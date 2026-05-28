package com.zeyvo.queue.domain;

public enum QueueCommand {
    JOIN_QUEUE,
    CALL_NEXT,
    CALL_AGAIN,
    CONFIRM_ARRIVAL,
    START_SERVING,
    FINISH_SERVING,
    MARK_NO_SHOW,
    RESTORE_NO_SHOW,
    CANCEL_BY_CUSTOMER,
    CANCEL_BY_STAFF,
    TRANSFER_SERVICE,
    PIN_WINDOW,
    SET_PRIORITY,
    EXPIRE
}
