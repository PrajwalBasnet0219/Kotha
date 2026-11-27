import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <p className="footer__word">Kotha</p>
          <p className="mono">A blueprint becomes a room.</p>
          <p className="footer__blurb">
            Built in Kathmandu for people who already have a plan — on paper, in a drawer, or in a
            photograph someone sent at midnight.
          </p>
        </div>

        <div className="footer__cols">
          <div>
            <p className="footer__head mono">Sections</p>
            <a href="#blueprint">Blueprint</a>
            <a href="#room">Room</a>
            <a href="#collection">Collection</a>
            <a href="#studio">Studio</a>
            <a href="#handover">Handover</a>
          </div>
          <div>
            <p className="footer__head mono">Studio</p>
            <Link to="/signup" className="footer__link">
              Open a plan
            </Link>
            <Link to="/signin" className="footer__link">
              Sign in
            </Link>
            <a href="mailto:prajwalbasnet0219@gmail.com">prajwalbasnet0219@gmail.com</a>
            <a href="tel:+9779749469713">+977 9749 469 713</a>
            <a href="https://github.com/PrajwalBasnet0219" target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </div>
          <div>
            <p className="footer__head mono">Specimen</p>
            <span>Living 4.20 × 3.60 m</span>
            <span>15.12 m² · 15.60 m perimeter</span>
            <span>Wall 120 mm · Height 2800 mm</span>
            <span>Scale 1:50 @ A3</span>
          </div>
        </div>
      </div>

      <div className="footer__rule" />

      <div className="footer__bottom">
        <p className="mono">© 2026 Kotha Studio · Final capstone, Gritfeat Solution</p>
        <p className="mono">27.7172° N · 85.3240° E · Kathmandu</p>
        <p className="mono">mm · exports in PDF and SVG</p>
      </div>
    </footer>
  );
}
