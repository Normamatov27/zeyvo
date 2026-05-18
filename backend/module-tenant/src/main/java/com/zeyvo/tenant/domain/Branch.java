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
@Table(name = "branch", schema = "app")
@Getter @Setter @NoArgsConstructor @Builder @AllArgsConstructor
public class Branch {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Builder.Default
    @Column(nullable = false)
    private String type = "general";

    private String address;

    private Double lat;

    private Double lng;

    @Builder.Default
    @Column(nullable = false)
    private String timezone = "Asia/Tashkent";

    @Builder.Default
    @Column(nullable = false)
    private int capacity = 100;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> settings = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
