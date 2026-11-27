import { useEffect, useRef } from 'react';
import { Nav } from '../components/layout/Nav';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/hero/Hero';
import { BlueprintFold } from '../components/landing/BlueprintFold';
import { RoomBuild } from '../components/landing/RoomBuild';
import { Collection } from '../components/landing/Collection';
import { Studio } from '../components/landing/Studio';
import { Handover } from '../components/landing/Handover';
import { Closing } from '../components/landing/Closing';
import { ScrollTrigger, reducedMotion } from '../lib/motion';

const REGISTER = [
  'Plan A-01 · ground floor',
  'Scale 1:50 @ A3',
  'Walls 120 mm',
  'Living 4.20 × 3.60 m',
  'Area 15.12 m²',
  'Perimeter 15.60 m',
  'Door D1 · 900 mm',
  'Window W1 · 1200 mm',
  'Grid 100 mm',
  'Height 2800 mm',
  'Drawn in Kathmandu',
  'All dimensions in millimetres',
];

function RegisterStrip() {
  const line = REGISTER.join('  ·  ');
  return (
    <div className="register" aria-hidden="true">
      <div className="register__track">
        <span>{line}</span>
        <span>{line}</span>
      </div>
      <p className="register__tag mono">Sheet register</p>
    </div>
  );
}

export function Landing() {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (reducedMotion()) {
      bar.style.transform = 'scaleY(1)';
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        bar.style.transform = `scaleY(${self.progress.toFixed(4)})`;
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="lens" aria-hidden="true" />
      <div className="rail" aria-hidden="true">
        <span ref={barRef} />
      </div>

      <Nav />

      <main>
        <Hero />
        <RegisterStrip />
        <BlueprintFold />
        <RoomBuild />
        <Collection />
        <Studio />
        <Handover />
        <Closing />
      </main>

      <Footer />
    </>
  );
}
