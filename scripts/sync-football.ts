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
    IN_PLAY: 'IN_PLAY', PAUSED: 'PAUSED',
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

type ESPNMatchData = { home: number; away: number; eventId: string }

async function fetchESPNScores(): Promise<Map<string, ESPNMatchData>> {
  const scores = new Map<string, ESPNMatchData>()
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard')
    const data = await res.json() as { events?: Record<string, unknown>[] }
    const ACTIVE_STATUSES = ['STATUS_FULL_TIME', 'STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_EXTRA_TIME', 'STATUS_PENALTY']
    for (const event of data.events ?? []) {
      const comp = (event.competitions as Record<string, unknown>[])?.[0]
      if (!comp) continue
      const statusName = ((comp.status as Record<string, unknown>)?.type as Record<string, unknown>)?.name as string
      if (!ACTIVE_STATUSES.includes(statusName)) continue
      const competitors = comp.competitors as Record<string, unknown>[]
      const homeTeam = competitors?.find(t => t.homeAway === 'home')
      const awayTeam = competitors?.find(t => t.homeAway === 'away')
      if (!homeTeam || !awayTeam) continue
      const homeScore = parseInt(homeTeam.score as string, 10)
      const awayScore = parseInt(awayTeam.score as string, 10)
      if (isNaN(homeScore) || isNaN(awayScore)) continue
      const homeAbb = (homeTeam.team as Record<string, unknown>)?.abbreviation as string
      const awayAbb = (awayTeam.team as Record<string, unknown>)?.abbreviation as string
      scores.set(`${homeAbb}|${awayAbb}`, { home: homeScore, away: awayScore, eventId: event.id as string })
    }
    console.log(`  ESPN scores fetched: ${scores.size} active matches`)
  } catch (e) {
    console.warn('  ESPN score fetch failed (non-fatal):', (e as Error).message)
  }
  return scores
}

type ESPNGoal = { player: string; team: string; minute: number; isOwnGoal: boolean; isPenalty: boolean; distanceMeters: null }
type ESPNCard = { player: string; team: string; minute: number; type: 'YELLOW' | 'RED' | 'YELLOW_RED' }

