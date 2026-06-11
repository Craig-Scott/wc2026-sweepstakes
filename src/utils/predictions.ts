import type { Match, Prediction } from '@/types'

export function calculatePoints(prediction: Prediction, match: Match): number {
  if (match.status !== 'FINISHED') return 0
  if (match.score.home === null || match.score.away === null) return 0

  const { predictedHome, predictedAway } = prediction
  const { home, away } = match.score

  // Canonical (result-only) picks can never earn the 6-pt exact-score bonus.
  if (!isCanonicalPrediction(predictedHome, predictedAway) && predictedHome === home && predictedAway === away) return 9

  const actualResult = Math.sign(home - away)
  const predictedResult = Math.sign(predictedHome - predictedAway)
  if (actualResult === predictedResult) return 3

  return 0
}

export function isMatchLocked(match: Match): boolean {
  return match.kickoff.toDate() <= new Date()
}

export function getResultLabel(home: number, away: number): string {
  if (home > away) return 'Home Win'
  if (away > home) return 'Away Win'
  return 'Draw'
}

export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return 'vs'
  return `${home} – ${away}`
}

// Canonical (result-only) sentinels use 99, which is unreachable via the score inputs
// (capped at 20) and impossible in a real match. This guarantees exact-score predictions
// (including 1-0 and 0-1) are always distinguishable, and canonical picks can never earn
// the 6-pt exact-score bonus in calculatePoints.
export function isCanonicalPrediction(home: number, away: number): boolean {
  return (home === 99 && away === 0) || (home === 99 && away === 99) || (home === 0 && away === 99)
}

export function predictionLabel(
  predictedHome: number,
  predictedAway: number,
  homeTeamName: string,
  awayTeamName: string,
): string {
  const isCanonical = isCanonicalPrediction(predictedHome, predictedAway)
  if (isCanonical) {
    if (predictedHome > predictedAway) return `${homeTeamName} Win`
    if (predictedHome === predictedAway) return 'Draw'
    return `${awayTeamName} Win`
  }
  return `${predictedHome} – ${predictedAway}`
}
