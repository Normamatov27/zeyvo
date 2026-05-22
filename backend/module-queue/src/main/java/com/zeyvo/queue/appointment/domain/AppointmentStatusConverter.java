package com.zeyvo.queue.appointment.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AppointmentStatusConverter implements AttributeConverter<AppointmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(AppointmentStatus attr) {
        return attr == null ? null : attr.value();
    }

    @Override
    public AppointmentStatus convertToEntityAttribute(String col) {
        if (col == null) return null;
        return switch (col) {
            case "booked"    -> AppointmentStatus.BOOKED;
            case "cancelled" -> AppointmentStatus.CANCELLED;
            case "no_show"   -> AppointmentStatus.NO_SHOW;
            case "served"    -> AppointmentStatus.SERVED;
            default          -> throw new IllegalArgumentException("Unknown appointment status: " + col);
        };
    }
}
