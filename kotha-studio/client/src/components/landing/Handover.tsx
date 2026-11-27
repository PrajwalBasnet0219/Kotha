import { CraftText } from '../motion/CraftText';
import { Reveal } from '../motion/Reveal';

const LINES = [
  ['Two-seat sofa', '1840 × 860 × 780', '01'],
  ['Dining table', '1600 × 900 × 750', '02'],
  ['Floor lamp', '380 × 380 × 1620', '03'],
  ['Wool rug', '2400 × 1700 × 12', '04'],
];

export function Handover() {
  return (
    <section id="handover" className="feature feature--order">
      <div className="feature__inner">
        <div className="feature__copy">
          <p className="kicker">
            <span className="kicker__num">05</span>
            The handover
          </p>

          <CraftText as="h2" text="The drawing leaves the screen intact." className="feature__title" />

          <p className="feature__lede">
            The plan, the room and the furniture schedule are exported together — dimensions in
            millimetres, in the same order the drawing was made. No re-typing, no second tool, no
            drift between the sheet and the site.
          </p>

          <ul className="spec-list">
            <li>
              <span className="mono">Export</span>
              <span>Plan as PDF and SVG, with every dimension</span>
            </li>
            <li>
              <span className="mono">Schedule</span>
              <span>Furniture list as CSV, filtered by fit</span>
            </li>
            <li>
              <span className="mono">Versions</span>
              <span>Snapshots you can restore and compare</span>
            </li>
            <li>
              <span className="mono">Units</span>
              <span>Millimetres end to end, never inches</span>
            </li>
          </ul>

          <p className="feature__note">
            The same numbers travel from the catalogue card to the handover sheet without a rounding
            step in between.
          </p>
        </div>

        <div className="feature__stage order">
          <Reveal className="invoice-wrap" delay={80}>
            <article className="invoice invoice--schedule">
              <header className="invoice__head">
                <div>
                  <p className="mono">Specification</p>
                  <p className="invoice__no">Rev C</p>
                </div>
                <span className="stamp">Rev C</span>
              </header>

              <div className="invoice__meta mono">
                <span>Room A-01 · living · 15.12 m²</span>
                <span>24 Nov 2026</span>
              </div>

              <ul className="invoice__lines">
                {LINES.map(([name, dims, rev]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span className="mono">{dims}</span>
                    <span className="mono">{rev}</span>
                  </li>
                ))}
              </ul>

              <dl className="invoice__totals">
                <div>
                  <dt>Pieces</dt>
                  <dd className="mono">04</dd>
                </div>
                <div>
                  <dt>Rooms</dt>
                  <dd className="mono">02</dd>
                </div>
                <div>
                  <dt>Floor area</dt>
                  <dd className="mono">15.12 m²</dd>
                </div>
                <div className="invoice__total">
                  <dt>Revision</dt>
                  <dd className="mono">Rev C · exported</dd>
                </div>
              </dl>

              <footer className="invoice__foot mono">
                <span>Sheet A-01 · mm</span>
                <span>exported · 24 Nov 2026</span>
              </footer>
            </article>
          </Reveal>

          <p className="order__note mono">
            The export is a snapshot, not a link. The numbers are frozen at the moment you print.
          </p>
        </div>
      </div>
    </section>
  );
}
