-- Run once on fresh database — enables required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;  -- for geo distance queries
CREATE EXTENSION IF NOT EXISTS "timescaledb";            -- for analytics hypertables

-- Create the timescaledb hypertable after migration creates the table
-- This is handled by a Spring ApplicationReadyEvent listener in module-analytics
