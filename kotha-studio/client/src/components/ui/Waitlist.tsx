import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { startScroll, stopScroll } from '../../lib/smooth';

type WaitlistProps = { open: boolean; onClose: () => void };

/**
 * The studio is in closed beta, so this is the honest front door: collect an
 * address, keep it locally, and say what actually happens next. No fake login.
 */
export function Waitlist({ open, onClose }: WaitlistProps) {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    stopScroll();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      startScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSaved(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError('That address is missing something.');
      return;
    }
    try {
      const raw = window.localStorage.getItem('kotha:waitlist');
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      window.localStorage.setItem('kotha:waitlist', JSON.stringify([...new Set([...list, value])]));
    } catch {
      /* private mode still gets the confirmation */
    }
    setSaved(true);
  };

  return createPortal(
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="waitlist-title">
      <button type="button" className="dialog__scrim" aria-label="Close" onClick={onClose} />
      <div className="dialog__card">
        <div className="dialog__top">
          <span className="mono">Kotha Studio · closed beta</span>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {saved ? (
          <div className="dialog__done">
            <p className="dialog__done-mark">✓</p>
            <h2 id="waitlist-title" className="dialog__title">
              Written down.
            </h2>
            <p>
              We open the studio in small groups so the drawing board gets looked after. Your
              address is kept on this device for now — the real list goes live with the API.
            </p>
            <button type="button" className="btn" onClick={onClose}>
              Back to the drawing
            </button>
          </div>
        ) : (
          <>
            <h2 id="waitlist-title" className="dialog__title">
              Leave an address. We will send a key.
            </h2>
            <p className="dialog__lede">
              Plans, rooms and ordering are being finished behind this page. No newsletter, no
              drip sequence — one message when your account can open.
            </p>
            <form className="dialog__form" onSubmit={submit}>
              <label className="field">
                <span className="mono">Email</span>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="you@studio.np"
                  autoComplete="email"
                />
              </label>
              {error ? <p className="dialog__error">{error}</p> : null}
              <button type="submit" className="btn btn--solid">
                Ask for a key
              </button>
            </form>
            <p className="dialog__fine mono">
              Demo accounts later: client@kotha.studio · designer@kotha.studio
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
