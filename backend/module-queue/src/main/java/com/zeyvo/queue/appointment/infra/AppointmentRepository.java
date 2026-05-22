package com.zeyvo.queue.appointment.infra;

import com.zeyvo.queue.appointment.domain.Appointment;
import com.zeyvo.queue.appointment.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByCustomerIdOrderByScheduledAtDesc(UUID customerId);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.branchId = :branchId
          AND a.scheduledAt >= :from
          AND a.scheduledAt < :to
        ORDER BY a.scheduledAt ASC
        """)
    List<Appointment> findByBranchAndRange(
            @Param("branchId") UUID branchId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
        SELECT COUNT(a) FROM Appointment a
        WHERE a.branchId = :branchId
          AND a.scheduledAt = :slot
          AND a.serviceId = :serviceId
          AND a.providerId IS NULL
          AND a.status NOT IN (com.zeyvo.queue.appointment.domain.AppointmentStatus.CANCELLED)
        """)
    long countBookedAtSlotNoProvider(
            @Param("branchId") UUID branchId,
            @Param("slot") Instant slot,
            @Param("serviceId") UUID serviceId);

    @Query("""
        SELECT COUNT(a) FROM Appointment a
        WHERE a.branchId = :branchId
          AND a.scheduledAt = :slot
          AND a.providerId = :providerId
          AND a.status NOT IN (com.zeyvo.queue.appointment.domain.AppointmentStatus.CANCELLED)
        """)
    long countBookedAtSlotForProvider(
            @Param("branchId") UUID branchId,
            @Param("slot") Instant slot,
            @Param("providerId") UUID providerId);

    @Query("""
        SELECT COUNT(a) FROM Appointment a
        WHERE a.branchId = :branchId
          AND a.scheduledAt = :slot
          AND a.serviceId = :serviceId
          AND a.status = :status
        """)
    long countBookedAtSlot(
            @Param("branchId") UUID branchId,
            @Param("slot") Instant slot,
            @Param("serviceId") UUID serviceId,
            @Param("status") AppointmentStatus status);

    @Query("""
        SELECT a.scheduledAt FROM Appointment a
        WHERE a.branchId = :branchId
          AND a.scheduledAt >= :from
          AND a.scheduledAt < :to
          AND a.status = :status
        """)
    List<Instant> findBookedSlots(
            @Param("branchId") UUID branchId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("status") AppointmentStatus status);
}
