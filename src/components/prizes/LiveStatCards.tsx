import { useMatches } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { getDirtiestTeam, calculateCardPoints } from '@/utils/cardPoints'
import type { Match, Participant } from '@/types'

// Resolve a code OR full name to the canonical team code stored in participants
function resolveCode(matches: Match[], codeOrName: string): string {
  for (const m of matches) {
    if (m.homeTeam.code === codeOrName || m.homeTeam.name === codeOrName) return m.homeTeam.code
    if (m.awayTeam.code === codeOrName || m.awayTeam.name === codeOrName) return m.awayTeam.code
  }
  return codeOrName
}

function teamDisplayName(matches: Match[], codeOrName: string): string {
  for (const m of matches) {
    if (m.homeTeam.code === codeOrName || m.homeTeam.name === codeOrName) return m.homeTeam.name
    if (m.awayTeam.code === codeOrName || m.awayTeam.name === codeOrName) return m.awayTeam.name
  }
  return codeOrName
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

  const dirtiestTable = [...calculateCardPoints(finishedMatches).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const empty = <p className="text-xs text-gray-500 italic">No data yet</p>

  return (
    <>
      <StatCard label="🟨 Dirtiest Team">
        {dirtiest ? (
          <>
            <ul className="space-y-2">
              {dirtiestTable.map(([codeOrName, pts], i) => {
                const code = resolveCode(matches, codeOrName)
                const owner = ownerName(participants, code)
                return (
                  <li key={codeOrName} className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 text-left shrink-0 ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 truncate">{teamDisplayName(matches, codeOrName)}</span>
                    {owner && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700 shrink-0">
                        {owner}
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-700 tabular-nums shrink-0">
                      {pts}<span className="text-xs text-gray-500 font-normal ml-0.5">pts</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : empty}
      </StatCard>

      <StatCard label="📏 Longest Goal">
        {longest ? (
          <>
            <p className="text-sm font-semibold text-navy-900">{longest.player}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {longest.distanceMeters}m · {teamDisplayName(matches, longest.teamCode)}
            </p>
            {ownerName(participants, resolveCode(matches, longest.teamCode)) && (
              <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                {ownerName(participants, resolveCode(matches, longest.teamCode))}
              </span>
            )}
          </>
        ) : empty}
      </StatCard>
    </>
  )
}
