package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketExpired(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID customerId,
        Instant occurredAt
) {}
