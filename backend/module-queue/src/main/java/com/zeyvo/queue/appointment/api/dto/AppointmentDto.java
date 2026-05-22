package com.zeyvo.queue.appointment.api.dto;

import com.zeyvo.queue.appointment.domain.Appointment;
import com.zeyvo.queue.appointment.domain.AppointmentStatus;

import java.time.Instant;
import java.util.UUID;

public record AppointmentDto(
        UUID id,
        UUID branchId,
        UUID serviceId,
        UUID customerId,
        Instant scheduledAt,
        int durationSeconds,
        AppointmentStatus status,
        UUID ticketId,
        String notes,
        Instant createdAt,
        // enriched
        String branchName,
        String serviceName
) {
    public static AppointmentDto from(Appointment a) {
        return new AppointmentDto(
                a.getId(), a.getBranchId(), a.getServiceId(), a.getCustomerId(),
                a.getScheduledAt(), a.getDurationSeconds(), a.getStatus(),
                a.getTicketId(), a.getNotes(), a.getCreatedAt(),
                null, null
        );
    }

    public static AppointmentDto fromEnriched(Appointment a, String branchName, String serviceName) {
        return new AppointmentDto(
                a.getId(), a.getBranchId(), a.getServiceId(), a.getCustomerId(),
                a.getScheduledAt(), a.getDurationSeconds(), a.getStatus(),
                a.getTicketId(), a.getNotes(), a.getCreatedAt(),
                branchName, serviceName
        );
    }
}
