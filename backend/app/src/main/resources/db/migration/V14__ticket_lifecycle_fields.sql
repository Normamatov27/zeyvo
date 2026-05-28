-- Phase 0+1: Full ticket lifecycle support.
-- Adds ARRIVED status, new timestamp/counter columns, and integrity indexes.

-- 1. Add ARRIVED to the status check constraint
ALTER TABLE app.ticket
    DROP CONSTRAINT IF EXISTS ticket_status_check;

ALTER TABLE app.ticket
    ADD CONSTRAINT ticket_status_check
    CHECK (status IN ('waiting','called','arrived','serving','served','no_show','cancelled','expired','transferred'));

-- 2. New lifecycle columns
ALTER TABLE app.ticket
    ADD COLUMN IF NOT EXISTS arrived_at            timestamptz,
    ADD COLUMN IF NOT EXISTS call_count            smallint    NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_show_reason        text,
    ADD COLUMN IF NOT EXISTS cancel_reason         text,
    ADD COLUMN IF NOT EXISTS cancelled_by          uuid        REFERENCES app.user_account(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS near_turn_notified_at timestamptz;

-- 3. Persisted near-turn state (replaces in-memory Set<UUID> in TicketLifecycleScheduler)
--    near_turn_notified_at IS NOT NULL means the notification has been sent;
--    the scheduler skips these tickets.

-- 4. Index: active tickets pinned to a window (for skill-aware callNext)
CREATE INDEX IF NOT EXISTS idx_ticket_window_waiting
    ON app.ticket (window_id, branch_id, priority DESC, joined_at ASC)
    WHERE status = 'waiting' AND window_id IS NOT NULL;

-- 5. Index: quickly find restorable no-shows (staff "missed list" view)
CREATE INDEX IF NOT EXISTS idx_ticket_no_show_recent
    ON app.ticket (branch_id, closed_at DESC)
    WHERE status = 'no_show';

-- 6. Index: arrived tickets waiting for service start
CREATE INDEX IF NOT EXISTS idx_ticket_arrived
    ON app.ticket (branch_id, arrived_at)
    WHERE status = 'arrived';
