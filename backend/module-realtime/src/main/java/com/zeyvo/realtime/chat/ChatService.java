package com.zeyvo.realtime.chat;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.realtime.BroadcastService;
import com.zeyvo.realtime.chat.domain.ChatConversation;
import com.zeyvo.realtime.chat.domain.ChatMessage;
import com.zeyvo.realtime.chat.infra.ChatConversationRepository;
import com.zeyvo.realtime.chat.infra.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatConversationRepository convRepo;
    private final ChatMessageRepository msgRepo;
    private final BroadcastService broadcast;

    @Transactional
    public Map<String, Object> sendCustomerMessage(UUID customerId, String type, UUID orgId, String content) {
        ChatConversation conv = orgId != null
            ? convRepo.findByCustomerIdAndOrgIdAndTypeAndStatus(customerId, orgId, type, "open")
                .orElseGet(() -> convRepo.save(ChatConversation.builder()
                    .customerId(customerId).type(type).orgId(orgId).build()))
            : convRepo.findByCustomerIdAndTypeAndStatus(customerId, type, "open")
                .orElseGet(() -> convRepo.save(ChatConversation.builder()
                    .customerId(customerId).type(type).build()));

        ChatMessage msg = msgRepo.save(ChatMessage.builder()
            .conversationId(conv.getId())
            .senderId(customerId)
            .senderRole("customer")
            .content(content)
            .build());

        conv.setUpdatedAt(Instant.now());
        convRepo.save(conv);

        var payload = messagePayload(msg, conv.getId());

        // Notify admins on the appropriate topic
        if ("support".equals(type)) {
            broadcast.broadcastToChat("support", null, payload);
        } else {
            broadcast.broadcastToChat("org", orgId, payload);
        }
        // Notify the customer's personal channel (for echoing)
        broadcast.notifyUserChat(customerId.toString(), payload);

        return payload;
    }

    @Transactional
    public Map<String, Object> sendAdminMessage(UUID convId, UUID senderId, String senderRole, String content) {
        ChatConversation conv = convRepo.findById(convId)
            .orElseThrow(() -> new DomainException("chat.not_found", "Conversation not found", HttpStatus.NOT_FOUND));
        if ("closed".equals(conv.getStatus())) {
            throw new DomainException("chat.closed", "Conversation is already closed", HttpStatus.CONFLICT);
        }

        ChatMessage msg = msgRepo.save(ChatMessage.builder()
            .conversationId(convId)
            .senderId(senderId)
            .senderRole(senderRole)
            .content(content)
            .build());

        conv.setUpdatedAt(Instant.now());
        convRepo.save(conv);

        var payload = messagePayload(msg, convId);

        // Notify the customer
        broadcast.notifyUserChat(conv.getCustomerId().toString(), payload);

        // Notify admins on the appropriate topic (for real-time sync across admin tabs)
        if ("support".equals(conv.getType())) {
            broadcast.broadcastToChat("support", null, payload);
        } else {
            broadcast.broadcastToChat("org", conv.getOrgId(), payload);
        }

        return payload;
    }

    @Transactional
    public void closeConversation(UUID convId) {
        convRepo.findById(convId).ifPresent(conv -> {
            conv.setStatus("closed");
            conv.setUpdatedAt(Instant.now());
            convRepo.save(conv);
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getConversation(UUID customerId, String type, UUID orgId) {
        var conv = orgId != null
            ? convRepo.findByCustomerIdAndOrgIdAndTypeAndStatus(customerId, orgId, type, "open")
            : convRepo.findByCustomerIdAndTypeAndStatus(customerId, type, "open");

        if (conv.isEmpty()) return Map.of("messages", List.of());

        var messages = msgRepo.findByConversationIdOrderBySentAtAsc(conv.get().getId())
            .stream().map(m -> messagePayload(m, conv.get().getId())).toList();

        var result = new LinkedHashMap<String, Object>();
        result.put("conversationId", conv.get().getId().toString());
        result.put("status", conv.get().getStatus());
        result.put("messages", messages);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAdminConversations(String type, UUID orgId) {
        var convs = orgId != null
            ? convRepo.findByOrgIdAndStatusOrderByUpdatedAtDesc(orgId, "open")
            : convRepo.findByTypeAndStatusOrderByUpdatedAtDesc(type, "open");

        return convs.stream().map(c -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("id", c.getId().toString());
            m.put("customerId", c.getCustomerId().toString());
            m.put("type", c.getType());
            m.put("orgId", c.getOrgId() != null ? c.getOrgId().toString() : null);
            m.put("status", c.getStatus());
            m.put("updatedAt", c.getUpdatedAt().toString());
            return (Map<String, Object>) m;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConversationMessages(UUID convId) {
        return msgRepo.findByConversationIdOrderBySentAtAsc(convId)
            .stream().map(m -> messagePayload(m, convId)).toList();
    }

    private Map<String, Object> messagePayload(ChatMessage m, UUID convId) {
        var p = new LinkedHashMap<String, Object>();
        p.put("type", "chat.message");
        p.put("id", m.getId().toString());
        p.put("conversationId", convId.toString());
        p.put("senderId", m.getSenderId().toString());
        p.put("senderRole", m.getSenderRole());
        p.put("content", m.getContent());
        p.put("sentAt", m.getSentAt().toString());
        return p;
    }
}
