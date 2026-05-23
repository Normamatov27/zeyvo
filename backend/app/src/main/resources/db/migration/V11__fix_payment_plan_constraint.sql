-- Update payment_request.plan CHECK to match the official plan codex:
-- trial, starter, growth, enterprise (removes old 'business' value)
ALTER TABLE app.payment_request
    DROP CONSTRAINT payment_request_plan_check;

ALTER TABLE app.payment_request
    ADD CONSTRAINT payment_request_plan_check
    CHECK (plan IN ('starter', 'growth', 'enterprise'));

-- Also align organization.plan allowed values (was unrestricted text)
ALTER TABLE app.organization
    ADD CONSTRAINT organization_plan_check
    CHECK (plan IN ('trial', 'starter', 'growth', 'enterprise'))
    NOT VALID;
