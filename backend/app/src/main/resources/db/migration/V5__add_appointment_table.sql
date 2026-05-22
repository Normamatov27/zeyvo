-- V5 — Appointments: pre-scheduled queue slots
CREATE TABLE app.appointment (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       uuid        NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    service_id      uuid        NOT NULL REFERENCES app.service(id) ON DELETE CASCADE,
    customer_id     uuid        NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    scheduled_at    timestamptz NOT NULL,
    duration_s      int         NOT NULL,
    status          text        NOT NULL DEFAULT 'booked'
                                CHECK (status IN ('booked','cancelled','no_show','served')),
    ticket_id       uuid        REFERENCES app.ticket(id) ON DELETE SET NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (branch_id, scheduled_at, service_id)
);

CREATE INDEX ON app.appointment (customer_id, scheduled_at DESC);
CREATE INDEX ON app.appointment (branch_id, scheduled_at);
CREATE INDEX ON app.appointment (status, scheduled_at) WHERE status = 'booked';
