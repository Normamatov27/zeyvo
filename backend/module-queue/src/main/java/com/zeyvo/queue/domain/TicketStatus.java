package com.zeyvo.queue.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TicketStatus {
    WAITING, CALLED, ARRIVED, SERVING, SERVED, NO_SHOW, CANCELLED, EXPIRED, TRANSFERRED;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static TicketStatus fromValue(String value) {
        return valueOf(value.toUpperCase());
    }

    public boolean isTerminal() {
        return switch (this) {
            case SERVED, NO_SHOW, CANCELLED, EXPIRED, TRANSFERRED -> true;
            default -> false;
        };
    }

    public boolean isActive() {
        return switch (this) {
            case WAITING, CALLED, ARRIVED, SERVING -> true;
            default -> false;
        };
    }
}
