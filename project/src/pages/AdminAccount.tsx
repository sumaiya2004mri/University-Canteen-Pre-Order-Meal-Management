import { useState } from 'react';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { Avatar, Card, SectionTitle, StudentInfoRow } from '@/components/ui';
import { updatePassword, type SessionUser } from '@/lib/auth';

export function AdminProfilePage({ admin }: { admin: SessionUser }) {
  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar name={admin.name} className="h-16 w-16 text-xl" />
          <div>
            <p className="text-lg font-bold text-brand-black">{admin.name}</p>
            <p className="text-sm text-brand-gray">{admin.email}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-beige px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrator
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StudentInfoRow label="Full Name" value={admin.name} />
          <StudentInfoRow label="Email" value={admin.email} />
          <StudentInfoRow label="Account Type" value="Canteen Administrator" />
          <StudentInfoRow label="Campus" value="Varendra University, Rajshahi" />
        </div>
      </Card>
    </div>
  );
}

export function AdminSettingsPage({ admin }: { admin: SessionUser }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setFeedback({ ok: false, message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setFeedback({ ok: false, message: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setFeedback(
      error
        ? { ok: false, message: error }
        : { ok: true, message: 'Password updated successfully.' },
    );
    if (!error) {
      setPassword('');
      setConfirm('');
    }
    setBusy(false);
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="max-w-2xl space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.ok && <CheckCircle2 className="h-5 w-5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <Card className="p-6">
        <SectionTitle>Change Password</SectionTitle>
        <form onSubmit={handlePassword} className="space-y-3">
          <div>
            <label htmlFor="pw-new" className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
              <KeyRound className="h-4 w-4 text-brand-gold" /> New password
            </label>
            <input id="pw-new" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pw-confirm" className="text-sm font-semibold text-brand-dark">Confirm new password</label>
            <input id="pw-confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={busy} className="focus-ring rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {busy ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        <p className="mt-3 text-xs text-brand-gray/70">Signed in as {admin.email}</p>
      </Card>
    </div>
  );
}
