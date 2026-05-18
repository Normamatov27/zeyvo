package com.zeyvo.queue.service;

import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.events.TicketNoShow;
import com.zeyvo.queue.infra.repository.TicketRepository;
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

@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowScheduler {

    private final TicketRepository ticketRepository;
    private final ApplicationEventPublisher eventPublisher;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${zeyvo.queue.no-show-timeout-minutes:3}")
    private int noShowTimeoutMinutes;

    @Scheduled(fixedDelayString = "${zeyvo.queue.no-show-check-interval-ms:60000}")
    @SchedulerLock(name = "noshow_check", lockAtMostFor = "55s", lockAtLeastFor = "10s")
    @Transactional
    public void checkAndMarkNoShows() {
        Instant cutoff = Instant.now().minusSeconds(noShowTimeoutMinutes * 60L);
        List<Ticket> expired = ticketRepository.findExpiredCalled(cutoff);

        if (expired.isEmpty()) return;
        log.info("No-show check: marking {} expired called tickets", expired.size());

        for (Ticket ticket : expired) {
            Instant now = Instant.now();
            ticket.markNoShow(now);

            // Clear the window's serving_ticket
            entityManager.createNativeQuery("""
                    UPDATE app.window_desk SET serving_ticket = NULL
                    WHERE serving_ticket = :ticketId
                    """)
                    .setParameter("ticketId", ticket.getId())
                    .executeUpdate();

            eventPublisher.publishEvent(new TicketNoShow(
                    ticket.getId(), ticket.getNumber(), ticket.getBranchId(),
                    ticket.getOrganizationId(), ticket.getWindowId(), now
            ));

            log.debug("Auto no-show: ticket={} branch={}", ticket.getNumber(), ticket.getBranchId());
        }
    }
}
