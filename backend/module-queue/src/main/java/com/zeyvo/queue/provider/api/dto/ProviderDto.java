package com.zeyvo.queue.provider.api.dto;

import com.zeyvo.queue.provider.domain.Provider;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProviderDto(
        UUID id,
        UUID organizationId,
        String fullName,
        String specialty,
        String bio,
        String avatarUrl,
        boolean active,
        Instant createdAt,
        List<UUID> branchIds,
        List<ScheduleSlotDto> schedule
) {
    public static ProviderDto from(Provider p) {
        return new ProviderDto(p.getId(), p.getOrganizationId(), p.getFullName(),
                p.getSpecialty(), p.getBio(), p.getAvatarUrl(), p.isActive(), p.getCreatedAt(),
                null, null);
    }

    public static ProviderDto withBranches(Provider p, List<UUID> branchIds, List<ScheduleSlotDto> schedule) {
        return new ProviderDto(p.getId(), p.getOrganizationId(), p.getFullName(),
                p.getSpecialty(), p.getBio(), p.getAvatarUrl(), p.isActive(), p.getCreatedAt(),
                branchIds, schedule);
    }
}
