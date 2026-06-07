/** Compact WC 2026 trophy mark — inspired by the FIFA 2026 three-colour palette. */
export function TrophyMark({ height = 36 }: { height?: number }) {
  const navy  = '#1a3461'
  const green = '#2a6b3e'
  const red   = '#c41230'

  return (
    <svg
      viewBox="0 0 28 38"
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* ── Bowl ────────────────────────────────────────── */}

      {/* Left half — green */}
      <path
        d="M14 2 C7 2 2 7 2 13 C2 19 6 23 14 24 Z"
        fill={green}
      />

      {/* Right half — navy */}
      <path
        d="M14 2 C21 2 26 7 26 13 C26 19 22 23 14 24 Z"
        fill={navy}
      />

      {/* Red swoosh — wraps the right bowl edge */}
      <path
        d="M21 4 C26 8 26 19 21 23 L14 24 C19 22 23 18 23 13 C23 9 22 6 20 4 Z"
        fill={red}
      />

      {/* White star in the left bowl */}
      <path
        d="M9 10 L9.7 12 L12 12 L10.2 13.4 L10.9 15.5 L9 14.2 L7.1 15.5 L7.8 13.4 L6 12 L8.3 12 Z"
        fill="white"
        opacity="0.92"
      />

      {/* ── Stem ────────────────────────────────────────── */}
      <rect x="11.5" y="24" width="5" height="7" rx="1" fill={navy} />

      {/* ── Base ────────────────────────────────────────── */}
      <rect x="8"   y="31" width="12" height="3"   rx="1.5" fill={navy} />
      <rect x="5.5" y="34" width="17" height="2.5" rx="1.25" fill={navy} />
    </svg>
  )
}
