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

// Translate ESPN abbreviations to football-data.org TLA codes where they diverge.
// Expand this table whenever a sync log reports an unmatched ESPN match.
const ESPN_TO_FDO: Record<string, string> = {
  NIRL: 'NIR',
  CZE:  'CZE', // same, but listed for visibility
  SVK:  'SVK',
}
function normalizeESPNCode(abbr: string): string {
  return ESPN_TO_FDO[abbr] ?? abbr
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
      const homeAbb = normalizeESPNCode((homeTeam.team as Record<string, unknown>)?.abbreviation as string)
      const awayAbb = normalizeESPNCode((awayTeam.team as Record<string, unknown>)?.abbreviation as string)
      scores.set(`${homeAbb}|${awayAbb}`, { home: homeScore, away: awayScore, eventId: event.id as string })
    }
    console.log(`  ESPN scores fetched: ${scores.size} active matches`)
    for (const key of scores.keys()) {
      console.log(`  ESPN active: ${key}`)
    }
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
    const data = await res.json() as { keyEvents?: Record<string, unknown>[]; boxscore?: Record<string, unknown> }
    const keyEvents = data.keyEvents ?? []

    // Build displayName → abbreviation map from boxscore teams
    const teamAbbr = new Map<string, string>()
    const bsTeams = (data.boxscore?.teams as Record<string, unknown>[] | undefined) ?? []
    for (const t of bsTeams) {
      const info = t.team as Record<string, unknown>
      if (info?.displayName && info?.abbreviation) {
        teamAbbr.set(info.displayName as string, info.abbreviation as string)
      }
    }
    const resolveTeam = (displayName: string) => teamAbbr.get(displayName) ?? displayName

    const scorers: ESPNGoal[] = keyEvents
      .filter(e => (e.scoringPlay === true))
      .map(e => {
        const type = (e.type as Record<string, unknown>)?.type as string
        const minute = Math.round(((e.clock as Record<string, unknown>)?.value as number ?? 0) / 60)
        const displayName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
        const participants = (e.participants as Record<string, unknown>[]) ?? []
        const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
        return {
          player,
          team: resolveTeam(displayName),
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
        const displayName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
        const participants = (e.participants as Record<string, unknown>[]) ?? []
        const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
        return {
          player,
          team: resolveTeam(displayName),
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

async function syncMatches(): Promise<Set<string>> {
  console.log('Fetching matches…')
  const [data, espnScores, existingSnap] = await Promise.all([
    apiFetch(`/competitions/${COMPETITION}/matches`),
    fetchESPNScores(),
    db.collection('matches').get(),
  ])
  const matches = data.matches ?? []
  console.log(`  ${matches.length} matches returned`)

  // Build maps of existing Firestore data to preserve across syncs
  const existingStatuses = new Map<string, string>()
  const existingScorers = new Map<string, Record<string, unknown>[]>()
  const existingCards = new Map<string, Record<string, unknown>[]>()
  const existingEspnEventIds = new Map<string, string | null>()
  for (const snap of existingSnap.docs) {
    existingStatuses.set(snap.id, (snap.data().status as string | undefined) ?? '')
    existingScorers.set(snap.id, (snap.data().scorers as Record<string, unknown>[] | undefined) ?? [])
    existingCards.set(snap.id, (snap.data().cards as Record<string, unknown>[] | undefined) ?? [])
    existingEspnEventIds.set(snap.id, (snap.data().espnEventId as string | null) ?? null)
  }

  const newlyFinished = new Set<string>()
  const batch = db.batch()
  let count = 0

  for (const m of matches) {
    const homeCode = normalizeCode(m.homeTeam?.tla ?? 'TBD')
    const awayCode = normalizeCode(m.awayTeam?.tla ?? 'TBD')
    const espnScore = espnScores.get(`${homeCode}|${awayCode}`)
    const matchId = String(m.id)
    const mappedStatus = mapStatus(m.status)

    // Log when an ESPN active match doesn't map to any football-data.org match — expand ESPN_TO_FDO if seen
    if (!espnScore && espnScores.size > 0 && ['IN_PLAY', 'PAUSED'].includes(mappedStatus)) {
      console.warn(`  [ESPN] No match found for ${homeCode}|${awayCode} (status: ${m.status}) — check ESPN_TO_FDO table`)
    }

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

    const preserved = existingScorers.get(matchId) ?? []
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
    } else if (espnScore?.eventId && mappedStatus === 'FINISHED') {
      const espnDetails = await fetchESPNEventDetails(espnScore.eventId)
      scorers = espnDetails.scorers.map(s => ({ ...s, distanceMeters: mergeDistance(s.player, s.minute) }))
      cards = espnDetails.cards
      if (scorers.length > 0) {
        console.log(`  [ESPN] Goals for ${homeCode} vs ${awayCode}: ${scorers.map((s) => `${(s as {player:string;minute:number}).player} ${(s as {player:string;minute:number}).minute}'`).join(', ')}`)
      }
    } else {
      // For FINISHED matches, preserve existing Firestore data rather than overwriting with empty
      // arrays — ESPN's scoreboard only shows recently active matches, so older finished matches
      // would otherwise lose their scorer/card data on every subsequent sync run.
      if (mappedStatus === 'FINISHED') {
        scorers = existingScorers.get(matchId) ?? []
        cards = existingCards.get(matchId) ?? []
      } else {
        scorers = []
        cards = []
      }
    }

    const matchDoc: Record<string, unknown> = {
      id: m.id,
      homeTeam: { code: homeCode, name: m.homeTeam?.name ?? 'TBD' },
      awayTeam: { code: awayCode, name: m.awayTeam?.name ?? 'TBD' },
      status: mappedStatus,
      score: {
        home: scoreHome,
        away: scoreAway,
      },
      kickoff: m.utcDate ? Timestamp.fromDate(new Date(m.utcDate)) : null,
      currentMinute: m.minute ?? null,
      espnEventId: espnScore?.eventId ?? existingEspnEventIds.get(matchId) ?? null,
      stage: mapStage(m.stage ?? ''),
      group: m.group?.replace('GROUP_', '') ?? null,
      round: m.matchday ? `Matchday ${m.matchday}` : null,
      scorers,
      cards,
      updatedAt: Timestamp.now(),
    }

    if (mappedStatus === 'FINISHED' && existingStatuses.get(matchId) !== 'FINISHED') {
      newlyFinished.add(matchId)
      console.log(`  [FINISHED] ${homeCode} vs ${awayCode} (${matchId})`)
    }

    if (DRY_RUN) {
      const scorerNames = (scorers as { player: string; minute: number }[]).map(s => `${s.player} ${s.minute}'`).join(', ')
      console.log(`  [DRY] ${m.id}: ${m.homeTeam?.name ?? 'TBD'} vs ${m.awayTeam?.name ?? 'TBD'} (${m.status})${scorerNames ? ` | ${scorerNames}` : ''}`)
    } else {
      const ref = db.collection('matches').doc(matchId)
      batch.set(ref, matchDoc, { merge: true })
    }
    count++
  }

  if (!DRY_RUN) await batch.commit()
  console.log(`  ${DRY_RUN ? '[DRY] Would have updated' : 'Updated'} ${count} matches, ${newlyFinished.size} newly finished`)
  return newlyFinished
}

async function backfillScorers(newlyFinished: Set<string>) {
  if (newlyFinished.size === 0) return
  console.log('Backfilling scorer data for newly finished matches…')

  const snap = await db.collection('matches').where('status', '==', 'FINISHED').get()

  // Only target newly-finished matches where goals were scored but scorer array is empty
  const needsBackfill = snap.docs.filter(d => {
    if (!newlyFinished.has(d.id)) return false
    const data = d.data()
    const scorers = (data.scorers as unknown[] | undefined) ?? []
    const score = data.score as { home: number | null; away: number | null }
    const totalGoals = (score.home ?? 0) + (score.away ?? 0)
    return scorers.length === 0 && totalGoals > 0
  })

  if (needsBackfill.length === 0) {
    console.log('  No matches need backfilling')
    return
  }

  console.log(`  ${needsBackfill.length} finished matches have goals but no scorer data`)

  // Group by UTC date to batch ESPN scoreboard fetches
  const dateMap = new Map<string, typeof needsBackfill>()
  for (const doc of needsBackfill) {
    const kickoff = (doc.data().kickoff as Timestamp).toDate()
    const dateStr = `${kickoff.getUTCFullYear()}${String(kickoff.getUTCMonth() + 1).padStart(2, '0')}${String(kickoff.getUTCDate()).padStart(2, '0')}`
    if (!dateMap.has(dateStr)) dateMap.set(dateStr, [])
    dateMap.get(dateStr)!.push(doc)
  }

  const toDateStr = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`

  const fetchESPNScoreboard = async (dateStr: string, into: Map<string, string>) => {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`)
      const data = await res.json() as { events?: Record<string, unknown>[] }
      let count = 0
      for (const event of data.events ?? []) {
        const comp = (event.competitions as Record<string, unknown>[])?.[0]
        if (!comp) continue
        const competitors = comp.competitors as Record<string, unknown>[]
        const homeTeam = competitors?.find(t => t.homeAway === 'home')
        const awayTeam = competitors?.find(t => t.homeAway === 'away')
        if (!homeTeam || !awayTeam) continue
        const homeAbb = (homeTeam.team as Record<string, unknown>)?.abbreviation as string
        const awayAbb = (awayTeam.team as Record<string, unknown>)?.abbreviation as string
        if (homeAbb && awayAbb) { into.set(`${homeAbb}|${awayAbb}`, event.id as string); count++ }
      }
      return count
    } catch (e) {
      console.warn(`  ESPN scoreboard fetch failed for ${dateStr}:`, (e as Error).message)
      return 0
    }
  }

  const batch = db.batch()
  let updated = 0

  for (const [dateStr, docs] of dateMap) {
    // ESPN indexes by US Eastern Time — late-UTC matches (e.g. 02:00 UTC) appear on the
    // previous calendar day in ESPN. Fetch both the UTC date and the day before.
    const eventIdMap = new Map<string, string>()
    const prevDate = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T00:00:00Z`)
    prevDate.setUTCDate(prevDate.getUTCDate() - 1)
    const prevDateStr = toDateStr(prevDate)

    const [n1, n2] = await Promise.all([
      fetchESPNScoreboard(dateStr, eventIdMap),
      fetchESPNScoreboard(prevDateStr, eventIdMap),
    ])
    console.log(`  Dates ${prevDateStr}+${dateStr}: found ${n1 + n2} ESPN events`)

    for (const doc of docs) {
      const matchData = doc.data()
      const homeCode = (matchData.homeTeam as { code: string }).code
      const awayCode = (matchData.awayTeam as { code: string }).code
      const eventId = eventIdMap.get(`${homeCode}|${awayCode}`)

      if (!eventId) {
        console.log(`  No ESPN event found for ${homeCode} vs ${awayCode} on ${dateStr}`)
        continue
      }

      const details = await fetchESPNEventDetails(eventId)
      if (details.scorers.length === 0) {
        console.log(`  ${homeCode} vs ${awayCode}: ESPN returned no goals (skipping)`)
        continue
      }

      console.log(`  ${homeCode} vs ${awayCode}: backfilling ${details.scorers.length} goals, ${details.cards.length} cards`)

      if (DRY_RUN) {
        console.log(`  [DRY] ${details.scorers.map(s => `${s.player} ${s.minute}'`).join(', ')}`)
      } else {
        batch.update(doc.ref, { scorers: details.scorers, cards: details.cards })
      }
      updated++
    }
  }

  if (!DRY_RUN && updated > 0) await batch.commit()
  console.log(`  ${DRY_RUN ? '[DRY] Would have updated' : 'Updated'} ${updated} matches with backfilled scorer data`)
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

async function calculatePredictionPoints(newlyFinished: Set<string>) {
  if (newlyFinished.size === 0) return
  console.log(`Calculating prediction points for ${newlyFinished.size} newly finished match(es)…`)

  const matchIds = [...newlyFinished].map(id => parseInt(id, 10))

  const matchSnap = await db.collection('matches').where('status', '==', 'FINISHED').get()
  const finishedMatches = new Map(matchSnap.docs.map(d => [d.id, d.data()]))

  const isCanonical = (h: number, a: number) => (h === 99 && a === 0) || (h === 99 && a === 99) || (h === 0 && a === 99)
  const calcPoints = (pH: number, pA: number, aH: number, aA: number): number => {
    // Specific score: 9 for exact, 0 otherwise — no consolation points.
    if (!isCanonical(pH, pA)) return (pH === aH && pA === aA) ? 9 : 0
    // Canonical (result-only): 3 for correct direction, 0 otherwise.
    return Math.sign(pH - pA) === Math.sign(aH - aA) ? 3 : 0
  }

  // Only fetch predictions for the newly-finished matches — avoids reading the whole collection every sync.
  // Firestore 'in' queries support up to 30 values; chunk if necessary.
  const chunkSize = 30
  const allPredDocs = []
  for (let i = 0; i < matchIds.length; i += chunkSize) {
    const chunk = matchIds.slice(i, i + chunkSize)
    const snap = await db.collection('predictions').where('matchId', 'in', chunk).get()
    allPredDocs.push(...snap.docs)
  }

  const toUpdate = allPredDocs.filter(d => {
    const data = d.data()
    const match = finishedMatches.get(String(data.matchId))
    if (!match) return false
    const s = match.score as { home: number | null; away: number | null }
    if (s.home === null || s.away === null) return false
    const expected = calcPoints(data.predictedHome, data.predictedAway, s.home, s.away)
    return data.pointsAwarded !== expected
  })

  console.log(`  ${toUpdate.length} predictions to score/correct`)

  const batch = db.batch()
  for (const predDoc of toUpdate) {
    const pred = predDoc.data()
    const match = finishedMatches.get(String(pred.matchId))!
    const s = match.score as { home: number; away: number }
    const points = calcPoints(pred.predictedHome, pred.predictedAway, s.home, s.away)

    if (DRY_RUN) {
      console.log(`  [DRY] ${pred.participantId} ${pred.matchId}: ${pred.pointsAwarded ?? 'null'} → ${points}pts`)
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
  let newlyFinished = new Set<string>()

  try {
    newlyFinished = await syncMatches()
  } catch (e) {
    console.error('\n✗ syncMatches failed:', e)
    failed = true
  }

  for (const [name, fn] of [
    ['backfillScorers', () => backfillScorers(newlyFinished)],
    ['syncStandings', syncStandings],
    ['calculatePredictionPoints', () => calculatePredictionPoints(newlyFinished)],
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
