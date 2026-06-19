/**
 * Backfills `espnEventId` on match docs by looking up ESPN's scoreboard BY DATE (not just
 * whoever is live right now), so the client's 30s live-score overlay can activate for most
 * matches instead of the ~5 that happened to be live during a sync run.
 *
 * Writes the id to both the match doc and the sync cache (so the live sync preserves it).
 * Uses only ESPN's free public API for lookups + a single matches read; the writes are
 * one-time. Run again later to pick up matches ESPN hadn't listed yet.
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node --esm scripts/backfill-espn-ids.ts
 *   DRY_RUN=false npx ts-node --esm scripts/backfill-espn-ids.ts
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
const DRY_RUN = process.env.DRY_RUN !== 'false'

// ESPN abbreviation → football-data TLA, where they diverge. Mirror of the sync's table.
const ESPN_TO_FDO: Record<string, string> = { NIRL: 'NIR' }
const norm = (abb: string) => ESPN_TO_FDO[abb] ?? abb

const toDateStr = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`

async function fetchScoreboard(dateStr: string, into: Map<string, string>) {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`)
    const data = await res.json() as { events?: Record<string, unknown>[] }
    for (const event of data.events ?? []) {
      const comp = (event.competitions as Record<string, unknown>[])?.[0]
      if (!comp) continue
      const competitors = comp.competitors as Record<string, unknown>[]
      const home = competitors?.find(t => t.homeAway === 'home')
      const away = competitors?.find(t => t.homeAway === 'away')
      if (!home || !away) continue
      const h = norm((home.team as Record<string, unknown>)?.abbreviation as string)
      const a = norm((away.team as Record<string, unknown>)?.abbreviation as string)
      if (h && a) into.set(`${h}|${a}`, event.id as string)
    }
  } catch (e) {
    console.warn(`  scoreboard fetch failed for ${dateStr}:`, (e as Error).message)
  }
}

const snap = await db.collection('matches').get()
const missing = snap.docs.filter(d => !d.data().espnEventId && d.data().kickoff)
console.log(`\n  ${snap.size} matches, ${snap.size - missing.length} already have an id, ${missing.length} missing\n`)

// Group missing matches by UTC date (+ the day before, since ESPN indexes by US Eastern).
const dates = new Set<string>()
for (const d of missing) {
  const k = (d.data().kickoff as Timestamp).toDate()
  dates.add(toDateStr(k))
  const prev = new Date(k); prev.setUTCDate(prev.getUTCDate() - 1)
  dates.add(toDateStr(prev))
}

const eventIdMap = new Map<string, string>()
for (const dateStr of dates) await fetchScoreboard(dateStr, eventIdMap)
console.log(`  Fetched ${dates.size} ESPN scoreboard dates → ${eventIdMap.size} events\n`)

const found: { id: string; code: string; eventId: string }[] = []
const unmatched: string[] = []
for (const d of missing) {
  const m = d.data()
  const key = `${(m.homeTeam as { code: string }).code}|${(m.awayTeam as { code: string }).code}`
  const eventId = eventIdMap.get(key)
  if (eventId) found.push({ id: d.id, code: key, eventId })
  else unmatched.push(key)
}

console.log(`  Matched ${found.length} / ${missing.length} missing matches`)
if (unmatched.length) console.log(`  Unmatched (ESPN not listing yet, or abbreviation gap): ${unmatched.join(', ')}`)

if (DRY_RUN) {
  console.log(`\n  → Dry run. Run with DRY_RUN=false to write.\n`)
} else if (found.length) {
  const batch = db.batch()
  const cacheRef = db.collection('sync').doc('match-cache')
  for (const f of found) {
    batch.set(db.collection('matches').doc(f.id), { espnEventId: f.eventId, updatedAt: Timestamp.now() }, { merge: true })
    batch.update(cacheRef, { [`espnEventIds.${f.id}`]: f.eventId })
  }
  await batch.commit()
  console.log(`\n  ✓ Wrote espnEventId for ${found.length} matches (doc + cache).\n`)
} else {
  console.log(`\n  Nothing to write.\n`)
}
