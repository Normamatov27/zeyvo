package com.zeyvo.adapter.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device", schema = "app")
@Getter @Setter @NoArgsConstructor @Builder @AllArgsConstructor
public class Device {

    @Id
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false)
    private String kind;   // kiosk / signage / window_display / printer / sensor / legacy_bridge

    @Column(nullable = false)
    private String adapter; // innomax_http / wavetec_tcp / web_kiosk / web_signage / generic_http

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private java.util.Map<String, Object> config = new java.util.HashMap<>();

    @Column(name = "api_token_hash", nullable = false)
    private String apiTokenHash;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Builder.Default
    @Column(nullable = false)
    private String status = "unknown";

    @Column(columnDefinition = "text[]")
    @Builder.Default
    private String[] capabilities = {};

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public AdapterType adapterType() {
        return switch (adapter) {
            case "innomax_http"  -> AdapterType.INNOMAX_HTTP;
            case "wavetec_tcp"   -> AdapterType.WAVETEC_TCP;
            case "web_kiosk"     -> AdapterType.WEB_KIOSK;
            case "web_signage"   -> AdapterType.WEB_SIGNAGE;
            default              -> AdapterType.GENERIC_HTTP;
        };
    }
}
