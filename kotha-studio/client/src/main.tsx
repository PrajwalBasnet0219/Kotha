import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Intro } from './components/layout/Intro';
import { initSmoothScroll } from './lib/smooth';
import { ScrollTrigger } from './lib/motion';
import { initTheme } from './lib/theme';
import './styles/base.css';
import './styles/intro.css';
import './styles/hero.css';
import './styles/landing.css';
import './styles/app.css';

initTheme();
initSmoothScroll();

document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
window.addEventListener('load', () => ScrollTrigger.refresh());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/' ? <Intro /> : null}
    <App />
  </StrictMode>,
);
