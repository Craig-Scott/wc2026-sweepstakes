import type { Match } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { useParticipants } from '@/hooks/useParticipants'
import { STAGE_LABELS } from '@/config/tournament'

interface Props {
  match: Match
}

export function MatchResultCard({ match }: Props) {
  const { participants } = useParticipants()

  const findParticipant = (teamCode: string) =>
    participants.find(p => p.teamCodes.includes(teamCode))

  const homeParticipant = findParticipant(match.homeTeam.code)
  const awayParticipant = findParticipant(match.awayTeam.code)
  const homeWin = (match.score.home ?? 0) > (match.score.away ?? 0)
  const awayWin = (match.score.away ?? 0) > (match.score.home ?? 0)

  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-3">
        {STAGE_LABELS[match.stage] ?? match.stage}{match.group ? ` · Group ${match.group}` : ''}
      </div>

      <div className="flex items-center justify-between">
        {/* Home */}
        <div className={`flex flex-col items-start gap-1 ${homeWin ? 'opacity-100' : 'opacity-50'}`}>
          <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="md" smSize="lg" bold nameClassName="max-w-[120px] sm:max-w-none truncate" />
          {homeParticipant && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
              {homeParticipant.name}
            </span>
          )}
        </div>

        {/* Score */}
        <div className="text-center shrink-0 px-2">
          <div className="font-display font-bold tabular-nums text-4xl text-navy-900 leading-none">
            {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
          </div>
        </div>

        {/* Away */}
        <div className={`flex flex-col items-end gap-1 ${awayWin ? 'opacity-100' : 'opacity-50'}`}>
          <TeamBadge code={match.awayTeam.code} name={match.awayTeam.name} size="md" smSize="lg" bold reverse nameClassName="max-w-[120px] sm:max-w-none truncate" />
          {awayParticipant && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
              {awayParticipant.name}
            </span>
          )}
        </div>
      </div>

      {match.scorers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1">
          {match.scorers.map((s, i) => (
            <div key={i} className="flex gap-2 text-gray-500">
              <span className="text-gray-500 w-6 text-right">{s.minute}'</span>
              <span>
                {s.isOwnGoal && <span className="text-red-500 mr-1">(OG)</span>}
                {s.isPenalty && <span className="text-gray-500 mr-1">(pen)</span>}
                {s.player}
                <span className="text-gray-500 ml-1">({s.team})</span>
                {s.distanceMeters && (
                  <span className="ml-1 font-medium text-brand-600">{s.distanceMeters}m ⚡</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {match.cards.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
          {match.cards.map((c, i) => (
            <span key={i} className="flex items-center gap-1 text-gray-500">
              {c.type === 'YELLOW' ? '🟨' : '🟥'} {c.player} ({c.team}) {c.minute}'
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
