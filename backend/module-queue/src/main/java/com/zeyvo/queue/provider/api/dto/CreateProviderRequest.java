package com.zeyvo.queue.provider.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record CreateProviderRequest(
        @NotBlank String fullName,
        String specialty,
        String bio,
        String avatarUrl,
        List<UUID> branchIds
) {}
