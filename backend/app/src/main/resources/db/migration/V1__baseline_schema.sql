-- zeyvo baseline schema
-- V1 — Creates schemas + core OLTP tables.
-- Extensions installed via Docker init script (earthdistance, pgcrypto, timescaledb).

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS analytics;

SET search_path TO app, public;

-- ── Organization (tenant) ─────────────────────────────────────────────────────
CREATE TABLE app.organization (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text        UNIQUE NOT NULL,
    name        text        NOT NULL,
    country     text        NOT NULL DEFAULT 'UZ',
    locale      text        NOT NULL DEFAULT 'uz',
    plan        text        NOT NULL DEFAULT 'trial'
                            CHECK (plan IN ('trial','starter','growth','enterprise')),
    active      boolean     NOT NULL DEFAULT true,
    settings    jsonb       NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- ── User account ──────────────────────────────────────────────────────────────
CREATE TABLE app.user_account (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        REFERENCES app.organization(id) ON DELETE SET NULL,
    email           text,
    phone           text        UNIQUE,
    telegram_id     bigint      UNIQUE,
    full_name       text,
    locale          text        NOT NULL DEFAULT 'uz',
    avatar_url      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    UNIQUE (organization_id, email)
);
CREATE INDEX ON app.user_account (organization_id);

CREATE TABLE app.user_role (
    user_id         uuid NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES app.organization(id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('customer','operator','manager','org_admin','super_admin')),
    branch_id       uuid,
    granted_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, organization_id, role)
);
CREATE INDEX ON app.user_role (user_id);
CREATE INDEX ON app.user_role (organization_id, role);

CREATE TABLE app.session (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    refresh_hash    text        NOT NULL UNIQUE,
    issued_at       timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz,
    ip              inet,
    user_agent      text
);
CREATE INDEX ON app.session (user_id, expires_at);
CREATE INDEX ON app.session (refresh_hash) WHERE revoked_at IS NULL;

CREATE TABLE app.otp (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       text        NOT NULL,
    code_hash   text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '5 minutes',
    used_at     timestamptz,
    attempts    int         NOT NULL DEFAULT 0
);
CREATE INDEX ON app.otp (phone, expires_at);

-- ── Branch & catalog ──────────────────────────────────────────────────────────
CREATE TABLE app.branch (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES app.organization(id),
    slug            text        NOT NULL,
    name            text        NOT NULL,
    short_name      text,
    type            text        NOT NULL DEFAULT 'general',
    address         text,
    lat             double precision,
    lng             double precision,
    timezone        text        NOT NULL DEFAULT 'Asia/Tashkent',
    capacity        int         NOT NULL DEFAULT 100,
    active          boolean     NOT NULL DEFAULT true,
    settings        jsonb       NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, slug)
);
CREATE INDEX ON app.branch (organization_id) WHERE active;

CREATE TABLE app.service (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       uuid        NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    code            char(1)     NOT NULL,
    name            text        NOT NULL,
    name_i18n       jsonb       NOT NULL DEFAULT '{}',
    avg_duration_s  int         NOT NULL DEFAULT 300,
    priority        smallint    NOT NULL DEFAULT 0,
    active          boolean     NOT NULL DEFAULT true,
    display_order   smallint    NOT NULL DEFAULT 0,
    UNIQUE (branch_id, code)
);
CREATE INDEX ON app.service (branch_id) WHERE active;

CREATE TABLE app.window_desk (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       uuid        NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    number          smallint    NOT NULL,
    label           text,
    status          text        NOT NULL DEFAULT 'closed'
                                CHECK (status IN ('open','idle','closed','paused')),
    operator_id     uuid        REFERENCES app.user_account(id) ON DELETE SET NULL,
    service_codes   char(1)[]   NOT NULL DEFAULT '{}',
    UNIQUE (branch_id, number)
);
CREATE INDEX ON app.window_desk (branch_id);
CREATE INDEX ON app.window_desk (operator_id) WHERE status = 'open';

CREATE TABLE app.operating_hours (
    branch_id   uuid        NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    day_of_week smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_at     time        NOT NULL,
    close_at    time        NOT NULL,
    PRIMARY KEY (branch_id, day_of_week)
);

-- Add serving_ticket to window_desk after ticket table is created (deferred FK)
-- The column is defined here, FK constraint added below after ticket table exists.
ALTER TABLE app.window_desk ADD COLUMN IF NOT EXISTS serving_ticket uuid;

