package com.zeyvo.queue.appointment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointment", schema = "app")
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class Appointment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_s", nullable = false)
    private int durationSeconds;

    @Convert(converter = AppointmentStatusConverter.class)
    @Column(nullable = false)
    private AppointmentStatus status;

    @Column(name = "ticket_id")
    private UUID ticketId;

    @Column
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public void cancel() {
        this.status = AppointmentStatus.CANCELLED;
    }

    public void checkIn(UUID ticketId) {
        this.status = AppointmentStatus.SERVED;
        this.ticketId = ticketId;
    }

    public void markNoShow() {
        this.status = AppointmentStatus.NO_SHOW;
    }
}
