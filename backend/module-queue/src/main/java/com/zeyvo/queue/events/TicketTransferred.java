package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketTransferred(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID fromServiceId,
        UUID toServiceId,
        UUID newTicketId,
        String newTicketNumber,
        UUID transferredBy,
        Instant occurredAt
) {}
