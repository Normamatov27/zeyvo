package com.zeyvo.platform.onboarding;

public record OnboardingResponse(
        String orgId,
        String orgSlug,
        String userId,
        String channel,
        int expiresInSeconds
) {}
