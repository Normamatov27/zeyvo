package com.zeyvo.queue.api.dto;

import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.domain.TicketStatus;

import java.time.Instant;
import java.util.UUID;

public record TicketDto(
        UUID id,
        String number,
        UUID branchId,
        UUID serviceId,
        String source,
        TicketStatus status,
        short priority,
        Instant joinedAt,
        Instant calledAt,
        Instant arrivedAt,
        Instant servingAt,
        Instant servedAt,
        UUID windowId,
        Integer windowNumber,
        Integer etaMinutes,
        Integer queuePosition,
        short callCount,
        // enriched fields — null when not fetched
        String serviceName,
        String branchName,
        String windowLabel,
        Short ratingStars
) {
    public static TicketDto from(Ticket t) {
        return new TicketDto(
                t.getId(), t.getNumber(), t.getBranchId(), t.getServiceId(),
                t.getSource(), t.getStatus(), t.getPriority(),
                t.getJoinedAt(), t.getCalledAt(), t.getArrivedAt(),
                t.getServingAt(), t.getServedAt(),
                t.getWindowId(), null, null, null, t.getCallCount(),
                null, null, null, t.getRatingStars()
        );
    }

    public static TicketDto from(Ticket t, Integer eta, Integer position, Integer windowNum) {
        return new TicketDto(
                t.getId(), t.getNumber(), t.getBranchId(), t.getServiceId(),
                t.getSource(), t.getStatus(), t.getPriority(),
                t.getJoinedAt(), t.getCalledAt(), t.getArrivedAt(),
                t.getServingAt(), t.getServedAt(),
                t.getWindowId(), windowNum, eta, position, t.getCallCount(),
                null, null, null, t.getRatingStars()
        );
    }

    public static TicketDto fromEnriched(Ticket t, Integer eta, Integer position, Integer windowNum,
                                         String serviceName, String branchName, String windowLabel) {
        return new TicketDto(
                t.getId(), t.getNumber(), t.getBranchId(), t.getServiceId(),
                t.getSource(), t.getStatus(), t.getPriority(),
                t.getJoinedAt(), t.getCalledAt(), t.getArrivedAt(),
                t.getServingAt(), t.getServedAt(),
                t.getWindowId(), windowNum, eta, position, t.getCallCount(),
                serviceName, branchName, windowLabel, t.getRatingStars()
        );
    }
}
