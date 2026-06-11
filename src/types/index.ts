import type { Timestamp } from 'firebase/firestore'

// ── Participants & Teams ────────────────────────────────────────────────────

export interface Participant {
  id: string
  name: string
  teamCodes: string[]  // FIFA country codes, e.g. ['BRA', 'ENG'] — at least 2 after draw
  hasPaid: boolean
  uid: string | null  // Firebase Auth UID, set after first login
  photoURL?: string | null
}

export interface Team {
  code: string
  name: string
  group: string  // 'A'–'L', or 'TBD'
  participantId: string
}

// ── Matches ─────────────────────────────────────────────────────────────────

export type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'

export type MatchStage =
  | 'GROUP'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE_PLAYOFF'
  | 'FINAL'

export interface GoalScorer {
  player: string
  team: string
  minute: number
  distanceMeters: number | null
  isOwnGoal: boolean
  isPenalty: boolean
}

export interface Card {
  player: string
  team: string
  type: 'YELLOW' | 'RED' | 'YELLOW_RED'
  minute: number
}

export interface Match {
  id: number
  homeTeam: { code: string; name: string }
  awayTeam: { code: string; name: string }
  status: MatchStatus
  score: { home: number | null; away: number | null }
  kickoff: Timestamp
  stage: MatchStage
  group: string | null
  round: string | null
  currentMinute?: number | null
  scorers: GoalScorer[]
  cards: Card[]
  updatedAt: Timestamp
}

// ── Standings ────────────────────────────────────────────────────────────────

export interface StandingRow {
  teamCode: string
  teamName: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface GroupStanding {
  group: string
  table: StandingRow[]
  updatedAt: Timestamp
}

// ── Predictions ──────────────────────────────────────────────────────────────

export interface Prediction {
  participantId: string
  matchId: number
  uid: string
  predictedHome: number
  predictedAway: number
  submittedAt: Timestamp
  pointsAwarded: number | null
}

// ── Prizes ──────────────────────────────────────────────────────────────────

export interface PrizePercentages {
  winner: number
  runnerUp: number
  thirdPlace: number
  dirtiestTeam: number
  longestGoal: number
  woodenSpoon: number
  nostradamus: number
}

export interface AppConfig {
  entryFee: number
  additionalPrize: number
  prizes: PrizePercentages
  tournamentYear: number
}

export interface PrizeWinnerEntry {
  participantId: string
  teamCode: string
  amount: number
  detail?: string
}

export interface PrizeWinners {
  winner: PrizeWinnerEntry | null
  runnerUp: PrizeWinnerEntry | null
  thirdPlace: PrizeWinnerEntry | null
  dirtiestTeam: (PrizeWinnerEntry & { totalCardPoints: number }) | null
  longestGoal: (PrizeWinnerEntry & { distanceMeters: number; player: string }) | null
  woodenSpoon: (PrizeWinnerEntry & { eliminatedRound: string }) | null
  nostradamus: (PrizeWinnerEntry & { totalPoints: number }) | null
  calculatedAt: Timestamp
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface UserRecord {
  uid: string
  email: string
  displayName: string
  participantId: string | null
  participantName: string | null
  isAdmin: boolean
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  participantId: string
  participantName: string
  teamCodes: string[]
  totalPoints: number
  correctResults: number
  exactScores: number
  predictionsSubmitted: number
}
