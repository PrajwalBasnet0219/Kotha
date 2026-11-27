import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="notfound">
      <p className="mono">404 · sheet missing</p>
      <h1>This drawing was never filed.</h1>
      <p>
        The page you asked for is not in the register. Go back to the sheet that is — the plan,
        the room, the catalogue.
      </p>
      <Link className="btn btn--solid" to="/">
        Back to the drawing
      </Link>
    </section>
  );
}
