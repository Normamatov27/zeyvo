-- ShedLock table — prevents double-firing of @Scheduled jobs on multi-instance deploys
CREATE TABLE IF NOT EXISTS public.shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMPTZ  NOT NULL,
    locked_at  TIMESTAMPTZ  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

-- Faster actor-based audit queries (e.g. "show me everything user X did")
CREATE INDEX IF NOT EXISTS idx_audit_event_actor
    ON app.audit_event (actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;
