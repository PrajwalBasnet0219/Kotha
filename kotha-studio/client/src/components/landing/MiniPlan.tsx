const INK = '#1b1b19';

/** A simplified version of the sheet, used inside the live-editing board. */
export function MiniPlan() {
  return (
    <svg className="mini-plan" viewBox="0 0 560 400" fill="none" aria-hidden="true">
      <g opacity="0.16" stroke={INK} strokeWidth="0.5">
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 35} y1="50" x2={40 + i * 35} y2="350" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="40" y1={50 + i * 37.5} x2="530" y2={50 + i * 37.5} />
        ))}
      </g>

      <g fill={INK}>
        <rect x="90" y="100" width="210" height="6" />
        <rect x="90" y="100" width="6" height="60" />
        <rect x="90" y="232" width="6" height="48" />
        <rect x="90" y="274" width="60" height="6" />
        <rect x="195" y="274" width="35" height="6" />
        <rect x="290" y="274" width="10" height="6" />
        <rect x="294" y="100" width="6" height="30" />
        <rect x="294" y="175" width="6" height="35" />
        <rect x="300" y="100" width="50" height="6" />
        <rect x="410" y="100" width="45" height="6" />
        <rect x="449" y="100" width="6" height="110" />
        <rect x="300" y="204" width="155" height="6" />
      </g>

      <g stroke={INK} strokeWidth="0.9" vectorEffect="non-scaling-stroke">
        <line x1="230" y1="274" x2="230" y2="280" />
        <line x1="235" y1="274" x2="235" y2="280" />
        <line x1="285" y1="274" x2="285" y2="280" />
        <line x1="350" y1="100" x2="350" y2="106" />
        <line x1="355" y1="100" x2="355" y2="106" />
        <line x1="405" y1="100" x2="405" y2="106" />
      </g>

      <g stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.75">
        <line x1="300" y1="130" x2="345" y2="130" />
        <path d="M345 130A45 45 0 0 1 300 175" strokeDasharray="4 4" />
        <line x1="150" y1="280" x2="150" y2="235" />
        <path d="M150 235A45 45 0 0 1 195 280" strokeDasharray="4 4" />
      </g>

      <g
        stroke={INK}
        strokeWidth="0.8"
        opacity="0.4"
        strokeDasharray="5 4"
        vectorEffect="non-scaling-stroke"
      >
        <rect x="105" y="115" width="125" height="145" />
        <rect x="112" y="122" width="46" height="86" />
        <rect x="175" y="150" width="46" height="32" />
        <rect x="330" y="130" width="70" height="38" />
      </g>

      <g fontFamily="IBM Plex Mono, monospace" fill={INK} fontSize="8" letterSpacing="1.4" opacity="0.6">
        <text x="90" y="296">LIVING · 15.12 m²</text>
        <text x="330" y="230">KITCHEN · 6.82 m²</text>
      </g>

      <g stroke={INK} strokeWidth="1" strokeDasharray="3 4" opacity="0.55">
        <rect x="294" y="114" width="6" height="45" fill="none" />
        <path d="M318 96v34" />
        <path d="M314 102l4-6 4 6" fill={INK} stroke="none" />
      </g>
      <text
        x="322"
        y="94"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="7.5"
        fill={INK}
        letterSpacing="1"
        opacity="0.7"
      >
        -400 mm
      </text>
    </svg>
  );
}
