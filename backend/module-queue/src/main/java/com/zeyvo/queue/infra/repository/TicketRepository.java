package com.zeyvo.queue.infra.repository;

import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.domain.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    @Query("""
            SELECT t FROM Ticket t
            WHERE t.branchId = :branchId
              AND t.status IN (com.zeyvo.queue.domain.TicketStatus.WAITING,
                               com.zeyvo.queue.domain.TicketStatus.CALLED,
                               com.zeyvo.queue.domain.TicketStatus.ARRIVED,
                               com.zeyvo.queue.domain.TicketStatus.SERVING)
            ORDER BY t.joinedAt ASC
            """)
    List<Ticket> findActiveByBranch(UUID branchId);

    @Query("""
            SELECT COUNT(t) FROM Ticket t
            WHERE t.branchId = :branchId
              AND t.status IN (com.zeyvo.queue.domain.TicketStatus.WAITING,
                               com.zeyvo.queue.domain.TicketStatus.CALLED,
                               com.zeyvo.queue.domain.TicketStatus.ARRIVED,
                               com.zeyvo.queue.domain.TicketStatus.SERVING)
            """)
    int countActiveByBranch(UUID branchId);

    @Query("""
            SELECT COUNT(t) FROM Ticket t
            WHERE t.customerId = :customerId
              AND t.branchId = :branchId
              AND t.status IN (com.zeyvo.queue.domain.TicketStatus.WAITING,
                               com.zeyvo.queue.domain.TicketStatus.CALLED,
                               com.zeyvo.queue.domain.TicketStatus.ARRIVED,
                               com.zeyvo.queue.domain.TicketStatus.SERVING)
            """)
    int countActiveByCustomerAndBranch(UUID customerId, UUID branchId);

    Optional<Ticket> findByWindowIdAndStatus(UUID windowId, TicketStatus status);

    List<Ticket> findByCustomerIdOrderByJoinedAtDesc(UUID customerId);

    @Query("""
            SELECT t FROM Ticket t
            WHERE t.status = com.zeyvo.queue.domain.TicketStatus.CALLED
              AND t.calledAt < :cutoff
            """)
    List<Ticket> findExpiredCalled(@Param("cutoff") Instant cutoff);
}
