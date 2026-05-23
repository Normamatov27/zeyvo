-- Update payment_request.plan CHECK to match the official plan codex:
-- starter, growth, enterprise (removes old 'business' value)
ALTER TABLE app.payment_request
    DROP CONSTRAINT IF EXISTS payment_request_plan_check;

ALTER TABLE app.payment_request
    ADD CONSTRAINT payment_request_plan_check
    CHECK (plan IN ('starter', 'growth', 'enterprise'));

-- Align organization.plan allowed values
ALTER TABLE app.organization
    DROP CONSTRAINT IF EXISTS organization_plan_check;

ALTER TABLE app.organization
    ADD CONSTRAINT organization_plan_check
    CHECK (plan IN ('trial', 'starter', 'growth', 'enterprise'))
    NOT VALID;
