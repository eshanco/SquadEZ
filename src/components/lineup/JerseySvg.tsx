// A flat-icon football shirt, themeable via `color`/`trimColor` so every
// player on a team (same club, same kit) renders identically without
// needing an actual image asset. `muted` swaps to a dashed outline-only
// version for empty slots, reusing the same silhouette.
export function JerseySvg({
  color,
  trimColor,
  className,
  muted,
}: {
  color: string
  trimColor: string
  className?: string
  muted?: boolean
}) {
  if (muted) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <polygon points="3,14 15,6 19,18 9,24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
        <polygon points="45,14 33,6 29,18 39,24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
        <rect x="14" y="8" width="20" height="34" rx="5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <polygon points="3,14 15,6 19,18 9,24" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <polygon points="45,14 33,6 29,18 39,24" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <rect x="14" y="8" width="20" height="34" rx="5" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <rect x="5" y="17" width="7" height="6" rx="2" fill={trimColor} />
      <rect x="36" y="17" width="7" height="6" rx="2" fill={trimColor} />
      <polygon points="20,8 28,8 24,14" fill={trimColor} />
      <rect x="14" y="39" width="20" height="3" fill={trimColor} />
    </svg>
  )
}
