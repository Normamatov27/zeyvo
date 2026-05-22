package com.zeyvo.queue.appointment.domain;

public enum AppointmentStatus {
    BOOKED, CANCELLED, NO_SHOW, SERVED;

    public String value() {
        return name().toLowerCase();
    }
}
