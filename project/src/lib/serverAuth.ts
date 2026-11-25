import pool from './mysql';
import bcrypt from 'bcryptjs';

// Define a minimal StudentProfile type used by the backend (mirrors supabase.ts type)
export type StudentProfile = {
  id: string;
  name: string;
  student_id: string;
  department: string;
  program?: string;
  email: string;
  phone: string | null;
};

export type Role = 'student' | 'admin' | 'staff' | 'canteen_staff';

export type SessionUser = StudentProfile & { role: Role };

/** Helper: get user row by email. */
async function getUserByEmail(email: string) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.trim()]);
  // @ts-ignore – rows is any[]
  return (rows as any)[0] || null;
}

/** Helper: get user row by user_id. */
async function getUserById(userId: string) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
  // @ts-ignore
  return (rows as any)[0] || null;
}

/** Sign up a new student or sign them right in if already registered. */
export async function signUp(input: {
  name: string;
  studentId: string;
  email: string;
  password: string;
  department: string;
}): Promise<{ user: SessionUser | null; error: string | null; needsEmailConfirm: boolean }> {
  try {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      if (input.password) {
        const hash = await bcrypt.hash(input.password, 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, existing.user_id]);
      }
      const profile = await fetchProfile(String(existing.user_id), existing.email);
      return { user: profile, error: null, needsEmailConfirm: false };
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [res] = await pool.execute(
      `INSERT INTO users (full_name, student_id, department, email, role, password_hash) VALUES (?, ?, ?, ?, 'student', ?)`,
      [input.name.trim(), input.studentId.trim(), input.department, input.email.trim(), passwordHash]
    );
    // @ts-ignore
    const newId = (res as any).insertId;
    const profile = await fetchProfile(String(newId), input.email.trim());
    return { user: profile, error: null, needsEmailConfirm: false };
  } catch (e: any) {
    return { user: null, error: e.message ?? 'Registration failed', needsEmailConfirm: false };
  }
}

/** Sign in using email + password. Accepts either account password or demo password '123456'. */
export async function signIn(email: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  const userRow = await getUserByEmail(email);
  if (!userRow) {
    return { user: null, error: 'Invalid email or password' };
  }
  const valid = (await bcrypt.compare(password, userRow.password_hash)) || password === '123456';
  if (!valid) {
    return { user: null, error: 'Invalid email or password' };
  }
  const profile = await fetchProfile(String(userRow.user_id), userRow.email);
  return { user: profile, error: null };
}

/** Fetch the user profile (StudentProfile shape) from the DB. */
export async function fetchProfile(userId: string, email: string): Promise<SessionUser | null> {
  const userRow = await getUserById(userId);
  if (!userRow) {
    return {
      id: userId,
      name: email.split('@')[0],
      student_id: '—',
      department: '—',
      program: '—',
      email,
      phone: null,
      role: 'student',
    } as SessionUser;
  }
  return {
    id: String(userRow.user_id),
    name: userRow.full_name ?? email.split('@')[0],
    student_id: userRow.student_id ?? '—',
    department: userRow.department ?? '—',
    program: userRow.program ?? '—',
    email: userRow.email,
    phone: userRow.phone ?? null,
    role: (userRow.role as Role) ?? 'student',
  } as SessionUser;
}

/** Placeholder for session retrieval – not implemented yet. */
export async function getSession(): Promise<SessionUser | null> {
  return null;
}

export async function signOut(): Promise<void> {
  return;
}

export async function updatePassword(userId: string, newPassword: string): Promise<{ error: string | null }> {
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [hash, userId]);
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? 'Failed to update password' };
  }
}
