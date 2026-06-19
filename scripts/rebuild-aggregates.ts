/**
 * Seeds / repairs aggregates/predictions — the per-match picks doc the client reads instead of
 * the whole predictions collection. Includes only LOCKED matches (kicked off), since picks are
 * hidden until kickoff. Also marks those matches `aggregated` in the sync cache so the live sync
 * doesn't re-populate them. The live sync maintains this doc incrementally after.
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node --esm scripts/rebuild-aggregates.ts
 *   DRY_RUN=false npx ts-node --esm scripts/rebuild-aggregates.ts
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
const DRY_RUN = process.env.DRY_RUN !== 'false'

const [predSnap, matchSnap] = await Promise.all([
  db.collection('predictions').get(),
  db.collection('matches').get(),
])

// Which matches have locked (kicked off)?
const now = Date.now()
const lockedMatchIds = new Set<string>()
for (const d of matchSnap.docs) {
  const kickoff = d.data().kickoff as Timestamp | undefined
  if (kickoff && kickoff.toMillis() <= now) lockedMatchIds.add(d.id)
}

const byMatch: Record<string, { p: string; h: number; a: number; pts: number | null }[]> = {}
for (const id of lockedMatchIds) byMatch[id] = []
for (const d of predSnap.docs) {
  const p = d.data() as { participantId: string; matchId: number; predictedHome: number; predictedAway: number; pointsAwarded: number | null }
  const key = String(p.matchId)
  if (!lockedMatchIds.has(key)) continue
  byMatch[key].push({ p: p.participantId, h: p.predictedHome, a: p.predictedAway, pts: p.pointsAwarded ?? null })
}

const totalPicks = Object.values(byMatch).reduce((s, a) => s + a.length, 0)
console.log(`\n  Locked matches: ${lockedMatchIds.size}  |  picks aggregated: ${totalPicks}`)

if (DRY_RUN) {
  console.log(`\n  → Dry run. Run with DRY_RUN=false to write aggregates/predictions.\n`)
} else {
  await db.collection('aggregates').doc('predictions').set({ byMatch, updatedAt: Timestamp.now() })
  const aggregated: Record<string, true> = {}
  for (const id of lockedMatchIds) aggregated[id] = true
  await db.collection('sync').doc('match-cache').set({ aggregated }, { merge: true })
  console.log(`\n  ✓ Wrote aggregates/predictions and marked ${lockedMatchIds.size} matches aggregated.\n`)
}
