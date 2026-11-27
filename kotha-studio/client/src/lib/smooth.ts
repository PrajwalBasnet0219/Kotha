import Lenis from 'lenis';
import { ScrollTrigger, gsap, reducedMotion } from './motion';

let instance: Lenis | null = null;
let wired = false;

/**
 * One Lenis for the whole document. GSAP's ticker drives it so ScrollTrigger
 * and the smooth scroll never disagree about where the page is.
 */
export function initSmoothScroll(): Lenis | null {
  if (typeof window === 'undefined' || reducedMotion()) return null;
  if (instance) return instance;

  instance = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.3,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  if (!wired) {
    wired = true;
    instance.on('scroll', (event) => {
      ScrollTrigger.update();
      // 0 → 1, used by the grain and the edge lens.
      const velocity = Math.min(1, Math.abs(event.velocity) / 45);
      document.documentElement.style.setProperty('--scroll-vel', velocity.toFixed(3));
    });
    gsap.ticker.add((time) => instance?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  return instance;
}

export const getLenis = (): Lenis | null => instance;

export const stopScroll = (): void => {
  instance?.stop();
  if (!instance) document.body.style.overflow = 'hidden';
};

export const startScroll = (): void => {
  instance?.start();
  if (!instance) document.body.style.overflow = '';
};
