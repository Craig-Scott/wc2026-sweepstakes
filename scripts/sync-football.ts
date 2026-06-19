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
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

const DRY_RUN = process.env.DRY_RUN === 'true'
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!
const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

if (!API_KEY) throw new Error('FOOTBALL_DATA_API_KEY is required')
if (!SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required')

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()

// Instrumentation: approximate Firestore document reads this run, logged in main().
let READS = 0
const countReads = (n: number) => { READS += n }

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

async function syncMatches(): Promise<{ newlyFinished: Set<string>; toScore: Set<string>; newlyLocked: Set<string>; espnIdGaps: { id: string; home: string; away: string; date: string }[] }> {
  console.log('Fetching matches…')
  const [data, espnScores, cacheSnap] = await Promise.all([
    apiFetch(`/competitions/${COMPETITION}/matches`),
    fetchESPNScores(),
    db.collection('sync').doc('match-cache').get(),
  ])
  countReads(1)
  const matches = data.matches ?? []
  console.log(`  ${matches.length} matches returned`)

  // Load existing match state from a single cache document (1 read instead of one per match)
  const cacheData = cacheSnap.data() ?? {}
  const existingStatuses = (cacheData.statuses ?? {}) as Record<string, string>
  const existingScorers = (cacheData.scorers ?? {}) as Record<string, Record<string, unknown>[]>
  const existingCards = (cacheData.cards ?? {}) as Record<string, Record<string, unknown>[]>
  const existingEspnEventIds = (cacheData.espnEventIds ?? {}) as Record<string, string | null>
  // matchId → the score string ("h-a") its predictions were last successfully scored against.
  // Advanced ONLY by calculatePredictionPoints after its batch commits, so a failed scoring
  // run (e.g. quota exhaustion) is retried next sync rather than silently skipped forever.
  const existingScored = (cacheData.scored ?? {}) as Record<string, string>
  // matchId → fingerprint of the doc's client-visible fields last written. Lets us skip writing
  // (and thus fanning out to every connected listener) a match doc whose content hasn't changed.
  const existingFingerprints = (cacheData.fingerprints ?? {}) as Record<string, string>
  // matchId → true once its picks have been written into aggregates/predictions (done once when
  // a match locks). Advanced only by populateAggregate after it commits.
  const existingAggregated = (cacheData.aggregated ?? {}) as Record<string, true>

  // Track updated state to write back to cache at the end of this sync
  const newStatuses: Record<string, string> = {}
  const newEspnEventIds: Record<string, string | null> = {}
  const newScorers: Record<string, unknown[]> = { ...(existingScorers as Record<string, unknown[]>) }
  const newCards: Record<string, unknown[]> = { ...(existingCards as Record<string, unknown[]>) }
  const newFingerprints: Record<string, string> = {}
  // Locked matches (kicked off) not yet in the predictions aggregate — their picks become
  // visible at kickoff, so we populate the aggregate doc once they lock.
  const newlyLocked = new Set<string>()
  // Matches with real teams and no espnEventId yet, kicking off soon — looked up by date so the
  // client's live-score overlay is ready by kickoff (mainly catches knockout matches once drawn).
  const espnIdGaps: { id: string; home: string; away: string; date: string }[] = []

  const newlyFinished = new Set<string>()
  // Finished matches whose predictions still need scoring (never scored, or final score changed).
  const toScore = new Set<string>()
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

    const preserved = existingScorers[matchId] ?? []
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
      // For FINISHED matches, preserve cached data rather than overwriting with empty arrays.
      // Cache is updated at end of every sync and patched by backfillScorers when it runs.
      if (mappedStatus === 'FINISHED') {
        scorers = existingScorers[matchId] ?? []
        cards = existingCards[matchId] ?? []
      } else {
        scorers = []
        cards = []
      }
    }

    const espnEventId = espnScore?.eventId ?? existingEspnEventIds[matchId] ?? null
    const homeName = m.homeTeam?.name ?? 'TBD'
    const awayName = m.awayTeam?.name ?? 'TBD'
    const stage = mapStage(m.stage ?? '')
    const group = m.group?.replace('GROUP_', '') ?? null
    const round = m.matchday ? `Matchday ${m.matchday}` : null

    const matchDoc: Record<string, unknown> = {
      id: m.id,
      homeTeam: { code: homeCode, name: homeName },
      awayTeam: { code: awayCode, name: awayName },
      status: mappedStatus,
      score: {
        home: scoreHome,
        away: scoreAway,
      },
      kickoff: m.utcDate ? Timestamp.fromDate(new Date(m.utcDate)) : null,
      currentMinute: m.minute ?? null,
      espnEventId,
      stage,
      group,
      round,
      scorers,
      cards,
    }

    // Fingerprint of the client-visible fields. Excludes `currentMinute` (changes every minute
    // during play and is shown live from ESPN client-side anyway) and `updatedAt`, so a match
    // doc is only rewritten — and thus only fanned out to listeners — on a meaningful change.
    const fingerprint = JSON.stringify({
      homeCode, homeName, awayCode, awayName,
      status: mappedStatus, scoreHome, scoreAway, espnEventId,
      kickoff: m.utcDate ?? null, stage, group, round, scorers, cards,
    })
    newFingerprints[matchId] = fingerprint
    const changed = existingFingerprints[matchId] !== fingerprint

    if (mappedStatus === 'FINISHED' && existingStatuses[matchId] !== 'FINISHED') {
      newlyFinished.add(matchId)
      console.log(`  [FINISHED] ${homeCode} vs ${awayCode} (${matchId})`)
    }

    // A finished match needs (re)scoring when we've never scored it, or its final score
    // changed since we last scored it. Decoupled from the FINISHED status transition so a
    // failed scoring run (quota, etc.) is retried instead of being permanently skipped.
    if (mappedStatus === 'FINISHED' && scoreHome !== null && scoreAway !== null) {
      const scoreStr = `${scoreHome}-${scoreAway}`
      if (existingScored[matchId] !== scoreStr) toScore.add(matchId)
    }

    // Once a match kicks off, everyone's picks become visible — populate the predictions
    // aggregate doc for it (once). Lock is time-based (status may lag behind kickoff).
    const locked = m.utcDate ? new Date(m.utcDate).getTime() <= Date.now() : false
    if (locked && !existingAggregated[matchId]) newlyLocked.add(matchId)

    // Needs an ESPN id for the live overlay? Only chase ones kicking off soon (or just started)
    // with real teams — keeps the by-date lookups bounded to a date or two.
    if (espnEventId === null && homeCode !== 'TBD' && awayCode !== 'TBD' && m.utcDate) {
      const ko = new Date(m.utcDate).getTime()
      if (ko >= Date.now() - 6 * 3600_000 && ko <= Date.now() + 48 * 3600_000) {
        espnIdGaps.push({ id: matchId, home: homeCode, away: awayCode, date: m.utcDate })
      }
    }

    // Accumulate updated state for the cache write at the end of this sync
    newStatuses[matchId] = mappedStatus
    newEspnEventIds[matchId] = espnEventId
    newScorers[matchId] = scorers as unknown[]
    newCards[matchId] = cards as unknown[]

    if (DRY_RUN) {
      const scorerNames = (scorers as { player: string; minute: number }[]).map(s => `${s.player} ${s.minute}'`).join(', ')
      console.log(`  [DRY]${changed ? ' [CHANGED]' : ''} ${m.id}: ${homeName} vs ${awayName} (${m.status})${scorerNames ? ` | ${scorerNames}` : ''}`)
    } else if (changed) {
      // Only write (and fan out to every listener) when something clients render actually changed.
      const ref = db.collection('matches').doc(matchId)
      batch.set(ref, { ...matchDoc, updatedAt: Timestamp.now() }, { merge: true })
      count++
    }
  }

  if (!DRY_RUN && count > 0) {
    // Write updated cache alongside the changed match docs — next sync reads 1 doc instead of
    // one per match. Only written when something changed, so an idle run touches nothing.
    // `scored` is preserved as-is here; only calculatePredictionPoints advances it (after a
    // successful commit), so scoring failures don't get masked by a status update.
    batch.set(db.collection('sync').doc('match-cache'), {
      statuses: newStatuses,
      espnEventIds: newEspnEventIds,
      scorers: newScorers,
      cards: newCards,
      scored: existingScored,
      fingerprints: newFingerprints,
      aggregated: existingAggregated,
      updatedAt: Timestamp.now(),
    })
  }
  if (!DRY_RUN && count > 0) await batch.commit()
  console.log(`  ${DRY_RUN ? '[DRY] Would have written' : 'Wrote'} ${count} changed matches, ${newlyFinished.size} newly finished, ${toScore.size} to score, ${newlyLocked.size} newly locked`)
  return { newlyFinished, toScore, newlyLocked, espnIdGaps }
}

