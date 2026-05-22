-- V8 — Appointments overhaul: providers, schedules, extended lifecycle, waitlist

-- 1. Provider (doctor / specialist)
CREATE TABLE app.provider (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES app.organization(id) ON DELETE CASCADE,
    full_name       text        NOT NULL,
    specialty       text,
    bio             text,
    avatar_url      text,
    active          boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON app.provider (organization_id, active);

-- 2. Provider ↔ branch (a doctor can work at multiple branches)
CREATE TABLE app.provider_branch (
    provider_id uuid NOT NULL REFERENCES app.provider(id) ON DELETE CASCADE,
    branch_id   uuid NOT NULL REFERENCES app.branch(id)  ON DELETE CASCADE,
    PRIMARY KEY (provider_id, branch_id)
);

-- 3. Repeating weekly schedule per provider per branch
CREATE TABLE app.provider_schedule (
    id                uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id       uuid     NOT NULL REFERENCES app.provider(id) ON DELETE CASCADE,
    branch_id         uuid     NOT NULL REFERENCES app.branch(id)   ON DELETE CASCADE,
    day_of_week       smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=Monday
    start_time        time     NOT NULL,
    end_time          time     NOT NULL,
    slot_duration_min smallint NOT NULL DEFAULT 15,
    UNIQUE (provider_id, branch_id, day_of_week)
);

-- 4. Break windows within a schedule day
CREATE TABLE app.provider_break (
    id          uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid     NOT NULL REFERENCES app.provider(id) ON DELETE CASCADE,
    branch_id   uuid     NOT NULL REFERENCES app.branch(id)   ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    break_start time     NOT NULL,
    break_end   time     NOT NULL
);

-- 5. Extend appointment: provider, type, priority, lifecycle timestamps
ALTER TABLE app.appointment
    ADD COLUMN provider_id      uuid        REFERENCES app.provider(id) ON DELETE SET NULL,
    ADD COLUMN appointment_type text        NOT NULL DEFAULT 'standard'
                                            CHECK (appointment_type IN ('standard','emergency','follow_up','walk_in')),
    ADD COLUMN priority         smallint    NOT NULL DEFAULT 0,
    ADD COLUMN check_in_at      timestamptz,
    ADD COLUMN patient_note     text,
    ADD COLUMN reminder_sent_at timestamptz;

-- 6. Widen status CHECK to include full lifecycle
ALTER TABLE app.appointment DROP CONSTRAINT appointment_status_check;
ALTER TABLE app.appointment ADD CONSTRAINT appointment_status_check
    CHECK (status IN ('booked','confirmed','checked_in','in_progress','no_show','served','cancelled'));

-- 7. Waitlist
CREATE TABLE app.appointment_waitlist (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      uuid        NOT NULL REFERENCES app.branch(id)   ON DELETE CASCADE,
    service_id     uuid        NOT NULL REFERENCES app.service(id)  ON DELETE CASCADE,
    provider_id    uuid        REFERENCES app.provider(id) ON DELETE SET NULL,
    customer_id    uuid        NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    preferred_date date        NOT NULL,
    notified_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON app.appointment_waitlist (branch_id, preferred_date, notified_at NULLS FIRST);

-- 8. Replace the old UNIQUE constraint with provider-aware indexes
ALTER TABLE app.appointment DROP CONSTRAINT IF EXISTS appointment_branch_id_scheduled_at_service_id_key;

-- When a provider is assigned: unique per (branch, provider, slot)
CREATE UNIQUE INDEX appointment_provider_slot_unique
    ON app.appointment (branch_id, provider_id, scheduled_at)
    WHERE provider_id IS NOT NULL AND status NOT IN ('cancelled');

-- When no provider: keep old per (branch, slot, service) uniqueness
CREATE UNIQUE INDEX appointment_no_provider_slot_unique
    ON app.appointment (branch_id, scheduled_at, service_id)
    WHERE provider_id IS NULL AND status NOT IN ('cancelled');
