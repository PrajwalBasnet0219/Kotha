import { useEffect, useRef } from 'react';
import { CraftText } from '../motion/CraftText';
import { PlanSheet } from './PlanSheet';
import { ScrollTrigger, gsap, reducedMotion } from '../../lib/motion';

/**
 * The sheet is folded in half along the wall between the two rooms, so the
 * crease falls on something that already exists in the drawing. It drops in,
 * opens like a page, then the ink is plotted from top to bottom.
 */
export function BlueprintFold() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!section || !stage || !wrap) return;

    const state = { open: 64, draw: 0, labels: 0, y: -108, tilt: -14, shadow: 0.28 };

    const apply = () => {
      stage.style.setProperty('--open', state.open.toFixed(3));
      stage.style.setProperty('--draw', state.draw.toFixed(4));
      stage.style.setProperty('--labels', state.labels.toFixed(3));
      stage.style.setProperty('--shadow', state.shadow.toFixed(3));
      wrap.style.transform = `translate3d(0, ${state.y.toFixed(2)}%, 0) rotateX(${state.tilt.toFixed(2)}deg)`;
    };
    apply();

    if (reducedMotion()) {
      state.open = 0;
      state.draw = 1;
      state.labels = 1;
      state.y = 0;
      state.tilt = 0;
      apply();
      return;
    }

    const mm = gsap.matchMedia();

    const build = (pinned: boolean) => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: pinned ? 'top top' : 'top 78%',
          end: pinned ? '+=165%' : 'bottom 45%',
          pin: pinned,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(state, { y: 0, tilt: 0, duration: 0.3, ease: 'power2.out', onUpdate: apply }, 0)
        .to(state, { open: 0, duration: 0.36, ease: 'power2.inOut', onUpdate: apply }, 0.12)
        .to(state, { draw: 1, duration: 0.42, ease: 'none', onUpdate: apply }, 0.4)
        .to(state, { labels: 1, duration: 0.16, onUpdate: apply }, 0.72)
        .to(state, { shadow: 0.1, duration: 0.3, onUpdate: apply }, 0.66);

      return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
      };
    };

    mm.add('(min-width: 900px)', () => build(true));
    mm.add('(max-width: 899px)', () => build(false));

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => mm.revert();
  }, []);

  return (
    <section id="blueprint" ref={sectionRef} className="feature feature--blueprint">
      <div className="feature__inner">
        <div className="feature__copy">
          <p className="kicker">
            <span className="kicker__num">01</span>
            The drawing
          </p>

          <CraftText as="h2" text="The plan is the product." className="feature__title" />

          <p className="feature__lede">
            You do not need a CAD file. Photograph the drawing in the drawer, drop it on the sheet,
            and trace the walls over the top. The board carries the tools a plan actually needs:
            wall runs at 120 mm, door swings, window sills, and a grid that snaps at one hundred
            millimetres.
          </p>

          <ul className="spec-list">
            <li>
              <span className="mono">Trace</span>
              <span>Over a photo, or from a blank sheet</span>
            </li>
            <li>
              <span className="mono">Snap</span>
              <span>100 mm grid · 15° rotation</span>
            </li>
            <li>
              <span className="mono">Scale</span>
              <span>Two points, one real distance</span>
            </li>
            <li>
              <span className="mono">Rooms</span>
              <span>Three, joined by shared walls</span>
            </li>
          </ul>

          <p className="feature__note">
            The moment the scale is set, every dimension on the sheet is real — and the room is
            ready to stand up.
          </p>
        </div>

        <div className="feature__stage blueprint" ref={stageRef} aria-hidden="true">
          <p className="hud hud--tl mono">Sheet A-01 · ground floor</p>
          <p className="hud hud--tr mono">1:50 @ A3</p>

          <div className="sheet-wrap" ref={wrapRef}>
            <div className="sheet__shadow" />
            <div className="sheet">
              <div className="sheet__half sheet__half--left">
                <div className="sheet__inner">
                  <PlanSheet />
                </div>
                <span className="sheet__crease sheet__crease--left" />
              </div>
              <div className="sheet__half sheet__half--right">
                <div className="sheet__inner sheet__inner--right">
                  <PlanSheet />
                </div>
                <span className="sheet__crease sheet__crease--right" />
              </div>
              <span className="sheet__scan" />
            </div>
          </div>

          <div className="hud hud--bl mono">
            <span>Trace</span>
            <span>Snap</span>
            <span>Scale</span>
            <span>Extrude</span>
          </div>
          <p className="hud hud--br mono">mm · Asia/Kathmandu</p>
        </div>
      </div>
    </section>
  );
}
