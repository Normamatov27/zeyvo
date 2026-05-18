package com.zeyvo.auth.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(schema = "app", name = "user_account")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(name = "telegram_id", unique = true)
    private Long telegramId;

    @Column(name = "full_name")
    private String fullName;

    @Column(nullable = false)
    @Builder.Default
    private String locale = "uz";

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
