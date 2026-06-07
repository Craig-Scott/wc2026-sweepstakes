import type { Match } from '@/types'

export function calculateCardPoints(matches: Match[]): Map<string, number> {
  const points = new Map<string, number>()

  for (const match of matches) {
    for (const card of match.cards) {
      const current = points.get(card.team) ?? 0
      const pts = card.type === 'YELLOW' ? 1 : card.type === 'RED' ? 3 : 2
      points.set(card.team, current + pts)
    }
  }

  return points
}

export function getDirtiestTeam(
  matches: Match[],
): { teamCode: string; points: number } | null {
  const points = calculateCardPoints(matches)
  if (points.size === 0) return null
  const [teamCode, pts] = [...points.entries()].sort((a, b) => b[1] - a[1])[0]
  return { teamCode, points: pts }
}