-- ── Ticket (core queue entity) ────────────────────────────────────────────────
CREATE TABLE app.ticket (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES app.organization(id),
    branch_id       uuid        NOT NULL REFERENCES app.branch(id),
    service_id      uuid        NOT NULL REFERENCES app.service(id),
    number          text        NOT NULL,
    customer_id     uuid        REFERENCES app.user_account(id) ON DELETE SET NULL,
    source          text        NOT NULL
                                CHECK (source IN ('remote','walk_in','kiosk','telegram','agent','legacy_bridge')),
    priority        smallint    NOT NULL DEFAULT 0,
    status          text        NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting','called','serving','served','no_show','cancelled','expired','transferred')),
    joined_at       timestamptz NOT NULL DEFAULT now(),
    called_at       timestamptz,
    serving_at      timestamptz,
    served_at       timestamptz,
    closed_at       timestamptz,
    window_id       uuid        REFERENCES app.window_desk(id) ON DELETE SET NULL,
    device_origin   uuid,
    metadata        jsonb       NOT NULL DEFAULT '{}',
    idempotency_key text        UNIQUE
);
-- Hot path: find active tickets for a branch
CREATE INDEX ON app.ticket (branch_id, status, joined_at)
    WHERE status IN ('waiting','called','serving');
CREATE INDEX ON app.ticket (customer_id, joined_at DESC)
    WHERE customer_id IS NOT NULL;
CREATE INDEX ON app.ticket (window_id)
    WHERE status IN ('called','serving');
CREATE INDEX ON app.ticket (organization_id, joined_at DESC);

-- Now safe to add the deferred FK from window_desk.serving_ticket → ticket
ALTER TABLE app.window_desk
    ADD CONSTRAINT fk_window_serving_ticket
    FOREIGN KEY (serving_ticket) REFERENCES app.ticket(id)
    ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ── Devices ───────────────────────────────────────────────────────────────────
CREATE TABLE app.device (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       uuid        NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    kind            text        NOT NULL
                                CHECK (kind IN ('kiosk','signage','window_display','printer','legacy_bridge')),
    adapter         text        NOT NULL,
    config          jsonb       NOT NULL DEFAULT '{}',
    api_token_hash  text        NOT NULL,
    last_seen_at    timestamptz,
    status          text        NOT NULL DEFAULT 'unknown'
                                CHECK (status IN ('online','offline','unknown','error')),
    capabilities    text[]      NOT NULL DEFAULT '{}'
);
CREATE INDEX ON app.device (branch_id);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE app.notification_delivery (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        REFERENCES app.user_account(id) ON DELETE CASCADE,
    channel         text        NOT NULL CHECK (channel IN ('telegram','push','sms','email')),
    template_key    text        NOT NULL,
    payload         jsonb       NOT NULL DEFAULT '{}',
    status          text        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued','sent','failed','cancelled')),
    attempts        int         NOT NULL DEFAULT 0,
    scheduled_at    timestamptz NOT NULL DEFAULT now(),
    sent_at         timestamptz,
    error           text
);
CREATE INDEX ON app.notification_delivery (status, scheduled_at)
    WHERE status IN ('queued','failed');

-- ── Audit log ─────────────────────────────────────────────────────────────────
CREATE TABLE app.audit_event (
    id              bigserial   PRIMARY KEY,
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    organization_id uuid,
    actor_user_id   uuid,
    actor_role      text,
    action          text        NOT NULL,
    target_type     text,
    target_id       uuid,
    ip              inet,
    trace_id        text,
    data            jsonb       NOT NULL DEFAULT '{}'
);
CREATE INDEX ON app.audit_event (organization_id, occurred_at DESC);
CREATE INDEX ON app.audit_event (action, occurred_at DESC);

-- ── Analytics (TimescaleDB hypertable) ───────────────────────────────────────
CREATE TABLE analytics.ticket_event (
    occurred_at     timestamptz NOT NULL,
    organization_id uuid        NOT NULL,
    branch_id       uuid        NOT NULL,
    service_id      uuid        NOT NULL,
    ticket_id       uuid        NOT NULL,
    event_type      text        NOT NULL,
    source          text,
    window_id       uuid,
    wait_seconds    int,
    service_seconds int,
    data            jsonb
);
-- NOTE: SELECT create_hypertable('analytics.ticket_event', 'occurred_at')
-- must be run AFTER TimescaleDB extension is loaded (handled by postgres init script).

-- ── Ticket counter (atomic sequential numbers per branch+service code) ──────
CREATE TABLE app.ticket_counter (
    branch_id    uuid    NOT NULL REFERENCES app.branch(id) ON DELETE CASCADE,
    service_code char(1) NOT NULL,
    next_val     int     NOT NULL DEFAULT 101,
    PRIMARY KEY (branch_id, service_code)
);

