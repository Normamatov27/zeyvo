package com.zeyvo.tenant.api.dto;

import com.zeyvo.tenant.domain.OperatingHours;

import java.util.List;

public record OperatingHoursDto(
        int dayOfWeek,   // 0=Sun, 1=Mon … 6=Sat
        String openAt,   // "HH:mm"
        String closeAt   // "HH:mm"
) {
    public static OperatingHoursDto from(OperatingHours oh) {
        return new OperatingHoursDto(
                oh.getDayOfWeek(),
                oh.getOpenAt().toString(),
                oh.getCloseAt().toString()
        );
    }

    public static List<OperatingHoursDto> fromAll(List<OperatingHours> list) {
        return list.stream().map(OperatingHoursDto::from).toList();
    }
}
