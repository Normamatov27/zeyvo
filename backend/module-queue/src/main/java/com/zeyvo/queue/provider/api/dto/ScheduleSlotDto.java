package com.zeyvo.queue.provider.api.dto;

import java.util.UUID;

public record ScheduleSlotDto(
        UUID branchId,
        int dayOfWeek,
        String startTime,
        String endTime,
        int slotDurationMin
) {}
