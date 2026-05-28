package com.zeyvo.platform;

import com.zeyvo.auth.events.UserRegisteredEvent;
import com.zeyvo.queue.events.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
@Slf4j
public class AuditEventListener {

    @PersistenceContext
    private EntityManager em;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketCreated e) {
        write(e.organizationId(), e.customerId(), "ticket.created", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), e.serviceId(), e.ticketId(),
                "joined", e.source(), null, null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketCalled e) {
        write(e.organizationId(), e.customerId(), "ticket.called", "ticket", e.ticketId(), e.ticketNumber());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketServed e) {
        write(e.organizationId(), e.customerId(), "ticket.served", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), e.serviceId(), e.ticketId(),
                "served", null, e.windowId(), e.waitSeconds(), e.serviceSeconds());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketCancelled e) {
        write(e.organizationId(), e.customerId(), "ticket.cancelled", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), null, e.ticketId(),
                "cancelled", null, null, null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketNoShow e) {
        write(e.organizationId(), null, "ticket.no_show", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), null, e.ticketId(),
                "no_show", null, e.windowId(), null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketExpired e) {
        write(e.organizationId(), e.customerId(), "ticket.expired", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), null, e.ticketId(),
                "cancelled", null, null, null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketCalledAgain e) {
        write(e.organizationId(), e.customerId(), "ticket.called_again", "ticket", e.ticketId(), e.ticketNumber());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketArrived e) {
        write(e.organizationId(), e.customerId(), "ticket.arrived", "ticket", e.ticketId(), e.ticketNumber());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketServingStarted e) {
        write(e.organizationId(), e.customerId(), "ticket.serving", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), null, e.ticketId(),
                "serving", null, e.windowId(), null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketRestored e) {
        write(e.organizationId(), e.restoredBy(), "ticket.restored", "ticket", e.ticketId(), e.ticketNumber());
        writeAnalytics(e.organizationId(), e.branchId(), null, e.ticketId(),
                "restored", null, null, null, null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TicketTransferred e) {
        write(e.organizationId(), e.transferredBy(), "ticket.transferred", "ticket", e.ticketId(), e.ticketNumber());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(UserRegisteredEvent e) {
        write(null, e.userId(), "user.registered", "user", e.userId(), e.channel());
    }

    private void write(UUID orgId, UUID actorUserId, String action,
                       String targetType, UUID targetId, String detail) {
        try {
            em.createNativeQuery("""
                    INSERT INTO app.audit_event
                      (organization_id, actor_user_id, action, target_type, target_id, data)
                    VALUES
                      (:org, :actor, :action, :tt, :tid, jsonb_build_object('detail', :detail))
                    """)
                .setParameter("org",    orgId)
                .setParameter("actor",  actorUserId)
                .setParameter("action", action)
                .setParameter("tt",     targetType)
                .setParameter("tid",    targetId)
                .setParameter("detail", detail)
                .executeUpdate();
        } catch (Exception ex) {
            log.warn("Audit write failed for {}: {}", action, ex.getMessage());
        }
    }

    private void writeAnalytics(UUID orgId, UUID branchId, UUID serviceId, UUID ticketId,
                                String eventType, String source, UUID windowId,
                                Long waitSeconds, Long serviceSeconds) {
        try {
            em.createNativeQuery("""
                    INSERT INTO analytics.ticket_event
                      (occurred_at, organization_id, branch_id, service_id, ticket_id,
                       event_type, source, window_id, wait_seconds, service_seconds, data)
                    VALUES
                      (now(), :org, :branch, :service, :ticket,
                       :eventType, :source, :window, :waitS, :serviceS, '{}'::jsonb)
                    """)
                .setParameter("org",       orgId)
                .setParameter("branch",    branchId)
                .setParameter("service",   serviceId)
                .setParameter("ticket",    ticketId)
                .setParameter("eventType", eventType)
                .setParameter("source",    source)
                .setParameter("window",    windowId)
                .setParameter("waitS",     waitSeconds != null ? waitSeconds.intValue() : null)
                .setParameter("serviceS",  serviceSeconds != null ? serviceSeconds.intValue() : null)
                .executeUpdate();
        } catch (Exception ex) {
            log.warn("Analytics write failed for {} ticket={}: {}", eventType, ticketId, ex.getMessage());
        }
    }
}
