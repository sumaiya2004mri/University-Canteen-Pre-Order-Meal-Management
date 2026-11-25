-- ------------------------------------------------------------
-- 11_extend_users.sql
-- Add department for students and activation flag for staff
-- ------------------------------------------------------------

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
