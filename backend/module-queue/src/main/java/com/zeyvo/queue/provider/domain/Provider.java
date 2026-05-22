package com.zeyvo.queue.provider.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "provider", schema = "app")
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class Provider {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column
    private String specialty;

    @Column
    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
