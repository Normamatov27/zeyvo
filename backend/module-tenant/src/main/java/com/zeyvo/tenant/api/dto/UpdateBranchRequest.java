package com.zeyvo.tenant.api.dto;

public record UpdateBranchRequest(
        String name,
        String shortName,
        String address,
        Integer capacity,
        String timezone,
        String type
) {}
