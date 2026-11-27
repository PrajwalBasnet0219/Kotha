import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleHome } from '../../auth/AuthProvider';
import { ThemeToggle } from '../ui/ThemeToggle';
import { startScroll, stopScroll } from '../../lib/smooth';

const LINKS = [
  { href: '#blueprint', label: 'Blueprint', id: 'blueprint' },
  { href: '#room', label: 'Room', id: 'room' },
  { href: '#collection', label: 'Collection', id: 'collection' },
  { href: '#studio', label: 'Studio', id: 'studio' },
  { href: '#handover', label: 'Handover', id: 'handover' },
];

export function Nav() {
  const { user, signOut } = useAuth();

  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    stopScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      startScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const go = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <header className={`nav ${stuck ? 'is-stuck' : ''}`}>
        <a href="#top" className="brand" aria-label="Kotha Studio, back to top">
          <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12C9.4 8.8 7.5 7.6 5.7 8.4c-1.9 1-1.9 3.1 0 4.1 1.8.9 3.7-.3 6.3-3.4 2.6-3.1 4.5-4.3 6.3-3.4 1.9 1 1.9 3.1 0 4.1-1.8.9-3.7-.3-6.3-3.4Z" />
          </svg>
          <span className="brand__word">Kotha Studio</span>
        </a>

        <nav className="nav__menu" aria-label="Sections">
          {LINKS.map((link, index) => (
            <a
              key={link.id}
              href={link.href}
              className={active === link.id ? 'is-active' : ''}
              onClick={(event) => {
                event.preventDefault();
                go(link.href);
              }}
            >
              <span className="nav__index">{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <ThemeToggle />
          {user ? (
            <>
              <Link className="link-btn" to={roleHome(user.role)}>
                {user.role === 'admin' ? 'Admin' : 'Studio'}
              </Link>
              <div className="account" ref={accountRef}>
                <button
                  type="button"
                  className="account__btn"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((value) => !value)}
                >
                  <span className="account__avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                  <span className="account__name">{user.name.split(' ')[0]}</span>
                </button>
                {accountOpen ? (
                  <div className="account__menu" role="menu">
                    <span className="mono">
                      {user.email} · {user.role}
                    </span>
                    <Link to={roleHome(user.role)} onClick={() => setAccountOpen(false)}>
                      Open workspace
                    </Link>
                    {user.role === 'admin' ? (
                      <Link to="/admin" onClick={() => setAccountOpen(false)}>
                        Admin dashboard
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link className="link-btn" to="/signin">
                Sign in
              </Link>
              <Link className="btn btn--solid btn--sm" to="/signup">
                Open a plan
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`burger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span />
          <span />
        </button>
      </header>

      <div className={`nav-sheet ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="nav-sheet__inner">
          {LINKS.map((link, index) => (
            <a
              key={link.id}
              href={link.href}
              onClick={(event) => {
                event.preventDefault();
                go(link.href);
              }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </a>
          ))}
          <div className="nav-sheet__foot">
            <ThemeToggle />
            {user ? (
              <>
                <Link className="btn btn--solid" to={roleHome(user.role)} onClick={() => setOpen(false)}>
                  Open workspace
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn--solid" to="/signup" onClick={() => setOpen(false)}>
                  Open a plan
                </Link>
                <Link className="btn" to="/signin" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </>
            )}
            <p className="mono">Kathmandu · 27.7172° N / 85.3240° E</p>
          </div>
        </div>
      </div>
    </>
  );
}
