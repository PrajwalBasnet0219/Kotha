import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
  foot?: React.ReactNode;
};

export function AuthShell({ eyebrow, title, lede, children, foot }: AuthShellProps) {
  return (
    <div className="auth">
      <aside className="auth__art" aria-hidden="true">
        <div className="auth__swirl">
          <span className="auth__swirl-band auth__swirl-band--a" />
          <span className="auth__swirl-band auth__swirl-band--b" />
          <span className="auth__swirl-band auth__swirl-band--c" />
          <span className="auth__swirl-band auth__swirl-band--d" />
        </div>
        <div className="auth__art-top">
          <Link to="/" className="brand auth__brand">
            <svg className="brand__mark" viewBox="0 0 24 24">
              <path d="M12 12C9.4 8.8 7.5 7.6 5.7 8.4c-1.9 1-1.9 3.1 0 4.1 1.8.9 3.7-.3 6.3-3.4 2.6-3.1 4.5-4.3 6.3-3.4 1.9 1 1.9 3.1 0 4.1-1.8.9-3.7-.3-6.3-3.4Z" />
            </svg>
            <span className="brand__word">Kotha Studio</span>
          </Link>
          <span className="mono">Sheet A-00 · KTM</span>
        </div>

        <div className="auth__art-body">
          <p className="mono auth__art-kicker">Draw first. Furnish second.</p>
          <h2 className="auth__art-title">Every room begins as a line.</h2>
          <p className="auth__art-lede">
            Set the scale once. Trace the walls. The room that stands up later is the same room you
            drew — down to the millimetre.
          </p>

          <svg className="auth__plan" viewBox="0 0 320 200" fill="none" aria-hidden="true">
            <rect x="24" y="24" width="272" height="152" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
            <rect x="48" y="48" width="224" height="104" stroke="currentColor" strokeWidth="0.8" />
            <path d="M48 100 H 272" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.45" />
            <path d="M160 48 V 152" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.45" />
            <rect x="118" y="88" width="84" height="24" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M160 88 V 112 M118 100 H 202" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
            <path d="M24 14 h -10 M 24 14 v -10 M 296 14 h 10 M 296 14 v -10 M 24 186 h -10 M 24 186 v 10 M 296 186 h 10 M 296 186 v 10" stroke="currentColor" strokeWidth="0.8" />
            <text x="160" y="196" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="currentColor" opacity="0.55">
              4.20 × 3.60 m · 15.12 m²
            </text>
          </svg>
        </div>

        <div className="auth__art-foot">
          <span className="mono">27.7172° N · 85.3240° E</span>
          <span className="mono">Kathmandu</span>
        </div>
      </aside>

      <main className="auth__panel">
        <div className="auth__top">
          <Link to="/" className="auth__back mono">
            ← Back to the sheet
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth__card">
          <p className="mono auth__eyebrow">{eyebrow}</p>
          <h1 className="auth__title">{title}</h1>
          <p className="auth__lede">{lede}</p>
          {children}
          {foot ? <div className="auth__foot">{foot}</div> : null}
        </div>
      </main>
    </div>
  );
}
