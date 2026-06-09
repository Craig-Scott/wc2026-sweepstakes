/**
 * One-time script to seed participants and teams to Firestore.
 * Run ONCE after setting up Firebase project:
 *   npm run seed
 *
 * Requires FIREBASE_SERVICE_ACCOUNT environment variable.
 * Uses participants from src/config/participants.ts.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
if (!SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required')

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()

const PARTICIPANTS = [
  { id: 'eoin',      name: 'Eoin',       teamCodes: [], hasPaid: false },
  { id: 'stephen',   name: 'Stephen',    teamCodes: [], hasPaid: false },
  { id: 'ciaran',    name: 'Ciaran',     teamCodes: [], hasPaid: false },
  { id: 'craig',     name: 'Craig',      teamCodes: [], hasPaid: false },
  { id: 'aarons',    name: 'Aaron S',    teamCodes: [], hasPaid: false },
  { id: 'kevin',     name: 'Kevin',      teamCodes: [], hasPaid: false },
  { id: 'sarai',     name: 'Sarai',      teamCodes: [], hasPaid: false },
  { id: 'sarah',     name: 'Sarah',      teamCodes: [], hasPaid: false },
  { id: 'ciara',     name: 'Ciara',      teamCodes: [], hasPaid: false },
  { id: 'astrid',    name: 'Astrid',     teamCodes: [], hasPaid: false },
  { id: 'luke',      name: 'Luke',       teamCodes: [], hasPaid: false },
  { id: 'dan',       name: 'Dan',        teamCodes: [], hasPaid: false },
  { id: 'aaronmcpo', name: 'Aaron Mcpo', teamCodes: [], hasPaid: false },
  { id: 'david',     name: 'David',      teamCodes: [], hasPaid: false },
  { id: 'clarke',    name: 'Clark',      teamCodes: [], hasPaid: false },
  { id: 'paul',      name: 'Paul',       teamCodes: [], hasPaid: false },
  { id: 'richards',  name: 'Richard S',  teamCodes: [], hasPaid: false },
  { id: 'marco',     name: 'Marco',      teamCodes: [], hasPaid: false },
  { id: 'aaronr',    name: 'Aaron R',    teamCodes: [], hasPaid: false },
  { id: 'richardw',  name: 'Richard W',  teamCodes: [], hasPaid: false },
  { id: 'kd',        name: 'KD',         teamCodes: [], hasPaid: false },
]

const DEFAULT_CONFIG = {
  entryFee: 10,
  prizes: {
    winner: 30, runnerUp: 20, thirdPlace: 15,
    dirtiestTeam: 10, longestGoal: 8, woodenSpoon: 7, nostradamus: 10,
  },
  tournamentYear: 2026,
}

async function main() {
  console.log('Seeding participants…')
  const batch = db.batch()
  for (const p of PARTICIPANTS) {
    batch.set(db.collection('participants').doc(p.id), { ...p, uid: null }, { merge: true })
  }
  await batch.commit()
  console.log(`  ✓ ${PARTICIPANTS.length} participants seeded`)

  console.log('Seeding config…')
  await db.collection('config').doc('app').set(DEFAULT_CONFIG, { merge: true })
  console.log('  ✓ Config seeded')

  console.log('\n✓ Seed complete. Next steps:')
  console.log('  1. After team draw: update teamCodes for each participant via Admin Panel → Teams')
  console.log('  2. Collect entry fees: update hasPaid via Admin Panel → Participants')
  console.log('  3. Run: npm run sync:dry (to test football API connection)')
}

main().catch(e => { console.error(e); process.exit(1) })
