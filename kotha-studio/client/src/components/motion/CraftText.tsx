import { Fragment, createElement, useEffect, useRef, type ElementType } from 'react';
import { gsap, reducedMotion } from '../../lib/motion';

type CraftTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Animate on page load instead of waiting for the scroll position. */
  on?: 'load' | 'scroll';
  /** Hold the animation until the page is ready (used behind the intro). */
  play?: boolean;
  delay?: number;
  /** Seconds between characters. */
  stagger?: number;
};

/**
 * The "crafted" reveal.
 *
 * Every letter has two layers: a hairline outline of itself sitting slightly
 * above, and the solid ink version below. On entry the ink rises from under
 * the baseline while the outline lifts away and fades — the letter looks like
 * it is being drawn onto the sheet, then printed. Words stay unbroken, so the
 * browser still wraps the heading naturally.
 */
export function CraftText({
  text,
  as = 'span',
  className = '',
  on = 'scroll',
  play = true,
  delay = 0,
  stagger = 0.024,
}: CraftTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;

    const inks = el.querySelectorAll<HTMLElement>('.craft-ink');
    const ghosts = el.querySelectorAll<HTMLElement>('.craft-ghost');
    if (!inks.length) return;

    if (reducedMotion()) {
      gsap.set(inks, { clearProps: 'all' });
      gsap.set(ghosts, { opacity: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        delay,
        paused: on !== 'load',
        scrollTrigger:
          on === 'scroll'
            ? { trigger: el, start: 'top 86%', once: true }
            : undefined,
      });

      timeline
        .fromTo(
          inks,
          {
            yPercent: 118,
            opacity: 0,
            rotate: (i: number) => (i % 2 === 0 ? -5 : 5),
            filter: 'blur(6px)',
          },
          {
            yPercent: 0,
            opacity: 1,
            rotate: 0,
            filter: 'blur(0px)',
            duration: 1.15,
            stagger: { each: stagger, from: 'start' },
            ease: 'expo.out',
          },
          0,
        )
        .fromTo(
          ghosts,
          { yPercent: 0, opacity: 0.5 },
          {
            yPercent: -90,
            opacity: 0,
            duration: 0.95,
            stagger: { each: stagger, from: 'start' },
            ease: 'power2.out',
          },
          0,
        );
    }, el);

    return () => ctx.revert();
  }, [text, on, delay, stagger, play]);

  const words = text.split(' ');

  return createElement(
    as,
    { ref, className, 'aria-label': text },
    <span aria-hidden="true">
      {words.map((word, wi) => (
        <Fragment key={`${word}-${wi}`}>
          <span className="craft-word">
            {Array.from(word).map((char, ci) => (
              <span className="craft-char" key={`${char}-${ci}`}>
                <span className="craft-ghost">{char}</span>
                <span className="craft-ink">{char}</span>
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>,
  );
}
