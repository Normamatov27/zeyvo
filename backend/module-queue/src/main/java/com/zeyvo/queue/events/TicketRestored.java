package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketRestored(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID restoredBy,
        Instant occurredAt
) {}
