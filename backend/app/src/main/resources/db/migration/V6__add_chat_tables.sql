CREATE TABLE app.chat_conversation (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type        text NOT NULL CHECK (type IN ('support', 'org')),
    org_id      uuid REFERENCES app.organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.chat_message (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES app.chat_conversation(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES app.user_account(id),
    sender_role     text NOT NULL,
    content         text NOT NULL,
    sent_at         timestamptz NOT NULL DEFAULT now(),
    read_at         timestamptz
);

CREATE INDEX ON app.chat_message (conversation_id, sent_at);
CREATE INDEX ON app.chat_conversation (customer_id, updated_at DESC);
CREATE INDEX ON app.chat_conversation (org_id, status, updated_at DESC);
CREATE INDEX ON app.chat_conversation (type, status, updated_at DESC);
