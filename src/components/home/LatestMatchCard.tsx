import { useLatestMatch } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { LatestMatchSkeleton } from '@/components/shared/Skeleton'
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

  const isHome = (t: string) => t === match.homeTeam.code || t === match.homeTeam.name
  const homeScorers = match.scorers.filter(s => isHome(s.team))
  const awayScorers = match.scorers.filter(s => !isHome(s.team))
  const homeYellow = match.cards.filter(c => isHome(c.team) && c.type === 'YELLOW').length
  const homeRed = match.cards.filter(c => isHome(c.team) && c.type !== 'YELLOW').length
  const awayYellow = match.cards.filter(c => !isHome(c.team) && c.type === 'YELLOW').length
  const awayRed = match.cards.filter(c => !isHome(c.team) && c.type !== 'YELLOW').length
  const hasScorers = match.scorers.length > 0

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-navy-900">Latest Result</h2>
        <span className="text-xs text-gray-500">
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group ? ` · Group ${match.group}` : ''}
        </span>
      </div>

      {/* Teams + score */}
      <div className={`flex ${hasScorers ? 'items-start' : 'items-center'} justify-between`}>
        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-start">
              <TeamBadge code={match.homeTeam.code} size="md" smSize="lg" showName={false} />
              {(homeYellow > 0 || homeRed > 0) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {homeYellow > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-yellow-400">{homeYellow}</span>}
                  {homeRed > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-red-500">{homeRed}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.homeTeam.name}</span>
              {homeParticipant && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {homeParticipant.name}
                </span>
              )}
              {homeScorers.length > 0 && (
                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                  {homeScorers.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-gray-400 shrink-0">{s.minute}'</span>
                      {s.isOwnGoal && <span className="text-red-400">(OG)</span>}
                      {s.isPenalty && <span className="text-gray-400">(pen)</span>}
                      <span>{s.player}</span>
                      {s.distanceMeters && <span className="text-brand-600 font-medium">{s.distanceMeters}m</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-center shrink-0 px-2">
          <div className="font-display font-bold tabular-nums text-4xl text-navy-900 leading-none">
            {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.awayTeam.name}</span>
              {awayParticipant && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {awayParticipant.name}
                </span>
              )}
              {awayScorers.length > 0 && (
                <div className="mt-1 space-y-0.5 text-xs text-gray-500 text-right">
                  {awayScorers.map((s, i) => (
                    <div key={i} className="flex items-center justify-end gap-1">
                      {s.distanceMeters && <span className="text-brand-600 font-medium">{s.distanceMeters}m</span>}
                      <span>{s.player}</span>
                      {s.isOwnGoal && <span className="text-red-400">(OG)</span>}
                      {s.isPenalty && <span className="text-gray-400">(pen)</span>}
                      <span className="text-gray-400 shrink-0">{s.minute}'</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <TeamBadge code={match.awayTeam.code} size="md" smSize="lg" showName={false} />
              {(awayYellow > 0 || awayRed > 0) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {awayYellow > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-yellow-400">{awayYellow}</span>}
                  {awayRed > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-red-500">{awayRed}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
