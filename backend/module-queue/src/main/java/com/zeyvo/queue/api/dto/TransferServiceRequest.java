package com.zeyvo.queue.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TransferServiceRequest(@NotNull UUID toServiceId) {}
