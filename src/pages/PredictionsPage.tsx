import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMatches } from '@/hooks/useMatches'
import { usePredictionsForParticipant } from '@/hooks/usePredictions'
import { PredictionForm } from '@/components/predictions/PredictionForm'
import { PredictionHistory } from '@/components/predictions/PredictionHistory'
import { PredictionsPageSkeleton } from '@/components/shared/Skeleton'
import { STAGE_LABELS } from '@/config/tournament'
import type { Match } from '@/types'

export function PredictionsPage() {
  const { firebaseUser, userRecord, isLoading: authLoading } = useCurrentUser()
  const participantId = userRecord?.participantId ?? null
  const { matches, isLoading: matchesLoading } = useMatches()
  const { predictions, isLoading: predsLoading } = usePredictionsForParticipant(participantId)

  if (!authLoading && !firebaseUser) return <Navigate to="/login" replace />

  const isLoading = matchesLoading || predsLoading

  const upcoming = matches.filter(m => ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED'].includes(m.status))
  const matchesById = new Map<number, Match>(matches.map(m => [m.id, m]))
  const predsByMatch = new Map(predictions.map(p => [p.matchId, p]))

  const groupedUpcoming = upcoming.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.stage === 'GROUP'
      ? `Group ${m.group ?? '?'} · ${m.round ?? ''}`
      : (STAGE_LABELS[m.stage] ?? m.stage)
    acc[key] = [...(acc[key] ?? []), m]
    return acc
  }, {})

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold text-navy-900 mb-1">Make Predictions</h1>
        <p className="text-sm text-gray-500 mb-6">
          Pick the correct result for <span className="font-medium text-gray-700">3pts</span>, or predict the exact score for <span className="font-medium text-gray-700">6pts</span>.
        </p>

        {authLoading || isLoading ? (
          <PredictionsPageSkeleton />
        ) : !participantId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-600">
            Your account hasn&apos;t been linked to a participant yet. Ask the admin to link your Google account.
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-12">
            No upcoming matches to predict right now.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedUpcoming).map(([groupLabel, groupMatches]) => (
              <div key={groupLabel}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {groupLabel}
                </h2>
                <div className="flex flex-col gap-3">
                  {groupMatches.map(match => (
                    <div key={match.id} className="card p-4">
                      <PredictionForm
                        match={match}
                        participantId={participantId}
                        uid={firebaseUser!.uid}
                        existingPrediction={predsByMatch.get(match.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prediction history */}
        {predictions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Prediction Results</h2>
            <div className="card p-4">
              <PredictionHistory predictions={predictions} matchesById={matchesById} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
