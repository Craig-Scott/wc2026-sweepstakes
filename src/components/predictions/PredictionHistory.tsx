import type { Match, Prediction } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { isCanonicalPrediction, predictionLabel } from '@/utils/predictions'
import { useParticipants } from '@/hooks/useParticipants'

interface Props {
  predictions: Prediction[]
  matchesById: Map<number, Match>
}

export function PredictionHistory({ predictions, matchesById }: Props) {
  const { participants } = useParticipants()
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

  const finished = predictions
    .filter(p => matchesById.get(p.matchId)?.status === 'FINISHED')
    .sort((a, b) => {
      const ma = matchesById.get(a.matchId)
      const mb = matchesById.get(b.matchId)
      return (mb?.kickoff.toDate().getTime() ?? 0) - (ma?.kickoff.toDate().getTime() ?? 0)
    })

  if (finished.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No completed matches with predictions yet.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {finished.map(pred => {
        const match = matchesById.get(pred.matchId)
        if (!match) return null

        return (
          <div key={`${pred.participantId}_${pred.matchId}`} className="py-4 first:pt-0 last:pb-0 space-y-3">

            {/* Teams + score */}
            <div className="relative flex items-center justify-between">
              <div className="flex flex-col items-start gap-1">
                <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="md" smSize="lg" bold nameClassName="max-w-[120px] sm:max-w-none truncate" />
                {findOwner(match.homeTeam.code) && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                    {findOwner(match.homeTeam.code)}
                  </span>
                )}
              </div>
              <div className="text-center shrink-0 px-2">
                <div className="font-display font-bold text-4xl text-navy-900 tabular-nums leading-none">
                  {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <TeamBadge code={match.awayTeam.code} name={match.awayTeam.name} size="md" smSize="lg" bold reverse nameClassName="max-w-[120px] sm:max-w-none truncate" />
                {findOwner(match.awayTeam.code) && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                    {findOwner(match.awayTeam.code)}
                  </span>
                )}
              </div>
            </div>

            {/* Scorers */}
            {match.scorers.length > 0 && (
              <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
                {match.scorers.map((s, i) => (
                  <div key={i} className="flex gap-1.5">
                    <span className="text-gray-400 w-6 text-right shrink-0">{s.minute}'</span>
                    <span>
                      {s.isOwnGoal && <span className="text-red-400 mr-1">(OG)</span>}
                      {s.isPenalty && <span className="text-gray-400 mr-1">(pen)</span>}
                      {s.player}
                      <span className="text-gray-400 ml-1 text-xs">({s.team})</span>
                      {s.distanceMeters && (
                        <span className="ml-1 text-brand-600 font-medium">{s.distanceMeters}m</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {match.cards.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs border-t border-gray-100 pt-2">
                {match.cards.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 text-gray-500">
                    {c.type === 'YELLOW' ? '🟨' : '🟥'} {c.player} {c.minute}'
                  </span>
                ))}
              </div>
            )}

            {/* Prediction + points */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs border-t border-gray-100 pt-3 mt-1">
              <span className="text-gray-500">
                Your pick:{' '}
                <span className="font-medium text-gray-700">
                  {predictionLabel(
                    pred.predictedHome,
                    pred.predictedAway,
                    match.homeTeam.name,
                    match.awayTeam.name,
                  )}
                  {!isCanonicalPrediction(pred.predictedHome, pred.predictedAway) && (
                    <span className="text-gray-400 ml-1 font-normal">
                      ({pred.predictedHome}–{pred.predictedAway})
                    </span>
                  )}
                </span>
              </span>
              {pred.pointsAwarded !== null ? (
                <span className={`font-bold shrink-0 ml-3 ${
                  pred.pointsAwarded === 9 ? 'text-brand-600'
                  : pred.pointsAwarded === 3 ? 'text-blue-600'
                  : 'text-gray-400'
                }`}>
                  {pred.pointsAwarded}pts
                </span>
              ) : (
                <span className="text-gray-400 shrink-0 ml-3">—</span>
              )}
            </div>

          </div>
        )
      })}
    </div>
  )
}
