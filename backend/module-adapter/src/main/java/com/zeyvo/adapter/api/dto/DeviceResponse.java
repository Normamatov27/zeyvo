package com.zeyvo.adapter.api.dto;

import com.zeyvo.adapter.domain.Device;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DeviceResponse(
        UUID id,
        UUID branchId,
        String kind,
        String adapter,
        String status,
        Instant lastSeenAt,
        Map<String, Object> config   // includes _raw_token only on first register
) {
    public static DeviceResponse from(Device d) {
        return new DeviceResponse(d.getId(), d.getBranchId(), d.getKind(),
                d.getAdapter(), d.getStatus(), d.getLastSeenAt(), d.getConfig());
    }
}
