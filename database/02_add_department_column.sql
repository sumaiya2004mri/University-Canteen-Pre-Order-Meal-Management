-- =============================================================
-- Add "department" column to users table
-- =============================================================
-- This migration adds a nullable department column (VARCHAR) to store
-- the student's department / program name (e.g. "Computer Science and Engineering").
-- Existing rows will retain NULL for this column.

ALTER TABLE IF EXISTS users
ADD COLUMN department VARCHAR(100) NULL;
