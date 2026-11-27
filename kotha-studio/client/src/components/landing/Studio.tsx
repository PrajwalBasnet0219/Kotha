import { CraftText } from '../motion/CraftText';
import { MiniPlan } from './MiniPlan';

export function Studio() {
  return (
    <section id="studio" className="feature feature--studio">
      <div className="feature__inner feature__inner--studio">
        <div className="feature__stage studio">
          <div className="studio__board">
            <div className="studio__bar">
              <span className="mono">Plan · living</span>
              <div className="studio__here">
                <i />
                <i />
                <span className="mono">2 in the room</span>
              </div>
              <span className="mono">v12 · 14:32</span>
            </div>

            <div className="studio__paper">
              <MiniPlan />
              <span className="cursor cursor--a">
                <svg viewBox="0 0 12 16" aria-hidden="true">
                  <path d="M1 1l9 8-4 .6L3.6 14 1 1Z" fill="currentColor" />
                </svg>
                <em>Prajwal</em>
              </span>
              <span className="cursor cursor--b">
                <svg viewBox="0 0 12 16" aria-hidden="true">
                  <path d="M1 1l9 8-4 .6L3.6 14 1 1Z" fill="currentColor" />
                </svg>
                <em>Anisha</em>
              </span>
              <div className="studio__comment">
                <span className="studio__pin" />
                <p>Move the door 400 up? It clears the shelf.</p>
                <span className="mono">Anisha · just now</span>
              </div>
            </div>

            <div className="studio__foot">
              <span className="mono">socket · opening:move</span>
              <span className="mono">version 12 of 14</span>
            </div>
          </div>
        </div>

        <div className="feature__copy">
          <p className="kicker">
            <span className="kicker__num">04</span>
            The studio
          </p>

          <CraftText as="h2" text="Two people, one drawing." className="feature__title" />

          <p className="feature__lede">
            Share the sheet and a designer joins the same document, not a thread beside it. Cursors,
            pinned notes and the version rail are part of the drawing. Every save becomes a version;
            restoring one copies it forward instead of erasing the ones after it.
          </p>

          <ul className="spec-list">
            <li>
              <span className="mono">Presence</span>
              <span>Cursors with names, live</span>
            </li>
            <li>
              <span className="mono">Comments</span>
              <span>Pinned to a point or a piece</span>
            </li>
            <li>
              <span className="mono">Versions</span>
              <span>Twenty kept per plan</span>
            </li>
            <li>
              <span className="mono">Access</span>
              <span>Owner · designer · shared link</span>
            </li>
          </ul>

          <p className="feature__note">
            The door moves on both screens through one socket room. No refresh, no merge step, no
            “which file is current?”.
          </p>
        </div>
      </div>
    </section>
  );
}
