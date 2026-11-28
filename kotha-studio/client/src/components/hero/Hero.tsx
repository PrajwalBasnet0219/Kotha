import { useEffect, useRef, useState } from 'react';
import { ShatterWord } from '../motion/ShatterWord';
import { ORBIT } from './orbit';
import { ScrollTrigger, clamp, easeOutCubic, reducedMotion } from '../../lib/motion';
import { INTRO_EVENT, introWillPlay } from '../../lib/intro';

const TILT = (-6 * Math.PI) / 180;
const COS = Math.cos(TILT);
const SIN = Math.sin(TILT);

type Box = { x0: number; y0: number; x1: number; y1: number };

type Metrics = {
  a: number;
  b: number;
  cx: number;
  cy: number;
  /** How much to shrink the objects on smaller stages. */
  unit: number;
  /** The wordmark's rectangle in stage coordinates, padded a little. */
  word: Box | null;
};

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const items = useRef<Array<HTMLDivElement | null>>([]);
  const metrics = useRef<Metrics>({ a: 0, b: 0, cx: 0, cy: 0, unit: 1, word: null });
  const scatterTarget = useRef(0);
  const scatter = useRef(0);
  const visible = useRef(true);
  const ready = useRef(!introWillPlay());
  const startRef = useRef(0);
  const [armed, setArmed] = useState(!introWillPlay());
  const [path, setPath] = useState('');

  // The intro sheet covers the page for a moment. Hold the hero's own intro
  // until it starts to lift, so the first thing the visitor sees is not a
  // race between two animations.
  useEffect(() => {
    if (ready.current) return;
    const onDone = () => {
      ready.current = true;
      startRef.current = performance.now();
      setArmed(true);
    };
    window.addEventListener(INTRO_EVENT, onDone, { once: true });
    return () => window.removeEventListener(INTRO_EVENT, onDone);
  }, []);



  // Measure the stage once and on every resize, and rebuild the loop path.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const a = Math.min(width * (width < 640 ? 0.42 : 0.375), 640);
      // On a phone a loop taller than it is wide stops reading as a figure of
      // eight, so the height is capped by the width as well.
      const b = Math.min(height * 0.62, width * 0.86, 780);
      const unit = width < 640 ? 0.72 : width < 1024 ? 0.86 : 1;

      let word: Box | null = null;
      const mark = stage.parentElement?.querySelector('.wordmark');
      if (mark) {
        const sr = stage.getBoundingClientRect();
        const wr = mark.getBoundingClientRect();
        const pad = width < 640 ? 8 : 14;
        word = {
          x0: wr.left - sr.left - pad,
          y0: wr.top - sr.top - pad,
          x1: wr.right - sr.left + pad,
          y1: wr.bottom - sr.top + pad,
        };
      }

      metrics.current = { a, b, cx: width / 2, cy: height / 2, unit, word };

      const points: string[] = [];
      const steps = 260;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const sin = Math.sin(t);
        const cos = Math.cos(t);
        const denom = 1 + sin * sin;
        const x = (a * cos) / denom;
        const y = (b * sin * cos) / denom;
        points.push(`${(width / 2 + x * COS - y * SIN).toFixed(1)},${(height / 2 + x * SIN + y * COS).toFixed(1)}`);
      }
      setPath(points.join(' '));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    // The wordmark box is measured in the fallback face until the serif
    // arrives, so measure again once it has.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  // Scroll progress while the hero leaves. The objects drift out and fade;
  // the blueprint sheet is the next section's opening move, not a shatter here.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const trigger = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        scatterTarget.current = self.progress;
      },
    });
    return () => trigger.kill();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
      },
      { rootMargin: '80px' },
    );
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const center = centerRef.current;
    const hero = heroRef.current;
    if (!stage || !center || !hero) return;

    const still = reducedMotion();
    if (ready.current && startRef.current === 0) startRef.current = performance.now();
    let raf = 0;

    const paint = (now: number) => {
      const armed = ready.current;
      const elapsed = armed ? (now - startRef.current) / 1000 : 0;
      const { a, b, cx, cy, unit, word } = metrics.current;
      if (a > 0 && visible.current) {
        scatter.current += (scatterTarget.current - scatter.current) * 0.075;
        const s = clamp(scatter.current);
        const drift = easeOutCubic(s);
        const clock = still ? 0 : elapsed;

        ORBIT.forEach((item, index) => {
          const el = items.current[index];
          if (!el) return;
          const phi = item.phase + clock * item.speed;
          const sin = Math.sin(phi);
          const cos = Math.cos(phi);
          const denom = 1 + sin * sin;
          const lx = (a * cos) / denom;
          const ly = (b * sin * cos) / denom;
          const rx = lx * COS - ly * SIN;
          const ry = lx * SIN + ly * COS;

          const intro = still ? 1 : armed ? easeOutCubic((now - startRef.current - index * 55) / 950) : 0;
          const bob = still ? 0 : Math.sin(elapsed * 0.66 + index * 1.7) * 3.2;
          const px = cx + rx + Math.cos(item.scatterAngle) * item.scatterDist * drift;
          const py = cy + ry + bob + Math.sin(item.scatterAngle) * item.scatterDist * drift * 0.7;

          // The upper arc is the part that travels over the wordmark; the lower
          // arc goes under it. Objects keep clear of the letterforms themselves,
          // so the loop can cross the name without turning the word into a
          // collage. The z-order still changes at the centre line.
          const front = ry < 0;
          let clear = 1;
          if (word) {
            const dx = Math.max(word.x0 - px, 0, px - word.x1);
            const dy = Math.max(word.y0 - py, 0, py - word.y1);
            clear = clamp(Math.hypot(dx, dy) / 64);
          }

          const scale = (0.58 + 0.42 * intro) * unit * (1 + drift * 0.06);
          const rot = item.tilt + (still ? 0 : Math.sin(elapsed * 0.44 + index) * 1.4);
          const opacity = (front ? 1 : 0.82) * intro * (1 - drift * 0.95) * clear;

          el.style.zIndex = front ? '4' : '1';
          el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
          el.style.opacity = opacity.toFixed(3);
        });

        center.style.transform = `translate3d(0, ${(-72 * drift).toFixed(1)}px, 0) scale(${(1 + drift * 0.05).toFixed(3)})`;
        center.style.opacity = armed ? Math.max(0, 1 - drift * 1.25).toFixed(3) : '0';
        hero.style.setProperty('--s', s.toFixed(4));
      }
      raf = requestAnimationFrame(paint);
    };

    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const el = readoutRef.current;
    if (!el) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    el.textContent = `X ${Math.round(2100 + nx * 4200)} · Y ${Math.round(1800 - ny * 3600)}`;
  };

  const resetReadout = () => {
    if (readoutRef.current) readoutRef.current.textContent = 'X 4200 · Y 3600';
  };

  return (
    <section
      id="top"
      ref={heroRef}
      className="hero"
      onPointerMove={onPointerMove}
      onPointerLeave={resetReadout}
    >
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__smoke hero__smoke--a" aria-hidden="true" />
      <div className="hero__smoke hero__smoke--b" aria-hidden="true" />

      <div className="hero__eyebrow">
        <p className="mono">Kotha Studio — interior planning, drawn to scale</p>
        <p className="mono">Est. MMXXVI / KTM</p>
      </div>

      <div className="hero__stage" ref={stageRef} aria-hidden="true">
        <svg className="hero__path hero__path--band" width="100%" height="100%" fill="none">
          <polyline points={path} stroke="currentColor" strokeWidth={26} opacity={0.035} strokeLinejoin="round" />
        </svg>
        <svg className="hero__path hero__path--dash hero__path--back" width="100%" height="100%" fill="none">
          <polyline
            points={path}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="1 8"
            strokeLinecap="round"
            opacity={0.38}
          />
        </svg>
        <svg className="hero__path hero__path--dash hero__path--front" width="100%" height="100%" fill="none">
          <polyline
            points={path}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="1 8"
            strokeLinecap="round"
            opacity={0.46}
          />
        </svg>

        {ORBIT.map((item, index) => {
          const Art = item.Art;
          return (
            <div
              key={item.id}
              ref={(node) => {
                items.current[index] = node;
              }}
              className="orbit-item"
              style={{ width: item.size }}
            >
              <Art />
            </div>
          );
        })}
      </div>

      <div className="hero__center" ref={centerRef}>
        <p className="hero__kicker mono">Kathmandu · interior planning</p>
        <ShatterWord text="Kotha" className="wordmark" play={armed} delay={0.15} />
        <div className="wordmark__row">
          <span className="wordmark__rule" />
          <span className="wordmark__sub">Studio</span>
          <span className="wordmark__rule" />
        </div>
        <p className="hero__lede">
          Trace the plan you already have. Stand in the room before it is built. Furnish only what
          fits.
        </p>
      </div>

      <div className="hero__foot">
        <div className="hero__spec">
          <p className="mono">Live specimen — living / 4.20 × 3.60 m</p>
          <p className="mono hero__spec-dim">15.12 m² · 15.60 m perimeter · wall 120 mm</p>
        </div>

        <a href="#blueprint" className="scroll-cue" aria-label="Scroll to the blueprint">
          <span className="scroll-cue__line">
            <span className="scroll-cue__dot" />
          </span>
          <span className="mono">Scroll to draw</span>
        </a>

        <div className="hero__readout">
          <span className="mono" ref={readoutRef}>
            X 4200 · Y 3600
          </span>
          <span className="mono hero__readout-sub">Grid 100 mm · 1:50 · v1.0</span>
        </div>
      </div>
    </section>
  );
}
