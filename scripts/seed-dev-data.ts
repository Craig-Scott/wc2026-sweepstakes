/**
 * Seeds realistic test data for local development and visual debugging.
 * DESTRUCTIVE — overwrites participants, teams, matches, standings, predictions, prizeWinners, config.
 *
 *   export FIREBASE_SERVICE_ACCOUNT='<paste JSON here>'
 *   npm run seed:dev
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
if (!SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required')

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()
const now = Timestamp.now()
const ts = (iso: string) => Timestamp.fromDate(new Date(iso))

// ── Participants with team assignments ───────────────────────────────────────

const PARTICIPANTS = [
  { id: 'eoin',      name: 'Eoin',       teamCodes: [], hasPaid: false, uid: null },
  { id: 'stephen',   name: 'Stephen',    teamCodes: [], hasPaid: false, uid: null },
  { id: 'ciaran',    name: 'Ciaran',     teamCodes: [], hasPaid: false, uid: null },
  { id: 'craig',     name: 'Craig',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'aarons',    name: 'Aaron S',    teamCodes: [], hasPaid: false, uid: null },
  { id: 'kevin',     name: 'Kevin',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'sarai',     name: 'Sarai',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'sarah',     name: 'Sarah',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'ciara',     name: 'Ciara',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'astrid',    name: 'Astrid',     teamCodes: [], hasPaid: false, uid: null },
  { id: 'luke',      name: 'Luke',       teamCodes: [], hasPaid: false, uid: null },
  { id: 'dan',       name: 'Dan',        teamCodes: [], hasPaid: false, uid: null },
  { id: 'aaronmcpo', name: 'Aaron Mcpo', teamCodes: [], hasPaid: false, uid: null },
  { id: 'david',     name: 'David',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'clarke',    name: 'Clark',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'paul',      name: 'Paul',       teamCodes: [], hasPaid: false, uid: null },
  { id: 'richards',  name: 'Richard S',  teamCodes: [], hasPaid: false, uid: null },
  { id: 'marco',     name: 'Marco',      teamCodes: [], hasPaid: false, uid: null },
  { id: 'aaronr',    name: 'Aaron R',    teamCodes: [], hasPaid: false, uid: null },
  { id: 'richardw',  name: 'Richard W',  teamCodes: [], hasPaid: false, uid: null },
  { id: 'kd',        name: 'KD',         teamCodes: [], hasPaid: false, uid: null },
]

// ── Teams (48 teams across 12 groups) ───────────────────────────────────────

const TEAMS = [
  // Group A
  { code: 'ENG', name: 'England',      group: 'A', participantId: ''      },
  { code: 'FRA', name: 'France',       group: 'A', participantId: ''     },
  { code: 'ITA', name: 'Italy',        group: 'A', participantId: ''     },
  { code: 'GHA', name: 'Ghana',        group: 'A', participantId: ''      },
  // Group B
  { code: 'BRA', name: 'Brazil',       group: 'B', participantId: ''   },
  { code: 'GER', name: 'Germany',      group: 'B', participantId: ''    },
  { code: 'NED', name: 'Netherlands',  group: 'B', participantId: ''     },
  { code: 'ECU', name: 'Ecuador',      group: 'B', participantId: ''    },
  // Group C
  { code: 'ARG', name: 'Argentina',    group: 'C', participantId: ''    },
  { code: 'ESP', name: 'Spain',        group: 'C', participantId: ''     },
  { code: 'POR', name: 'Portugal',     group: 'C', participantId: ''    },
  { code: 'HON', name: 'Honduras',     group: 'C', participantId: ''  },
  // Group D
  { code: 'USA', name: 'USA',          group: 'D', participantId: ''     },
  { code: 'MEX', name: 'Mexico',       group: 'D', participantId: ''     },
  { code: 'CRO', name: 'Croatia',      group: 'D', participantId: ''     },
  { code: 'URU', name: 'Uruguay',      group: 'D', participantId: ''     },
  // Group E
  { code: 'MAR', name: 'Morocco',      group: 'E', participantId: ''     },
  { code: 'SEN', name: 'Senegal',      group: 'E', participantId: ''   },
  { code: 'AUS', name: 'Australia',    group: 'E', participantId: ''    },
  { code: 'EGY', name: 'Egypt',        group: 'E', participantId: ''     },
  // Group F
  { code: 'JPN', name: 'Japan',        group: 'F', participantId: ''      },
  { code: 'KOR', name: 'South Korea',  group: 'F', participantId: ''    },
  { code: 'COL', name: 'Colombia',     group: 'F', participantId: ''     },
  { code: 'IRN', name: 'Iran',         group: 'F', participantId: ''       },
  // Group G
  { code: 'BEL', name: 'Belgium',      group: 'G', participantId: ''      },
  { code: 'SCO', name: 'Scotland',     group: 'G', participantId: ''       },
  { code: 'TUR', name: 'Turkey',       group: 'G', participantId: '' },
  { code: 'CIV', name: 'Ivory Coast',  group: 'G', participantId: '' },
  // Group H
  { code: 'UKR', name: 'Ukraine',      group: 'H', participantId: ''     },
  { code: 'VEN', name: 'Venezuela',    group: 'H', participantId: ''     },
  { code: 'DEN', name: 'Denmark',      group: 'H', participantId: ''    },
  { code: 'SAU', name: 'Saudi Arabia', group: 'H', participantId: ''    },
  // Group I
  { code: 'AUT', name: 'Austria',      group: 'I', participantId: ''      },
  { code: 'CMR', name: 'Cameroon',     group: 'I', participantId: ''      },
  { code: 'SUI', name: 'Switzerland',  group: 'I', participantId: ''  },
  { code: 'JAM', name: 'Jamaica',      group: 'I', participantId: ''          },
  // Group J
  { code: 'CAN', name: 'Canada',       group: 'J', participantId: ''     },
  { code: 'SRB', name: 'Serbia',       group: 'J', participantId: ''    },
  { code: 'MLI', name: 'Mali',         group: 'J', participantId: ''    },
  { code: 'JOR', name: 'Jordan',       group: 'J', participantId: ''          },
  // Group K
  { code: 'HUN', name: 'Hungary',      group: 'K', participantId: ''  },
  { code: 'PAN', name: 'Panama',       group: 'K', participantId: ''  },
  { code: 'SVN', name: 'Slovenia',     group: 'K', participantId: ''        },
  { code: 'SVK', name: 'Slovakia',     group: 'K', participantId: ''          },
  // Group L
  { code: 'ZAF', name: 'South Africa', group: 'L', participantId: ''        },
  { code: 'IRQ', name: 'Iraq',         group: 'L', participantId: ''          },
  { code: 'NZL', name: 'New Zealand',  group: 'L', participantId: ''          },
  { code: 'TUN', name: 'Tunisia',      group: 'L', participantId: ''          },
]

const t = (code: string) => ({ code, name: TEAMS.find(x => x.code === code)!.name })

// ── Matches ──────────────────────────────────────────────────────────────────
// Group A: 4 FINISHED, 2 upcoming. Group B: 2 FINISHED, 1 IN_PLAY, 3 upcoming.
// Plus 2 knockout placeholders.

const MATCHES = [
  // ── Group A ──
  {
    id: 1, homeTeam: t('ENG'), awayTeam: t('ITA'),
    status: 'FINISHED', score: { home: 2, away: 1 },
    kickoff: ts('2026-06-12T15:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [
      { player: 'Saka',       team: 'ENG', minute: 23, distanceMeters: 18,   isOwnGoal: false, isPenalty: false },
      { player: 'Bellingham', team: 'ENG', minute: 67, distanceMeters: 22,   isOwnGoal: false, isPenalty: false },
      { player: 'Tonali',     team: 'ITA', minute: 55, distanceMeters: null, isOwnGoal: false, isPenalty: true  },
    ],
    cards: [
      { player: 'Barella',    team: 'ITA', type: 'YELLOW', minute: 38 },
      { player: 'Bellingham', team: 'ENG', type: 'YELLOW', minute: 72 },
    ],
    updatedAt: now,
  },
  {
    id: 2, homeTeam: t('FRA'), awayTeam: t('GHA'),
    status: 'FINISHED', score: { home: 3, away: 0 },
    kickoff: ts('2026-06-12T18:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [
      { player: 'Mbappé',   team: 'FRA', minute: 12, distanceMeters: 25,   isOwnGoal: false, isPenalty: false },
      { player: 'Dembélé',  team: 'FRA', minute: 44, distanceMeters: null, isOwnGoal: false, isPenalty: false },
      { player: 'Mbappé',   team: 'FRA', minute: 88, distanceMeters: 19,   isOwnGoal: false, isPenalty: false },
    ],
    cards: [
      { player: 'Kudus', team: 'GHA', type: 'YELLOW', minute: 56 },
      { player: 'Ayew',  team: 'GHA', type: 'RED',    minute: 81 },
    ],
    updatedAt: now,
  },
  {
    id: 3, homeTeam: t('ENG'), awayTeam: t('GHA'),
    status: 'FINISHED', score: { home: 1, away: 0 },
    kickoff: ts('2026-06-17T15:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [
      { player: 'Kane', team: 'ENG', minute: 63, distanceMeters: null, isOwnGoal: false, isPenalty: true },
    ],
    cards: [
      { player: 'Kudus', team: 'GHA', type: 'YELLOW', minute: 71 },
    ],
    updatedAt: now,
  },
  {
    id: 4, homeTeam: t('ITA'), awayTeam: t('FRA'),
    status: 'FINISHED', score: { home: 1, away: 1 },
    kickoff: ts('2026-06-17T18:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [
      { player: 'Retegui',    team: 'ITA', minute: 34, distanceMeters: 17, isOwnGoal: false, isPenalty: false },
      { player: 'Tchouaméni', team: 'FRA', minute: 78, distanceMeters: 28, isOwnGoal: false, isPenalty: false },
    ],
    cards: [
      { player: 'Barella',    team: 'ITA', type: 'YELLOW', minute: 45 },
      { player: 'Camavinga',  team: 'FRA', type: 'YELLOW', minute: 62 },
    ],
    updatedAt: now,
  },
  {
    id: 5, homeTeam: t('ENG'), awayTeam: t('FRA'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-06-22T20:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [], cards: [], updatedAt: now,
  },
  {
    id: 6, homeTeam: t('GHA'), awayTeam: t('ITA'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-06-22T20:00:00Z'), stage: 'GROUP', group: 'A', round: null,
    scorers: [], cards: [], updatedAt: now,
  },

  // ── Group B ──
  {
    id: 7, homeTeam: t('BRA'), awayTeam: t('ECU'),
    status: 'FINISHED', score: { home: 4, away: 1 },
    kickoff: ts('2026-06-13T15:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [
      { player: 'Vinicius Jr', team: 'BRA', minute:  8, distanceMeters: 20,   isOwnGoal: false, isPenalty: false },
      { player: 'Rodrygo',     team: 'BRA', minute: 31, distanceMeters: null, isOwnGoal: false, isPenalty: false },
      { player: 'Caicedo',     team: 'ECU', minute: 49, distanceMeters: null, isOwnGoal: false, isPenalty: false },
      { player: 'Neymar',      team: 'BRA', minute: 72, distanceMeters: 24,   isOwnGoal: false, isPenalty: false },
      { player: 'Vinicius Jr', team: 'BRA', minute: 85, distanceMeters: null, isOwnGoal: false, isPenalty: true  },
    ],
    cards: [
      { player: 'Caicedo', team: 'ECU', type: 'YELLOW', minute: 44 },
    ],
    updatedAt: now,
  },
  {
    id: 8, homeTeam: t('GER'), awayTeam: t('NED'),
    status: 'FINISHED', score: { home: 2, away: 2 },
    kickoff: ts('2026-06-13T18:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [
      { player: 'Müller',   team: 'GER', minute: 22, distanceMeters: null, isOwnGoal: false, isPenalty: false },
      { player: 'Gakpo',    team: 'NED', minute: 38, distanceMeters: 21,   isOwnGoal: false, isPenalty: false },
      { player: 'Wirtz',    team: 'GER', minute: 55, distanceMeters: 26,   isOwnGoal: false, isPenalty: false },
      { player: 'Van Dijk', team: 'NED', minute: 90, distanceMeters: null, isOwnGoal: false, isPenalty: false },
    ],
    cards: [
      { player: 'Kroos',  team: 'GER', type: 'YELLOW', minute: 67 },
      { player: 'De Ligt', team: 'NED', type: 'YELLOW', minute: 78 },
      { player: 'Brandt', team: 'GER', type: 'YELLOW', minute: 83 },
    ],
    updatedAt: now,
  },
  {
    id: 9, homeTeam: t('BRA'), awayTeam: t('GER'),
    status: 'IN_PLAY', score: { home: 1, away: 0 },
    kickoff: ts('2026-06-18T18:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [
      { player: 'Vinicius Jr', team: 'BRA', minute: 34, distanceMeters: 19, isOwnGoal: false, isPenalty: false },
    ],
    cards: [], updatedAt: now,
  },
  {
    id: 10, homeTeam: t('NED'), awayTeam: t('ECU'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-06-18T15:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [], cards: [], updatedAt: now,
  },
  {
    id: 11, homeTeam: t('BRA'), awayTeam: t('NED'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-06-23T20:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [], cards: [], updatedAt: now,
  },
  {
    id: 12, homeTeam: t('GER'), awayTeam: t('ECU'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-06-23T20:00:00Z'), stage: 'GROUP', group: 'B', round: null,
    scorers: [], cards: [], updatedAt: now,
  },

  // ── Knockout stage placeholders ──
  {
    id: 49, homeTeam: t('ENG'), awayTeam: t('BRA'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-07-01T20:00:00Z'), stage: 'ROUND_OF_16', group: null, round: 'Round of 16',
    scorers: [], cards: [], updatedAt: now,
  },
  {
    id: 50, homeTeam: t('ARG'), awayTeam: t('FRA'),
    status: 'TIMED', score: { home: null, away: null },
    kickoff: ts('2026-07-02T20:00:00Z'), stage: 'ROUND_OF_16', group: null, round: 'Round of 16',
    scorers: [], cards: [], updatedAt: now,
  },
]

// ── Standings ────────────────────────────────────────────────────────────────
// Group A after matchdays 1 & 2 (4 matches played):
//   ENG: W2 D0 L0 — 6 pts
//   FRA: W1 D1 L0 — 4 pts
//   ITA: W0 D1 L1 — 1 pt
//   GHA: W0 D0 L2 — 0 pts

const STANDINGS = [
  {
    group: 'A',
    table: [
      { teamCode: 'ENG', teamName: 'England',     position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 1, goalDifference:  2, points: 6 },
      { teamCode: 'FRA', teamName: 'France',      position: 2, played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference:  3, points: 4 },
      { teamCode: 'ITA', teamName: 'Italy',       position: 3, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: -1, points: 1 },
      { teamCode: 'GHA', teamName: 'Ghana',       position: 4, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 0, goalsAgainst: 4, goalDifference: -4, points: 0 },
    ],
    updatedAt: now,
  },
  {
    // Group B after matchday 1 only (in-play match excluded from table)
    group: 'B',
    table: [
      { teamCode: 'BRA', teamName: 'Brazil',      position: 1, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference:  3, points: 3 },
      { teamCode: 'GER', teamName: 'Germany',     position: 2, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 2, goalDifference:  0, points: 1 },
      { teamCode: 'NED', teamName: 'Netherlands', position: 3, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 2, goalDifference:  0, points: 1 },
      { teamCode: 'ECU', teamName: 'Ecuador',     position: 4, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 4, goalDifference: -3, points: 0 },
    ],
    updatedAt: now,
  },
]

// ── Predictions ──────────────────────────────────────────────────────────────
// Points: exact score = 6, correct result = 3, wrong = 0.
// Leaderboard after 4 finished Group A matches + 2 Group B matches:
//   craig:   0 + 6 + 6 + 6 = 18 pts (Nostradamus leader)
//   eoin:    3 + 3 + 3 + 0 = 9 pts
//   stephen: 3 + 0         = 3 pts
//   ciara:   0 + 0         = 0 pts
//   aarons:  0             = 0 pts

const PREDICTIONS = [
  // eoin (ENG fan — correct results, no exact scores)
  { participantId: '', matchId: 1, uid: 'dev_uid_eoin', predictedHome: 2, predictedAway: 0, pointsAwarded: 3  }, // ENG 2-1 ITA: correct result
  { participantId: '', matchId: 2, uid: 'dev_uid_eoin', predictedHome: 2, predictedAway: 0, pointsAwarded: 3  }, // FRA 3-0 GHA: correct result
  { participantId: '', matchId: 3, uid: 'dev_uid_eoin', predictedHome: 2, predictedAway: 0, pointsAwarded: 3  }, // ENG 1-0 GHA: correct result
  { participantId: '', matchId: 4, uid: 'dev_uid_eoin', predictedHome: 0, predictedAway: 2, pointsAwarded: 0  }, // ITA 1-1 FRA: wrong (predicted away win)

  // craig (FRA fan — prophetic predictions)
  { participantId: '', matchId: 1, uid: 'dev_uid_craig', predictedHome: 1, predictedAway: 1, pointsAwarded: 0 }, // ENG 2-1 ITA: wrong (predicted draw)
  { participantId: '', matchId: 2, uid: 'dev_uid_craig', predictedHome: 3, predictedAway: 0, pointsAwarded: 6 }, // FRA 3-0 GHA: exact!
  { participantId: '', matchId: 3, uid: 'dev_uid_craig', predictedHome: 1, predictedAway: 0, pointsAwarded: 6 }, // ENG 1-0 GHA: exact!
  { participantId: '', matchId: 4, uid: 'dev_uid_craig', predictedHome: 1, predictedAway: 1, pointsAwarded: 6 }, // ITA 1-1 FRA: exact!

  // stephen (BRA fan)
  { participantId: '', matchId: 7, uid: 'dev_uid_stephen', predictedHome: 3, predictedAway: 1, pointsAwarded: 3 }, // BRA 4-1 ECU: correct result
  { participantId: '', matchId: 8, uid: 'dev_uid_stephen', predictedHome: 2, predictedAway: 0, pointsAwarded: 0 }, // GER 2-2 NED: wrong (predicted GER win)

  // ciara (ITA fan)
  { participantId: '', matchId: 1, uid: 'dev_uid_ciara', predictedHome: 1, predictedAway: 2, pointsAwarded: 0 }, // ENG 2-1 ITA: wrong (predicted ITA win)
  { participantId: '', matchId: 4, uid: 'dev_uid_ciara', predictedHome: 1, predictedAway: 0, pointsAwarded: 0 }, // ITA 1-1 FRA: wrong (predicted ITA win)

  // aarons (GER fan)
  { participantId: '', matchId: 8, uid: 'dev_uid_aarons', predictedHome: 3, predictedAway: 1, pointsAwarded: 0 }, // GER 2-2 NED: wrong (predicted GER win)
]

// ── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  entryFee: 10,
  prizes: { winner: 30, runnerUp: 20, thirdPlace: 15, dirtiestTeam: 10, longestGoal: 8, woodenSpoon: 7, nostradamus: 10 },
  tournamentYear: 2026,
  dataMode: 'test',
}

// ── Prize winners (partial — tournament in progress) ─────────────────────────
// Pool: 21 × £15 = £315

const PRIZE_WINNERS = {
  winner:       null,
  runnerUp:     null,
  thirdPlace:   null,
  dirtiestTeam: null,
  longestGoal:  null,
  woodenSpoon:  null,
  nostradamus:  null,
  calculatedAt: now,
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding participants…')
  let batch = db.batch()
  for (const p of PARTICIPANTS) {
    batch.set(db.collection('participants').doc(p.id), p)
  }
  await batch.commit()
  console.log(`  ✓ ${PARTICIPANTS.length} participants`)

  console.log('Seeding teams…')
  batch = db.batch()
  for (const team of TEAMS) {
    batch.set(db.collection('teams').doc(team.code), team)
  }
  await batch.commit()
  console.log(`  ✓ ${TEAMS.length} teams`)

  console.log('Seeding matches_test…')
  batch = db.batch()
  for (const match of MATCHES) {
    batch.set(db.collection('matches_test').doc(String(match.id)), match)
  }
  await batch.commit()
  console.log(`  ✓ ${MATCHES.length} matches`)

  console.log('Seeding standings_test…')
  batch = db.batch()
  for (const standing of STANDINGS) {
    batch.set(db.collection('standings_test').doc(standing.group), standing)
  }
  await batch.commit()
  console.log(`  ✓ ${STANDINGS.length} groups`)

  console.log('Seeding predictions_test…')
  batch = db.batch()
  for (const pred of PREDICTIONS) {
    const docId = `${pred.participantId}_${pred.matchId}`
    batch.set(db.collection('predictions_test').doc(docId), {
      ...pred,
      submittedAt: now,
    })
  }
  await batch.commit()
  console.log(`  ✓ ${PREDICTIONS.length} predictions`)

  console.log('Seeding config (dataMode: test)…')
  await db.collection('config').doc('app').set(CONFIG)
  console.log('  ✓ Config')

  console.log('Seeding prizeWinners_test…')
  await db.collection('prizeWinners_test').doc('current').set(PRIZE_WINNERS)
  console.log('  ✓ Prize winners')

  console.log('\n✓ Dev seed complete.')
  console.log('  Leaderboard: craig 18pts · eoin 9pts · stephen 3pts')
  console.log('  Group A complete (2 matches left). Group B: 1 IN_PLAY, 3 upcoming.')
  console.log('  2 Round of 16 placeholders seeded.')
}

main().catch(e => { console.error(e); process.exit(1) })
