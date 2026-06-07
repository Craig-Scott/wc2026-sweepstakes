import { useLatestMatch } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { LatestMatchSkeleton } from '@/components/shared/Skeleton'
import { formatKickoffFull } from '@/utils/dates'
import { STAGE_LABELS } from '@/config/tournament'

export function LatestMatchCard() {
  const { match, isLoading } = useLatestMatch()
  const { participants } = useParticipants()

  if (isLoading) return <LatestMatchSkeleton />
  if (!match) {
    return (
      <div className="card p-5 min-h-[130px] flex items-center justify-center text-sm text-gray-500">
        No completed matches yet — the tournament is about to begin!
      </div>
    )
  }

  const findParticipant = (teamCode: string) =>
    participants.find(p => p.teamCodes.includes(teamCode))

  const homeParticipant = findParticipant(match.homeTeam.code)
  const awayParticipant = findParticipant(match.awayTeam.code)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-900">Latest Result</h2>
        <span className="text-xs text-gray-500">
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group ? ` · Group ${match.group}` : ''}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex flex-col items-start gap-1">
          <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="lg" />
          {homeParticipant && (
            <span className="text-xs text-gray-500 ml-1">{homeParticipant.name}</span>
          )}
        </div>
        <div className="text-center">
          <div className="font-display font-bold tabular-nums text-6xl tracking-tight text-navy-900 leading-none">
            {match.score.home} <span className="text-gray-300">–</span> {match.score.away}
          </div>
          <div className="text-xs text-gray-500 mt-2">{formatKickoffFull(match.kickoff)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TeamBadge code={match.awayTeam.code} name={match.awayTeam.name} size="lg" />
          {awayParticipant && (
            <span className="text-xs text-gray-500 mr-1">{awayParticipant.name}</span>
          )}
        </div>
      </div>

      {/* Scorers */}
      {match.scorers.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <ul className="space-y-1">
            {match.scorers.map((s, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-2">
                <span className="text-gray-500">{s.minute}'</span>
                <span>
                  {s.isOwnGoal ? '(OG) ' : s.isPenalty ? '(pen) ' : ''}
                  {s.player}
                  <span className="text-gray-500 ml-1">({s.team})</span>
                  {s.distanceMeters ? (
                    <span className="ml-1 text-brand-500 font-medium">{s.distanceMeters}m</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards */}
      {match.cards.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-2">
          <ul className="flex flex-wrap gap-2">
            {match.cards.map((c, i) => (
              <li key={i} className="text-xs flex items-center gap-1">
                <span>{c.type === 'YELLOW' ? '🟨' : '🟥'}</span>
                <span className="text-gray-500">{c.player} {c.minute}'</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
