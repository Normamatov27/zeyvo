package com.zeyvo.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpRequestRequest(
        @NotBlank
        @Pattern(regexp = "\\+998[0-9]{9}", message = "Phone must be in +998XXXXXXXXX format")
        String phone,

        // "sms" | "telegram" | "whatsapp" | "call" — defaults to "sms"
        String channel
) {
    public OtpRequestRequest {
        if (channel == null || channel.isBlank()) channel = "sms";
    }
}
