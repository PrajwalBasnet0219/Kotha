import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '../../auth/AuthProvider';
import { CraftText } from '../motion/CraftText';

export function Closing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const start = () => {
    navigate(user ? roleHome(user.role) : '/signup');
  };

  return (
    <section id="start" className="closing">
      <div className="closing__inner">
        <p className="kicker">
          <span className="kicker__num">06</span>
          Begin
        </p>

        <CraftText as="h2" text="Bring a plan. Leave with a room." className="closing__title" />

        <p className="closing__lede">
          Kotha Studio is in closed beta while the drawing board is finished. If you have a plan in
          a drawer — or a photograph of one — open an account and start tracing.
        </p>

        <div className="closing__actions">
          <button type="button" className="btn btn--solid" onClick={start}>
            Open a plan
          </button>
          <a className="btn" href="mailto:prajwalbasnet0219@gmail.com">
            Ask a question
          </a>
        </div>

        <div className="closing__meta">
          <span className="mono">Kathmandu studio</span>
          <span className="mono">Exports in mm, PDF and SVG</span>
          <span className="mono">Dimensions in mm</span>
        </div>
      </div>

      <div className="closing__mark" aria-hidden="true">
        <svg viewBox="0 0 200 120" fill="none">
          <path
            d="M100 60C74 30 50 30 32 44 8 62 8 82 32 96c18 14 42 14 68-16 26-30 50-30 68-16 24 14 24 34 0 52-18 14-42 14-68-16Z"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="2 6"
          />
          <circle cx="100" cy="60" r="2" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}
