import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type GoogleDialogProps = {
  open: boolean;
  onClose: () => void;
  onContinue: (email: string, name: string) => void;
};

export function GoogleDialog({ open, onClose, onContinue }: GoogleDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setName('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter the Google address you want to use.');
      return;
    }
    onContinue(email, name);
  };

  return createPortal(
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="google-title">
      <button type="button" className="dialog__scrim" aria-label="Close" onClick={onClose} />
      <div className="dialog__card dialog__card--google">
        <div className="google__top">
          <span className="google__g" aria-hidden="true">
            G
          </span>
          <span className="mono">Sign in with Google</span>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h2 id="google-title" className="dialog__title dialog__title--small">
          Use your Google account.
        </h2>
        <p className="dialog__lede">
          The API will verify the Google ID token when it is connected. For now, confirm the
          address and name you want attached to this workspace.
        </p>

        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="mono">Google email</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@gmail.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
            />
          </label>

          <label className="field">
            <span className="mono">Name</span>
            <input
              type="text"
              value={name}
              autoComplete="name"
              placeholder="Your name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {error ? <p className="form__error">{error}</p> : null}

          <button type="submit" className="btn btn--solid form__submit">
            Continue
          </button>
        </form>

        <p className="dialog__fine mono">A client account is created on first use.</p>
      </div>
    </div>,
    document.body,
  );
}
