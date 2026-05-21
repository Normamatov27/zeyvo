package com.zeyvo.platform.onboarding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Public self-service org onboarding payload. Optional fields (orgSlug, country,
 * locale, firstBranchName) may be null; null orgSlug is auto-derived from orgName.
 */
public record OnboardingRequest(
        @NotBlank @Size(min = 2, max = 80) String orgName,
        @Pattern(regexp = "[a-z0-9-]{3,40}", message = "Slug must be 3-40 lowercase letters, digits, or hyphens") String orgSlug,
        @Size(min = 2, max = 2) String country,
        @Size(min = 2, max = 5) String locale,
        @NotBlank @Pattern(regexp = "\\+[0-9]{7,15}", message = "Phone must be E.164 (e.g. +99890XXXXXXX)") String phone,
        @NotBlank @Size(min = 2, max = 120) String fullName,
        @Size(max = 80) String firstBranchName
) {}
