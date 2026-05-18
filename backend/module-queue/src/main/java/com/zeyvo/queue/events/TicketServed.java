package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketServed(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID serviceId,
        UUID windowId,
        UUID customerId,
        long waitSeconds,
        long serviceSeconds,
        Instant occurredAt
) {}
