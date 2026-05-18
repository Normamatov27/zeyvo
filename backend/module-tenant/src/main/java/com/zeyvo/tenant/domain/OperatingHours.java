package com.zeyvo.tenant.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "operating_hours", schema = "app")
@IdClass(OperatingHoursId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatingHours {

    @Id
    @Column(name = "branch_id")
    private UUID branchId;

    @Id
    @Column(name = "day_of_week")
    private short dayOfWeek;

    @Id
    @Column(name = "open_at")
    private LocalTime openAt;

    @Column(name = "close_at", nullable = false)
    private LocalTime closeAt;
}
