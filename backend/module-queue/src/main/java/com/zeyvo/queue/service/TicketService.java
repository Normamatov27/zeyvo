package com.zeyvo.queue.service;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.api.dto.TakeTicketRequest;
import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.domain.TicketStatus;
import com.zeyvo.queue.events.TicketCalled;
import com.zeyvo.queue.events.TicketCancelled;
import com.zeyvo.queue.events.TicketCreated;
import com.zeyvo.queue.events.TicketNoShow;
import com.zeyvo.queue.events.TicketServed;
import com.zeyvo.queue.infra.repository.TicketRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final HeuristicEtaEstimator etaEstimator;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Ticket takeTicket(TakeTicketRequest req, UUID customerId) {
        // Look up org and branch capacity from DB (never trust client-provided capacity)
        Object[] branchRow;
        try {
            branchRow = (Object[]) entityManager.createNativeQuery(
                    "SELECT organization_id, capacity FROM app.branch WHERE id = :id")
                .setParameter("id", req.branchId())
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new com.zeyvo.common.web.DomainException(
                    "branch.not_found", "Branch not found", org.springframework.http.HttpStatus.NOT_FOUND);
        }
        UUID orgId = (UUID) branchRow[0];
        int branchCapacity = branchRow[1] != null ? ((Number) branchRow[1]).intValue() : 100;

        // Anti-abuse: 1 active ticket per branch per customer
        if (customerId != null && ticketRepository.countActiveByCustomerAndBranch(customerId, req.branchId()) > 0) {
            throw DomainException.conflict("queue.active_ticket_exists",
                    "You already have an active ticket for this branch.");
        }

        // Advisory lock per branch prevents TOCTOU race where two concurrent
        // takeTicket calls both pass the capacity check before either inserts.
        entityManager.createNativeQuery(
                "SELECT pg_advisory_xact_lock(hashtext(:id)::bigint)")
            .setParameter("id", req.branchId().toString())
            .getSingleResult();

        // Capacity check: reject if branch is at capacity
        int activeCount = ticketRepository.countActiveByBranch(req.branchId());
        if (activeCount >= branchCapacity) {
            throw DomainException.conflict("queue.capacity_exceeded",
                    "Branch is at capacity. Try again later or visit another branch.");
        }

        // Operating hours check: reject if branch is outside its configured hours
        checkBranchIsOpen(req.branchId());

        // Generate unique sequential ticket number atomically via ON CONFLICT DO UPDATE
        String number = generateTicketNumber(req.branchId(), req.serviceCode());

        Ticket ticket = Ticket.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .branchId(req.branchId())
                .serviceId(req.serviceId())
                .number(number)
                .customerId(customerId)
                .source(req.source())
                .priority((short) 0)
                .status(TicketStatus.WAITING)
                .joinedAt(Instant.now())
                .build();

        ticketRepository.save(ticket);

        int newQueueSize = activeCount + 1;
        eventPublisher.publishEvent(new TicketCreated(
                ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                ticket.getOrganizationId(), ticket.getServiceId(), customerId,
                ticket.getSource(), newQueueSize, ticket.getJoinedAt()
        ));

        log.info("Ticket created: {} for branch={}", ticket.getNumber(), req.branchId());
        return ticket;
    }

    /**
     * Atomically claim the next waiting ticket for a window using SELECT FOR UPDATE SKIP LOCKED.
     * Two concurrent callNext on the same branch cannot both grab the same ticket.
     */
    @Transactional
    public Optional<Ticket> callNext(UUID windowId, UUID branchId, int windowNumber) {
        @SuppressWarnings("unchecked")
        List<Ticket> results = entityManager.createNativeQuery("""
                SELECT * FROM app.ticket
                WHERE branch_id = :branchId AND status = 'waiting'
                ORDER BY priority DESC, joined_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
                """, Ticket.class)
                .setParameter("branchId", branchId)
                .getResultList();

        if (results.isEmpty()) {
            clearWindowCurrentTicket(windowId);
            return Optional.empty();
        }

        // Reject if the window already has an active ticket — operator must serve or no-show first.
        ticketRepository.findByWindowIdAndStatus(windowId, TicketStatus.CALLED)
                .or(() -> ticketRepository.findByWindowIdAndStatus(windowId, TicketStatus.SERVING))
                .ifPresent(busy -> {
                    throw DomainException.conflict("queue.window_busy",
                            "Window already has an active ticket. Serve or no-show it before calling the next.");
                });

        Ticket ticket = results.get(0);
        Instant now = Instant.now();

        ticket.call(windowId, now);

        // Update window_desk.serving_ticket atomically
        entityManager.createNativeQuery("""
                UPDATE app.window_desk
                SET serving_ticket = :ticketId, status = 'open'
                WHERE id = :windowId
                """)
                .setParameter("ticketId", ticket.getId())
                .setParameter("windowId", windowId)
                .executeUpdate();

        eventPublisher.publishEvent(new TicketCalled(
                ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                ticket.getOrganizationId(), windowId, windowNumber,
                ticket.getCustomerId(), now
        ));

        log.info("Ticket called: {} → window {}", ticket.getNumber(), windowNumber);
        return Optional.of(ticket);
    }

    @Transactional
    public void markServed(UUID ticketId, UUID windowId) {
        Ticket ticket = getOrThrow(ticketId);
        if (ticket.getWindowId() == null || !ticket.getWindowId().equals(windowId)) {
            throw DomainException.conflict("ticket.wrong_window",
                    "This ticket is not assigned to your window.");
        }
        Instant now = Instant.now();

        long waitSeconds = ticket.getCalledAt() != null
                ? ticket.getCalledAt().getEpochSecond() - ticket.getJoinedAt().getEpochSecond()
                : 0;
        long serviceSeconds = ticket.getServingAt() != null
                ? now.getEpochSecond() - ticket.getServingAt().getEpochSecond()
                : 0;

        ticket.markServed(now);
        clearWindowCurrentTicket(windowId);

        eventPublisher.publishEvent(new TicketServed(
                ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                ticket.getOrganizationId(), ticket.getServiceId(), windowId,
                ticket.getCustomerId(), waitSeconds, serviceSeconds, now
        ));
    }

    @Transactional
    public void markNoShow(UUID ticketId, UUID windowId) {
        Ticket ticket = getOrThrow(ticketId);
        if (ticket.getWindowId() == null || !ticket.getWindowId().equals(windowId)) {
            throw DomainException.conflict("ticket.wrong_window",
                    "This ticket is not assigned to your window.");
        }
        if (ticket.getStatus() != TicketStatus.CALLED) {
            log.debug("markNoShow skipped: ticket {} is in status {}", ticketId, ticket.getStatus());
            return;
        }
        Instant now = Instant.now();

        ticket.markNoShow(now);
        clearWindowCurrentTicket(windowId);

        eventPublisher.publishEvent(new TicketNoShow(
                ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                ticket.getOrganizationId(), windowId, now
        ));
    }

    @Transactional
    public void cancel(UUID ticketId, UUID requestingCustomerId) {
        Ticket ticket = getOrThrow(ticketId);

        // Only the ticket owner or admin can cancel; admin path skips customer check
        if (requestingCustomerId != null && !requestingCustomerId.equals(ticket.getCustomerId())) {
            throw DomainException.forbidden("Cannot cancel another customer's ticket.");
        }
        if (ticket.getStatus().isTerminal()) {
            throw DomainException.conflict("ticket.terminal_state",
                    "Ticket is already in terminal state: " + ticket.getStatus());
        }
        Instant now = Instant.now();
        ticket.cancel(now);
        eventPublisher.publishEvent(new TicketCancelled(
                ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                ticket.getOrganizationId(), ticket.getCustomerId(), now
        ));
    }

    public Ticket getOrThrow(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> DomainException.notFound("Ticket", ticketId));
    }

    public List<Ticket> getActiveQueueForBranch(UUID branchId) {
        return ticketRepository.findActiveByBranch(branchId);
    }

    public List<Ticket> getHistoryForUser(UUID userId) {
        return ticketRepository.findByCustomerIdOrderByJoinedAtDesc(userId)
                .stream().limit(50).toList();
    }

    /**
     * Customer taps "I'm here" when called — resets called_at so no-show timer restarts.
     * Allowed only when status = CALLED.
     */
    @Transactional
    public void confirmPresence(UUID ticketId, UUID requestingCustomerId) {
        Ticket ticket = getOrThrow(ticketId);
        if (requestingCustomerId != null && !requestingCustomerId.equals(ticket.getCustomerId())) {
            throw DomainException.forbidden("Cannot confirm presence for another customer's ticket.");
        }
        if (ticket.getStatus() != TicketStatus.CALLED) {
            throw DomainException.conflict("ticket.not_called",
                    "Ticket is not in 'called' state — cannot confirm presence.");
        }
        // Reset called_at so the no-show scheduler gets a fresh window
        ticket.setCalledAt(Instant.now());
        log.info("Presence confirmed for ticket {}", ticket.getNumber());
    }

    @Transactional
    public void rate(UUID ticketId, int stars, String comment, UUID requesterId) {
        Ticket ticket = getOrThrow(ticketId);
        if (requesterId == null || !requesterId.equals(ticket.getCustomerId())) {
            throw DomainException.forbidden("Only the ticket owner can submit a rating.");
        }
        if (ticket.getStatus() != TicketStatus.SERVED) {
            throw DomainException.conflict("ticket.not_served",
                    "Ticket must be in 'served' state to submit a rating.");
        }
        if (ticket.getRatingStars() != null) {
            throw DomainException.conflict("ticket.already_rated",
                    "This ticket has already been rated.");
        }
        ticket.setRatingStars((short) stars);
        ticket.setRatingComment(comment);
        log.info("Rating submitted for ticket {}: {} stars", ticket.getNumber(), stars);
    }

    @Transactional
    public Ticket transfer(UUID ticketId, UUID toWindowId, AuthPrincipal user) {
        Ticket ticket = getOrThrow(ticketId);
        // Verify the ticket's branch belongs to the caller's org (SUPER_ADMIN bypasses)
        if (!user.isSuperAdmin()) {
            try {
                UUID ticketOrg = (UUID) entityManager.createNativeQuery(
                        "SELECT b.organization_id FROM app.branch b " +
                        "JOIN app.service s ON s.branch_id = b.id WHERE s.id = :sid")
                    .setParameter("sid", ticket.getServiceId())
                    .getSingleResult();
                if (!ticketOrg.equals(user.orgId())) {
                    throw DomainException.forbidden("Ticket not in your organization.");
                }
            } catch (jakarta.persistence.NoResultException ignored) {}
        }
        if (ticket.getStatus() != TicketStatus.WAITING && ticket.getStatus() != TicketStatus.CALLED) {
            throw DomainException.conflict("ticket.not_transferable",
                    "Only waiting or called tickets can be transferred.");
        }
        ticket.setStatus(TicketStatus.WAITING);
        ticket.setWindowId(toWindowId);
        ticket.setCalledAt(null);
        // Slight priority bump so the transferred ticket doesn't sink to the back
        ticket.setPriority((short) Math.min(ticket.getPriority() + 5, 90));
        log.info("Ticket {} transferred to window {}", ticket.getNumber(), toWindowId);
        return ticket;
    }

    public int estimateEtaMinutes(UUID ticketId, double avgServiceMinutes, int openWindows) {
        Ticket ticket = getOrThrow(ticketId);
        List<Ticket> queue = ticketRepository.findActiveByBranch(ticket.getBranchId());
        int ahead = (int) queue.stream()
                .filter(t -> t.getStatus() == TicketStatus.WAITING
                        && t.getJoinedAt().isBefore(ticket.getJoinedAt()))
                .count();
        return etaEstimator.estimateMinutes(ahead, avgServiceMinutes, openWindows);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    /**
     * Rejects ticket creation if operating hours are configured for today but the
     * current branch-local time falls outside all defined windows.
     * If no hours are configured for today → treated as always-open (no rejection).
     */
    private void checkBranchIsOpen(UUID branchId) {
        Object tzRaw;
        try {
            tzRaw = entityManager.createNativeQuery(
                    "SELECT timezone FROM app.branch WHERE id = :bid")
                .setParameter("bid", branchId)
                .getSingleResult();
        } catch (Exception e) {
            return; // branch not found — takeTicket will handle it
        }

        String tz = tzRaw instanceof String s ? s : "Asia/Tashkent";
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of(tz));
        // Convert ISO DayOfWeek (Mon=1..Sun=7) to Sun=0..Sat=6 convention stored in DB
        int calDow = now.getDayOfWeek().getValue() % 7;
        LocalTime localTime = now.toLocalTime();

        Number totalForDay = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM app.operating_hours WHERE branch_id = :bid AND day_of_week = :dow")
            .setParameter("bid", branchId)
            .setParameter("dow", calDow)
            .getSingleResult();

        if (totalForDay.intValue() == 0) return; // no hours configured → always open

        Number openNow = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM app.operating_hours " +
                "WHERE branch_id = :bid AND day_of_week = :dow AND open_at <= :t AND close_at > :t")
            .setParameter("bid", branchId)
            .setParameter("dow", calDow)
            .setParameter("t", localTime)
            .getSingleResult();

        if (openNow.intValue() == 0) {
            throw DomainException.conflict("queue.branch_closed",
                    "This branch is currently closed. Please check the branch's operating hours.");
        }
    }

    private String generateTicketNumber(UUID branchId, String serviceCode) {
        // Atomic INSERT ... ON CONFLICT DO UPDATE ... RETURNING next_val
        Number nextVal = (Number) entityManager.createNativeQuery("""
                INSERT INTO app.ticket_counter (branch_id, service_code, next_val)
                VALUES (:branchId, :serviceCode, 101)
                ON CONFLICT (branch_id, service_code) DO UPDATE
                SET next_val = ticket_counter.next_val + 1
                RETURNING next_val
                """)
                .setParameter("branchId", branchId)
                .setParameter("serviceCode", serviceCode)
                .getSingleResult();
        return serviceCode + "-" + nextVal.intValue();
    }

    private void clearWindowCurrentTicket(UUID windowId) {
        entityManager.createNativeQuery("""
                UPDATE app.window_desk SET serving_ticket = NULL WHERE id = :windowId
                """)
                .setParameter("windowId", windowId)
                .executeUpdate();
    }
}
