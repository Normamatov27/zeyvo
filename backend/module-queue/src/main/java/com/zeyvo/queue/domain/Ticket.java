package com.zeyvo.queue.domain;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "ticket", schema = "app")
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class Ticket {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(nullable = false)
    private String number;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private short priority;

    @Convert(converter = TicketStatusConverter.class)
    @Column(nullable = false)
    private TicketStatus status;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "called_at")
    private Instant calledAt;

    @Column(name = "serving_at")
    private Instant servingAt;

    @Column(name = "served_at")
    private Instant servedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "window_id")
    private UUID windowId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "device_origin")
    private UUID deviceOrigin;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "rating_stars")
    private Short ratingStars;

    @Column(name = "rating_comment")
    private String ratingComment;

    @Column(name = "arrived_at")
    private Instant arrivedAt;

    @Column(name = "call_count", nullable = false)
    @Builder.Default
    private short callCount = 0;

    @Column(name = "no_show_reason")
    private String noShowReason;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    public void call(UUID windowId, Instant now) {
        this.status = TicketStatus.CALLED;
        this.windowId = windowId;
        this.calledAt = now;
        this.callCount = (short) (this.callCount + 1);
    }

    public void callAgain(Instant now) {
        this.calledAt = now;
        this.callCount = (short) (this.callCount + 1);
    }

    public void confirmArrival(Instant now) {
        this.status = TicketStatus.ARRIVED;
        this.arrivedAt = now;
    }

    public void startServing(Instant now) {
        this.status = TicketStatus.SERVING;
        this.servingAt = now;
        if (this.arrivedAt == null) {
            this.arrivedAt = now;
        }
    }

    public void markServed(Instant now) {
        this.status = TicketStatus.SERVED;
        this.servedAt = now;
        this.closedAt = now;
    }

    public void markNoShow(Instant now, String reason) {
        this.status = TicketStatus.NO_SHOW;
        this.noShowReason = reason;
        this.closedAt = now;
    }

    public void restoreToWaiting(Instant now) {
        this.status = TicketStatus.WAITING;
        this.calledAt = null;
        this.arrivedAt = null;
        this.servingAt = null;
        this.servedAt = null;
        this.closedAt = null;
        this.noShowReason = null;
        this.windowId = null;
        this.callCount = 0;
    }

    public void cancel(Instant now, String reason, UUID by) {
        this.status = TicketStatus.CANCELLED;
        this.cancelReason = reason;
        this.cancelledBy = by;
        this.closedAt = now;
    }

    public void markTransferred(Instant now) {
        this.status = TicketStatus.TRANSFERRED;
        this.closedAt = now;
    }

    /** Legacy no-arg cancel — kept for backward compatibility; reason/by left null. */
    public void cancel(Instant now) {
        cancel(now, null, null);
    }

    /** Legacy no-arg markNoShow — kept for backward compatibility; reason left null. */
    public void markNoShow(Instant now) {
        markNoShow(now, null);
    }
}
