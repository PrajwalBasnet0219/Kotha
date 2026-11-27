import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '../auth/AuthProvider';
import { AuthShell } from '../components/auth/AuthShell';
import { GoogleDialog } from '../components/ui/GoogleDialog';

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = signIn(email, password, remember);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(from && from !== '/signin' ? from : roleHome(result.user.role), { replace: true });
  };

  const continueGoogle = (googleEmail: string, googleName: string) => {
    setGoogleOpen(false);
    const result = signInWithGoogle(googleEmail, googleName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(roleHome(result.user.role), { replace: true });
  };

  const sendReset = (event: React.FormEvent) => {
    event.preventDefault();
    setResetSent(true);
  };

  return (
    <>
      <AuthShell
        eyebrow="Member access"
        title="Sign in to the drawing board."
        lede="Your plans, floors and rooms are saved to your account. New here? Create an account in under a minute."
        foot={
          <p className="auth__switch">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        }
      >
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="mono">Email</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@studio.np"
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
            />
          </label>

          <label className="field">
            <span className="mono">Password</span>
            <div className="field__row">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                placeholder="••••••••••"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
              />
              <button
                type="button"
                className="field__peek mono"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="form__row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setResetEmail(email);
                setResetSent(false);
              }}
            >
              Forgot password?
            </button>
          </div>

          {error ? <p className="form__error">{error}</p> : null}

          <button type="submit" className="btn btn--solid form__submit" disabled={submitting}>
            {submitting ? 'Checking…' : 'Sign in'}
          </button>

          <div className="form__divider">
            <span className="mono">or</span>
          </div>

          <button type="button" className="btn google-btn" onClick={() => setGoogleOpen(true)}>
            <span className="google-btn__g" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        </form>

        {resetEmail || resetSent ? (
          <form className="reset" onSubmit={sendReset}>
            <p className="mono reset__title">Reset password</p>
            <label className="field">
              <span className="mono">Email</span>
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
              />
            </label>
            {resetSent ? (
              <p className="reset__ok">
                If that address is on file, a reset link will be sent once mail delivery is
                connected. Ask your admin to reset it in the meantime.
              </p>
            ) : null}
            <div className="reset__actions">
              <button type="submit" className="btn btn--sm">
                Send link
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setResetEmail('');
                  setResetSent(false);
                }}
              >
                Close
              </button>
            </div>
          </form>
        ) : null}

        <p className="auth__note mono">
          Accounts are stored on this device while the API is being connected. Nothing leaves this
          browser.
        </p>
      </AuthShell>

      <GoogleDialog open={googleOpen} onClose={() => setGoogleOpen(false)} onContinue={continueGoogle} />
    </>
  );
}
