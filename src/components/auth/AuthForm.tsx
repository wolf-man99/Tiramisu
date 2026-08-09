'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

const ERRORS: Record<string, string> = {
  google_unconfigured: 'Google sign-in isn’t configured on this deployment yet — use email and password.',
  oauth_state: 'That Google sign-in link expired. Please try again.',
  oauth: 'Google sign-in failed. Please try again or use email.',
};

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = params.get('error');
    if (e) setError(ERRORS[e] ?? 'Something went wrong.');
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setGoogleEnabled(d.googleEnabled)).catch(() => {});
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      }).then((r) => r.json());
      if (res.ok) { router.push(next); router.refresh(); }
      else setError(res.error ?? 'Please check your details.');
    } catch { setError('Network error — please try again.'); }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] shadow-[0_4px_20px_-6px_var(--accent)]"><Sparkles size={18} className="text-white" /></span>
        <span className="text-lg font-semibold tracking-tight">Growth<span className="text-[var(--accent-text)]">SQL</span></span>
      </Link>

      <div className="card p-6">
        <h1 className="text-xl font-semibold tracking-tight">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{mode === 'signup' ? 'Start learning in under a minute — your progress saves automatically.' : 'Sign in to pick up where you left off.'}</p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === 'signup' && (
            <Field label="Name (optional)" value={displayName} onChange={setDisplayName} placeholder="Alex Marketer" type="text" />
          )}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@company.com" type="email" required />
          <Field label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" required />
          <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-faint)]">
          <div className="h-px flex-1 bg-[var(--border)]" /> or <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <a href="/api/auth/google" className="block">
          <Button variant="secondary" size="lg" className="w-full justify-center gap-2" type="button">
            <GoogleIcon /> Continue with Google
          </Button>
        </a>
        {!googleEnabled && <p className="mt-2 text-center text-[11px] text-[var(--text-faint)]">Google sign-in activates once credentials are configured.</p>}

        <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
          {mode === 'signup' ? (
            <>Already have an account? <Link href="/login" className="font-medium text-[var(--accent-text)] hover:underline">Sign in</Link></>
          ) : (
            <>New here? <Link href="/signup" className="font-medium text-[var(--accent-text)] hover:underline">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, required }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-sm outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-border)]"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
