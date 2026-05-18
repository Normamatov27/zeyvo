package com.zeyvo.auth.api.dto;

import java.time.Instant;
import java.util.List;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Instant accessExpiresAt,
        String userId,
        String orgId,
        List<String> roles,
        String locale
) {
    /** Return a copy with no refresh token — the token is in the httpOnly cookie. */
    public AuthResponse withoutRefreshToken() {
        return new AuthResponse(accessToken, null, accessExpiresAt, userId, orgId, roles, locale);
    }
}
