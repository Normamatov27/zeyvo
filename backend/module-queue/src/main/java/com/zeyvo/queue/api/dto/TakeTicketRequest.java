package com.zeyvo.queue.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TakeTicketRequest(
        @NotNull UUID branchId,
        @NotNull UUID serviceId,
        @NotBlank String serviceCode,
        @NotBlank String source
) {
    public TakeTicketRequest {
        if (source == null) source = "remote";
    }
}
