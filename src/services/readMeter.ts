import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Lightweight client-side Firestore read accounting. Each subscription reports
 * how many documents it was billed for (snapshot.docChanges().length), tallied
 * in memory and flushed — batched — into a per-day `usage/{date}` doc via atomic
 * increments. A small script (scripts/usage.ts) reads that doc to show where the
 * day's reads went, broken down by source. Free alternative to the billing-gated
 * Cloud Monitoring API.
 *
 * Failures are swallowed: usage accounting must never break the app.
 */

// Pacific calendar date (YYYY-MM-DD) — the day boundary the Firestore quota resets on.
function pacificDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

const pending = new Map<string, number>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  flushTimer = null
  if (pending.size === 0) return
  const reads: Record<string, unknown> = {}
  for (const [src, n] of pending) reads[src] = increment(n)
  pending.clear()
  try {
    await setDoc(doc(db, 'usage', pacificDate()), { reads, updatedAt: serverTimestamp() }, { merge: true })
  } catch {
    // ignore — accounting is best-effort
  }
}

/** Record `n` document reads attributed to `source` (e.g. 'matches', 'participants'). */
export function recordRead(source: string, n: number) {
  if (n <= 0) return
  pending.set(source, (pending.get(source) ?? 0) + n)
  // Batch writes: most reads land in the first second (initial attaches), so a single
  // delayed flush captures the bulk; tab-hide/unload handlers catch the rest.
  if (!flushTimer) flushTimer = setTimeout(flush, 60_000)
}

if (typeof window !== 'undefined') {
  const flushNow = () => { if (pending.size) void flush() }
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow()
  })
  window.addEventListener('pagehide', flushNow)
}
