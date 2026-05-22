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

    @Column(name = "provider_id")
    private UUID providerId;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_s", nullable = false)
    private int durationSeconds;

    @Column(name = "appointment_type", nullable = false)
    @Builder.Default
    private String appointmentType = "standard";

    @Column(nullable = false)
    private short priority;

    @Convert(converter = AppointmentStatusConverter.class)
    @Column(nullable = false)
    private AppointmentStatus status;

    @Column(name = "ticket_id")
    private UUID ticketId;

    @Column
    private String notes;

    @Column(name = "patient_note")
    private String patientNote;

    @Column(name = "check_in_at")
    private Instant checkInAt;

    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public void cancel() {
        this.status = AppointmentStatus.CANCELLED;
    }

    public void confirm() {
        this.status = AppointmentStatus.CONFIRMED;
    }

    public void checkIn() {
        this.status = AppointmentStatus.CHECKED_IN;
        this.checkInAt = Instant.now();
    }

    public void startServing(UUID ticketId) {
        this.status = AppointmentStatus.IN_PROGRESS;
        this.ticketId = ticketId;
    }

    public void complete() {
        this.status = AppointmentStatus.SERVED;
    }

    public void markNoShow() {
        this.status = AppointmentStatus.NO_SHOW;
    }

    public void markReminderSent() {
        this.reminderSentAt = Instant.now();
    }
}
