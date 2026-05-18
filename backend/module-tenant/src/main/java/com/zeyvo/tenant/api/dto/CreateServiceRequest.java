package com.zeyvo.tenant.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateServiceRequest(
        @NotBlank @Size(min = 1, max = 1) String code,
        @NotBlank String name,
        Integer avgDurationS,
        Short priority
) {}
