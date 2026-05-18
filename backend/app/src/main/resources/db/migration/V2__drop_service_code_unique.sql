-- Multiple services can share the same code prefix (e.g. "A" for both
-- "Open an account" and "Card replacement" — tickets print as A-001, A-002).
-- The unique constraint on (branch_id, code) is too strict.
ALTER TABLE app.service DROP CONSTRAINT IF EXISTS service_branch_id_code_key;
