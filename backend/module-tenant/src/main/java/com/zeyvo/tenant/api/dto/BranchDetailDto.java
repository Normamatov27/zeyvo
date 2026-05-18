package com.zeyvo.tenant.api.dto;

import java.util.List;
import java.util.UUID;

public record BranchDetailDto(
        UUID id,
        UUID organizationId,
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
        List<ServiceDto> services,
        List<WindowDeskDto> windows,
        int activeTickets,
        int openWindows,
        int avgServiceS
) {}
