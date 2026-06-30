/**
 * Recomputes the aggregated `leaderboard/current` doc from all predictions.
 *
 * The sync job keeps this doc fresh after every match (see updateLeaderboard in
 * sync-football.ts). Run this manually to seed the doc the first time, or to correct
 * it if it ever drifts from the prediction data.
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node --esm scripts/rebuild-leaderboard.ts
 *   DRY_RUN=false npx ts-node --esm scripts/rebuild-leaderboard.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const DRY_RUN = process.env.DRY_RUN !== 'false'

const [predSnap, partSnap] = await Promise.all([
  db.collection('predictions').get(),
  db.collection('participants').get(),
])
const names = new Map(partSnap.docs.map(d => [d.id, (d.data() as { name: string }).name]))

const points: Record<string, number> = {}
const exact: Record<string, number> = {}
for (const d of predSnap.docs) {
  const p = d.data() as { participantId: string; pointsAwarded: number | null }
  if (p.pointsAwarded === null || p.pointsAwarded === undefined) continue
  points[p.participantId] = (points[p.participantId] ?? 0) + p.pointsAwarded
  if (p.pointsAwarded >= 9) exact[p.participantId] = (exact[p.participantId] ?? 0) + 1 // 9 (group) or 15 (KO)
}

const sorted = Object.entries(points).sort((a, b) => b[1] - a[1])
console.log(`\nLeaderboard (${sorted.length} participants with points):`)
for (const [id, pts] of sorted) {
  console.log(`  ${(names.get(id) ?? id).padEnd(14)} ${String(pts).padStart(3)}pts (${exact[id] ?? 0} exact)`)
}

if (DRY_RUN) {
  console.log('\n→ Dry run. Run with DRY_RUN=false to write leaderboard/current.\n')
} else {
  await db.collection('leaderboard').doc('current').set({ points, exact, updatedAt: Timestamp.now() })
  console.log('\n✓ Wrote leaderboard/current\n')
}
