import { useEffect } from 'react'
import type { Match, Participant } from '@/types'
import { usePredictionsForParticipant } from '@/hooks/usePredictions'
import { predictionLabel } from '@/utils/predictions'
import { TeamBadge } from '@/components/shared/TeamBadge'

interface Props {
  participant: Participant
  matchesById: Map<number, Match>
  onClose: () => void
}

function pointsPillClass(points: number): string {
  if (points >= 9) return 'bg-brand-600/10 text-brand-700'
  if (points === 3) return 'bg-blue-100 text-blue-700'
  return 'bg-red-100 text-red-600'
}

export function PredictionResultsModal({ participant, matchesById, onClose }: Props) {
  const { predictions, isLoading } = usePredictionsForParticipant(participant.id)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Only finished matches have results; newest first.
  const rows = predictions
    .map(p => ({ pred: p, match: matchesById.get(p.matchId) }))
    .filter((r): r is { pred: typeof r.pred; match: Match } =>
      !!r.match && r.match.status === 'FINISHED' && r.pred.pointsAwarded !== null)
    .sort((a, b) => b.match.kickoff.toDate().getTime() - a.match.kickoff.toDate().getTime())

  const total = rows.reduce((sum, r) => sum + (r.pred.pointsAwarded ?? 0), 0)

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-navy-900">{participant.name}</h2>
            <p className="text-xs text-gray-500">Prediction results</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No results yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Match</th>
                  <th className="text-left font-semibold px-4 py-2">Prediction</th>
                  <th className="text-right font-semibold px-4 py-2">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ pred, match }) => {
                  const points = pred.pointsAwarded ?? 0
                  return (
                    <tr key={match.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <TeamBadge code={match.homeTeam.code} size="sm" showName={false} />
                          <span className="font-semibold text-navy-900 tabular-nums">
                            {match.score.home}<span className="text-gray-300 mx-0.5">–</span>{match.score.away}
                          </span>
                          <TeamBadge code={match.awayTeam.code} size="sm" showName={false} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {predictionLabel(pred.predictedHome, pred.predictedAway, match.homeTeam.name, match.awayTeam.name)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${pointsPillClass(points)}`}>
                          {points}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-navy-900" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-bold text-navy-900 tabular-nums">{total}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
