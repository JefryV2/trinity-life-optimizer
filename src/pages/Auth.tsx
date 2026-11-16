import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { Topline } from '@/components/ds';
import { useAuth } from '@/components/AuthProvider';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signin' | 'signup' | 'reset';

const COPY: Record<Mode, { title: string; line: string; action: string }> = {
  signin: {
    title: 'Sign in',
    line: 'Health, money and relationships, read as one score.',
    action: 'SIGN IN',
  },
  signup: {
    title: 'Create account',
    line: 'Seven days of logging is enough to see a pattern.',
    action: 'CREATE ACCOUNT',
  },
  reset: {
    title: 'Reset password',
    line: 'We will email a link to set a new password.',
    action: 'SEND LINK',
  },
};

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="ds-label mb-[6px] block text-[9.5px]">{label}</span>
    {children}
    {hint ? <span className="ds-dim mt-[6px] block text-[10px] font-medium">{hint}</span> : null}
  </label>
);

const inputClass =
  'w-full rounded-[16px] border border-[#232326] bg-[#101012] px-[14px] py-[13px] text-[15px] font-medium text-foreground outline-none placeholder:text-[#4e4e56] focus:border-primary';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>(() => {
    // deep-linkable: /auth?mode=signup | reset
    const requested = new URLSearchParams(window.location.search).get('mode');
    return requested === 'signup' || requested === 'reset' ? requested : 'signin';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = COPY[mode];
  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!EMAIL.test(email.trim())) return false;
    if (mode === 'reset') return true;
    if (password.length < 6) return false;
    return mode === 'signin' || firstName.trim().length > 0;
  }, [busy, email, firstName, mode, password]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!EMAIL.test(email.trim())) {
      setError('That email address does not look right.');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('Passwords are at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !firstName.trim()) {
      setError('Enter your first name.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'reset') {
        const { error: resetError } = await resetPassword(email.trim());
        if (resetError) throw new Error(resetError.message);
        setNotice('If an account exists for that address, a reset link is on its way.');
        setMode('signin');
        return;
      }

      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email.trim(), password, {
          first_name: firstName.trim(),
        });
        if (signUpError) throw new Error(signUpError.message);
        setNotice('Check your inbox to confirm the address, then sign in.');
        setMode('signin');
        return;
      }

      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) throw new Error(signInError.message);
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-[18px] pb-10">
        <Topline left="TRINITY" right={format(new Date(), 'EEE d MMM').toUpperCase()} />

        <div className="flex flex-1 flex-col justify-center pt-8">
          <h1 className="ds-num text-[44px] leading-[1.02] tracking-[-0.04em]">{copy.title}</h1>
          <p className="ds-body mt-[8px] max-w-[330px]">{copy.line}</p>

          {mode !== 'reset' && (
            <div className="mt-5 flex gap-[4px] rounded-pill border border-[#1b1b1e] bg-[#0a0a0c] p-[4px]">
              {(['signin', 'signup'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={[
                    'press flex-1 rounded-pill py-[9px] text-[10px] font-bold uppercase tracking-[0.1em]',
                    mode === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-[#4e4e56] hover:text-[#8a8a92]',
                  ].join(' ')}
                >
                  {value === 'signin' ? 'Sign in' : 'Create'}
                </button>
              ))}
            </div>
          )}

          {notice && (
            <div className="reveal mt-4 rounded-[16px] border border-[#1b1b1e] bg-[#0a0a0c] px-[14px] py-[11px]">
              <p className="text-[12.5px] font-medium leading-[1.5] text-[#b4b4bb]">{notice}</p>
            </div>
          )}

          {error && (
            <div className="reveal mt-4 rounded-[16px] border border-[#ff6b5a]/60 bg-[#1a0f0e] px-[14px] py-[11px]">
              <p className="text-[12.5px] font-medium leading-[1.5] text-[#ff6b5a]">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="mt-5 flex flex-col gap-[14px]">
            {mode === 'signup' && (
              <Field label="FIRST NAME">
                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setError(null);
                  }}
                  placeholder="Yomna"
                  autoComplete="given-name"
                  autoFocus
                />
              </Field>
            )}

            <Field label="EMAIL">
              <input
                className={inputClass}
                type="email"
                inputMode="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus={mode !== 'signup'}
                required
              />
            </Field>

            {mode !== 'reset' && (
              <Field
                label="PASSWORD"
                hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
              >
                <div className="relative">
                  <input
                    className={`${inputClass} pr-[64px]`}
                    type={reveal ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    placeholder="Your password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((value) => !value)}
                    aria-label={reveal ? 'Hide password' : 'Show password'}
                    className="press absolute inset-y-0 right-[10px] my-auto h-[28px] px-[6px] text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a8a92]"
                  >
                    {reveal ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </Field>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="pill-btn pill-btn-solid mt-[2px] w-full disabled:bg-[#141417] disabled:text-[#4e4e56]"
            >
              <span>{busy ? 'WORKING…' : copy.action}</span>
              <span className="text-[11px] font-bold opacity-70">{busy ? '' : '→'}</span>
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => switchMode(mode === 'reset' ? 'signin' : 'reset')}
              className="press py-[10px] text-left text-[12px] font-semibold text-[#8a8a92]"
            >
              {mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="press py-[10px] text-right text-[12px] font-semibold text-primary"
            >
              Continue as guest →
            </button>
          </div>

          <p className="ds-dim mt-2 text-[10.5px] font-medium leading-[1.6]">
            Guest browsing stays on this device. Scores are stored when you sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
