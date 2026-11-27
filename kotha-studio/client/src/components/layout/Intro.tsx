import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/motion';
import { INTRO_EVENT, introWillPlay } from '../../lib/intro';
import { startScroll, stopScroll } from '../../lib/smooth';

/** Bernoulli lemniscate — the same infinity the hero uses, drawn across the sheet. */
const RAIL_POINTS = Array.from({ length: 361 }, (_, index) => {
  const t = (index / 360) * Math.PI * 2;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const denom = 1 + sin * sin;
  const x = 600 + (380 * cos) / denom;
  const y = 400 + (210 * sin * cos) / denom;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
});
const RAIL_PATH = `M ${RAIL_POINTS.join(' L ')} Z`;

/** Small line-art specimens that travel the infinity as a train. */
const TRAIL_ICONS = [
  'M -6 -2 L -6 -7 M -6 0 L -6 3 M 6 -2 L 6 -7 M 6 0 L 6 3 M -7 -2 L 7 -2 M -7 -2 L -7 1 L 7 1 L 7 -2 M -6 1 L -6 4 M 6 1 L 6 4',
  'M 0 4 L 0 -1 M -3 4 L 3 4 M -4 -4 L 4 -4 L 2 -7 L -2 -7',
  'M -6 -2 L 6 -2 L 6 -1 L -6 -1 Z M -5 -1 L -5 3 M 5 -1 L 5 3',
  'M 0 3 L 0 -1 M 0 -1 C -4 -1 -5 -4 -5 -6 C -2 -6 0 -4 0 -1 M 0 -1 C 4 -1 5 -4 5 -6 C 2 -6 0 -4 0 -1 M -3 3 L 3 3 L 2 6 L -2 6 Z',
  'M -6 -6 L 6 -6 L 6 6 L -6 6 Z M -3 -6 L -3 6 M 3 -6 L 3 6 M -6 -1 L 6 -1',
  'M -4 -4 L 4 -4 L 4 4 L -4 4 Z M 0 -4 L 0 4 M -4 0 L 4 0',
];

