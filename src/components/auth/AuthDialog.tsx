import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

type Mode = 'login' | 'register';

/** The minimum password length the register form states in its own hint copy. */
export const MIN_REGISTER_PASSWORD_LENGTH = 8;

/**
 * Whether the submit button should be disabled. A single source of truth for
 * the JSX below and for the unit test — a new password (register mode) must
 * meet the length the form's own hint states; an existing password (login)
 * has no client-side minimum since it isn't being chosen here.
 */
export function isAuthSubmitDisabled(params: {
  mode: Mode;
  email: string;
  password: string;
  submitting: boolean;
}): boolean {
  const { mode, email, password, submitting } = params;
  return (
    submitting ||
    email.trim().length === 0 ||
    password.length === 0 ||
    (mode === 'register' && password.length < MIN_REGISTER_PASSWORD_LENGTH)
  );
}

/**
 * Sign-in / create-account dialog. Built entirely from the shared `.modal`,
 * `.field` and `.btn` primitives so it matches every other dialog. Opened from
 * the lobby account control and from the AI panel's sign-in prompt.
 */
export function AuthDialog() {
  const open = useUiStore((s) => s.authDialogOpen);
  const close = useUiStore((s) => s.closeAuthDialog);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset to a clean login form each time the dialog opens, and focus the email.
  useEffect(() => {
    if (!open) return;
    setMode('login');
    setEmail('');
    setPassword('');
    setError(null);
    setSubmitting(false);
    const id = window.setTimeout(() => emailRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEscape(close, open);

  if (!open) return null;

  const isRegister = mode === 'register';
  const passwordTooShort =
    isRegister && password.length > 0 && password.length < MIN_REGISTER_PASSWORD_LENGTH;

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    if (isAuthSubmitDisabled({ mode, email, password, submitting })) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) await register(email.trim(), password);
      else await login(email.trim(), password);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={close}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label={isRegister ? 'Create account' : 'Sign in'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{isRegister ? 'Create account' : 'Sign in'}</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={close}>
            <Icon name="x" />
          </button>
        </div>

        <form className="modal-body stack" onSubmit={submit}>
          <p className="hint">
            {isRegister
              ? 'Create an account to generate AI furnishing suggestions.'
              : 'Sign in to generate AI furnishing suggestions.'}
          </p>
          <label className="field">
            <span className="field-label">Email</span>
            <span className="field-input">
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <span className="field-input">
              <input
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </span>
          </label>
          {isRegister &&
            (passwordTooShort ? (
              <p className="error">Password must be at least 8 characters.</p>
            ) : (
              <p className="hint">Use at least 8 characters.</p>
            ))}
          {error && <p className="error">{error}</p>}
          {/* Submit lives in the form so Enter works; the footer mirrors it. */}
          <button type="submit" hidden aria-hidden="true" />
        </form>

        <div className="modal-foot">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError(null);
            }}
          >
            {isRegister ? 'Have an account? Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="btn btn-accent"
            disabled={isAuthSubmitDisabled({ mode, email, password, submitting })}
            onClick={submit}
          >
            {submitting
              ? isRegister
                ? 'Creating …'
                : 'Signing in …'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
