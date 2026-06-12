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

            {/* Teams + score + inline scorers/cards */}
            {(() => {
              const isHome = (t: string) => t === match.homeTeam.code || t === match.homeTeam.name
              const homeScorers = match.scorers.filter(s => isHome(s.team))
              const awayScorers = match.scorers.filter(s => !isHome(s.team))
              const homeYellow = match.cards.filter(c => isHome(c.team) && c.type === 'YELLOW').length
              const homeRed = match.cards.filter(c => isHome(c.team) && c.type !== 'YELLOW').length
              const awayYellow = match.cards.filter(c => !isHome(c.team) && c.type === 'YELLOW').length
              const awayRed = match.cards.filter(c => !isHome(c.team) && c.type !== 'YELLOW').length
              const hasScorers = match.scorers.length > 0
              return (
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
                        {findOwner(match.homeTeam.code) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                            {findOwner(match.homeTeam.code)}
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
                    <div className="font-display font-bold text-4xl text-navy-900 tabular-nums leading-none">
                      {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <div className="flex flex-col items-end">
                        <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.awayTeam.name}</span>
                        {findOwner(match.awayTeam.code) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                            {findOwner(match.awayTeam.code)}
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
              )
            })()}

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
