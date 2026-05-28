package com.zeyvo.queue.service;

import com.zeyvo.queue.events.TicketExpired;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Two lifecycle jobs:
 * 1. Near-turn: finds waiting tickets with ≤3 ahead, fires NearTurnEvent (→ Telegram nudge).
 * 2. Expiration: cancels waiting tickets older than the configured TTL.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TicketLifecycleScheduler {

    private final ApplicationEventPublisher eventPublisher;

    @PersistenceContext
    private EntityManager em;

    @Value("${zeyvo.queue.near-turn-threshold:3}")
    private int nearTurnThreshold;

    @Value("${zeyvo.queue.expiry-minutes:120}")
    private int expiryMinutes;

    // ── Near-turn notification ────────────────────────────────────────────────

    /**
     * Finds waiting tickets with ≤threshold tickets ahead that have NOT yet been nudged
     * (near_turn_notified_at IS NULL). Uses the DB column instead of in-memory state,
     * which makes it safe across restarts and multiple instances.
     */
    @Scheduled(fixedDelayString = "${zeyvo.queue.near-turn-check-interval-ms:60000}")
    @SchedulerLock(name = "near_turn_check", lockAtMostFor = "55s", lockAtLeastFor = "10s")
    @Transactional
    public void checkNearTurn() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                SELECT t.id, t.number, t.branch_id, t.customer_id,
                       (SELECT COUNT(*) FROM app.ticket t2
                        WHERE t2.branch_id = t.branch_id
                          AND t2.status = 'waiting'
                          AND t2.joined_at < t.joined_at) AS ahead
                FROM app.ticket t
                WHERE t.status = 'waiting'
                  AND t.customer_id IS NOT NULL
                  AND t.near_turn_notified_at IS NULL
                  AND (SELECT COUNT(*) FROM app.ticket t2
                       WHERE t2.branch_id = t.branch_id
                         AND t2.status = 'waiting'
                         AND t2.joined_at < t.joined_at) BETWEEN 1 AND :threshold
                """)
                .setParameter("threshold", nearTurnThreshold)
                .getResultList();

        for (Object[] row : rows) {
            UUID ticketId = (UUID) row[0];
            String number = (String) row[1];
            UUID branchId = (UUID) row[2];
            UUID customerId = (UUID) row[3];
            int ahead = ((Number) row[4]).intValue();

            // Stamp the DB column so we don't re-nudge on subsequent runs
            em.createNativeQuery("UPDATE app.ticket SET near_turn_notified_at = now() WHERE id = :id")
                    .setParameter("id", ticketId)
                    .executeUpdate();

            log.debug("Near-turn nudge: ticket={} ahead={} customer={}", number, ahead, customerId);
            eventPublisher.publishEvent(new NearTurnEvent(ticketId, number, branchId, customerId, ahead));
        }
    }

    // ── Expiration ────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${zeyvo.queue.expiry-check-interval-ms:300000}")
    @SchedulerLock(name = "expire_stale_tickets", lockAtMostFor = "4m", lockAtLeastFor = "30s")
    @Transactional
    public void expireStaleTickets() {
        Instant cutoff = Instant.now().minusSeconds(expiryMinutes * 60L);

        @SuppressWarnings("unchecked")
        List<Object[]> staleRows = em.createNativeQuery("""
                SELECT id, number, branch_id, organization_id, customer_id
                FROM app.ticket
                WHERE status = 'waiting' AND joined_at < :cutoff
                """)
                .setParameter("cutoff", cutoff)
                .getResultList();

        if (staleRows.isEmpty()) return;
        log.info("Expiring {} stale waiting tickets (older than {} min)", staleRows.size(), expiryMinutes);

        List<UUID> staleIds = staleRows.stream().map(r -> (UUID) r[0]).toList();

        Instant now = Instant.now();
        int batchSize = 100;
        for (int i = 0; i < staleIds.size(); i += batchSize) {
            List<UUID> batch = staleIds.subList(i, Math.min(i + batchSize, staleIds.size()));
            em.createQuery("UPDATE Ticket t SET t.status = com.zeyvo.queue.domain.TicketStatus.EXPIRED, t.closedAt = :now WHERE t.id IN :ids")
                    .setParameter("now", now)
                    .setParameter("ids", batch)
                    .executeUpdate();
        }

        Instant occurredAt = now;
        for (Object[] row : staleRows) {
            UUID ticketId  = (UUID) row[0];
            String number  = (String) row[1];
            UUID branchId  = (UUID) row[2];
            UUID orgId     = (UUID) row[3];
            UUID customerId = row[4] instanceof UUID u ? u : null;
            eventPublisher.publishEvent(new TicketExpired(ticketId, number, branchId, orgId, customerId, occurredAt));
        }
    }

    /** Internal event — consumed by NotificationListener for the Telegram nudge. */
    public record NearTurnEvent(UUID ticketId, String number, UUID branchId, UUID customerId, int ahead) {}
}
