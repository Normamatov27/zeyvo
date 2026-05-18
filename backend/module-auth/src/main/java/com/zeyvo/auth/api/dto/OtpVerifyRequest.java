package com.zeyvo.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OtpVerifyRequest(
        @NotBlank
        @Pattern(regexp = "\\+998[0-9]{9}")
        String phone,

        @NotBlank
        @Size(min = 6, max = 6, message = "Code must be exactly 6 digits")
        @Pattern(regexp = "[0-9]{6}")
        String code
) {}
