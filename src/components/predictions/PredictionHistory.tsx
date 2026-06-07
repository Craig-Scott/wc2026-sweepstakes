import type { Match, Prediction } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { formatKickoff } from '@/utils/dates'
import { formatScore } from '@/utils/predictions'

interface Props {
  predictions: Prediction[]
  matchesById: Map<number, Match>
}

export function PredictionHistory({ predictions, matchesById }: Props) {
  const finished = predictions.filter(p => {
    const m = matchesById.get(p.matchId)
    return m?.status === 'FINISHED'
  })

  if (finished.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No completed matches with predictions yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 pr-3">Match</th>
            <th className="pb-2 pr-3 text-center">Result</th>
            <th className="pb-2 pr-3 text-center">Your Pred</th>
            <th className="pb-2 text-center">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {finished.map(pred => {
            const match = matchesById.get(pred.matchId)
            if (!match) return null
            return (
              <tr key={`${pred.participantId}_${pred.matchId}`} className="py-2">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <TeamBadge code={match.homeTeam.code} size="sm" showName={false} />
                    <span>{match.homeTeam.name}</span>
                    <span className="text-gray-500">vs</span>
                    <TeamBadge code={match.awayTeam.code} size="sm" showName={false} />
                    <span>{match.awayTeam.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatKickoff(match.kickoff)}</div>
                </td>
                <td className="py-2 pr-3 text-center font-mono font-semibold">
                  {formatScore(match.score.home, match.score.away)}
                </td>
                <td className="py-2 pr-3 text-center font-mono text-gray-500">
                  {formatScore(pred.predictedHome, pred.predictedAway)}
                </td>
                <td className="py-2 text-center">
                  {pred.pointsAwarded !== null ? (
                    <span className={`font-bold ${
                      pred.pointsAwarded === 6 ? 'text-brand-600'
                      : pred.pointsAwarded === 3 ? 'text-blue-600'
                      : 'text-gray-500'
                    }`}>
                      {pred.pointsAwarded}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
