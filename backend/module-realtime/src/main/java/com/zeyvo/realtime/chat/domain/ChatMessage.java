package com.zeyvo.realtime.chat.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_message", schema = "app")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "sender_role", nullable = false)
    private String senderRole;

    @Column(nullable = false)
    private String content;

    @Builder.Default
    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    @Column(name = "read_at")
    private Instant readAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }
}
