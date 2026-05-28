package com.zeyvo.common.web;

import java.util.Set;
import java.util.UUID;

/**
 * Typed security principal extracted from a validated JWT.
 * Replaces the raw {@code String} principal that previously broke
 * {@code @AuthenticationPrincipal Principal} injection (String is not Principal).
 */
public record AuthPrincipal(UUID userId, UUID orgId, Set<String> roles) {

    public boolean hasRole(String role) {
        return roles.contains(role.toUpperCase());
    }

    public boolean isSuperAdmin() {
        return hasRole("SUPER_ADMIN");
    }

    /** True if the caller has at least staff-level access (can act on behalf of their org). */
    public boolean isStaff() {
        return hasRole("OPERATOR") || hasRole("MANAGER") || hasRole("ORG_ADMIN") || hasRole("SUPER_ADMIN");
    }
}
