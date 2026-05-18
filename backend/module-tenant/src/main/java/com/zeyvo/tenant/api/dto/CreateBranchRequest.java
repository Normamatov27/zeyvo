package com.zeyvo.tenant.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBranchRequest(
        @NotBlank String name,
        String shortName,
        @NotBlank String type,
        String address,
        Integer capacity,
        String timezone
) {}
