-- Optimistic locking column for app.ticket.
-- Prevents double-serve and double-no-show races: two concurrent markServed()
-- calls on the same ticket will both read version=N, but only the first UPDATE
-- (version=N+1 WHERE version=N) wins; the second gets a 0-row result and
-- Hibernate throws OptimisticLockException → 409.
ALTER TABLE app.ticket
    ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
