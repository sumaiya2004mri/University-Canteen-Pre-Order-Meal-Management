-- =============================================================
-- RLS policies for the "users" table – using email for identity
-- =============================================================

-- 1️⃣ Enable Row Level Security (if not already enabled)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 2️⃣ Drop any previous policies that relied on user_id (optional safety)
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'users') THEN
    EXECUTE 'DROP POLICY IF EXISTS users_insert_self ON users';
    EXECUTE 'DROP POLICY IF EXISTS users_select_self ON users';
    EXECUTE 'DROP POLICY IF EXISTS users_update_self ON users';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access ON users';
  END IF;
END $$;

-- -----------------------------------------------------------------
-- 3️⃣ Allow authenticated users to INSERT their own profile (by email)
-- -----------------------------------------------------------------
CREATE POLICY "users_insert_self_email"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() = email
);

-- -----------------------------------------------------------------
-- 4️⃣ Allow authenticated users to SELECT only their own profile (by email)
-- -----------------------------------------------------------------
CREATE POLICY "users_select_self_email"
ON users
FOR SELECT
TO authenticated
USING (
  auth.email() = email
);

-- -----------------------------------------------------------------
-- 5️⃣ Allow authenticated users to UPDATE only their own profile (by email)
-- -----------------------------------------------------------------
CREATE POLICY "users_update_self_email"
ON users
FOR UPDATE
TO authenticated
USING (
  auth.email() = email
)
WITH CHECK (
  auth.email() = email
);

-- -----------------------------------------------------------------
-- 6️⃣ (Optional) Admin full access via service_role
-- -----------------------------------------------------------------
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO service_role
USING (true);
