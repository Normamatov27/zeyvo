package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketCalledAgain(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID windowId,
        int callCount,
        UUID customerId,
        Instant occurredAt
) {}
