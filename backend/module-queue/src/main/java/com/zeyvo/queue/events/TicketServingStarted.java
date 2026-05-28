package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketServingStarted(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID windowId,
        UUID customerId,
        Instant occurredAt
) {}
