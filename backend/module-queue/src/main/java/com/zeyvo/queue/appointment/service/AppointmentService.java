package com.zeyvo.queue.appointment.service;

import com.zeyvo.common.web.AuthPrincipal;
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

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

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

        try {
            em.createNativeQuery("SELECT 1 FROM app.branch WHERE id = :id")
                .setParameter("id", req.branchId())
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new DomainException("branch.not_found", "Branch not found", HttpStatus.NOT_FOUND);
        }

        if (req.providerId() != null) {
            long provCount;
            try {
                provCount = ((Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM app.provider_branch WHERE provider_id = :pid AND branch_id = :bid")
                        .setParameter("pid", req.providerId())
                        .setParameter("bid", req.branchId())
                        .getSingleResult()).longValue();
            } catch (Exception e) {
                provCount = 0;
            }
            if (provCount == 0) {
                throw new DomainException("provider.not_at_branch",
                        "Provider is not assigned to this branch", HttpStatus.BAD_REQUEST);
            }
        }

        Instant fiveMinFromNow = Instant.now().plus(5, ChronoUnit.MINUTES);
        if (req.scheduledAt().isBefore(fiveMinFromNow)) {
            throw new DomainException("appointment.slot_in_past", "Slot must be at least 5 minutes in the future", HttpStatus.BAD_REQUEST);
        }

        // Double-booking guard
        if (req.providerId() != null) {
            if (repo.countBookedAtSlotForProvider(req.branchId(), req.scheduledAt(), req.providerId()) > 0) {
                throw new DomainException("appointment.slot_taken", "This slot is already booked", HttpStatus.CONFLICT);
            }
        } else {
            if (repo.countBookedAtSlotNoProvider(req.branchId(), req.scheduledAt(), req.serviceId()) > 0) {
                throw new DomainException("appointment.slot_taken", "This slot is already booked", HttpStatus.CONFLICT);
            }
        }

        String type = req.appointmentType() != null ? req.appointmentType() : "standard";

        Appointment appt = Appointment.builder()
                .id(UUID.randomUUID())
                .branchId(req.branchId())
                .serviceId(req.serviceId())
                .customerId(customerId)
                .providerId(req.providerId())
                .scheduledAt(req.scheduledAt())
                .durationSeconds(durationS)
                .appointmentType(type)
                .priority((short) 0)
                .status(AppointmentStatus.BOOKED)
                .patientNote(req.patientNote())
                .createdAt(Instant.now())
                .build();

        repo.save(appt);
        log.info("Appointment booked: {} at {} for branch={}", appt.getId(), appt.getScheduledAt(), appt.getBranchId());
        return appt;
    }

    /**
     * Appointment detail is visible to the owner or staff in the same org.
     * A staff caller must have their org match the appointment's branch org.
     */
    @Transactional(readOnly = true)
    public AppointmentDto getById(UUID id, AuthPrincipal caller) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));
        boolean isOwner = appt.getCustomerId().equals(caller.userId());
        boolean isStaff = caller.isStaff();
        if (!isOwner && !isStaff) {
            throw DomainException.forbidden("Not your appointment.");
        }
        if (isStaff && !isOwner) {
            // Staff must belong to the same org as the appointment's branch
            requireAppointmentInOrg(caller, id, appt);
        }
        return enrich(appt);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getMyAppointments(UUID customerId) {
        return repo.findByCustomerIdOrderByScheduledAtDesc(customerId).stream()
                .map(this::enrich)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getAdminView(UUID branchId, Instant from, Instant to) {
        return repo.findByBranchAndRange(branchId, from, to).stream()
                .map(this::enrich)
                .toList();
    }

    @Transactional
    public Appointment cancel(UUID id, UUID requesterId, Set<String> requesterRoles, AuthPrincipal caller) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));

        boolean isStaff = requesterRoles.stream().anyMatch(r ->
                r.equalsIgnoreCase("MANAGER") || r.equalsIgnoreCase("ORG_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN"));

        if (!isStaff && !appt.getCustomerId().equals(requesterId)) {
            throw new DomainException("appointment.forbidden", "Not your appointment", HttpStatus.FORBIDDEN);
        }
        // Staff cancellation must be within the same org (owner-cancel skips this)
        if (isStaff && !appt.getCustomerId().equals(requesterId)) {
            requireAppointmentInOrg(caller, id, appt);
        }

        Set<AppointmentStatus> cancellable = Set.of(AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED);
        if (!cancellable.contains(appt.getStatus())) {
            throw new DomainException("appointment.not_cancellable", "Appointment cannot be cancelled in its current state", HttpStatus.CONFLICT);
        }

        if (!isStaff) {
            Instant oneHourBefore = appt.getScheduledAt().minus(Duration.ofHours(1));
            if (Instant.now().isAfter(oneHourBefore)) {
                throw new DomainException("appointment.cancel_too_late", "Cannot cancel within 1 hour of the appointment", HttpStatus.CONFLICT);
            }
        }

        appt.cancel();
        log.info("Appointment cancelled: {} by {} (staff={})", id, requesterId, isStaff);
        return appt;
    }

    @Transactional
    public Appointment confirm(UUID id) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));
        if (appt.getStatus() != AppointmentStatus.BOOKED) {
            throw new DomainException("appointment.not_confirmable", "Only booked appointments can be confirmed", HttpStatus.CONFLICT);
        }
        appt.confirm();
        return appt;
    }

    @Transactional
    public Appointment checkIn(UUID id) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));
        Set<AppointmentStatus> checkInable = Set.of(AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED);
        if (!checkInable.contains(appt.getStatus())) {
            throw new DomainException("appointment.not_checkinable", "Appointment is not in a check-in eligible state", HttpStatus.CONFLICT);
        }
        appt.checkIn();
        log.info("Appointment {} checked in", id);
        return appt;
    }

    @Transactional
    public Ticket startServing(UUID id, UUID operatorId) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));
        if (appt.getStatus() != AppointmentStatus.CHECKED_IN) {
            throw new DomainException("appointment.not_checked_in", "Appointment must be checked in first", HttpStatus.CONFLICT);
        }

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
        appt.startServing(ticket.getId());

        log.info("Appointment {} → ticket {}", id, ticket.getId());
        return ticket;
    }

    @Transactional
    public Appointment markNoShow(UUID id) {
        Appointment appt = repo.findById(id)
                .orElseThrow(() -> new DomainException("appointment.not_found", "Appointment not found", HttpStatus.NOT_FOUND));
        Set<AppointmentStatus> noShowable = Set.of(AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED);
        if (!noShowable.contains(appt.getStatus())) {
            throw new DomainException("appointment.not_no_showable", "Cannot mark no-show in current state", HttpStatus.CONFLICT);
        }
        appt.markNoShow();
        return appt;
    }

    @Transactional(readOnly = true)
    public List<SlotInfo> getAvailability(UUID branchId, String dateStr, UUID serviceId, UUID providerId) {
        LocalDate date = LocalDate.parse(dateStr);

        String tz = "Asia/Tashkent";
        try {
            Object tzRow = em.createNativeQuery("SELECT timezone FROM app.branch WHERE id = :id")
                    .setParameter("id", branchId).getSingleResult();
            if (tzRow instanceof String s && !s.isBlank()) tz = s;
        } catch (Exception ignored) {}

        ZoneId zone = ZoneId.of(tz);
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd   = date.plusDays(1).atStartOfDay(zone).toInstant();

        Instant cursor;
        Instant end;
        int slotMinutes = 15;

        if (providerId != null) {
            // Use provider schedule for this day
            int dow = date.getDayOfWeek().getValue(); // 1=Monday
            Object[] schedRow = null;
            try {
                schedRow = (Object[]) em.createNativeQuery(
                        "SELECT start_time, end_time, slot_duration_min FROM app.provider_schedule " +
                        "WHERE provider_id = :pid AND branch_id = :bid AND day_of_week = :dow")
                        .setParameter("pid", providerId)
                        .setParameter("bid", branchId)
                        .setParameter("dow", dow)
                        .getSingleResult();
            } catch (Exception ignored) {}

            if (schedRow == null) {
                return List.of(); // provider doesn't work this day at this branch
            }

            LocalTime startTime = ((java.sql.Time) schedRow[0]).toLocalTime();
            LocalTime endTime   = ((java.sql.Time) schedRow[1]).toLocalTime();
            slotMinutes = ((Number) schedRow[2]).intValue();

            cursor = date.atTime(startTime).atZone(zone).toInstant();
            end    = date.atTime(endTime).atZone(zone).toInstant();
        } else {
            cursor = date.atTime(9, 0).atZone(zone).toInstant();
            end    = date.atTime(18, 0).atZone(zone).toInstant();
        }

        // Collect provider break windows for the day
        Set<String> breakRanges = new HashSet<>();
        if (providerId != null) {
            int dow = date.getDayOfWeek().getValue();
            try {
                @SuppressWarnings("unchecked")
                List<Object[]> breaks = em.createNativeQuery(
                        "SELECT break_start, break_end FROM app.provider_break " +
                        "WHERE provider_id = :pid AND branch_id = :bid AND day_of_week = :dow")
                        .setParameter("pid", providerId)
                        .setParameter("bid", branchId)
                        .setParameter("dow", dow)
                        .getResultList();
                for (Object[] br : breaks) {
                    breakRanges.add(br[0].toString() + "~" + br[1].toString());
                }
            } catch (Exception ignored) {}
        }

        // Booked slots for this provider (or branch if no provider)
        Set<Instant> booked = new HashSet<>(repo.findBookedSlots(branchId, dayStart, dayEnd, AppointmentStatus.BOOKED));
        // Also include confirmed/checked_in/in_progress as occupied
        try {
            if (providerId != null) {
                @SuppressWarnings("unchecked")
                List<Object> extra = em.createNativeQuery(
                        "SELECT scheduled_at FROM app.appointment " +
                        "WHERE branch_id = :bid AND provider_id = :pid " +
                        "AND scheduled_at >= :ds AND scheduled_at < :de " +
                        "AND status IN ('confirmed','checked_in','in_progress')")
                        .setParameter("bid", branchId)
                        .setParameter("pid", providerId)
                        .setParameter("ds", dayStart)
                        .setParameter("de", dayEnd)
                        .getResultList();
                for (Object o : extra) {
                    if (o instanceof java.sql.Timestamp ts) booked.add(ts.toInstant());
                }
            } else {
                @SuppressWarnings("unchecked")
                List<Object> extra = em.createNativeQuery(
                        "SELECT scheduled_at FROM app.appointment " +
                        "WHERE branch_id = :bid AND provider_id IS NULL " +
                        "AND scheduled_at >= :ds AND scheduled_at < :de " +
                        "AND status IN ('confirmed','checked_in','in_progress')")
                        .setParameter("bid", branchId)
                        .setParameter("ds", dayStart)
                        .setParameter("de", dayEnd)
                        .getResultList();
                for (Object o : extra) {
                    if (o instanceof java.sql.Timestamp ts) booked.add(ts.toInstant());
                }
            }
        } catch (Exception ignored) {}

        Instant now = Instant.now().plus(5, ChronoUnit.MINUTES);
        List<SlotInfo> slots = new ArrayList<>();
        while (cursor.isBefore(end)) {
            boolean inBreak = false;
            if (!breakRanges.isEmpty()) {
                LocalTime ct = cursor.atZone(zone).toLocalTime();
                for (String range : breakRanges) {
                    String[] parts = range.split("~");
                    LocalTime bs = LocalTime.parse(parts[0]);
                    LocalTime be = LocalTime.parse(parts[1]);
                    if (!ct.isBefore(bs) && ct.isBefore(be)) { inBreak = true; break; }
                }
            }
            boolean available = !booked.contains(cursor) && cursor.isAfter(now) && !inBreak;
            slots.add(new SlotInfo(cursor, available));
            cursor = cursor.plus(slotMinutes, ChronoUnit.MINUTES);
        }
        return slots;
    }

    // ── Waitlist ────────────────────────────────────────────────────────────────

    @Transactional
    public void joinWaitlist(UUID branchId, UUID serviceId, UUID providerId, String preferredDate, UUID customerId) {
        LocalDate date = LocalDate.parse(preferredDate);
        em.createNativeQuery("""
                INSERT INTO app.appointment_waitlist
                    (id, branch_id, service_id, provider_id, customer_id, preferred_date, created_at)
                VALUES (gen_random_uuid(), :bid, :sid, :pid, :cid, :dt, now())
                """)
                .setParameter("bid", branchId)
                .setParameter("sid", serviceId)
                .setParameter("pid", providerId)
                .setParameter("cid", customerId)
                .setParameter("dt", java.sql.Date.valueOf(date))
                .executeUpdate();
    }

    @Transactional
    public void leaveWaitlist(UUID waitlistId, UUID customerId) {
        em.createNativeQuery(
                "DELETE FROM app.appointment_waitlist WHERE id = :id AND customer_id = :cid")
                .setParameter("id", waitlistId)
                .setParameter("cid", customerId)
                .executeUpdate();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getMyWaitlist(UUID customerId) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT w.id, w.branch_id, b.name, w.service_id, s.name, w.preferred_date, w.created_at
                FROM app.appointment_waitlist w
                JOIN app.branch b ON b.id = w.branch_id
                JOIN app.service s ON s.id = w.service_id
                WHERE w.customer_id = :cid
                ORDER BY w.preferred_date
                """)
                .setParameter("cid", customerId)
                .getResultList();

        return rows.stream().map(r -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", r[0].toString());
            m.put("branchId", r[1].toString());
            m.put("branchName", r[2]);
            m.put("serviceId", r[3].toString());
            m.put("serviceName", r[4]);
            m.put("preferredDate", r[5].toString());
            m.put("createdAt", r[6] == null ? null : r[6].toString());
            return (Map<String, Object>) m;
        }).toList();
    }

    private AppointmentDto enrich(Appointment a) {
        String branchName = null;
        String serviceName = null;
        String providerName = null;
        try {
            Object[] row = (Object[]) em.createNativeQuery(
                    "SELECT b.name, s.name FROM app.branch b, app.service s WHERE b.id = :bid AND s.id = :sid")
                .setParameter("bid", a.getBranchId())
                .setParameter("sid", a.getServiceId())
                .getSingleResult();
            branchName = (String) row[0];
            serviceName = (String) row[1];
        } catch (Exception ignored) {}

        if (a.getProviderId() != null) {
            try {
                Object pName = em.createNativeQuery(
                        "SELECT full_name FROM app.provider WHERE id = :id")
                        .setParameter("id", a.getProviderId())
                        .getSingleResult();
                providerName = (String) pName;
            } catch (Exception ignored) {}
        }

        return AppointmentDto.fromEnriched(a, branchName, serviceName, providerName);
    }

    public record SlotInfo(Instant time, boolean available) {}

    /**
     * Verifies the appointment's branch belongs to the caller's org.
     * Accepts a pre-loaded Appointment to avoid a second DB round-trip when the caller already has it.
     * SUPER_ADMIN bypass is handled by the caller (AuthorizationService.requireAppointmentInOrg or directly).
     */
    private void requireAppointmentInOrg(AuthPrincipal caller, UUID appointmentId, Appointment appt) {
        if (caller.isSuperAdmin()) return;
        UUID callerOrg = caller.orgId();
        if (callerOrg == null) throw DomainException.forbidden("No organisation in token.");
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                    "SELECT organization_id FROM app.branch WHERE id = :bid")
                .setParameter("bid", appt.getBranchId())
                .getSingleResult();
            if (callerOrg.equals(branchOrg)) return;
        } catch (jakarta.persistence.NoResultException ignored) {}
        throw DomainException.forbidden("Appointment not in your organization.");
    }
}
