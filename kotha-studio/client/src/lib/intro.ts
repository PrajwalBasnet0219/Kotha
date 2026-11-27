import { reducedMotion } from './motion';

/** Fired the moment the intro sheet starts to lift, so the hero can begin. */
export const INTRO_EVENT = 'kotha:intro-done';

/** The intro is a motion piece; with reduced motion the page just starts. */
export const introWillPlay = (): boolean => !reducedMotion();
