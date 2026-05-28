package com.zeyvo.common.web;

import java.util.Set;
import java.util.UUID;

/**
 * Unified identity wrapper for every queue command.
 * Carries who is acting, how (channel), and their tenant scope.
 */
public record ActorContext(
        ActorType type,
        UUID userId,
        UUID orgId,
        Set<String> roles,
        String channel,
        UUID deviceId
) {
    public enum ActorType { CUSTOMER, STAFF, SYSTEM, DEVICE }

    public static ActorContext staff(AuthPrincipal p) {
        return new ActorContext(ActorType.STAFF, p.userId(), p.orgId(), p.roles(), "api", null);
    }

    public static ActorContext customer(AuthPrincipal p) {
        return new ActorContext(ActorType.CUSTOMER, p.userId(), p.orgId(), p.roles(), "api", null);
    }

    public static ActorContext anonymous(String channel, UUID deviceId) {
        return new ActorContext(ActorType.CUSTOMER, null, null, Set.of(), channel, deviceId);
    }

    public static ActorContext system(String reason) {
        return new ActorContext(ActorType.SYSTEM, null, null, Set.of(), reason, null);
    }

    public static ActorContext device(UUID deviceId, UUID orgId) {
        return new ActorContext(ActorType.DEVICE, null, orgId, Set.of(), "device", deviceId);
    }

    public boolean isStaff() {
        return type == ActorType.STAFF;
    }

    public boolean isSystem() {
        return type == ActorType.SYSTEM;
    }

    public boolean isCustomer() {
        return type == ActorType.CUSTOMER || type == ActorType.DEVICE;
    }

    public boolean hasRole(String role) {
        return roles.contains(role.toUpperCase());
    }

    public boolean isSuperAdmin() {
        return hasRole("SUPER_ADMIN");
    }
}
