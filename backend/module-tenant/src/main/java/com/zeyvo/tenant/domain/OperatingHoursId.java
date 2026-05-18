package com.zeyvo.tenant.domain;

import java.io.Serializable;
import java.time.LocalTime;
import java.util.Objects;
import java.util.UUID;

public class OperatingHoursId implements Serializable {
    private UUID branchId;
    private short dayOfWeek;
    private LocalTime openAt;

    public OperatingHoursId() {}
    public OperatingHoursId(UUID branchId, short dayOfWeek, LocalTime openAt) {
        this.branchId = branchId;
        this.dayOfWeek = dayOfWeek;
        this.openAt = openAt;
    }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OperatingHoursId that)) return false;
        return dayOfWeek == that.dayOfWeek && Objects.equals(branchId, that.branchId) && Objects.equals(openAt, that.openAt);
    }
    @Override public int hashCode() { return Objects.hash(branchId, dayOfWeek, openAt); }
}
