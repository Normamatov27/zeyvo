package com.zeyvo.tenant.api.dto;

public record UpdateServiceRequest(
        String name,
        Integer avgDurationS,
        Short priority,
        Short displayOrder
) {}