async function fetchESPNEventDetails(eventId: string): Promise<{ scorers: ESPNGoal[]; cards: ESPNCard[] }> {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`)
    const data = await res.json() as { keyEvents?: Record<string, unknown>[] }
    const keyEvents = data.keyEvents ?? []

    const scorers: ESPNGoal[] = keyEvents
      .filter(e => (e.scoringPlay === true))
      .map(e => {
        const type = (e.type as Record<string, unknown>)?.type as string
        const minute = Math.round(((e.clock as Record<string, unknown>)?.value as number ?? 0) / 60)
        const teamName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
        const participants = (e.participants as Record<string, unknown>[]) ?? []
        const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
        return {
          player,
          team: teamName,
          minute,
          distanceMeters: null,
          isOwnGoal: type === 'own-goal',
          isPenalty: type === 'penalty-goal' || type === 'penalty',
        }
      })

    const cards: ESPNCard[] = keyEvents
      .filter(e => ['yellow-card', 'red-card', 'yellow-red-card'].includes((e.type as Record<string, unknown>)?.type as string))
      .map(e => {
        const type = (e.type as Record<string, unknown>)?.type as string
        const minute = Math.round(((e.clock as Record<string, unknown>)?.value as number ?? 0) / 60)
        const teamName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
        const participants = (e.participants as Record<string, unknown>[]) ?? []
        const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
        return {
          player,
          team: teamName,
          minute,
          type: type === 'red-card' ? 'RED' : type === 'yellow-red-card' ? 'YELLOW_RED' : 'YELLOW',
        }
      })

    return { scorers, cards }
  } catch (e) {
    console.warn(`  ESPN event detail fetch failed for ${eventId} (non-fatal):`, (e as Error).message)
    return { scorers: [], cards: [] }
  }
}

async function syncMatches() {
  console.log('Fetching matches…')
  const [data, espnScores, existingSnap] = await Promise.all([
    apiFetch(`/competitions/${COMPETITION}/matches`),
    fetchESPNScores(),
    db.collection('matches').get(),
  ])
  const matches = data.matches ?? []
  console.log(`  ${matches.length} matches returned`)

  // Build a map of existing Firestore scorers so we can preserve admin-entered distanceMeters
  const existingScorers = new Map<string, Record<string, unknown>[]>()
  for (const snap of existingSnap.docs) {
    const scorers = (snap.data().scorers as Record<string, unknown>[] | undefined) ?? []
    existingScorers.set(snap.id, scorers)
  }

  const batch = db.batch()
  let count = 0

  for (const m of matches) {
    const homeCode = normalizeCode(m.homeTeam?.tla ?? 'TBD')
    const awayCode = normalizeCode(m.awayTeam?.tla ?? 'TBD')
    const espnScore = espnScores.get(`${homeCode}|${awayCode}`)

    const apiHome = m.score?.fullTime?.home ?? null
    const apiAway = m.score?.fullTime?.away ?? null
    const scoreHome = apiHome ?? espnScore?.home ?? null
    const scoreAway = apiAway ?? espnScore?.away ?? null

    if (espnScore && apiHome === null) {
      console.log(`  [ESPN] ${homeCode} ${scoreHome}-${scoreAway} ${awayCode}`)
    }

    const apiGoals = (m.goals ?? []) as Record<string, unknown>[]
    const apiBookings = (m.bookings ?? []) as Record<string, unknown>[]

    let scorers: unknown[]
    let cards: unknown[]

    const preserved = existingScorers.get(String(m.id)) ?? []
    const mergeDistance = (player: string, minute: number): number | null => {
      const ex = preserved.find(s => s.player === player && s.minute === minute)
      return (ex?.distanceMeters as number | null) ?? null
    }

    if (apiGoals.length > 0) {
      scorers = apiGoals.map(g => {
        const player = (g.scorer as { name?: string })?.name ?? 'Unknown'
        const minute = (g.minute as number) ?? 0
        return {
          player,
          team: normalizeCode((g.team as { tla?: string })?.tla ?? ''),
          minute,
          distanceMeters: mergeDistance(player, minute),
          isOwnGoal: g.type === 'OWN_GOAL',
          isPenalty: g.type === 'PENALTY',
        }
      })
      cards = apiBookings.map(b => ({
        player: (b.player as { name?: string })?.name ?? 'Unknown',
        team: normalizeCode((b.team as { tla?: string })?.tla ?? ''),
        minute: (b.minute as number) ?? 0,
        type: b.card === 'YELLOW_CARD' ? 'YELLOW' : b.card === 'RED_CARD' ? 'RED' : 'YELLOW_RED',
      }))
    } else if (espnScore?.eventId && mapStatus(m.status) === 'FINISHED') {
      const espnDetails = await fetchESPNEventDetails(espnScore.eventId)
      scorers = espnDetails.scorers.map(s => ({ ...s, distanceMeters: mergeDistance(s.player, s.minute) }))
      cards = espnDetails.cards
      if (scorers.length > 0) {
        console.log(`  [ESPN] Goals for ${homeCode} vs ${awayCode}: ${scorers.map((s) => `${(s as {player:string;minute:number}).player} ${(s as {player:string;minute:number}).minute}'`).join(', ')}`)
      }
    } else {
      scorers = []
      cards = []
    }

    const matchDoc: Record<string, unknown> = {
      id: m.id,
      homeTeam: { code: homeCode, name: m.homeTeam?.name ?? 'TBD' },
      awayTeam: { code: awayCode, name: m.awayTeam?.name ?? 'TBD' },
      status: mapStatus(m.status),
      score: {
        home: scoreHome,
        away: scoreAway,
      },
      kickoff: m.utcDate ? Timestamp.fromDate(new Date(m.utcDate)) : null,
      currentMinute: m.minute ?? null,
      stage: mapStage(m.stage ?? ''),
      group: m.group?.replace('GROUP_', '') ?? null,
      round: m.matchday ? `Matchday ${m.matchday}` : null,
      scorers,
      cards,
      updatedAt: Timestamp.now(),
    }

    if (DRY_RUN) {
      const scorerNames = scorers.map((s: { player: string; minute: number }) => `${s.player} ${s.minute}'`).join(', ')
      console.log(`  [DRY] ${m.id}: ${m.homeTeam?.name ?? 'TBD'} vs ${m.awayTeam?.name ?? 'TBD'} (${m.status})${scorerNames ? ` | ${scorerNames}` : ''}`)
    } else {
      const ref = db.collection('matches').doc(String(m.id))
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
