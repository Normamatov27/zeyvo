package com.zeyvo.tenant.api.dto;

import jakarta.validation.constraints.Min;
import java.util.List;

public record CreateWindowRequest(
        @Min(1) int number,
        String label,
        List<String> serviceCodes
) {}
