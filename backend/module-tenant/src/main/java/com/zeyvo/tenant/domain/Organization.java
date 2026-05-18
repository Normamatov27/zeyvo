package com.zeyvo.tenant.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "organization", schema = "app")
@Getter @Setter @NoArgsConstructor @Builder @AllArgsConstructor
public class Organization {

    @Id
    private UUID id;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String country = "UZ";

    @Column(nullable = false)
    private String locale = "uz";

    @Column(nullable = false)
    private String plan = "trial";

    @Column(nullable = false)
    private boolean active = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> settings = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
