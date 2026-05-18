package com.zeyvo.queue.service;

import com.zeyvo.queue.events.TicketNoShow;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * After a no-show, automatically calls the next waiting ticket on the freed window.
 * The window is already cleared by NoShowScheduler; this just advances the queue.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowAutoAdvanceListener {

    private final TicketService ticketService;

    @PersistenceContext
    private EntityManager em;

    @Value("${zeyvo.queue.auto-advance-after-no-show:true}")
    private boolean autoAdvance;

    @Async
    @EventListener
    @Transactional
    public void onNoShow(TicketNoShow event) {
        if (!autoAdvance || event.windowId() == null) return;

        int windowNumber = lookupWindowNumber(event.windowId());
        ticketService.callNext(event.windowId(), event.branchId(), windowNumber)
                .ifPresentOrElse(
                        t -> log.info("Auto-advance after no-show: called {} on window {}", t.getNumber(), windowNumber),
                        () -> log.debug("Auto-advance: no waiting tickets for branch {}", event.branchId())
                );
    }

    private int lookupWindowNumber(UUID windowId) {
        try {
            Object result = em.createNativeQuery(
                            "SELECT number FROM app.window_desk WHERE id = :id")
                    .setParameter("id", windowId)
                    .getSingleResult();
            return result != null ? ((Number) result).intValue() : 0;
        } catch (NoResultException e) {
            return 0;
        }
    }
}
