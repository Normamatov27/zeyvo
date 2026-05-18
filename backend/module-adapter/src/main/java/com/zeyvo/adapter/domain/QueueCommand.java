package com.zeyvo.adapter.domain;

import java.util.Map;
import java.util.UUID;

/**
 * A normalized command arriving from a hardware device into zeyvo.
 * Adapters translate device-specific messages into this type.
 */
public record QueueCommand(
        CommandType type,
        UUID branchId,
        UUID deviceId,
        String serviceCode,    // for TAKE_TICKET
        String ticketNumber,   // for CALL_NEXT, NO_SHOW
        Map<String, Object> raw
) {
    public enum CommandType {
        TAKE_TICKET,
        CALL_NEXT,
        NO_SHOW,
        SERVE,
        HEARTBEAT
    }
}
