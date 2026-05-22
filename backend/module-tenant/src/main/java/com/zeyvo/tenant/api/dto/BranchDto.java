package com.zeyvo.tenant.api.dto;

import com.zeyvo.tenant.domain.Branch;

import java.util.UUID;

public record BranchDto(
        UUID id,
        UUID organizationId,
        String orgName,
        String slug,
        String name,
        String shortName,
        String type,
        String address,
        Double lat,
        Double lng,
        String timezone,
        int capacity,
        boolean active,
        int activeTickets,
        int openWindows,
        int avgServiceS
) {
    public static BranchDto from(Branch b) {
        return new BranchDto(b.getId(), b.getOrganizationId(), null, b.getSlug(),
                b.getName(), b.getShortName(), b.getType(), b.getAddress(),
                b.getLat(), b.getLng(), b.getTimezone(), b.getCapacity(), b.isActive(),
                0, 0, 300);
    }
}
