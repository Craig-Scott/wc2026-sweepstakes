/**
 * Migrates OLD-format win/draw sentinels (1-0 / 0-0 / 0-1) to the NEW format
 * (99-0 / 99-99 / 0-99), using each document's immutable Firestore `createTime`
 * metadata to decide — NOT the app's `submittedAt` field, which a form auto-save
 * bug bumped forward and so can't be trusted.
 *
 * Key fact: before commit 218b069 (~2026-06-11 09:10 UTC) win/draw picks and
 * genuine exact-score picks shared the same encoding (1-0/0-0/0-1) and were both
 * scored as result-only. So ANY 1-0/0-0/0-1 created before that deploy is a
 * win/draw sentinel — a genuine "exactly 1-0" pick was not representable yet.
 * Genuine minimal-margin exact-score picks only exist from createTime >= cutoff.
 *
 * Buckets (printed by the dry run):
 *   CONFIDENT — created before cutoff, participant never used the new UI (no 99-x
 *               picks at all). Definitely sentinels. Migrated automatically.
 *   REVIEW    — created before cutoff, but participant ALSO has 99-x picks (used
 *               the new UI), so in theory could have re-picked a genuine exact
 *               score. Ask the person. Migrated only if named in INCLUDE.
 *   GENUINE   — created on/after cutoff. A real exact-score pick. Left alone.
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node --esm scripts/migrate-old-sentinels.ts
 *   DRY_RUN=false npx ts-node --esm scripts/migrate-old-sentinels.ts
 *   DRY_RUN=false INCLUDE="luke,stephen" npx ts-node --esm scripts/migrate-old-sentinels.ts
 *   CUTOFF=2026-06-11T09:10:00.000Z ...   (override the format-change boundary)
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const DRY_RUN = process.env.DRY_RUN !== 'false'
const CUTOFF = Timestamp.fromDate(new Date(process.env.CUTOFF ?? '2026-06-11T09:10:00.000Z'))
const INCLUDE = new Set(
  (process.env.INCLUDE ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
)

const NEW: Record<string, [number, number]> = { '1-0': [99, 0], '0-0': [99, 99], '0-1': [0, 99] }
const isOldSentinel = (h: number, a: number) => `${h}-${a}` in NEW
const isNew99 = (h: number, a: number) =>
  (h === 99 && a === 0) || (h === 99 && a === 99) || (h === 0 && a === 99)

console.log(`\n═══════════════════════════════════════════════`)
console.log(`  Old-sentinel migration${DRY_RUN ? ' (DRY RUN)' : ''}`)
console.log(`  Cutoff (createTime): ${CUTOFF.toDate().toISOString()}`)
if (INCLUDE.size) console.log(`  INCLUDE (review → migrate): ${[...INCLUDE].join(', ')}`)
console.log(`═══════════════════════════════════════════════`)

const NEW_MAP: Record<string, [number, number]> = { '1-0': [99, 0], '0-0': [99, 99], '0-1': [0, 99] }

// ── Lean apply path ────────────────────────────────────────────────────────
// When applying for specific confirmed people, read ONLY their predictions
// (scoped query) — avoids scanning the full predictions + matches collections,
// so it works even on a tight read-quota day.
if (!DRY_RUN && INCLUDE.size > 0) {
  const partSnap = await db.collection('participants').get()
  const idByName = new Map(partSnap.docs.map(d => [(d.data() as { name: string }).name.toLowerCase(), d.id]))
  const ids = [...INCLUDE].map(n => idByName.get(n)).filter((x): x is string => !!x)
  if (ids.length === 0) { console.log(`\n  No participants matched INCLUDE.\n`); process.exit(0) }

  const snap = await db.collection('predictions').where('participantId', 'in', ids).get()
  const targets = snap.docs.filter(d => {
    const p = d.data() as { predictedHome: number; predictedAway: number }
    return `${p.predictedHome}-${p.predictedAway}` in NEW_MAP && d.createTime!.toMillis() < CUTOFF.toMillis()
  })

  console.log(`\n  Migrating ${targets.length} old-sentinel prediction(s) for: ${[...INCLUDE].join(', ')}`)
  const batch = db.batch()
  for (const d of targets) {
    const p = d.data() as { predictedHome: number; predictedAway: number }
    const [nh, na] = NEW_MAP[`${p.predictedHome}-${p.predictedAway}`]
    console.log(`    ${d.id}: ${p.predictedHome}-${p.predictedAway} → ${nh}-${na}`)
    batch.update(d.ref, { predictedHome: nh, predictedAway: na })
  }
  if (targets.length > 0) await batch.commit()
  console.log(`\n  ✓ Done. Re-run verify-scoring + rebuild-leaderboard to refresh points.\n`)
  process.exit(0)
}

const [predSnap, partSnap, matchSnap] = await Promise.all([
  db.collection('predictions').get(),
  db.collection('participants').get(),
  db.collection('matches').get(),
])
const names = new Map(partSnap.docs.map(d => [d.id, (d.data() as { name: string }).name]))
const nameOf = (id: string) => names.get(id) ?? id
const matchLabel = new Map(matchSnap.docs.map(d => {
  const m = d.data() as { homeTeam: { code: string }; awayTeam: { code: string } }
  return [Number(d.id), `${m.homeTeam.code}-${m.awayTeam.code}`]
}))

type Row = {
  ref: FirebaseFirestore.DocumentReference
  participantId: string
  matchId: number
  h: number; a: number
  createdAt: Timestamp
  submittedAt: Timestamp | null
}

// Which participants have used the new UI (have at least one 99-x prediction)?
const usedNewUI = new Set<string>()
for (const d of predSnap.docs) {
  const p = d.data() as { participantId: string; predictedHome: number; predictedAway: number }
  if (isNew99(p.predictedHome, p.predictedAway)) usedNewUI.add(p.participantId)
}

const confident: Row[] = []
const review: Row[] = []
const genuine: Row[] = []

for (const d of predSnap.docs) {
  const p = d.data() as { participantId: string; matchId: number; predictedHome: number; predictedAway: number; submittedAt?: Timestamp }
  if (!isOldSentinel(p.predictedHome, p.predictedAway)) continue
  const row: Row = {
    ref: d.ref,
    participantId: p.participantId,
    matchId: p.matchId,
    h: p.predictedHome, a: p.predictedAway,
    createdAt: d.createTime!,
    submittedAt: p.submittedAt ?? null,
  }
  if (d.createTime!.toMillis() >= CUTOFF.toMillis()) genuine.push(row)
  else if (usedNewUI.has(p.participantId)) review.push(row)
  else confident.push(row)
}

const fmt = (r: Row) => {
  const [nh, na] = NEW[`${r.h}-${r.a}`]
  const submitted = r.submittedAt ? r.submittedAt.toDate().toISOString() : '—'
  return `    ${nameOf(r.participantId).padEnd(12)} ${(matchLabel.get(r.matchId) ?? r.matchId).toString().padEnd(9)} `
    + `${r.h}-${r.a} → ${nh}-${na}  created ${r.createdAt.toDate().toISOString()}  submittedAt ${submitted}`
}
const byParticipant = (rows: Row[]) => {
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.participantId, (m.get(r.participantId) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log(`\n■ CONFIDENT — created before cutoff, participant never used new UI (migrate):`)
if (confident.length === 0) console.log('  (none)')
else for (const [id, n] of byParticipant(confident)) console.log(`  ${nameOf(id).padEnd(12)} ${n}`)

console.log(`\n■ REVIEW — created before cutoff, but participant also has 99-x picks (ASK them):`)
if (review.length === 0) console.log('  (none)')
else {
  for (const r of review) console.log(fmt(r))
  console.log(`  → ${review.length} prediction(s) across ${new Set(review.map(r => r.participantId)).size} participant(s).`)
  console.log(`    Confirm with each, then re-run with INCLUDE="name1,name2" to migrate theirs.`)
}

console.log(`\n■ GENUINE — created on/after cutoff, left as exact-score picks:`)
if (genuine.length === 0) console.log('  (none)')
else for (const r of genuine) console.log(fmt(r))

// Build the set to actually migrate: all confident + any review rows whose participant is in INCLUDE
const toMigrate = [...confident, ...review.filter(r => INCLUDE.has(nameOf(r.participantId).toLowerCase()))]

console.log(`\n  Will migrate: ${toMigrate.length} prediction(s) `
  + `(${confident.length} confident${INCLUDE.size ? ` + ${toMigrate.length - confident.length} from INCLUDE` : ''}).`)

if (DRY_RUN) {
  console.log(`\n  → Dry run. Run with DRY_RUN=false to apply.\n`)
} else if (toMigrate.length > 0) {
  const SIZE = 400
  for (let i = 0; i < toMigrate.length; i += SIZE) {
    const batch = db.batch()
    for (const r of toMigrate.slice(i, i + SIZE)) {
      const [nh, na] = NEW[`${r.h}-${r.a}`]
      batch.update(r.ref, { predictedHome: nh, predictedAway: na })
    }
    await batch.commit()
  }
  console.log(`\n  ✓ Migrated ${toMigrate.length} predictions. Re-run verify-scoring + rebuild-leaderboard to refresh points.\n`)
} else {
  console.log(`\n  Nothing to migrate.\n`)
}
