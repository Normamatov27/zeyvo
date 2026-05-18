package com.zeyvo.common.web;

import java.util.UUID;

/** Per-request tenant. Set from JWT claim by security filter; cleared after response. */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT = new InheritableThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID organizationId) {
        CURRENT.set(organizationId);
    }

    public static UUID get() {
        UUID id = CURRENT.get();
        if (id == null) {
            throw new IllegalStateException("No tenant in context — request not authenticated?");
        }
        return id;
    }

    public static UUID getOrNull() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
