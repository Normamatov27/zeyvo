package com.zeyvo.queue.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TicketStatusConverter implements AttributeConverter<TicketStatus, String> {

    @Override
    public String convertToDatabaseColumn(TicketStatus status) {
        return status == null ? null : status.name().toLowerCase();
    }

    @Override
    public TicketStatus convertToEntityAttribute(String dbValue) {
        return dbValue == null ? null : TicketStatus.valueOf(dbValue.toUpperCase());
    }
}
