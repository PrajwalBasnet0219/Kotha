import { useEffect, useRef, useState } from 'react';
import { gsap, reducedMotion } from '../../lib/motion';

/** Four irregular slices per letter — just enough to read as a break without
 *  turning the wordmark into confetti. Shared edges tile the glyph box. */
const PIECES = [
  'polygon(0% 0%, 54% 0%, 47% 47%, 0% 53%)',
  'polygon(54% 0%, 100% 0%, 100% 56%, 47% 47%)',
  'polygon(0% 53%, 47% 47%, 51% 100%, 0% 100%)',
  'polygon(47% 47%, 100% 56%, 100% 100%, 51% 100%)',
];

const DRIFT = [
  { x: -7, y: -6, rotate: -5 },
  { x: 7, y: -5, rotate: 5 },
  { x: -6, y: 7, rotate: 4 },
  { x: 6, y: 6, rotate: -4 },
];

type ShatterWordProps = {
  text: string;
  className?: string;
  /** Hold the reveal until the intro sheet lifts. */
  play?: boolean;
  delay?: number;
};

/**
 * The hero wordmark. Each glyph is split into four clipped layers so the
 * letter can break apart and reassemble on hover. The reveal lifts the whole
 * glyph as one piece, so the word still reads as a single printed mark on
 * arrival. Reduced motion keeps the static wordmark.
 */
export function ShatterWord({ text, className = '', play = true, delay = 0 }: ShatterWordProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const [hovered, setHovered] = useState(false);

  // Arrival: the same printed lift the rest of the page uses.
  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;
    const glyphs = el.querySelectorAll<HTMLElement>('.shatter-glyph');
    if (!glyphs.length) return;

    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        glyphs,
        { yPercent: 118, opacity: 0, rotate: (i: number) => (i % 2 === 0 ? -5 : 5), filter: 'blur(6px)' },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          filter: 'blur(0px)',
          duration: 1.15,
          delay,
          stagger: { each: 0.07, from: 'start' },
          ease: 'expo.out',
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, play]);

  const shatter = () => {
    const el = ref.current;
    if (!el || busy.current || reducedMotion()) return;
    const pieces = el.querySelectorAll<HTMLElement>('.shatter-piece');
    if (!pieces.length) return;

    busy.current = true;
    const timeline = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });

    timeline
      .to(pieces, {
        x: (i: number) => DRIFT[i % 4].x,
        y: (i: number) => DRIFT[i % 4].y,
        rotate: (i: number) => DRIFT[i % 4].rotate,
        opacity: 0.82,
        duration: 0.26,
        ease: 'power2.out',
        stagger: { each: 0.006, from: 'start' },
      })
      .to(
        pieces,
        {
          x: 0,
          y: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.66,
          ease: 'power3.inOut',
          stagger: { each: 0.014, from: 'random' },
        },
        0.3,
      );
  };

  // One quiet shatter after the arrival, so the mark shows what it does.
  useEffect(() => {
    if (!play || reducedMotion()) return;
    const timer = window.setTimeout(() => {
      if (!hovered) shatter();
    }, (delay + 1.6) * 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, delay]);

  return (
    <h1
      ref={ref}
      className={`wordmark shatter ${className}`.trim()}
      aria-label={text}
      onPointerEnter={() => {
        setHovered(true);
        shatter();
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <span className="shatter-word" aria-hidden="true">
        {Array.from(text).map((char, charIndex) => (
          <span className="shatter-char" key={`${char}-${charIndex}`}>
            <span className="shatter-glyph">
              <span className="shatter-size" aria-hidden="true">
                {char}
              </span>
              {PIECES.map((clip, pieceIndex) => (
                <span
                  className="shatter-piece"
                  key={pieceIndex}
                  style={{ clipPath: clip, WebkitClipPath: clip }}
                >
                  {char}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}
