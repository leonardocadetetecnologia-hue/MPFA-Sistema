-- Foundation baseline: no business tables yet (they start in PROMPT 02).
-- pgcrypto provides gen_random_uuid() for UUID primary keys.
-- Rollback: DROP EXTENSION IF EXISTS "pgcrypto"; (only while no table depends on it)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
