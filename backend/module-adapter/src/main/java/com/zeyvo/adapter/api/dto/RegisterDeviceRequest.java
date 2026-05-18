package com.zeyvo.adapter.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record RegisterDeviceRequest(
        @NotNull UUID branchId,
        @NotBlank String kind,
        @NotBlank String adapter,
        Map<String, Object> config
) {}
