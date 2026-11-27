import { useState } from 'react';
import { CraftText } from '../motion/CraftText';
import {
  ChairArt,
  LampArt,
  PlantArt,
  ShelfArt,
  SofaArt,
  TableArt,
} from '../hero/heroArt';

type Piece = {
  id: string;
  name: string;
  group: 'Seating' | 'Tables' | 'Storage' | 'Lighting' | 'Plant';
  w: number;
  d: number;
  h: number;
  fit: string;
  fits: boolean;
  Art: () => React.ReactElement;
};

const PIECES: Piece[] = [
  { id: 'sofa', name: 'Two-seat sofa', group: 'Seating', w: 1840, d: 860, h: 780, fit: 'Fits the long wall', fits: true, Art: SofaArt },
  { id: 'chair', name: 'Lounge chair', group: 'Seating', w: 760, d: 800, h: 720, fit: 'Fits the corner', fits: true, Art: ChairArt },
  { id: 'table', name: 'Dining table', group: 'Tables', w: 1600, d: 900, h: 750, fit: 'Clears the door swing', fits: true, Art: TableArt },
  { id: 'shelf', name: 'Open shelving', group: 'Storage', w: 900, d: 320, h: 1800, fit: 'Fits the left wall', fits: true, Art: ShelfArt },
  { id: 'lamp', name: 'Floor lamp', group: 'Lighting', w: 380, d: 380, h: 1620, fit: 'Fits beside the chair', fits: true, Art: LampArt },
  { id: 'fig', name: 'Fiddle-leaf fig', group: 'Plant', w: 520, d: 520, h: 1500, fit: 'Fits the window corner', fits: true, Art: PlantArt },
  { id: 'chaise', name: 'Chaise, three-seat', group: 'Seating', w: 2900, d: 980, h: 760, fit: 'Too wide · 1.90 m gap', fits: false, Art: SofaArt },
];

const GROUPS = ['All', 'Seating', 'Tables', 'Storage', 'Lighting', 'Plant'] as const;

export function Collection() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');
  const visible = group === 'All' ? PIECES : PIECES.filter((piece) => piece.group === group);

  return (
    <section id="collection" className="feature feature--collection">
      <div className="feature__inner feature__inner--collection">
        <header className="collection__head">
          <div>
            <p className="kicker">
              <span className="kicker__num">03</span>
              The collection
            </p>
            <CraftText
              as="h2"
              text="If it does not fit, it does not appear."
              className="feature__title feature__title--wide"
            />
          </div>
          <p className="collection__note">
            Every piece carries its real footprint. The catalogue is filtered against the room you
            drew before a single card is shown, so nothing that will not fit is ever offered.
          </p>
        </header>

        <div className="collection__filters" role="group" aria-label="Filter furniture">
          {GROUPS.map((name) => (
            <button
              key={name}
              type="button"
              className={group === name ? 'is-active' : ''}
              onClick={() => setGroup(name)}
              aria-pressed={group === name}
            >
              {name}
            </button>
          ))}
          <span className="collection__count mono">
            {String(visible.length).padStart(2, '0')} pieces
          </span>
        </div>

        <div className="collection__grid">
          {visible.map((piece) => {
            const Art = piece.Art;
            return (
              <article
                key={`${group}-${piece.id}`}
                className={`piece ${piece.fits ? '' : 'piece--out'}`}
              >
                <div className="piece__plate">
                  <div className="piece__art">
                    <Art />
                  </div>
                  <span className="piece__tag mono">{piece.group}</span>
                </div>
                <div className="piece__body">
                  <div className="piece__row">
                    <h3>{piece.name}</h3>
                    <span className="piece__group mono">{piece.group}</span>
                  </div>
                  <p className="piece__dims mono">
                    {piece.w} × {piece.d} × {piece.h} mm
                  </p>
                  <p className={`piece__fit mono ${piece.fits ? '' : 'is-out'}`}>{piece.fit}</p>
                </div>
              </article>
            );
          })}
        </div>

        <p className="collection__fine mono">
          Dimensions in millimetres, not marketing copy · catalogue curated by the studio
        </p>
      </div>
    </section>
  );
}
