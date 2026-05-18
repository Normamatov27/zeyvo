package com.zeyvo.notification;

import com.zeyvo.queue.events.TicketCalled;
import com.zeyvo.queue.events.TicketCreated;
import com.zeyvo.queue.events.TicketExpired;
import com.zeyvo.queue.service.TicketLifecycleScheduler;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationListener {

    private final TelegramNotificationService telegram;

    @PersistenceContext
    private EntityManager em;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void onTicketCreated(TicketCreated event) {
        if (!telegram.isEnabled()) return;
        if (event.customerId() == null) return;

        Long telegramId = lookupTelegramId(event.customerId());
        if (telegramId == null) return;

        // Estimate ETA: avg service duration from the service record
        int avgDurationS = lookupAvgDurationS(event.serviceId());
        int openWindows = lookupOpenWindows(event.branchId());
        int ahead = Math.max(0, event.queueSize() - 1);
        int etaMin = openWindows > 0
                ? Math.max(1, (int) Math.round((ahead * (avgDurationS / 60.0)) / openWindows))
                : ahead * (avgDurationS / 60);

        telegram.sendTicketCreated(telegramId, event.ticketNumber(), ahead, etaMin);
        log.debug("Ticket-created notification → chat_id={} ticket={}", telegramId, event.ticketNumber());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void onTicketCalled(TicketCalled event) {
        if (!telegram.isEnabled()) return;
        if (event.customerId() == null) return;

        Long telegramId = lookupTelegramId(event.customerId());
        if (telegramId == null) return;

        telegram.sendTicketCalled(telegramId, event.ticketNumber(), event.windowNumber());
        log.debug("Ticket-called notification → chat_id={} ticket={}", telegramId, event.ticketNumber());
    }

    @Async
    @EventListener
    @Transactional(readOnly = true)
    public void onNearTurn(TicketLifecycleScheduler.NearTurnEvent event) {
        if (!telegram.isEnabled()) return;
        Long telegramId = lookupTelegramId(event.customerId());
        if (telegramId == null) return;
        int avgDurationS = 300; // fallback; branch-level average good enough for nudge
        int etaMin = Math.max(1, (int) Math.round(event.ahead() * (avgDurationS / 60.0)));
        telegram.sendTicketNearTurn(telegramId, event.number(), event.ahead(), etaMin);
        log.debug("Near-turn notification → chat_id={} ticket={} ahead={}", telegramId, event.number(), event.ahead());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void onTicketExpired(TicketExpired event) {
        if (!telegram.isEnabled()) return;
        if (event.customerId() == null) return;

        Long telegramId = lookupTelegramId(event.customerId());
        if (telegramId == null) return;

        telegram.sendTicketExpired(telegramId, event.ticketNumber());
        log.debug("Ticket-expired notification → chat_id={} ticket={}", telegramId, event.ticketNumber());
    }

    private Long lookupTelegramId(UUID customerId) {
        try {
            Object result = em.createNativeQuery(
                            "SELECT telegram_id FROM app.user_account WHERE id = :id AND telegram_id IS NOT NULL")
                    .setParameter("id", customerId)
                    .getSingleResult();
            return result != null ? ((Number) result).longValue() : null;
        } catch (NoResultException e) {
            return null;
        } catch (Exception e) {
            log.error("Failed to look up telegram_id for {}: {}", customerId, e.getMessage());
            return null;
        }
    }

    private int lookupAvgDurationS(UUID serviceId) {
        try {
            Object result = em.createNativeQuery(
                            "SELECT avg_duration_s FROM app.service WHERE id = :id")
                    .setParameter("id", serviceId)
                    .getSingleResult();
            return result != null ? ((Number) result).intValue() : 300;
        } catch (Exception e) {
            return 300;
        }
    }

    private int lookupOpenWindows(UUID branchId) {
        try {
            Object result = em.createNativeQuery(
                            "SELECT COUNT(*) FROM app.window_desk WHERE branch_id = :id AND status = 'open'")
                    .setParameter("id", branchId)
                    .getSingleResult();
            return result != null ? Math.max(1, ((Number) result).intValue()) : 1;
        } catch (Exception e) {
            return 1;
        }
    }
}
