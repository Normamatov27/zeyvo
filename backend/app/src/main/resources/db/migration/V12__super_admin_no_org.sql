-- V12: Allow super_admin role rows to exist without an organization binding.
-- Previously user_role had a composite PK (user_id, organization_id, role) which required
-- organization_id to be NOT NULL. This migration replaces it with a surrogate PK + partial unique indexes.

-- Step 1: Drop the composite PK
ALTER TABLE app.user_role DROP CONSTRAINT IF EXISTS user_role_pkey;

-- Step 2: Add surrogate PK column
ALTER TABLE app.user_role ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
UPDATE app.user_role SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE app.user_role ALTER COLUMN id SET NOT NULL;
ALTER TABLE app.user_role ADD PRIMARY KEY (id);

-- Step 3: Make organization_id nullable
ALTER TABLE app.user_role ALTER COLUMN organization_id DROP NOT NULL;

-- Step 4: Preserve uniqueness via partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS user_role_user_org_role_unique
    ON app.user_role (user_id, organization_id, role)
    WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_role_user_no_org_role_unique
    ON app.user_role (user_id, role)
    WHERE organization_id IS NULL;

-- Step 5: Detach super_admin role rows from any placeholder org
UPDATE app.user_role SET organization_id = NULL WHERE role = 'super_admin';

-- Step 6: Clear user_account.organization_id for pure super admins
-- (users whose ONLY non-customer role is super_admin)
UPDATE app.user_account SET organization_id = NULL
WHERE id IN (
  SELECT user_id FROM app.user_role
  GROUP BY user_id
  HAVING bool_and(role = 'super_admin')
);