export function Intro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const playable = introWillPlay();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !playable) return;

    stopScroll();
    document.documentElement.classList.add('intro-lock');

    let cancelled = false;
    let finished = false;
    let timeline: gsap.core.Timeline | null = null;
    let timer = 0;
    let fontTimer = 0;

    const unlock = () => {
      document.documentElement.classList.remove('intro-lock');
      startScroll();
    };

    const begin = () => {
      window.dispatchEvent(new Event(INTRO_EVENT));
      unlock();
    };

    const complete = () => {
      if (finished) return;
      finished = true;
      begin();
      root.style.visibility = 'hidden';
      window.setTimeout(() => {
        import('../../lib/motion').then(({ ScrollTrigger }) => ScrollTrigger.refresh());
      }, 80);
    };

    const skip = () => {
      if (finished) return;
      if (timeline) timeline.progress(1);
      else complete();
    };

    const onKey = () => skip();

    const play = () => {
      if (cancelled || finished) return;
      const rail = root.querySelector<SVGPathElement>('.intro__rail');
      if (!rail) return;
      const len = rail.getTotalLength();
      const state = { p: 0 };
      const items = Array.from(root.querySelectorAll<SVGGElement>('.intro__item'));
      const counter = { value: 0 };

      const place = () => {
        items.forEach((node, index) => {
          const u = ((state.p + index * 0.045) % 1 + 1) % 1;
          const at = u * len;
          const pt = rail.getPointAtLength(at);
          const ahead = rail.getPointAtLength((at + 1.2) % len);
          const angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
          node.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${angle})`);
        });
      };

      timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });

      timeline
        .fromTo('.intro__meta--top', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0)
        .fromTo('.intro__foot', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.4)
        .fromTo('.intro__rule span', { scaleX: 0 }, { scaleX: 1, duration: 0.85, ease: 'power2.inOut' }, 0.1)
        .fromTo(
          '.intro__rail',
          { strokeDashoffset: 1, opacity: 0.18 },
          { strokeDashoffset: 0, opacity: 0.28, duration: 1.1, ease: 'power2.inOut' },
          0.15,
        )
        .fromTo(
          '.intro__guide',
          { strokeDashoffset: 1, opacity: 0 },
          { strokeDashoffset: 0, opacity: 0.55, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' },
          1.15,
        )
        .to(state, { p: 0.6, duration: 1.5, ease: 'none', onUpdate: place }, 0.2)
        .to(state, { p: 3.2, duration: 1.05, ease: 'power2.in', onUpdate: place }, 1.7)
        .fromTo('.intro__sub', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.65 }, 2.1)
        .to('.intro__trail', { opacity: 0, duration: 0.5, ease: 'power2.out' }, 2.6)
        .to('.intro__rail', { opacity: 0.12, duration: 0.5 }, 2.6)
        .to(
          counter,
          {
            value: 100,
            duration: 1.6,
            ease: 'power1.inOut',
            onUpdate: () => {
              if (countRef.current) {
                countRef.current.textContent = String(Math.round(counter.value)).padStart(2, '0');
              }
            },
          },
          0.35,
        )
        .to('.intro__content', { y: -34, opacity: 0, duration: 0.65, ease: 'power2.in' }, 3.05)
        .to('.intro__meta--top, .intro__foot', { opacity: 0, duration: 0.45 }, 3.05)
        .to(root, { yPercent: -100, duration: 0.95, ease: 'power4.inOut' }, 3.05)
        .call(begin, [], 3.07)
        .call(complete, [], 4.05);

      place();
    };

    timer = window.setTimeout(() => {
      if (cancelled) return;
      if (!document.fonts) {
        play();
        return;
      }
      Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => {
          fontTimer = window.setTimeout(resolve, 600);
        }),
      ])
        .then(play)
        .catch(play);
    }, 0);

    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchstart', skip, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(fontTimer);
      timeline?.kill();
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', onKey);
      if (!finished) unlock();
    };
  }, [playable]);

  if (!playable) return null;

  return (
    <div className="intro" ref={rootRef}>
      <div className="intro__grid" aria-hidden="true" />
      <div className="intro__frame" aria-hidden="true" />
      <span className="intro__crop intro__crop--tl" aria-hidden="true" />
      <span className="intro__crop intro__crop--tr" aria-hidden="true" />
      <span className="intro__crop intro__crop--bl" aria-hidden="true" />
      <span className="intro__crop intro__crop--br" aria-hidden="true" />

      <svg className="intro__stage" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="intro__rail" pathLength={1} d={RAIL_PATH} />
        <g className="intro__trail">
          {TRAIL_ICONS.map((icon, index) => (
            <g key={index} className="intro__item">
              <path d={icon} />
            </g>
          ))}
        </g>
        <g className="intro__guides">
          <line className="intro__guide" x1="400" y1="400" x2="800" y2="400" pathLength={1} />
          <line className="intro__guide" x1="600" y1="300" x2="600" y2="500" pathLength={1} />
        </g>
      </svg>

      <div className="intro__meta intro__meta--top">
        <span className="mono">Kotha Studio · sheet A-00</span>
        <span className="mono">Est. MMXXVI / KTM</span>
      </div>

      <div className="intro__content">
        <div className="intro__rule" aria-hidden="true">
          <span />
        </div>

        <p className="intro__sub mono">A blueprint becomes a room</p>
      </div>

      <div className="intro__foot">
        <button
          type="button"
          className="intro__skip mono"
          onClick={() => {
            const root = rootRef.current;
            if (root) root.dispatchEvent(new Event('intro-skip'));
          }}
        >
          Click or press any key to enter
        </button>
        <span className="intro__count mono" ref={countRef}>
          00
        </span>
      </div>
    </div>
  );
}
