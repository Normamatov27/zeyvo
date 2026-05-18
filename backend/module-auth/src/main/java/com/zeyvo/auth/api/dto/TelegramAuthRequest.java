package com.zeyvo.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record TelegramAuthRequest(
        @NotBlank String initData
) {}
