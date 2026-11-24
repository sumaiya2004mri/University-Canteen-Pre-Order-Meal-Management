import { supabase, type StudentProfile } from '@/lib/supabase';

export type Role = 'student' | 'admin';

export type SessionUser = StudentProfile & {
  role: Role;
};

/**
 * Sign in with email + password via Supabase Auth.
 * Role is always read server-side from the `users` table — never from browser input.
 */
export async function signIn(email: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Sign-in failed. Please try again.' };

  const profile = await fetchProfile(data.user.id, data.user.email ?? email.trim());
  if (!profile) {
    await supabase.auth.signOut();
    return { user: null, error: 'No CampusBites profile is linked to this account.' };
  }
  return { user: profile, error: null };
}

export async function signUp(input: {
  name: string;
  studentId: string;
  email: string;
  password: string;
  department: string;
}): Promise<{ error: string | null; needsEmailConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { error: error.message, needsEmailConfirm: false };
  if (!data.user) return { error: 'Registration failed. Please try again.', needsEmailConfirm: false };

  // Insert into users table using our schema column names
  const { error: profileErr } = await supabase.from('users').insert({
    id: data.user.id,
    full_name: input.name.trim(),
    student_id: input.studentId.trim(),
    department: input.department,
    email: input.email.trim(),
    role: 'student',
  });

  if (profileErr) {
    // If users table uses a different id strategy, try without explicit id
    const { error: profileErr2 } = await supabase.from('users').insert({
      full_name: input.name.trim(),
      student_id: input.studentId.trim(),
      department: input.department,
      email: input.email.trim(),
      role: 'student',
    });
    if (profileErr2) {
      return {
        error: `Account created but profile could not be saved: ${profileErr2.message}`,
        needsEmailConfirm: false,
      };
    }
  }

  return { error: null, needsEmailConfirm: !data.session };
}

export async function fetchProfile(userId: string, email: string): Promise<SessionUser | null> {
  // Try matching by Supabase auth UUID (stored as id or user_id)
  const { data, error } = await supabase
    .from('users')
    .select('user_id, id, full_name, name, student_id, department, program, email, phone, role')
    .or(`id.eq.${userId},email.eq.${email}`)
    .maybeSingle();

  if (!error && data) {
    const row = data as {
      user_id?: number | string | null;
      id?: string | null;
      full_name?: string | null;
      name?: string | null;
      student_id?: string | null;
      department?: string | null;
      program?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: string | null;
    };
    return {
      id: userId,
      name: row.full_name ?? row.name ?? email.split('@')[0],
      student_id: row.student_id ?? '—',
      department: row.department ?? '—',
      program: row.program ?? '—',
      email: row.email ?? email,
      phone: row.phone ?? null,
      role: row.role === 'admin' ? 'admin' : 'student',
    };
  }

  // Fallback: account exists in auth but no users row yet — allow limited access
  return {
    id: userId,
    name: email.split('@')[0],
    student_id: '—',
    department: '—',
    program: '—',
    email,
    phone: null,
    role: 'student',
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return fetchProfile(user.id, user.email ?? '');
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}
