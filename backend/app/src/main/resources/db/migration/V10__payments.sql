-- Payment requests for plan upgrades (P2P bank transfer, confirmed by super_admin)
CREATE TABLE app.payment_request (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       uuid        NOT NULL REFERENCES app.organization(id) ON DELETE CASCADE,
    plan         text        NOT NULL CHECK (plan IN ('growth','business')),
    amount       numeric     NOT NULL,
    currency     text        NOT NULL DEFAULT 'UZS' CHECK (currency IN ('UZS','USD')),
    tx_ref       text,                        -- transaction reference / last 4 digits customer provides
    note         text,
    status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    reviewed_at  timestamptz,
    reviewed_by  uuid        REFERENCES app.user_account(id) ON DELETE SET NULL
);
CREATE INDEX ON app.payment_request (org_id, created_at DESC);
CREATE INDEX ON app.payment_request (status, created_at DESC);
