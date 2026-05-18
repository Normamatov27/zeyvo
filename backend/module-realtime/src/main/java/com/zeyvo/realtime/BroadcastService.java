package com.zeyvo.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Fan-out to all STOMP subscribers.
 * Topics:
 *   /topic/branches/{branchId}/queue  — public queue updates (customer + signage)
 *   /topic/branches/{branchId}/ops    — full operator view
 *   /topic/signage/{branchId}         — minimal display update
 *   /user/queue/notifications         — per-user toast
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastService {

    private final SimpMessagingTemplate stomp;

    public void broadcastToQueue(UUID branchId, Map<String, Object> payload) {
        String topic = "/topic/branches/" + branchId + "/queue";
        stomp.convertAndSend(topic, payload);
        log.debug("→ WS {} payload={}", topic, payload.get("type"));
    }

    public void broadcastToOps(UUID branchId, Map<String, Object> payload) {
        stomp.convertAndSend("/topic/branches/" + branchId + "/ops", payload);
    }

    public void broadcastToSignage(UUID branchId, Map<String, Object> payload) {
        stomp.convertAndSend("/topic/signage/" + branchId, payload);
    }

    public void broadcastToTicket(UUID ticketId, Map<String, Object> payload) {
        stomp.convertAndSend("/topic/tickets/" + ticketId, payload);
    }

    public void notifyUser(String userId, Map<String, Object> payload) {
        stomp.convertAndSendToUser(userId, "/queue/notifications", payload);
    }
}
