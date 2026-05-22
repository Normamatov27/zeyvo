package com.zeyvo.queue.appointment.service;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.appointment.api.dto.AppointmentDto;
import com.zeyvo.queue.appointment.api.dto.BookAppointmentRequest;
import com.zeyvo.queue.appointment.domain.Appointment;
import com.zeyvo.queue.appointment.domain.AppointmentStatus;
import com.zeyvo.queue.appointment.infra.AppointmentRepository;
import com.zeyvo.queue.api.dto.TakeTicketRequest;
import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.service.TicketService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository repo;
    private final TicketService ticketService;

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public Appointment book(BookAppointmentRequest req, UUID customerId) {
        // Verify branch + service exist and get service duration
        Object[] serviceRow;
        try {
            serviceRow = (Object[]) em.createNativeQuery(
                    "SELECT s.avg_duration_s, s.code FROM app.service s WHERE s.id = :id AND s.active = true")
                .setParameter("id", req.serviceId())
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new DomainException("service.not_found", "Service not found or inactive", HttpStatus.NOT_FOUND);
        }

        int durationS = serviceRow[0] != null ? ((Number) serviceRow[0]).intValue() : 900;
        String serviceCode = (String) serviceRow[1];

        // Verify branch belongs to some org (existence check)
        try {
            em.createNativeQuery("SELECT 1 FROM app.branch WHERE id = :id")
                .setParameter("id", req.branchId())
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new DomainException("branch.not_found", "Branch not found", HttpStatus.NOT_FOUND);
        }

        // Slot must be in the future (at least 5 minutes from now)
        Instant fiveMinFromNow = Instant.now().plus(5, ChronoUnit.MINUTES);
        if (req.scheduledAt().isBefore(fiveMinFromNow)) {
            throw new DomainException("appointment.slot_in_past", "Slot must be at least 5 minutes in the future", HttpStatus.BAD_REQUEST);
        }

        // Check for duplicate slot
        if (repo.countBookedAtSlot(req.branchId(), req.scheduledAt(), req.serviceId(), AppointmentStatus.BOOKED) > 0) {
            throw new DomainException("appointment.slot_taken", "This slot is already booked", HttpStatus.CONFLICT);
        }

        Appointment appt = Appointment.builder()
                .id(UUID.randomUUID())
                .branchId(req.branchId())
                .serviceId(req.serviceId())
                .customerId(customerId)
                .scheduledAt(req.scheduledAt())
                .durationSeconds(durationS)
                .status(AppointmentStatus.BOOKED)
                .createdAt(Instant.now())
                .build();

        repo.save(appt);
        log.info("Appointment booked: {} at {} for branch={}", appt.getId(), appt.getScheduledAt(), appt.getBranchId());
        return appt;
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getMyAppointments(UUID customerId) {
        return repo.findByCustomerIdOrderByScheduledAtDesc(customerId).stream()
                .map(a -> enrich(a))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getAdminView(UUID branchId, Instant from, Instant to) {
        return repo.findByBranchAndRange(branchId, from, to).stream()
                .map(a -> enrich(a))
                .toList();
    }

    @Transactional
    public Appointment cancel(UUID id, UUID requesterId, boolean isAdmin) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));

        if (!isAdmin && !appt.getCustomerId().equals(requesterId)) {
            throw new DomainException("appointment.forbidden", "Not your appointment", HttpStatus.FORBIDDEN);
        }

        if (appt.getStatus() != AppointmentStatus.BOOKED) {
            throw new DomainException("appointment.not_cancellable", "Appointment cannot be cancelled in its current state", HttpStatus.CONFLICT);
        }

        // Customers can only cancel >1h before the slot
        if (!isAdmin) {
            Instant oneHourBefore = appt.getScheduledAt().minus(Duration.ofHours(1));
            if (Instant.now().isAfter(oneHourBefore)) {
                throw new DomainException("appointment.cancel_too_late", "Cannot cancel within 1 hour of the appointment", HttpStatus.CONFLICT);
            }
        }

        appt.cancel();
        log.info("Appointment cancelled: {} by {} (admin={})", id, requesterId, isAdmin);
        return appt;
    }

    @Transactional
    public Ticket checkIn(UUID id, UUID operatorId) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));

        if (appt.getStatus() != AppointmentStatus.BOOKED) {
            throw new DomainException("appointment.not_booked", "Appointment is not in booked state", HttpStatus.CONFLICT);
        }

        // Get service code for ticket creation
        Object[] row;
        try {
            row = (Object[]) em.createNativeQuery("SELECT code FROM app.service WHERE id = :id")
                .setParameter("id", appt.getServiceId())
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new DomainException("service.not_found", "Service not found", HttpStatus.NOT_FOUND);
        }
        String serviceCode = (String) row[0];

        TakeTicketRequest req = new TakeTicketRequest(
                appt.getBranchId(), appt.getServiceId(), serviceCode, "appointment"
        );

        Ticket ticket = ticketService.takeTicket(req, appt.getCustomerId());
        appt.checkIn(ticket.getId());

        log.info("Appointment {} checked-in → ticket {}", id, ticket.getId());
        return ticket;
    }

    @Transactional(readOnly = true)
    public List<SlotInfo> getAvailability(UUID branchId, String dateStr, UUID serviceId) {
        // Parse date as UTC day boundaries
        java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        // Get booked slots for the day
        Set<Instant> booked = new HashSet<>(repo.findBookedSlots(branchId, dayStart, dayEnd, AppointmentStatus.BOOKED));

        // Generate 15-min slots from 09:00 to 18:00 UTC
        List<SlotInfo> slots = new ArrayList<>();
        Instant cursor = date.atTime(9, 0).toInstant(ZoneOffset.UTC);
        Instant end = date.atTime(18, 0).toInstant(ZoneOffset.UTC);
        Instant now = Instant.now().plus(5, ChronoUnit.MINUTES);

        while (cursor.isBefore(end)) {
            boolean available = !booked.contains(cursor) && cursor.isAfter(now);
            slots.add(new SlotInfo(cursor, available));
            cursor = cursor.plus(15, ChronoUnit.MINUTES);
        }

        return slots;
    }

    private AppointmentDto enrich(Appointment a) {
        String branchName = null;
        String serviceName = null;
        try {
            Object[] row = (Object[]) em.createNativeQuery(
                    "SELECT b.name, s.name FROM app.branch b, app.service s WHERE b.id = :bid AND s.id = :sid")
                .setParameter("bid", a.getBranchId())
                .setParameter("sid", a.getServiceId())
                .getSingleResult();
            branchName = (String) row[0];
            serviceName = (String) row[1];
        } catch (Exception ignored) {}
        return AppointmentDto.fromEnriched(a, branchName, serviceName);
    }

    public record SlotInfo(Instant time, boolean available) {}
}