async function backfillScorers(newlyFinished: Set<string>) {
  if (newlyFinished.size === 0) return
  console.log('Backfilling scorer data for newly finished matches…')

  // Targeted read — only the newly-finished match docs, not the full collection
  const matchRefs = [...newlyFinished].map(id => db.collection('matches').doc(id))
  const matchDocs = await db.getAll(...matchRefs)
  countReads(matchDocs.length)

  const needsBackfill = matchDocs.filter(d => {
    if (!d.exists) return false
    const data = d.data()!
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
    const kickoff = (doc.data()!.kickoff as Timestamp).toDate()
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
  const cacheUpdates: Record<string, unknown> = {}
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
      const matchData = doc.data()!
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
        // Patch cache with dot-notation so next sync doesn't overwrite backfilled scorer data
        cacheUpdates[`scorers.${doc.id}`] = details.scorers
        cacheUpdates[`cards.${doc.id}`] = details.cards
      }
      updated++
    }
  }

  if (!DRY_RUN && updated > 0) {
    if (Object.keys(cacheUpdates).length > 0) {
      batch.update(db.collection('sync').doc('match-cache'), cacheUpdates)
    }
    await batch.commit()
  }
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

  // Per-group fingerprints, so unchanged group tables aren't rewritten (and thus aren't fanned
  // out to every client subscribed to the standings collection) on every sync.
  const cacheRef = db.collection('sync').doc('standings-cache')
  const existingFingerprints = (DRY_RUN ? {} : ((countReads(1), (await cacheRef.get()).data()?.fingerprints) ?? {})) as Record<string, string>
  const newFingerprints: Record<string, string> = {}

  const batch = db.batch()
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

    const fingerprint = JSON.stringify(table)
    newFingerprints[groupCode] = fingerprint
    const changed = existingFingerprints[groupCode] !== fingerprint

    if (DRY_RUN) {
      console.log(`  [DRY]${changed ? ' [CHANGED]' : ''} Group ${groupCode}: ${table.length} teams`)
    } else if (changed) {
      batch.set(db.collection('standings').doc(groupCode), {
        group: groupCode,
        table,
        updatedAt: Timestamp.now(),
      })
      count++
    }
  }

  if (!DRY_RUN && count > 0) {
    batch.set(cacheRef, { fingerprints: newFingerprints, updatedAt: Timestamp.now() })
    await batch.commit()
  }
  console.log(`  ${DRY_RUN ? '[DRY] Would have written' : 'Wrote'} ${count} changed groups`)
}

