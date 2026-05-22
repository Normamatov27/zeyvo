package com.zeyvo.realtime.chat.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_conversation", schema = "app")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatConversation {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String type; // "support" | "org"

    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Builder.Default
    @Column(nullable = false)
    private String status = "open";

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }
}
