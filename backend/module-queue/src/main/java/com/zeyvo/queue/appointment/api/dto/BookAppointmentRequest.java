package com.zeyvo.queue.appointment.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record BookAppointmentRequest(
        @NotNull UUID branchId,
        @NotNull UUID serviceId,
        @NotNull Instant scheduledAt,
        UUID providerId,
        String appointmentType,
        String patientNote
) {}
