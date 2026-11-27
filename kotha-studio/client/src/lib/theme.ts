import { useSyncExternalStore } from 'react';
import { gsap } from './motion';

export type Theme = 'light' | 'dark';

const KEY = 'kotha:theme';
const EVENT = 'kotha:theme';
const listeners = new Set<() => void>();

let switching = false;

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function paint(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d0d0c' : '#f1f0ec');
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* private mode still gets the theme for this session */
  }
  paint(theme);
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const onEvent = () => listener();
  window.addEventListener(EVENT, onEvent);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(EVENT, onEvent);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, getTheme);
}

/** Read the saved choice, or the system preference, before the first paint. */
export function initTheme(): void {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (saved === 'light' || saved === 'dark') {
    paint(saved);
    return;
  }
  paint(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

type Origin = { x: number; y: number };

/**
 * The switch is a printed-sheet move: a new sheet is laid over the page with a
 * circular wipe, a field of hatch strokes is drawn across it, the palette flips
 * underneath, and the sheet lifts away. Reduced motion flips instantly.
 */
export function toggleTheme(origin?: Origin): void {
  if (switching) return;

  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    setTheme(next);
    return;
  }

  switching = true;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const x = origin ? origin.x : width / 2;
  const y = origin ? origin.y : height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 40;

  const overlay = document.createElement('div');
  overlay.className = 'theme-craft';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--craft-sheet', next === 'dark' ? '#0d0d0c' : '#f1f0ec');
  overlay.style.setProperty('--craft-ink', next === 'dark' ? '#f2f0e9' : '#141414');

  const sheet = document.createElement('div');
  sheet.className = 'theme-craft__sheet';
  overlay.append(sheet);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'theme-craft__svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Hatch field — sorted by distance from the switch origin so the strokes
  // appear to be laid down outward from the button.
  const strokes: SVGPathElement[] = [];
  const stepX = 58;
  const stepY = 52;
  for (let gy = -1; gy * stepY < height + 80; gy++) {
    for (let gx = -1; gx * stepX < width + 80; gx++) {
      const px = gx * stepX + ((gy * 37) % 26);
      const py = gy * stepY + ((gx * 19) % 22);
      const length = 15 + ((gx * gy + 40) % 11);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${px} ${py} l ${length} -${Math.round(length * 0.62)}`);
      path.setAttribute('pathLength', '1');
      path.setAttribute('class', 'theme-craft__line');
      svg.append(path);
      strokes.push(path);
    }
  }

  // Registration marks in the corners of the new sheet.
  const marks = [
    `M 26 26 h 18 M 26 26 v 18`,
    `M ${width - 26} 26 h -18 M ${width - 26} 26 v 18`,
    `M 26 ${height - 26} h 18 M 26 ${height - 26} v -18`,
    `M ${width - 26} ${height - 26} h -18 M ${width - 26} ${height - 26} v -18`,
  ];
  for (const d of marks) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    path.setAttribute('class', 'theme-craft__mark');
    svg.append(path);
  }

  overlay.append(svg);
  document.body.append(overlay);

  const distance = (path: SVGPathElement): number => {
    const box = path.getBBox();
    return Math.hypot(box.x - x, box.y - y);
  };
  strokes.sort((a, b) => distance(a) - distance(b));

  document.documentElement.classList.add('theme-changing');

  const timeline = gsap.timeline({
    onComplete: () => {
      overlay.remove();
      document.documentElement.classList.remove('theme-changing');
      switching = false;
    },
  });

  timeline
    .set(sheet, { clipPath: `circle(0px at ${x}px ${y}px)` })
    .to(
      sheet,
      {
        clipPath: `circle(${radius}px at ${x}px ${y}px)`,
        duration: 0.62,
        ease: 'power3.inOut',
      },
      0,
    )
    .fromTo(
      strokes,
      { strokeDashoffset: 1, opacity: 0.85 },
      {
        strokeDashoffset: 0,
        duration: 0.46,
        ease: 'power2.out',
        stagger: { each: 0.006 },
      },
      0.04,
    )
    .fromTo(
      '.theme-craft__mark',
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out', stagger: 0.05 },
      0.1,
    )
    .call(() => setTheme(next), [], 0.42)
    .to(strokes, { opacity: 0, duration: 0.34, ease: 'power1.out' }, 0.66)
    .to('.theme-craft__mark', { opacity: 0, duration: 0.3 }, 0.66)
    .to(sheet, { opacity: 0, duration: 0.42, ease: 'power2.inOut' }, 0.76)
    .to(overlay, { opacity: 0, duration: 0.2 }, 1.02);
}
