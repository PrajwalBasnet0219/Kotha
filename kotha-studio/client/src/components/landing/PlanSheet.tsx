const INK = '#1b1b19';

/** A3 landscape sheet, 1100 × 760 drawing units. 1 unit ≈ 0.42 mm at print. */
export function PlanSheet() {
  return (
    <svg
      className="plan"
      viewBox="0 0 1100 760"
      role="img"
      aria-label="Ground floor plan of a two-room flat, drawn to 1:50, with dimensions and a title block."
    >
      <rect width="1100" height="760" fill="#f8f6ef" />
      <rect x="18" y="18" width="1064" height="724" stroke={INK} strokeWidth="1" fill="none" />
      <rect x="26" y="26" width="1048" height="708" stroke={INK} strokeWidth="0.6" fill="none" opacity="0.35" />

      {[
        [18, 18],
        [1082, 18],
        [18, 742],
        [1082, 742],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={INK} strokeWidth="0.8" opacity="0.6">
          <line x1={x - 8} y1={y} x2={x + 8} y2={y} />
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
        </g>
      ))}

      <line
        x1="550"
        y1="30"
        x2="550"
        y2="730"
        stroke={INK}
        strokeWidth="0.8"
        strokeDasharray="1 7"
        opacity="0.18"
      />

      {/* ------------------------------------------------ the drawing */}
      <g className="plan-ink">
        <g transform="translate(88 110) scale(0.11)">
          {/* wall poché */}
          <g fill={INK}>
            <rect x="0" y="0" width="2600" height="120" />
            <rect x="3800" y="0" width="400" height="120" />
            <rect x="0" y="0" width="120" height="1900" />
            <rect x="0" y="2900" width="120" height="700" />
            <rect x="0" y="3480" width="1200" height="120" />
            <rect x="2100" y="3480" width="2100" height="120" />
            <rect x="4080" y="0" width="120" height="1100" />
            <rect x="4080" y="2000" width="120" height="200" />
            <rect x="4080" y="2200" width="120" height="1400" />
            <rect x="4200" y="0" width="1200" height="120" />
            <rect x="6600" y="0" width="700" height="120" />
            <rect x="7180" y="0" width="120" height="2200" />
            <rect x="4200" y="2080" width="3100" height="120" />
          </g>

          {/* glazing */}
          <g stroke={INK} strokeWidth="0.9" vectorEffect="non-scaling-stroke">
            <path d="M2600 30h1200M2600 62h1200M2600 94h1200" />
            <path d="M30 1900v1000M62 1900v1000M94 1900v1000" />
            <path d="M5400 30h1200M5400 62h1200M5400 94h1200" />
          </g>

          {/* door leaves and swings */}
          <g stroke={INK} strokeWidth="1.1" vectorEffect="non-scaling-stroke" fill="none">
            <line x1="1200" y1="3480" x2="1200" y2="2580" />
            <path d="M2100 3480A900 900 0 0 0 1200 2580" strokeDasharray="5 4" />
            <line x1="4200" y1="1100" x2="5100" y2="1100" />
            <path d="M5100 1100A900 900 0 0 1 4200 2000" strokeDasharray="5 4" />
          </g>

          {/* furniture footprints, dashed */}
          <g
            stroke={INK}
            strokeWidth="0.9"
            fill="none"
            opacity="0.55"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 5"
          >
            <rect x="300" y="500" width="2400" height="2500" opacity="0.5" />
            <rect x="380" y="700" width="900" height="2000" />
            <line x1="470" y1="700" x2="470" y2="2700" />
            <rect x="1600" y="1250" width="800" height="1100" />
            <rect x="5000" y="600" width="1400" height="800" />
            <rect x="120" y="2400" width="300" height="900" />
            <circle cx="3800" cy="2900" r="220" />
          </g>

          {/* opening tags */}
          <g
            fill={INK}
            fontFamily="IBM Plex Mono, monospace"
            fontSize="115"
            letterSpacing="6"
            opacity="0.8"
          >
            <text x="1650" y="3400" textAnchor="middle">
              D1 · 900
            </text>
            <text x="4620" y="940" textAnchor="middle">
              D2 · 900
            </text>
            <text x="3200" y="-20" textAnchor="middle">
              W1 · 1200
            </text>
            <text x="6000" y="-20" textAnchor="middle">
              W2 · 1200
            </text>
          </g>

          {/* room names */}
          <g fill={INK} fontFamily="Archivo, sans-serif">
            <text x="2100" y="1820" textAnchor="middle" fontSize="165" letterSpacing="22">
              LIVING
            </text>
            <text
              x="2100"
              y="1980"
              textAnchor="middle"
              fontSize="120"
              letterSpacing="10"
              opacity="0.65"
            >
              15.12 m²
            </text>
            <text x="5750" y="1120" textAnchor="middle" fontSize="150" letterSpacing="20">
              KITCHEN
            </text>
            <text
              x="5750"
              y="1270"
              textAnchor="middle"
              fontSize="112"
              letterSpacing="8"
              opacity="0.65"
            >
              6.82 m²
            </text>
          </g>

          {/* dimensions */}
          <g
            stroke={INK}
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
            fontFamily="IBM Plex Mono, monospace"
          >
            <g opacity="0.8">
              <path d="M0 0v-340M7300 0v-340" strokeDasharray="4 4" opacity="0.55" />
              <path d="M0 -280h7300" />
              <path d="M0 -308l22 56M7300 -308l-22 56" />
              <text
                x="3650"
                y="-330"
                stroke="none"
                fill={INK}
                fontSize="140"
                textAnchor="middle"
                letterSpacing="10"
              >
                7300
              </text>
            </g>

            <g opacity="0.8">
              <path d="M0 3600v320M4200 3600v320" strokeDasharray="4 4" opacity="0.55" />
              <path d="M0 3840h4200" />
              <path d="M0 3812l22 56M4200 3812l-22 56" />
              <text
                x="2100"
                y="3760"
                stroke="none"
                fill={INK}
                fontSize="140"
                textAnchor="middle"
                letterSpacing="10"
              >
                4200
              </text>
            </g>

            <g opacity="0.8">
              <path d="M0 0h-270M0 3600h-270" strokeDasharray="4 4" opacity="0.55" />
              <path d="M-220 0v3600" />
              <path d="M-248 0l56 22M-248 3600l56-22" />
              <text
                x="-262"
                y="1800"
                stroke="none"
                fill={INK}
                fontSize="140"
                textAnchor="middle"
                letterSpacing="10"
                transform="rotate(-90 -262 1800)"
              >
                3600
              </text>
            </g>

            <g opacity="0.8">
              <path d="M7300 0h300M7300 2200h300" strokeDasharray="4 4" opacity="0.55" />
              <path d="M7540 0v2200" />
              <path d="M7512 0l56 22M7512 2200l56-22" />
              <text
                x="7600"
                y="1100"
                stroke="none"
                fill={INK}
                fontSize="140"
                textAnchor="middle"
                letterSpacing="10"
                transform="rotate(-90 7600 1100)"
              >
                2200
              </text>
            </g>
          </g>

          {/* north arrow */}
          <g transform="translate(-40 -470)" stroke={INK} fill="none" vectorEffect="non-scaling-stroke">
            <circle r="95" strokeWidth="1" />
            <path d="M0 62V-58M0 -58l-22 42M0 -58l22 42" strokeWidth="1.1" />
            <text
              x="0"
              y="-108"
              fill={INK}
              stroke="none"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="92"
              textAnchor="middle"
            >
              N
            </text>
          </g>
        </g>
      </g>

      {/* ------------------------------------------------ notes and title */}
      <g className="plan-labels">
        <g fill={INK} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" letterSpacing="1.1">
          <text x="88" y="596" fontSize="10" letterSpacing="2">
            NOTES
          </text>
          <g opacity="0.75" fontSize="9" letterSpacing="0.4">
            <text x="88" y="616">1. All dimensions in millimetres unless noted.</text>
            <text x="88" y="631">2. Walls 120 mm, height 2800 mm. Verify one wall on site.</text>
            <text x="88" y="646">3. Scale is set from two measured points, never by eye.</text>
            <text x="88" y="661">4. Door heights 2100 mm; window sills 900 mm.</text>
            <text x="88" y="676">5. Drawing is a specimen. Dimensions follow the traced plan.</text>
          </g>

          {/* scale bar */}
          <g transform="translate(88 702)" opacity="0.8">
            <line x1="0" y1="0" x2="220" y2="0" stroke={INK} strokeWidth="1" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke={INK} />
            <line x1="110" y1="-4" x2="110" y2="4" stroke={INK} />
            <line x1="220" y1="-4" x2="220" y2="4" stroke={INK} />
            <text x="0" y="16" fontSize="8">0</text>
            <text x="104" y="16" fontSize="8">1</text>
            <text x="210" y="16" fontSize="8">2 m</text>
          </g>
        </g>

        <g transform="translate(690 588)">
          <rect width="382" height="144" stroke={INK} strokeWidth="0.9" fill="none" />
          <line x1="0" y1="34" x2="382" y2="34" stroke={INK} strokeWidth="0.6" opacity="0.5" />
          <line x1="250" y1="0" x2="250" y2="144" stroke={INK} strokeWidth="0.6" opacity="0.5" />
          <line x1="0" y1="82" x2="382" y2="82" stroke={INK} strokeWidth="0.6" opacity="0.35" />
          <line x1="0" y1="113" x2="382" y2="113" stroke={INK} strokeWidth="0.6" opacity="0.35" />

          <text
            x="12"
            y="22"
            fill={INK}
            fontFamily="Archivo, sans-serif"
            fontSize="13"
            letterSpacing="2.4"
          >
            KOTHA STUDIO
          </text>
          <text
            x="370"
            y="23"
            fill={INK}
            fontFamily="Instrument Serif, serif"
            fontSize="19"
            textAnchor="end"
          >
            A-01
          </text>

          {[
            ['PROJECT', 'GROUND FLOOR FLAT'],
            ['DRAWING', 'PLAN · 1:50'],
            ['DRAWN', 'YOU'],
            ['DATE', '24.11.2026'],
            ['REV', 'A'],
            ['SHEET', '1 / 1'],
          ].map(([label, value], index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            return (
              <g key={label} transform={`translate(${column * 250} ${34 + row * 31})`}>
                <text
                  x="12"
                  y="12"
                  fill={INK}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="7"
                  opacity="0.55"
                  letterSpacing="1"
                >
                  {label}
                </text>
                <text
                  x="12"
                  y="25"
                  fill={INK}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="8.5"
                  letterSpacing="0.6"
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
