import { useMatches } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { getDirtiestTeam } from '@/utils/cardPoints'
import type { Match, Participant } from '@/types'

function teamName(matches: Match[], code: string): string {
  for (const m of matches) {
    if (m.homeTeam.code === code) return m.homeTeam.name
    if (m.awayTeam.code === code) return m.awayTeam.name
  }
  return code
}

function longestGoal(matches: Match[]) {
  let best: { player: string; teamCode: string; distanceMeters: number } | null = null
  for (const m of matches) {
    for (const s of m.scorers) {
      if (s.distanceMeters !== null && s.distanceMeters > (best?.distanceMeters ?? 0)) {
        best = { player: s.player, teamCode: s.team, distanceMeters: s.distanceMeters }
      }
    }
  }
  return best
}

function ownerName(participants: Participant[], teamCode: string): string | null {
  return participants.find(p => p.teamCodes.includes(teamCode))?.name ?? null
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h2>
      {children}
    </div>
  )
}

export function LiveStatCards() {
  const { matches } = useMatches()
  const { participants } = useParticipants()

  const finishedMatches = matches.filter(m => m.status === 'FINISHED')

  const dirtiest = getDirtiestTeam(finishedMatches)
  const longest  = longestGoal(finishedMatches)

  const empty = <p className="text-xs text-gray-500 italic">No data yet</p>

  return (
    <>
      <StatCard label="🟨 Dirtiest Team">
        {dirtiest ? (
          <>
            <p className="text-sm font-semibold text-navy-900">
              {teamName(matches, dirtiest.teamCode)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{dirtiest.points} card points</p>
            {ownerName(participants, dirtiest.teamCode) && (
              <p className="text-xs text-gray-500 mt-1">
                {ownerName(participants, dirtiest.teamCode)}
              </p>
            )}
          </>
        ) : empty}
      </StatCard>

      <StatCard label="📏 Longest Goal">
        {longest ? (
          <>
            <p className="text-sm font-semibold text-navy-900">{longest.player}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {longest.distanceMeters}m · {teamName(matches, longest.teamCode)}
            </p>
            {ownerName(participants, longest.teamCode) && (
              <p className="text-xs text-gray-500 mt-1">
                {ownerName(participants, longest.teamCode)}
              </p>
            )}
          </>
        ) : empty}
      </StatCard>
    </>
  )
}
