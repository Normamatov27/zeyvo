package com.zeyvo.tenant.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "service", schema = "app")
@Getter @Setter @NoArgsConstructor @Builder @AllArgsConstructor
public class QueueService {

    @Id
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false, length = 1)
    private String code;

    @Column(nullable = false)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "name_i18n", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> nameI18n = new HashMap<>();

    @Builder.Default
    @Column(name = "avg_duration_s", nullable = false)
    private int avgDurationS = 300;

    @Builder.Default
    @Column(nullable = false)
    private short priority = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private short displayOrder = 0;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }
}