async function calculatePredictionPoints(toScore: Set<string>) {
  if (toScore.size === 0) return
  console.log(`Calculating prediction points for ${toScore.size} match(es)…`)

  const matchIds = [...toScore].map(id => parseInt(id, 10))

  // Targeted read — only the matches needing scoring, not the full collection
  const matchRefs = [...toScore].map(id => db.collection('matches').doc(id))
  const matchDocs = await db.getAll(...matchRefs)
  countReads(matchDocs.length)
  const finishedMatches = new Map(matchDocs.filter(d => d.exists).map(d => [d.id, d.data()!]))

  const isCanonical = (h: number, a: number) => (h === 99 && a === 0) || (h === 99 && a === 99) || (h === 0 && a === 99)
  const calcPoints = (pH: number, pA: number, aH: number, aA: number): number => {
    // Specific score: 9 for exact, 0 otherwise — no consolation points.
    if (!isCanonical(pH, pA)) return (pH === aH && pA === aA) ? 9 : 0
    // Canonical (result-only): 3 for correct direction, 0 otherwise.
    return Math.sign(pH - pA) === Math.sign(aH - aA) ? 3 : 0
  }

  // Only fetch predictions for the matches being scored — avoids reading the whole collection.
  // Firestore 'in' queries support up to 30 values; chunk if necessary.
  const chunkSize = 30
  const allPredDocs = []
  for (let i = 0; i < matchIds.length; i += chunkSize) {
    const chunk = matchIds.slice(i, i + chunkSize)
    const snap = await db.collection('predictions').where('matchId', 'in', chunk).get()
    countReads(snap.size)
    allPredDocs.push(...snap.docs)
  }

  // Only matches whose score is present can be scored — track which ones so we can mark them
  // scored in the cache afterwards (a match with a still-null score is left for a later run).
  const scoredScores = new Map<string, string>()
  for (const [id, match] of finishedMatches) {
    const s = match.score as { home: number | null; away: number | null }
    if (s.home !== null && s.away !== null) scoredScores.set(id, `${s.home}-${s.away}`)
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

  // Accumulate per-participant point/exact deltas so the leaderboard doc can be updated
  // incrementally (FieldValue.increment) in the same batch — no full-collection re-read.
  const ptsDelta: Record<string, number> = {}
  const exactDelta: Record<string, number> = {}
  const bump = (m: Record<string, number>, id: string, by: number) => { if (by) m[id] = (m[id] ?? 0) + by }

  const batch = db.batch()
  for (const predDoc of toUpdate) {
    const pred = predDoc.data()
    const match = finishedMatches.get(String(pred.matchId))!
    const s = match.score as { home: number; away: number }
    const points = calcPoints(pred.predictedHome, pred.predictedAway, s.home, s.away)
    const old = (pred.pointsAwarded as number | null) ?? 0

    if (DRY_RUN) {
      console.log(`  [DRY] ${pred.participantId} ${pred.matchId}: ${pred.pointsAwarded ?? 'null'} → ${points}pts`)
    } else {
      batch.update(predDoc.ref, { pointsAwarded: points })
      bump(ptsDelta, pred.participantId, points - old)
      bump(exactDelta, pred.participantId, (points === 9 ? 1 : 0) - (old === 9 ? 1 : 0))
    }
  }

  // Mark each scorable match as scored against its current score — in the SAME batch as the
  // point updates, so the cache only advances if the writes actually commit. A match whose
  // final score later changes will mismatch and be re-scored automatically.
  if (!DRY_RUN && scoredScores.size > 0) {
    const cacheRef = db.collection('sync').doc('match-cache')
    for (const [id, scoreStr] of scoredScores) {
      batch.update(cacheRef, { [`scored.${id}`]: scoreStr })
    }
  }

  // Apply leaderboard deltas in the same batch. Atomic increments mean we never re-read the
  // whole predictions collection. Re-seed with scripts/rebuild-leaderboard.ts if it ever drifts.
  if (!DRY_RUN) {
    const lbRef = db.collection('leaderboard').doc('current')
    const lbUpdate: Record<string, FirebaseFirestore.FieldValue> = {}
    for (const [id, d] of Object.entries(ptsDelta)) lbUpdate[`points.${id}`] = FieldValue.increment(d)
    for (const [id, d] of Object.entries(exactDelta)) lbUpdate[`exact.${id}`] = FieldValue.increment(d)
    if (Object.keys(lbUpdate).length > 0) batch.update(lbRef, lbUpdate)
  }

  if (!DRY_RUN && (toUpdate.length > 0 || scoredScores.size > 0)) await batch.commit()
  console.log(`  Done scoring predictions${Object.keys(ptsDelta).length ? ` (leaderboard: ${Object.keys(ptsDelta).length} participant deltas)` : ''}`)

  // Refresh the predictions aggregate for the matches we just scored, with current points,
  // using the predictions already read above (no extra reads). Separate commit + non-fatal so
  // an aggregate hiccup can never corrupt scoring.
  if (!DRY_RUN && allPredDocs.length > 0) {
    try {
      const byMatch: Record<string, unknown[]> = {}
      for (const d of allPredDocs) {
        const p = d.data()
        const match = finishedMatches.get(String(p.matchId))
        if (!match) continue
        const s = match.score as { home: number | null; away: number | null }
        if (s.home === null || s.away === null) continue
        ;(byMatch[String(p.matchId)] ??= []).push({
          p: p.participantId, h: p.predictedHome, a: p.predictedAway,
          pts: calcPoints(p.predictedHome, p.predictedAway, s.home, s.away),
        })
      }
      if (Object.keys(byMatch).length > 0) {
        await db.collection('aggregates').doc('predictions').set({ byMatch, updatedAt: Timestamp.now() }, { merge: true })
      }
    } catch (e) {
      console.warn('  (predictions aggregate refresh failed, non-fatal):', (e as Error).message)
    }
  }
}

// Writes the picks for newly-locked matches into aggregates/predictions, so the client can show
// "who predicted what" by reading ONE doc instead of the whole predictions collection. Reads only
// the locked matches' own predictions (scoped), and marks them aggregated in the cache so this
// runs once per match.
async function populateAggregate(newlyLocked: Set<string>) {
  if (newlyLocked.size === 0) return
  console.log(`Populating predictions aggregate for ${newlyLocked.size} newly-locked match(es)…`)

  const ids = [...newlyLocked].map(id => parseInt(id, 10))
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = []
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await db.collection('predictions').where('matchId', 'in', ids.slice(i, i + 30)).get()
    countReads(snap.size)
    docs.push(...snap.docs)
  }

  const byMatch: Record<string, unknown[]> = {}
  for (const id of newlyLocked) byMatch[id] = [] // ensure even pick-less matches get an entry
  for (const d of docs) {
    const p = d.data()
    ;(byMatch[String(p.matchId)] ??= []).push({
      p: p.participantId, h: p.predictedHome, a: p.predictedAway, pts: p.pointsAwarded ?? null,
    })
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Would aggregate ${docs.length} picks across ${newlyLocked.size} matches`)
    return
  }
  const batch = db.batch()
  batch.set(db.collection('aggregates').doc('predictions'), { byMatch, updatedAt: Timestamp.now() }, { merge: true })
  const cacheRef = db.collection('sync').doc('match-cache')
  for (const id of newlyLocked) batch.update(cacheRef, { [`aggregated.${id}`]: true })
  await batch.commit()
  console.log(`  Aggregated ${docs.length} picks across ${newlyLocked.size} matches`)
}

// Fills espnEventId for soon-to-kick-off matches that don't have one yet (mainly knockout
// matches once their teams are drawn), by looking up ESPN's scoreboard by date. Bounded to the
// gap matches' dates. ESPN fetches are external (free); writes the id to the match doc + cache.
async function backfillEspnIds(gaps: { id: string; home: string; away: string; date: string }[]) {
  if (gaps.length === 0) return
  console.log(`Backfilling ESPN ids for ${gaps.length} upcoming match(es)…`)

  const toDateStr = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`

  // Each match's UTC date + the day before (ESPN indexes by US Eastern).
  const dates = new Set<string>()
  for (const g of gaps) {
    const k = new Date(g.date)
    dates.add(toDateStr(k))
    const prev = new Date(k); prev.setUTCDate(prev.getUTCDate() - 1)
    dates.add(toDateStr(prev))
  }

  const eventIdMap = new Map<string, string>()
  for (const dateStr of dates) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`)
      const data = await res.json() as { events?: Record<string, unknown>[] }
      for (const event of data.events ?? []) {
        const comp = (event.competitions as Record<string, unknown>[])?.[0]
        const competitors = comp?.competitors as Record<string, unknown>[] | undefined
        const home = competitors?.find(t => t.homeAway === 'home')
        const away = competitors?.find(t => t.homeAway === 'away')
        if (!home || !away) continue
        const h = normalizeESPNCode((home.team as Record<string, unknown>)?.abbreviation as string)
        const a = normalizeESPNCode((away.team as Record<string, unknown>)?.abbreviation as string)
        if (h && a) eventIdMap.set(`${h}|${a}`, event.id as string)
      }
    } catch (e) {
      console.warn(`  ESPN scoreboard fetch failed for ${dateStr}:`, (e as Error).message)
    }
  }

  const found = gaps
    .map(g => ({ ...g, eventId: eventIdMap.get(`${g.home}|${g.away}`) }))
    .filter((g): g is typeof g & { eventId: string } => !!g.eventId)

  if (found.length === 0) { console.log('  No matching ESPN events found yet'); return }
  if (DRY_RUN) { console.log(`  [DRY] Would set ${found.length} espnEventId(s)`); return }

  const batch = db.batch()
  const cacheRef = db.collection('sync').doc('match-cache')
  for (const f of found) {
    batch.set(db.collection('matches').doc(f.id), { espnEventId: f.eventId, updatedAt: Timestamp.now() }, { merge: true })
    batch.update(cacheRef, { [`espnEventIds.${f.id}`]: f.eventId })
  }
  await batch.commit()
  console.log(`  Set espnEventId for ${found.length} match(es)`)
}

async function main() {
  console.log(`\n=== Football Data Sync${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`)
  let failed = false
  let newlyFinished = new Set<string>()
  let toScore = new Set<string>()
  let newlyLocked = new Set<string>()
  let espnIdGaps: { id: string; home: string; away: string; date: string }[] = []

  try {
    const result = await syncMatches()
    newlyFinished = result.newlyFinished
    toScore = result.toScore
    newlyLocked = result.newlyLocked
    espnIdGaps = result.espnIdGaps
  } catch (e) {
    console.error('\n✗ syncMatches failed:', e)
    failed = true
  }

  for (const [name, fn] of [
    ['backfillScorers', () => backfillScorers(newlyFinished)],
    ['syncStandings', syncStandings],
    ['calculatePredictionPoints', () => calculatePredictionPoints(toScore)],
    ['populateAggregate', () => populateAggregate(newlyLocked)],
    ['backfillEspnIds', () => backfillEspnIds(espnIdGaps)],
  ] as [string, () => Promise<void>][]) {
    try {
      await fn()
    } catch (e) {
      console.error(`\n✗ ${name} failed:`, e)
      failed = true
    }
  }

  console.log(`\n≈ ${READS} Firestore document reads this run`)

  // Record this run's reads into the shared per-day usage doc (read via scripts/usage.ts).
  if (!DRY_RUN && READS > 0) {
    try {
      const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date())
      await db.collection('usage').doc(date).set(
        { reads: { sync: FieldValue.increment(READS) }, updatedAt: Timestamp.now() },
        { merge: true },
      )
    } catch (e) {
      console.warn('  (usage accounting write failed, non-fatal):', (e as Error).message)
    }
  }

  if (failed) {
    console.error('\nSync finished with errors')
    process.exit(1)
  }
  console.log('\n✓ Sync complete')
}

main()
