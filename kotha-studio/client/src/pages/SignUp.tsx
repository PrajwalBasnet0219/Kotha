import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '../auth/AuthProvider';
import { AuthShell } from '../components/auth/AuthShell';
import { GoogleDialog } from '../components/ui/GoogleDialog';
import type { Role } from '../lib/store';

export function SignUp() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [adminCode, setAdminCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const validPassword = password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please add your name so the studio knows who is drawing.');
      return;
    }
    if (!validPassword) {
      setError('Passwords need at least 10 characters, with a letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (role === 'admin' && !adminCode.trim()) {
      setError('Admin accounts need the provisioning code issued by Gritfeat.');
      return;
    }
    if (!terms) {
      setError('Please agree to the studio terms before creating the account.');
      return;
    }

    setSubmitting(true);
    const result = signUp({ name, email, password, role, adminCode, remember: true });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(roleHome(result.user.role), { replace: true });
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

  return (
    <>
      <AuthShell
        eyebrow="New account"
        title="Open a plan."
        lede="A client draws and previews; a designer reviews and approves. Admin accounts are provisioned by Gritfeat."
        foot={
          <p className="auth__switch">
            Already have a key? <Link to="/signin">Sign in</Link>
          </p>
        }
      >
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="mono">Name</span>
            <input
              type="text"
              value={name}
              autoComplete="name"
              placeholder="Your name"
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
            />
          </label>

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

          <fieldset className="role-choice" aria-label="Role">
            <legend className="mono">Role</legend>
            {(['client', 'designer'] as Role[]).map((choice) => (
              <label
                key={choice}
                className={`role-choice__option ${role === choice ? 'is-active' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={choice}
                  checked={role === choice}
                  onChange={() => setRole(choice)}
                />
                <span className="role-choice__name">{choice === 'client' ? 'Client' : 'Designer'}</span>
                <span className="role-choice__desc">
                  {choice === 'client'
                    ? 'Draw a plan, preview it in 3D, and share it with a designer.'
                    : 'Review layouts, pin comments, and approve a blueprint.'}
                </span>
              </label>
            ))}
          </fieldset>

          {role === 'designer' ? (
            <p className="field__hint mono">
              Designer accounts can review any shared project and leave pinned comments.
            </p>
          ) : null}

          <details className="admin-provision">
            <summary className="mono">Have a Gritfeat admin code?</summary>
            <div className="admin-provision__body">
              <label className="check">
                <input
                  type="checkbox"
                  checked={role === 'admin'}
                  onChange={(event) => setRole(event.target.checked ? 'admin' : 'client')}
                />
                <span>Create this account as an admin.</span>
              </label>
              {role === 'admin' ? (
                <label className="field">
                  <span className="mono">Provisioning code</span>
                  <input
                    type="text"
                    value={adminCode}
                    autoComplete="off"
                    placeholder="Issued by Gritfeat"
                    onChange={(event) => {
                      setAdminCode(event.target.value);
                      setError('');
                    }}
                  />
                </label>
              ) : null}
            </div>
          </details>

          <label className="field">
            <span className="mono">Password</span>
            <div className="field__row">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="new-password"
                placeholder="At least 10 characters"
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
            <span className="field__hint mono">
              {validPassword ? 'Strong enough.' : 'Letter + number, 10 characters minimum.'}
            </span>
          </label>

          <label className="field">
            <span className="mono">Confirm password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              autoComplete="new-password"
              placeholder="Repeat the password"
              onChange={(event) => {
                setConfirm(event.target.value);
                setError('');
              }}
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            <span>
              I agree to the studio terms: the platform is a design and visualisation tool, and
              material estimates are reference values, not a quote.
            </span>
          </label>

          {error ? <p className="form__error">{error}</p> : null}

          <button type="submit" className="btn btn--solid form__submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
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
      </AuthShell>

      <GoogleDialog open={googleOpen} onClose={() => setGoogleOpen(false)} onContinue={continueGoogle} />
    </>
  );
}
