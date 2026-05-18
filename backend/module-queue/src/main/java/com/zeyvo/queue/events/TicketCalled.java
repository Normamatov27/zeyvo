package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketCalled(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID windowId,
        int windowNumber,
        UUID customerId,
        Instant occurredAt
) {}
