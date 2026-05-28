package com.zeyvo.realtime;

import com.zeyvo.queue.events.TicketArrived;
import com.zeyvo.queue.events.TicketCalled;
import com.zeyvo.queue.events.TicketCalledAgain;
import com.zeyvo.queue.events.TicketCancelled;
import com.zeyvo.queue.events.TicketCreated;
import com.zeyvo.queue.events.TicketExpired;
import com.zeyvo.queue.events.TicketNoShow;
import com.zeyvo.queue.events.TicketRestored;
import com.zeyvo.queue.events.TicketServed;
import com.zeyvo.queue.events.TicketServingStarted;
import com.zeyvo.queue.events.TicketTransferred;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * Translates domain events published by TicketService into WebSocket broadcasts.
 * @Async keeps event handling off the transaction thread.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class QueueEventBroadcaster {

    private final BroadcastService broadcast;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketCreated e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.created",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "service_id", e.serviceId().toString(),
                "source", e.source(),
                "queue_size", e.queueSize(),
                "joined_at", e.occurredAt().toString()
        );
        broadcast.broadcastToQueue(e.branchId(), payload);
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToSignage(e.branchId(), Map.of(
                "type", "queue.size",
                "queue_size", e.queueSize()
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketCalled e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.called",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "window_id", e.windowId().toString(),
                "window_number", e.windowNumber(),
                "called_at", e.occurredAt().toString()
        );
        broadcast.broadcastToQueue(e.branchId(), payload);
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.called",
                "status", "called",
                "window_id", e.windowId().toString(),
                "window_number", e.windowNumber(),
                "called_at", e.occurredAt().toString()
        ));
        broadcast.broadcastToSignage(e.branchId(), Map.of(
                "type", "ticket.called",
                "number", e.ticketNumber(),
                "window_number", e.windowNumber()
        ));
        if (e.customerId() != null) {
            broadcast.notifyUser(e.customerId().toString(), Map.of(
                    "type", "your_turn",
                    "number", e.ticketNumber(),
                    "window_number", e.windowNumber()
            ));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketServed e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.served",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "window_id", e.windowId().toString(),
                "wait_seconds", e.waitSeconds(),
                "service_seconds", e.serviceSeconds()
        );
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.served",
                "status", "served"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketCancelled e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.cancelled",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber()
        );
        broadcast.broadcastToQueue(e.branchId(), payload);
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.cancelled",
                "status", "cancelled"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketNoShow e) {
        var payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("v", 1);
        payload.put("type", "ticket.no_show");
        payload.put("ticket_id", e.ticketId().toString());
        payload.put("number", e.ticketNumber());
        if (e.windowId() != null) payload.put("window_id", e.windowId().toString());
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.no_show",
                "status", "no_show"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketCalledAgain e) {
        var payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("v", 1);
        payload.put("type", "ticket.called_again");
        payload.put("ticket_id", e.ticketId().toString());
        payload.put("number", e.ticketNumber());
        if (e.windowId() != null) payload.put("window_id", e.windowId().toString());
        payload.put("call_count", e.callCount());
        payload.put("called_at", e.occurredAt().toString());
        broadcast.broadcastToOps(e.branchId(), payload);
        if (e.customerId() != null) {
            broadcast.notifyUser(e.customerId().toString(), Map.of(
                    "type", "your_turn_again",
                    "number", e.ticketNumber()
            ));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketArrived e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.arrived",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "arrived_at", e.occurredAt().toString()
        );
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.arrived", "status", "arrived"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketServingStarted e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.serving",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "window_id", e.windowId().toString(),
                "serving_at", e.occurredAt().toString()
        );
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.serving", "status", "serving"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketRestored e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.restored",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber()
        );
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToQueue(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.restored", "status", "waiting"
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketTransferred e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.transferred",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber(),
                "to_service_id", e.toServiceId().toString(),
                "new_ticket_id", e.newTicketId().toString(),
                "new_number", e.newTicketNumber()
        );
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.transferred", "status", "transferred",
                "new_ticket_id", e.newTicketId().toString()
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(TicketExpired e) {
        Map<String, Object> payload = Map.of(
                "v", 1,
                "type", "ticket.expired",
                "ticket_id", e.ticketId().toString(),
                "number", e.ticketNumber()
        );
        broadcast.broadcastToQueue(e.branchId(), payload);
        broadcast.broadcastToOps(e.branchId(), payload);
        broadcast.broadcastToTicket(e.ticketId(), Map.of(
                "v", 1, "type", "ticket.expired",
                "status", "expired"
        ));
    }
}
