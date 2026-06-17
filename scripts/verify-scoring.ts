/**
 * Verification script — proves the prediction scoring is working correctly.
 *
 * 1. Unit-tests the scoring function against all known cases.
 * 2. Cross-checks every prediction in Firestore against the actual match result.
 * 3. Prints a leaderboard of accumulated points.
 *
 *   export FIREBASE_SERVICE_ACCOUNT='<paste JSON>'
 *   npx ts-node --esm scripts/verify-scoring.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
const FIX = process.env.FIX === 'true'

// ── Scoring function (mirrors both src/utils/predictions.ts and sync-football.ts) ──

function isCanonical(h: number, a: number): boolean {
  return (h === 99 && a === 0) || (h === 99 && a === 99) || (h === 0 && a === 99)
}

function score(pH: number, pA: number, aH: number, aA: number): number {
  if (!isCanonical(pH, pA)) return (pH === aH && pA === aA) ? 9 : 0
  return Math.sign(pH - pA) === Math.sign(aH - aA) ? 3 : 0
}

// ── Unit tests ────────────────────────────────────────────────────────────────

const CASES: { label: string; pH: number; pA: number; aH: number; aA: number; want: number }[] = [
  // Exact score → 9
  { label: 'Exact home win (2-1)',      pH: 2, pA: 1, aH: 2, aA: 1, want: 9 },
  { label: 'Exact draw (1-1)',          pH: 1, pA: 1, aH: 1, aA: 1, want: 9 },
  { label: 'Exact away win (0-2)',      pH: 0, pA: 2, aH: 0, aA: 2, want: 9 },
  { label: 'Exact 0-0',                pH: 0, pA: 0, aH: 0, aA: 0, want: 9 },
  { label: 'Exact 1-0',                pH: 1, pA: 0, aH: 1, aA: 0, want: 9 },
  { label: 'Exact 0-1',                pH: 0, pA: 1, aH: 0, aA: 1, want: 9 },
  // Specific score, wrong — no consolation points
  { label: 'Right home win, wrong score',  pH: 1, pA: 0, aH: 3, aA: 1, want: 0 },
  { label: 'Right draw, wrong score',      pH: 1, pA: 1, aH: 2, aA: 2, want: 0 },
  { label: 'Right away win, wrong score',  pH: 0, pA: 1, aH: 1, aA: 3, want: 0 },
  // Canonical (result-only) sentinels → max 3 pts, never 9
  { label: 'Canonical home (99-0) vs 2-1',   pH: 99, pA: 0,  aH: 2, aA: 1, want: 3 },
  { label: 'Canonical draw (99-99) vs 1-1',  pH: 99, pA: 99, aH: 1, aA: 1, want: 3 },
  { label: 'Canonical away (0-99) vs 0-2',   pH: 0,  pA: 99, aH: 0, aA: 2, want: 3 },
  { label: 'Canonical home (99-0) vs 0-2',   pH: 99, pA: 0,  aH: 0, aA: 2, want: 0 },
  // Wrong result → 0
  { label: 'Predicted home win, actual draw',  pH: 2, pA: 0, aH: 1, aA: 1, want: 0 },
  { label: 'Predicted draw, actual away win',  pH: 0, pA: 0, aH: 0, aA: 1, want: 0 },
  { label: 'Predicted away win, actual home',  pH: 0, pA: 1, aH: 1, aA: 0, want: 0 },
  { label: 'Exact wrong (1-0 vs 0-1)',          pH: 1, pA: 0, aH: 0, aA: 1, want: 0 },
]

console.log('\n══════════════════════════════════════════')
console.log('  UNIT TESTS — Scoring Function')
console.log('══════════════════════════════════════════')
let passed = 0
for (const c of CASES) {
  const got = score(c.pH, c.pA, c.aH, c.aA)
  const ok = got === c.want
  if (ok) passed++
  console.log(`  ${ok ? '✓' : '✗'} ${c.label.padEnd(40)} predicted ${c.pH}-${c.pA} | actual ${c.aH}-${c.aA} → ${got}pts ${ok ? '' : `(expected ${c.want}pts) ← BUG`}`)
}
console.log(`\n  ${passed}/${CASES.length} tests passed${passed === CASES.length ? ' ✓' : ' — FIX BUGS ABOVE'}`)

// ── Live Firestore cross-check ────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════')
console.log('  LIVE CHECK — Firestore Predictions')
console.log('══════════════════════════════════════════')

const [matchSnap, predSnap, participantSnap] = await Promise.all([
  db.collection('matches').where('status', '==', 'FINISHED').get(),
  db.collection('predictions').get(),
  db.collection('participants').get(),
])

const matchMap = new Map(matchSnap.docs.map(d => [Number(d.id), d.data()]))
const participantNames = new Map(participantSnap.docs.map(d => [d.id, (d.data() as { name: string }).name]))

let discrepancies = 0
let unscored = 0
let correct = 0

type LeaderRow = { name: string; points: number; exact: number; result: number; wrong: number }
const leaderboard = new Map<string, LeaderRow>()

for (const doc of predSnap.docs) {
  const pred = doc.data() as { participantId: string; matchId: number; predictedHome: number; predictedAway: number; pointsAwarded: number | null }
  const match = matchMap.get(pred.matchId)
  const name = participantNames.get(pred.participantId) ?? pred.participantId

  if (!leaderboard.has(pred.participantId)) {
    leaderboard.set(pred.participantId, { name, points: 0, exact: 0, result: 0, wrong: 0 })
  }

  if (!match) continue // match not finished yet — skip

  const s = match.score as { home: number; away: number }
  const expected = score(pred.predictedHome, pred.predictedAway, s.home, s.away)

  const entry = leaderboard.get(pred.participantId)!
  entry.points += expected
  if (expected === 9) entry.exact++
  else if (expected === 3) entry.result++
  else entry.wrong++

  if (pred.pointsAwarded === null) {
    unscored++
  } else if (pred.pointsAwarded !== expected) {
    discrepancies++
    console.log(`  ✗ MISMATCH  ${name.padEnd(14)} match ${pred.matchId}: predicted ${pred.predictedHome}-${pred.predictedAway}, actual ${s.home}-${s.away} → should be ${expected}pts, stored as ${pred.pointsAwarded}pts`)
  } else {
    correct++
  }
}

if (discrepancies === 0 && unscored === 0) {
  console.log(`  ✓ All ${correct} scored predictions are correct`)
} else {
  if (discrepancies > 0) {
    if (FIX) {
      console.log(`\n  Fixing ${discrepancies} discrepancies…`)
    } else {
      console.log(`\n  ${discrepancies} discrepancies found — rerun with FIX=true to correct`)
    }
  }
  if (unscored > 0) console.log(`  ${unscored} predictions unscored (matches not yet finished or sync not yet run)`)
}

if (FIX && discrepancies > 0) {
  const batch = db.batch()
  for (const doc of predSnap.docs) {
    const pred = doc.data() as { participantId: string; matchId: number; predictedHome: number; predictedAway: number; pointsAwarded: number | null }
    const match = matchMap.get(pred.matchId)
    if (!match) continue
    const s = match.score as { home: number; away: number }
    const expected = score(pred.predictedHome, pred.predictedAway, s.home, s.away)
    if (pred.pointsAwarded !== expected) {
      batch.update(doc.ref, { pointsAwarded: expected })
    }
  }
  await batch.commit()
  console.log(`  ✓ Fixed`)
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════')
console.log('  LEADERBOARD — Calculated from scratch')
console.log('══════════════════════════════════════════')

const sorted = [...leaderboard.values()]
  .filter(e => e.points > 0 || e.exact > 0 || e.result > 0)
  .sort((a, b) => b.points - a.points || b.exact - a.exact)

if (sorted.length === 0) {
  console.log('  No predictions scored yet.')
} else {
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    console.log(`  ${String(i + 1).padStart(2)}. ${e.name.padEnd(14)} ${String(e.points).padStart(3)}pts  (${e.exact} exact, ${e.result} result, ${e.wrong} wrong)`)
  }
}

console.log('')
