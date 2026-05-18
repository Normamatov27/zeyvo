package com.zeyvo.tenant.api.dto;

import com.zeyvo.tenant.domain.QueueService;

import java.util.UUID;

public record ServiceDto(
        UUID id,
        UUID branchId,
        String code,
        String name,
        int avgDurationS,
        short priority,
        boolean active,
        short displayOrder
) {
    public static ServiceDto from(QueueService s) {
        return new ServiceDto(s.getId(), s.getBranchId(), s.getCode(),
                s.getName(), s.getAvgDurationS(), s.getPriority(),
                s.isActive(), s.getDisplayOrder());
    }
}
