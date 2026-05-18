package com.zeyvo.auth.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "otp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Otp {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String phone;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    @Builder.Default
    private Instant expiresAt = Instant.now().plusSeconds(300); // 5 minutes

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(nullable = false)
    @Builder.Default
    private int attempts = 0;

    private static final int MAX_ATTEMPTS = 5;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isValid() {
        return !isExpired() && !isUsed() && attempts < MAX_ATTEMPTS;
    }

    public void recordAttempt() {
        this.attempts++;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }
}
