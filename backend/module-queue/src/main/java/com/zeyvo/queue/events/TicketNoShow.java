package com.zeyvo.queue.events;

import java.time.Instant;
import java.util.UUID;

public record TicketNoShow(
        UUID ticketId,
        String ticketNumber,
        UUID branchId,
        UUID organizationId,
        UUID windowId,
        Instant occurredAt
) {}
