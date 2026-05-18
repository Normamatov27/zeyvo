package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketCreated(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID serviceId,
        UUID customerId,
        String source,
        int queueSize,
        Instant occurredAt
) {}
