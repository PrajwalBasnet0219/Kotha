import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CraftText } from '../motion/CraftText';
import { ScrollTrigger, gsap, reducedMotion } from '../../lib/motion';

const KothaRoom = lazy(() =>
  import('../three/KothaRoom').then((module) => ({ default: module.KothaRoom })),
);

const STEPS = [
  { label: 'Floor', range: 0.18 },
  { label: 'Walls', range: 0.45 },
  { label: 'Openings', range: 0.6 },
  { label: 'Furniture', range: 0.8 },
];

export function RoomBuild() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const percentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const paint = (value: number) => {
      progress.current = value;
      if (barRef.current) barRef.current.style.transform = `scaleX(${value.toFixed(4)})`;
      if (percentRef.current) {
        percentRef.current.textContent = String(Math.round(value * 100)).padStart(2, '0');
      }
      let active = 0;
      STEPS.forEach((step, index) => {
        if (value >= step.range) active = index + 1;
      });
      stepRefs.current.forEach((item, index) => {
        if (!item) return;
        item.dataset.state = index < active ? 'done' : index === active ? 'active' : 'idle';
      });
    };

    if (reducedMotion()) {
      paint(1);
      return;
    }

    const mm = gsap.matchMedia();

    const attach = (pinned: boolean) => {
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: pinned ? 'top top' : 'top 72%',
        end: pinned ? '+=185%' : 'bottom 35%',
        pin: pinned,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => paint(self.progress),
        onRefresh: (self) => paint(self.progress),
      });
      return () => trigger.kill();
    };

    mm.add('(min-width: 900px)', () => attach(true));
    mm.add('(max-width: 899px)', () => attach(false));

    return () => mm.revert();
  }, []);

  return (
    <section id="room" ref={sectionRef} className="feature feature--room">
      <div className="feature__inner feature__inner--room">
        <div className="feature__copy">
          <p className="kicker">
            <span className="kicker__num">02</span>
            The room
          </p>

          <CraftText as="h2" text="The plan stands up." className="feature__title" />

          <p className="feature__lede">
            Walls extrude at the thickness you set, and the floor keeps the area the drawing
            computed. The door you drew is cut where you drew it, with the swing you chose. Change a
            wall and the model changes with it — there is no export step, and no second model to
            keep in sync.
          </p>

          <ol className="build-steps">
            {STEPS.map((step, index) => (
              <li
                key={step.label}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                data-state="idle"
              >
                <span className="build-steps__num mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="build-steps__label">{step.label}</span>
                <span className="build-steps__rule" />
              </li>
            ))}
          </ol>

          <p className="feature__note">
            Not a render. The walls are the drawing, given height — every dimension is still
            millimetres.
          </p>
        </div>

        <div className="feature__stage build">
          <div className="build__canvas">
            {near ? (
              <Suspense fallback={<p className="build__loading mono">Setting the model</p>}>
                <KothaRoom progress={progress} />
              </Suspense>
            ) : null}
          </div>

          <p className="hud hud--tl mono">Model / living + kitchen</p>
          <p className="hud hud--tr mono">
            <span ref={percentRef}>00</span>% built
          </p>

          <div className="build__readout hud hud--bl mono">
            <span>4.20 × 3.60 m</span>
            <span>15.12 m²</span>
            <span>2800 mm</span>
          </div>

          <div className="build__bar" aria-hidden="true">
            <span ref={barRef} />
          </div>

          <p className="hud hud--br mono">Scroll builds · no drag required</p>
        </div>
      </div>
    </section>
  );
}
