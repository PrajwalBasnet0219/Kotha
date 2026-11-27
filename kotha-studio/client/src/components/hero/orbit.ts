import type { ReactElement } from 'react';
import {
  ArmchairArt,
  CabinetArt,
  ChairArt,
  DoorArt,
  LampArt,
  PlanArt,
  PlantArt,
  RoundTableArt,
  ShelfArt,
  SofaArt,
  StoolArt,
  TableArt,
  WindowArt,
} from './heroArt';

export type OrbitEntry = {
  id: string;
  label: string;
  /** Rendered width in CSS pixels on a desktop viewport. */
  size: number;
  lane: 'back' | 'front';
  /** Where the object sits on the lemniscate, in radians. */
  phase: number;
  /** Radians per second. Shared so the spacing between items holds. */
  speed: number;
  /** Static lean, degrees. */
  tilt: number;
  /** How far it drifts outward as the hero leaves, in pixels. */
  scatterDist: number;
  scatterAngle: number;
  Art: () => ReactElement;
};

const TAU = Math.PI * 2;
const step = TAU / 14;
const phase = (i: number) => i * step + 0.22;

/**
 * Fourteen objects on one loop. Alternate lanes so half pass under the
 * wordmark and half pass over it — the eye reads that as depth without a
 * single 3D transform.
 */
export const ORBIT: OrbitEntry[] = [
  { id: 'chair', label: 'Lounge chair', size: 58, lane: 'front', phase: phase(0), speed: 0.15, tilt: -6, scatterDist: 70, scatterAngle: -0.6, Art: ChairArt },
  { id: 'plan', label: 'Tracing sheet', size: 86, lane: 'back', phase: phase(1), speed: 0.15, tilt: 8, scatterDist: 90, scatterAngle: -1.5, Art: PlanArt },
  { id: 'table', label: 'Dining table', size: 72, lane: 'back', phase: phase(2), speed: 0.15, tilt: -3, scatterDist: 80, scatterAngle: -2.4, Art: TableArt },
  { id: 'window', label: 'Window, 1200 mm', size: 66, lane: 'front', phase: phase(3), speed: 0.15, tilt: 4, scatterDist: 75, scatterAngle: -2.9, Art: WindowArt },
  { id: 'plant', label: 'Fiddle-leaf fig', size: 56, lane: 'front', phase: phase(4), speed: 0.15, tilt: -5, scatterDist: 85, scatterAngle: 2.9, Art: PlantArt },
  { id: 'sofa', label: 'Two-seat sofa', size: 82, lane: 'back', phase: phase(5), speed: 0.15, tilt: 3, scatterDist: 95, scatterAngle: 2.3, Art: SofaArt },
  { id: 'lamp', label: 'Floor lamp', size: 54, lane: 'front', phase: phase(6), speed: 0.15, tilt: 2, scatterDist: 65, scatterAngle: 1.7, Art: LampArt },
  { id: 'window-b', label: 'Window frame', size: 60, lane: 'back', phase: phase(7), speed: 0.15, tilt: -7, scatterDist: 88, scatterAngle: 1.1, Art: WindowArt },
  { id: 'shelf', label: 'Open shelving', size: 64, lane: 'front', phase: phase(8), speed: 0.15, tilt: 5, scatterDist: 92, scatterAngle: 0.6, Art: ShelfArt },
  { id: 'stool', label: 'Stool, 450 mm', size: 48, lane: 'back', phase: phase(9), speed: 0.15, tilt: -4, scatterDist: 70, scatterAngle: 0.1, Art: StoolArt },
  { id: 'door', label: 'Door, 900 mm', size: 62, lane: 'front', phase: phase(10), speed: 0.15, tilt: 6, scatterDist: 78, scatterAngle: -0.4, Art: DoorArt },
  { id: 'round', label: 'Side table', size: 52, lane: 'back', phase: phase(11), speed: 0.15, tilt: -2, scatterDist: 82, scatterAngle: 3.4, Art: RoundTableArt },
  { id: 'armchair', label: 'Armchair', size: 64, lane: 'front', phase: phase(12), speed: 0.15, tilt: 3, scatterDist: 90, scatterAngle: 2.0, Art: ArmchairArt },
  { id: 'cabinet', label: 'Low cabinet', size: 60, lane: 'back', phase: phase(13), speed: 0.15, tilt: -6, scatterDist: 76, scatterAngle: 1.2, Art: CabinetArt },
];
