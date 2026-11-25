// Browser‑side authentication utilities – all calls go through the Express API.
// No server‑side dependencies (mysql2, bcrypt) are imported here.

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

const API_ROOT = '/api/auth';

/** Sign up a new student via the backend. */
export async function signUp(input: {
  name: string;
  studentId: string;
  email: string;
  password: string;
  department: string;
}): Promise<{ error: string | null; needsEmailConfirm: boolean }> {
  try {
    const resp = await fetch(`${API_ROOT}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error ?? 'Sign‑up failed', needsEmailConfirm: false };
    return { error: null, needsEmailConfirm: data.needsEmailConfirm ?? false };
  } catch (e: any) {
    return { error: e.message ?? 'Network error', needsEmailConfirm: false };
  }
}

/** Sign in a user via the backend. */
export async function signIn(email: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  try {
    const resp = await fetch(`${API_ROOT}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) return { user: null, error: data.error ?? 'Sign‑in failed' };
    return { user: data.user ?? null, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? 'Network error' };
  }
}

/** Get current session – backend stores session in a cookie/JWT. */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const resp = await fetch(`${API_ROOT}/session`, { credentials: 'include' });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Sign out – tell backend to clear session cookie. */
export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_ROOT}/signout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore errors
  }
}

/** Fetch profile for a given user ID. */
export async function fetchProfile(userId: string, email: string): Promise<SessionUser | null> {
  try {
    const resp = await fetch(`${API_ROOT}/profile/${userId}?email=${encodeURIComponent(email)}`, { credentials: 'include' });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.profile ?? null;
  } catch {
    return null;
  }
}

/** Update user password via the backend. */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    const resp = await fetch(`${API_ROOT}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error ?? 'Failed to update password' };
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? 'Network error' };
  }
}

