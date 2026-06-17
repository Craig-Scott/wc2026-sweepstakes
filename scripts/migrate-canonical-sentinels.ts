/**
 * One-time migration — converts old canonical sentinels to new ones.
 *
 * Before commit 218b069 (2026-06-11), result-only picks were stored as:
 *   Home win → 1-0   Draw → 0-0   Away win → 0-1
 *
 * After that commit the new sentinels are:
 *   Home win → 99-0  Draw → 99-99  Away win → 0-99
 *
 * Predictions submitted AFTER the fix could have 1-0 / 0-1 as genuine
 * exact-score picks, so this script only migrates predictions submitted
 * before the cutoff (when the fix went live in production).
 *
 * Usage:
 *   DRY_RUN=true  npx ts-node --esm scripts/migrate-canonical-sentinels.ts
 *   DRY_RUN=false npx ts-node --esm scripts/migrate-canonical-sentinels.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const DRY_RUN = process.env.DRY_RUN !== 'false'

// Dan submitted all predictions in bulk on 2026-06-12 before the sentinel fix
// was live in his browser. The cutoff covers his session window.
const CUTOFF = Timestamp.fromDate(new Date('2026-06-12T09:10:00.000Z'))
const PARTICIPANT_FILTER = 'dan'

// Old sentinel → new sentinel
const MIGRATIONS: Array<{ fromHome: number; fromAway: number; toHome: number; toAway: number; label: string }> = [
  { fromHome: 1, fromAway: 0,  toHome: 99, toAway: 0,  label: 'Home win (1-0 → 99-0)'  },
  { fromHome: 0, fromAway: 0,  toHome: 99, toAway: 99, label: 'Draw   (0-0 → 99-99)'   },
  { fromHome: 0, fromAway: 1,  toHome: 0,  toAway: 99, label: 'Away win (0-1 → 0-99)'  },
]

console.log(`\n═══════════════════════════════════════════════`)
console.log(`  Canonical Sentinel Migration${DRY_RUN ? ' (DRY RUN)' : ''}`)
console.log(`  Cutoff: ${CUTOFF.toDate().toISOString()}`)
console.log(`═══════════════════════════════════════════════\n`)

const snap = await db.collection('predictions').get()
const allPreds = snap.docs.map(d => ({ ref: d.ref, ...d.data() as {
  participantId: string
  matchId: number
  predictedHome: number
  predictedAway: number
  submittedAt: Timestamp
}}))

console.log(`Total predictions in Firestore: ${allPreds.length}`)

let totalMigrated = 0

for (const migration of MIGRATIONS) {
  const toMigrate = allPreds.filter(p =>
    p.participantId === PARTICIPANT_FILTER &&
    p.predictedHome === migration.fromHome &&
    p.predictedAway === migration.fromAway &&
    p.submittedAt < CUTOFF
  )

  const skipped = allPreds.filter(p =>
    p.predictedHome === migration.fromHome &&
    p.predictedAway === migration.fromAway &&
    p.submittedAt >= CUTOFF
  )

  console.log(`\n  ${migration.label}`)
  console.log(`    Migrate:  ${toMigrate.length} predictions (submitted before cutoff)`)
  if (skipped.length > 0) {
    console.log(`    Preserve: ${skipped.length} predictions (genuine exact-score picks after cutoff)`)
    for (const p of skipped) {
      console.log(`      → ${p.participantId} match ${p.matchId} submitted ${p.submittedAt.toDate().toISOString()}`)
    }
  }

  if (!DRY_RUN && toMigrate.length > 0) {
    const BATCH_SIZE = 400
    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
      const batch = db.batch()
      for (const p of toMigrate.slice(i, i + BATCH_SIZE)) {
        batch.update(p.ref, { predictedHome: migration.toHome, predictedAway: migration.toAway })
      }
      await batch.commit()
    }
    console.log(`    ✓ Migrated ${toMigrate.length} predictions`)
  }

  totalMigrated += toMigrate.length
}

console.log(`\n  Total to migrate: ${totalMigrated}`)
if (DRY_RUN) {
  console.log(`\n  → Dry run complete. Run with DRY_RUN=false to apply.\n`)
} else {
  console.log(`\n  ✓ Migration complete.\n`)
}
