import { useState } from 'react';
import { ChefHat, GraduationCap, Lock, Mail, UtensilsCrossed, UserPlus } from 'lucide-react';
import { signIn, signUp, type SessionUser } from '@/lib/auth';
import { Card } from '@/components/ui';

type Mode = 'signin' | 'signup';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronic Engineering',
  'Business Administration',
  'Economics',
  'English',
  'Law',
];

export default function AuthPage({ onSignedIn }: { onSignedIn: (user?: SessionUser) => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { user, error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else if (user) {
          onSignedIn(user);
        }
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        const { user, error: err } = await signUp({
          name,
          studentId,
          email,
          password,
          department,
        });
        if (err) {
          setError(err);
        } else if (user) {
          onSignedIn(user);
        } else {
          onSignedIn();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black placeholder:text-brand-gray/60 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-ivory px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-sm">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-dark">CampusBites</h1>
          <p className="mt-1 text-sm text-brand-gray">Varendra University Canteen Pre-Order System</p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-brand-ivory p-1" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setError(null);
                setInfo(null);
              }}
              className={`focus-ring flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === 'signin' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray hover:text-brand-dark'
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfo(null);
              }}
              className={`focus-ring flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray hover:text-brand-dark'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Register
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="text-sm font-semibold text-brand-dark">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ayesha Rahman"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="auth-sid" className="text-sm font-semibold text-brand-dark">Student ID</label>
                  <input
                    id="auth-sid"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. VU-2023-0148"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="auth-dept" className="text-sm font-semibold text-brand-dark">Department</label>
                  <select
                    id="auth-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={inputClass}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="text-sm font-semibold text-brand-dark">University email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray/60" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@varendra.edu.bd"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="text-sm font-semibold text-brand-dark">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray/60" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="focus-ring w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-brand-gray"
            >
              {busy ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : mode === 'signin' ? 'Sign In' : 'Create Student Account'}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-beige/60 px-4 py-3 text-xs text-brand-gray">
            <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
            Canteen staff and administrators sign in with their admin account on this same screen — the portal
            opens the admin console automatically for them. New registrations are always created as students.
          </p>
        </Card>
      </div>
    </div>
  );
}
