import type { ReactNode } from 'react';

/**
 * Hairline furniture for the orbit. Deliberately drawn on the same 48-unit
 * grid so the whole field shares one pen weight — the cut-out photographs sit
 * beside these, and a single weight is what keeps the mix from looking random.
 */
function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ChairArt = () => (
  <Frame>
    <path d="M16 5v20h22v18" />
    <path d="M16 25 12.5 43" />
    <path d="M20 30h13" />
    <path d="M16 11h13" opacity=".35" />
  </Frame>
);

export const ArmchairArt = () => (
  <Frame>
    <path d="M13 21v-9a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v9" />
    <path d="M8 23a3 3 0 0 1 3 3v8h26v-8a3 3 0 0 1 3-3" />
    <path d="M14 34h20" />
    <path d="M12 34v8M36 34v8" />
    <path d="M16 12v9M32 12v9" opacity=".3" />
  </Frame>
);

export const TableArt = () => (
  <Frame>
    <path d="M6 18h36v4H6z" />
    <path d="M10 22v20M38 22v20" />
    <path d="M14 22v5M34 22v5" opacity=".4" />
    <path d="M10 38h4M34 38h4" opacity=".4" />
  </Frame>
);

export const RoundTableArt = () => (
  <Frame>
    <ellipse cx="24" cy="17" rx="16" ry="4.6" />
    <path d="M24 21.6v15" />
    <path d="M14 41h20" />
    <path d="M15 42h18" opacity=".3" />
  </Frame>
);

export const LampArt = () => (
  <Frame>
    <path d="M15 42h18" />
    <path d="M24 42V20" />
    <path d="M16 20h16l-4-10h-8z" />
    <path d="M21 42v-2M27 42v-2" opacity=".35" />
  </Frame>
);

export const PendantArt = () => (
  <Frame>
    <path d="M24 2v12" />
    <path d="M15 29h18l-5-12h-8z" />
    <circle cx="24" cy="32" r="1.6" />
    <path d="M20 34.5 18 40M28 34.5 30 40" opacity=".3" />
  </Frame>
);

export const SofaArt = () => (
  <Frame>
    <rect x="6" y="19" width="36" height="14" rx="2" />
    <path d="M6 19v-4a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v4" />
    <path d="M15 19v14M33 19v14" />
    <path d="M9 33v7M39 33v7" />
  </Frame>
);

export const StoolArt = () => (
  <Frame>
    <ellipse cx="24" cy="18" rx="11" ry="3.4" />
    <path d="M14 19.5 11 41M34 19.5 37 41M26 21.5l2 19.5" />
    <path d="M16 32h15" opacity=".3" />
  </Frame>
);

export const ShelfArt = () => (
  <Frame>
    <rect x="10" y="6" width="28" height="36" />
    <path d="M10 18h28M10 30h28" />
    <path d="M14 12v6M17 13v5M20 12v6M25 13.5v4.5" opacity=".45" />
    <path d="M14 24v6M17 25v5M30 24v6" opacity=".3" />
  </Frame>
);

export const CabinetArt = () => (
  <Frame>
    <rect x="9" y="8" width="30" height="34" />
    <path d="M24 8v34M9 25h30" />
    <path d="M21 20h-1M27 20h1M21 33h-1M27 33h1" strokeWidth={2} />
    <path d="M12 42v3M36 42v3" />
  </Frame>
);

export const PlantArt = () => (
  <Frame>
    <path d="M18 29h12l-2 13H20z" />
    <path d="M24 29c0-8-3-12-8-15" />
    <path d="M24 29c0-9 3-13 9-16" />
    <path d="M24 29v-9" />
    <path d="M16 14c-3 1-4 4-3 6 3 .5 5-1 6-4" />
    <path d="M33 13c3 1 4 4 3 6-3 .5-5-1-6-4" />
    <path d="M24 20c-3-1-5-3-5-6 3-.5 5 1 6 4" />
  </Frame>
);

export const RugArt = () => (
  <Frame>
    <path d="M6 29 38 20l6 6-32 9z" />
    <path d="M11 30.5 37 23.6" opacity=".35" />
    <path d="M7 36l-2 3M13 37.5l-2 3M19 36.5l-2 3M25 35l-2 3M31 33.5l-2 3M37 32l-2 3" opacity=".5" />
  </Frame>
);

export const ArchArt = () => (
  <Frame>
    <path d="M8 43V23a16 16 0 0 1 32 0v20" />
    <path d="M14 43V24a10 10 0 0 1 20 0v19" />
    <path d="M8 43h32M24 7v3" opacity=".35" />
  </Frame>
);

export const WindowArt = () => (
  <Frame>
    <rect x="9" y="7" width="30" height="32" />
    <path d="M24 7v32M9 23h30" />
    <path d="M6 39h36M12 43h24" opacity=".35" />
  </Frame>
);

export const DoorArt = () => (
  <Frame>
    <path d="M13 44V5h22v39" />
    <path d="M13 44h22" />
    <circle cx="30" cy="25" r="1.3" />
    <path d="M18 10h12v10H18z" opacity=".35" />
    <path d="M18 24h12v10H18z" opacity=".2" />
  </Frame>
);

export const PlanArt = () => (
  <Frame>
    <path d="M9 8h24l6 6v26H9z" />
    <path d="M33 8v6h6" />
    <path d="M13 20h22M13 26h22M13 32h14" opacity=".3" />
    <path d="M17 8v26M27 14v26" opacity=".18" />
    <path d="M9 43h30M9 41v4M39 41v4" opacity=".45" />
    <path d="M12 37l3-2M18 30l3-2M29 21l3-2" opacity=".4" />
  </Frame>
);

export const TapeArt = () => (
  <Frame>
    <rect x="5" y="17" width="38" height="14" rx="2" />
    <path d="M11 17v7M17 17v5M23 17v7M29 17v5M35 17v7" />
    <path d="M39 24h3v6h-3" opacity=".4" />
  </Frame>
);
