package com.zeyvo.tenant.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "window_desk", schema = "app")
@Getter @Setter @NoArgsConstructor @Builder @AllArgsConstructor
public class WindowDesk {

    @Id
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false)
    private short number;

    private String label;

    @Builder.Default
    @Column(nullable = false)
    private String status = "closed";

    @Column(name = "operator_id")
    private UUID operatorId;

    @Column(name = "serving_ticket")
    private UUID servingTicket;

    // service_codes is char(1)[] in Postgres; stored as text[] for JPA simplicity
    @Builder.Default
    @Column(name = "service_codes", columnDefinition = "char(1)[]")
    private String[] serviceCodes = {};

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public boolean isOpen() {
        return "open".equals(status);
    }

    public boolean handlesService(String code) {
        if (serviceCodes == null || serviceCodes.length == 0) return true;
        for (String c : serviceCodes) {
            if (c.equals(code)) return true;
        }
        return false;
    }
}
