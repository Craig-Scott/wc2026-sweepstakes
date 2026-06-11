/**
 * Fetches World Cup 2026 match data from football-data.org and writes to Firestore.
 * Run via: npm run sync        (live)
 *          npm run sync:dry    (read-only, prints what would be written)
 *
 * Requires environment variables:
 *   FOOTBALL_DATA_API_KEY    - free API key from football-data.org
 *   FIREBASE_SERVICE_ACCOUNT - JSON string of Firebase service account key
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const DRY_RUN = process.env.DRY_RUN === 'true'
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!
const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

if (!API_KEY) throw new Error('FOOTBALL_DATA_API_KEY is required')
if (!SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required')

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()

const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'

async function apiFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    TIMED: 'TIMED', SCHEDULED: 'SCHEDULED',
    IN_PLAY: 'IN_PLAY', PAUSED: 'IN_PLAY',
    FINISHED: 'FINISHED', POSTPONED: 'POSTPONED', CANCELLED: 'CANCELLED',
  }
  return map[status] ?? 'SCHEDULED'
}

// Normalize API TLA codes to match WC2026_TEAMS canonical codes used in admin/participant assignments
function normalizeCode(tla: string): string {
  const overrides: Record<string, string> = {
    URY: 'URU', // football-data.org sometimes returns ISO alpha-3 instead of FIFA code
  }
  return overrides[tla] ?? tla
}

function mapStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE:         'GROUP',
    ROUND_OF_32:         'ROUND_OF_32',
    LAST_32:             'ROUND_OF_32',
    ROUND_OF_16:         'ROUND_OF_16',
    LAST_16:             'ROUND_OF_16',
    QUARTER_FINALS:      'QUARTER_FINAL',
    SEMI_FINALS:         'SEMI_FINAL',
    THIRD_PLACE:         'THIRD_PLACE_PLAYOFF',
    THIRD_PLACE_PLAYOFF: 'THIRD_PLACE_PLAYOFF',
    FINAL:               'FINAL',
  }
  return map[stage] ?? stage
}

async function syncMatches() {
  console.log('Fetching matches…')
  const data = await apiFetch(`/competitions/${COMPETITION}/matches`)
  const matches = data.matches ?? []
  console.log(`  ${matches.length} matches returned`)

  const batch = db.batch()
  let count = 0

  for (const m of matches) {
    const matchDoc: Record<string, unknown> = {
      id: m.id,
      homeTeam: { code: normalizeCode(m.homeTeam?.tla ?? 'TBD'), name: m.homeTeam?.name ?? 'TBD' },
      awayTeam: { code: normalizeCode(m.awayTeam?.tla ?? 'TBD'), name: m.awayTeam?.name ?? 'TBD' },
      status: mapStatus(m.status),
      score: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
      kickoff: m.utcDate ? Timestamp.fromDate(new Date(m.utcDate)) : null,
      stage: mapStage(m.stage ?? ''),
      group: m.group?.replace('GROUP_', '') ?? null,
      round: m.matchday ? `Matchday ${m.matchday}` : null,
      updatedAt: Timestamp.now(),
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${m.id}: ${m.homeTeam?.name ?? 'TBD'} vs ${m.awayTeam?.name ?? 'TBD'} (${m.status})`)
    } else {
      const ref = db.collection('matches').doc(String(m.id))
      // Preserve existing admin-entered scorers/cards — only update API-sourced fields
      batch.set(ref, matchDoc, { merge: true })
    }
    count++
  }

  if (!DRY_RUN) await batch.commit()
  console.log(`  ${DRY_RUN ? '[DRY] Would have updated' : 'Updated'} ${count} matches`)
}

async function syncStandings() {
  console.log('Fetching standings…')
  let data: Record<string, unknown>
  try {
    data = await apiFetch(`/competitions/${COMPETITION}/standings`)
  } catch (e) {
    console.log(`  Standings not available yet (${(e as Error).message}) — skipping`)
    return
  }
  const standings = (data.standings as Record<string, unknown>[]) ?? []

  let count = 0
  for (const group of standings) {
    const groupCode = (group.group as string | undefined)?.replace('GROUP_', '') ?? '?'
    const table = (group.table as Record<string, unknown>[] | undefined ?? []).map((row: Record<string, unknown>, i: number) => ({
      teamCode: normalizeCode((row.team as { tla?: string })?.tla ?? 'TBD'),
      teamName: (row.team as { name?: string })?.name ?? 'TBD',
      position: i + 1,
      played: row.playedGames ?? 0,
      won: row.won ?? 0,
      drawn: row.draw ?? 0,
      lost: row.lost ?? 0,
      goalsFor: row.goalsFor ?? 0,
      goalsAgainst: row.goalsAgainst ?? 0,
      goalDifference: row.goalDifference ?? 0,
      points: row.points ?? 0,
    }))

    if (DRY_RUN) {
      console.log(`  [DRY] Group ${groupCode}: ${table.length} teams`)
    } else {
      await db.collection('standings').doc(groupCode).set({
        group: groupCode,
        table,
        updatedAt: Timestamp.now(),
      })
    }
    count++
  }
  console.log(`  ${DRY_RUN ? '[DRY] Would have updated' : 'Updated'} ${count} groups`)
}

async function calculatePredictionPoints() {
  console.log('Calculating prediction points…')
  const matchSnap = await db.collection('matches').where('status', '==', 'FINISHED').get()
  const finishedMatches = new Map(matchSnap.docs.map(d => [d.id, d.data()]))

  const predSnap = await db.collection('predictions').where('pointsAwarded', '==', null).get()
  const toUpdate = predSnap.docs.filter(d => finishedMatches.has(String(d.data().matchId)))

  console.log(`  ${toUpdate.length} predictions to score`)

  const batch = db.batch()
  for (const predDoc of toUpdate) {
    const pred = predDoc.data()
    const match = finishedMatches.get(String(pred.matchId))!
    const score = match.score as { home: number | null; away: number | null }

    if (score.home === null || score.away === null) continue

    let points = 0
    const isCanonical = (h: number, a: number) => (h === 99 && a === 0) || (h === 99 && a === 99) || (h === 0 && a === 99)
    if (!isCanonical(pred.predictedHome, pred.predictedAway) && pred.predictedHome === score.home && pred.predictedAway === score.away) {
      points = 9
    } else {
      const actualResult = Math.sign(score.home - score.away)
      const predResult = Math.sign(pred.predictedHome - pred.predictedAway)
      if (actualResult === predResult) points = 3
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${pred.participantId} ${pred.matchId}: ${points}pts`)
    } else {
      batch.update(predDoc.ref, { pointsAwarded: points })
    }
  }

  if (!DRY_RUN && toUpdate.length > 0) await batch.commit()
  console.log(`  Done scoring predictions`)
}

async function main() {
  console.log(`\n=== Football Data Sync${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`)
  let failed = false

  for (const [name, fn] of [
    ['syncMatches', syncMatches],
    ['syncStandings', syncStandings],
    ['calculatePredictionPoints', calculatePredictionPoints],
  ] as [string, () => Promise<void>][]) {
    try {
      await fn()
    } catch (e) {
      console.error(`\n✗ ${name} failed:`, e)
      failed = true
    }
  }

  if (failed) {
    console.error('\nSync finished with errors')
    process.exit(1)
  }
  console.log('\n✓ Sync complete')
}

main()
