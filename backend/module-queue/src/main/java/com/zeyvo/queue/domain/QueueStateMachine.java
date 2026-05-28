package com.zeyvo.queue.domain;

import com.zeyvo.common.web.DomainException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Single source of truth for legal ticket state transitions.
 * All command handlers must call assertLegal() before mutating ticket status.
 *
 * Transition table:
 *   joinQueue         ∅           → WAITING
 *   callNext          WAITING     → CALLED
 *   callAgain         CALLED      → CALLED
 *   confirmArrival    CALLED      → ARRIVED
 *   startServing      CALLED      → SERVING
 *   startServing      ARRIVED     → SERVING
 *   finishServing     SERVING     → SERVED
 *   markNoShow        CALLED      → NO_SHOW   (CALLED only — not ARRIVED or SERVING)
 *   restoreNoShow     NO_SHOW     → WAITING
 *   cancelByCustomer  WAITING     → CANCELLED
 *   cancelByCustomer  CALLED      → CANCELLED
 *   cancelByStaff     WAITING     → CANCELLED
 *   cancelByStaff     CALLED      → CANCELLED
 *   cancelByStaff     ARRIVED     → CANCELLED
 *   cancelByStaff     SERVING     → CANCELLED
 *   transferService   WAITING     → TRANSFERRED
 *   transferService   CALLED      → TRANSFERRED
 *   transferService   ARRIVED     → TRANSFERRED
 *   pinWindow         WAITING     → WAITING
 *   setPriority       WAITING     → WAITING
 *   expire            WAITING     → EXPIRED
 *
 * Illegal (regression guards enforced here):
 *   WAITING  → SERVED  (must pass SERVING)
 *   CALLED   → SERVED  (must pass SERVING)
 *   ARRIVED  → NO_SHOW (no-show only from CALLED)
 *   SERVING  → NO_SHOW (same)
 *   any terminal → any non-terminal (except restoreNoShow)
 */
@Component
public class QueueStateMachine {

    private static final Map<QueueCommand, Set<TicketStatus>> LEGAL_FROM = Map.ofEntries(
            Map.entry(QueueCommand.CALL_NEXT,         Set.of(TicketStatus.WAITING)),
            Map.entry(QueueCommand.CALL_AGAIN,        Set.of(TicketStatus.CALLED)),
            Map.entry(QueueCommand.CONFIRM_ARRIVAL,   Set.of(TicketStatus.CALLED)),
            Map.entry(QueueCommand.START_SERVING,     Set.of(TicketStatus.CALLED, TicketStatus.ARRIVED)),
            Map.entry(QueueCommand.FINISH_SERVING,    Set.of(TicketStatus.SERVING)),
            Map.entry(QueueCommand.MARK_NO_SHOW,      Set.of(TicketStatus.CALLED)),
            Map.entry(QueueCommand.RESTORE_NO_SHOW,   Set.of(TicketStatus.NO_SHOW)),
            Map.entry(QueueCommand.CANCEL_BY_CUSTOMER,Set.of(TicketStatus.WAITING, TicketStatus.CALLED)),
            Map.entry(QueueCommand.CANCEL_BY_STAFF,   Set.of(TicketStatus.WAITING, TicketStatus.CALLED,
                                                              TicketStatus.ARRIVED, TicketStatus.SERVING)),
            Map.entry(QueueCommand.TRANSFER_SERVICE,  Set.of(TicketStatus.WAITING, TicketStatus.CALLED,
                                                              TicketStatus.ARRIVED)),
            Map.entry(QueueCommand.PIN_WINDOW,        Set.of(TicketStatus.WAITING)),
            Map.entry(QueueCommand.SET_PRIORITY,      Set.of(TicketStatus.WAITING)),
            Map.entry(QueueCommand.EXPIRE,            Set.of(TicketStatus.WAITING))
    );

    /**
     * Asserts the command is legal from the ticket's current status.
     * Throws DomainException (409) if illegal.
     */
    public void assertLegal(QueueCommand command, TicketStatus current) {
        Set<TicketStatus> legalFrom = LEGAL_FROM.get(command);
        if (legalFrom == null) {
            // JOIN_QUEUE has no "from" status — always valid at command level
            return;
        }
        if (!legalFrom.contains(current)) {
            throw DomainException.conflict(
                    "queue.illegal_transition",
                    "Cannot execute " + command.name() + " on ticket in status " + current.name() +
                    ". Expected one of: " + legalFrom
            );
        }
    }

    /** Returns true if the transition is legal (non-throwing variant). */
    public boolean isLegal(QueueCommand command, TicketStatus current) {
        Set<TicketStatus> legalFrom = LEGAL_FROM.get(command);
        if (legalFrom == null) return true;
        return legalFrom.contains(current);
    }
}
