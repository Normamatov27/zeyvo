package com.zeyvo.auth.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "refresh_hash", nullable = false, unique = true)
    private String refreshHash;

    @Column(name = "issued_at", updatable = false)
    @Builder.Default
    private Instant issuedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(insertable = false, updatable = false, columnDefinition = "inet")
    private String ip;

    @Column(name = "user_agent")
    private String userAgent;

    public boolean isValid() {
        return revokedAt == null && Instant.now().isBefore(expiresAt);
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
