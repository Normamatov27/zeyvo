CREATE TABLE app.page_view (
    id          bigserial   PRIMARY KEY,
    path        text        NOT NULL,
    visited_at  timestamptz NOT NULL DEFAULT now(),
    ip          inet,
    referrer    text
);
CREATE INDEX ON app.page_view (visited_at);
CREATE INDEX ON app.page_view (path, visited_at);
