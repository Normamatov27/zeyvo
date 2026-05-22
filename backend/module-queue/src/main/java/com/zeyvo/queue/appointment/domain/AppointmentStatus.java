package com.zeyvo.queue.appointment.domain;

public enum AppointmentStatus {
    BOOKED, CONFIRMED, CHECKED_IN, IN_PROGRESS, NO_SHOW, SERVED, CANCELLED;

    public String value() {
        return name().toLowerCase();
    }
}
