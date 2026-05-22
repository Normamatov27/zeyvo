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
        UUID providerId,
        Instant scheduledAt,
        int durationSeconds,
        String appointmentType,
        short priority,
        AppointmentStatus status,
        UUID ticketId,
        String notes,
        String patientNote,
        Instant checkInAt,
        Instant createdAt,
        // enriched
        String branchName,
        String serviceName,
        String providerName
) {
    public static AppointmentDto from(Appointment a) {
        return new AppointmentDto(
                a.getId(), a.getBranchId(), a.getServiceId(), a.getCustomerId(), a.getProviderId(),
                a.getScheduledAt(), a.getDurationSeconds(), a.getAppointmentType(), a.getPriority(),
                a.getStatus(), a.getTicketId(), a.getNotes(), a.getPatientNote(), a.getCheckInAt(),
                a.getCreatedAt(), null, null, null
        );
    }

    public static AppointmentDto fromEnriched(Appointment a, String branchName, String serviceName, String providerName) {
        return new AppointmentDto(
                a.getId(), a.getBranchId(), a.getServiceId(), a.getCustomerId(), a.getProviderId(),
                a.getScheduledAt(), a.getDurationSeconds(), a.getAppointmentType(), a.getPriority(),
                a.getStatus(), a.getTicketId(), a.getNotes(), a.getPatientNote(), a.getCheckInAt(),
                a.getCreatedAt(), branchName, serviceName, providerName
        );
    }
}
