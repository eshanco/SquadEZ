// Decorative pitch line-art: goal box at the top (own goal line), a
// halfway line with the center circle poking up into the pitch, and
// corner arcs — the same "attacking half only" view FPL uses, since the
// far half of the pitch never has anyone standing in it.
export function PitchMarkings() {
  const stroke = 'rgba(255,255,255,0.35)'
  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="98" height="138" rx="2" fill="none" stroke={stroke} strokeWidth="1" />

      {/* six-yard box */}
      <path d="M35,1 L35,13 L65,13 L65,1" fill="none" stroke={stroke} strokeWidth="1" />
      {/* penalty box */}
      <path d="M20,1 L20,30 L80,30 L80,1" fill="none" stroke={stroke} strokeWidth="1" />
      {/* penalty arc */}
      <path d="M40,30 Q50,42 60,30" fill="none" stroke={stroke} strokeWidth="1" />

      {/* corner arcs */}
      <path d="M1,7 Q1,1 7,1" fill="none" stroke={stroke} strokeWidth="1" />
      <path d="M93,1 Q99,1 99,7" fill="none" stroke={stroke} strokeWidth="1" />

      {/* halfway line + center circle (top half only), kept low so it sits
          in the clear strip below the last row of players rather than
          under their feet */}
      <line x1="1" y1="133" x2="99" y2="133" stroke={stroke} strokeWidth="1" />
      <path d="M40,133 Q50,121 60,133" fill="none" stroke={stroke} strokeWidth="1" />
      <circle cx="50" cy="133" r="1.2" fill={stroke} />
    </svg>
  )
}
