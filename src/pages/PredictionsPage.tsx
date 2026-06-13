import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMatches } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { usePredictionsForParticipant, useAllPredictions } from '@/hooks/usePredictions'
import { PredictionForm } from '@/components/predictions/PredictionForm'
import { LiveMatchCard, ResultWithPrediction } from '@/components/home/HomeMatchSection'
import { PredictionsPageSkeleton } from '@/components/shared/Skeleton'
import { isMatchLocked } from '@/utils/predictions'
import { STAGE_LABELS } from '@/config/tournament'
import type { Match } from '@/types'

type Tab = 'predict' | 'results'

export function PredictionsPage() {
  const [tab, setTab] = useState<Tab>('predict')
  const { firebaseUser, userRecord, isLoading: authLoading } = useCurrentUser()
  const participantId = userRecord?.participantId ?? null
  const { matches, isLoading: matchesLoading } = useMatches()
  const { predictions, isLoading: predsLoading } = usePredictionsForParticipant(participantId)
  const { participants } = useParticipants()
  const { predictions: allPredictions } = useAllPredictions()
  const allPredsByMatch = new Map<number, typeof allPredictions>()
  for (const p of allPredictions) {
    const list = allPredsByMatch.get(p.matchId) ?? []
    list.push(p)
    allPredsByMatch.set(p.matchId, list)
  }

  if (!authLoading && !firebaseUser) return <Navigate to="/login" replace />

  const isLoading = matchesLoading || predsLoading

  const liveMatches = matches.filter(m =>
    ['IN_PLAY', 'PAUSED'].includes(m.status) ||
    (['SCHEDULED', 'TIMED'].includes(m.status) && isMatchLocked(m))
  )
  const upcoming = matches.filter(m => ['SCHEDULED', 'TIMED'].includes(m.status) && !isMatchLocked(m))
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
        <div className="flex items-center gap-1 mb-6">
          {(['predict', 'results'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t === 'predict' ? 'Predict' : 'Prediction Results'}
            </button>
          ))}
        </div>

        {authLoading || isLoading ? (
          <PredictionsPageSkeleton />
        ) : !participantId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-600">
            Your account hasn&apos;t been linked to a participant yet. Ask the admin to link your Google account.
          </div>
        ) : tab === 'predict' ? (
          liveMatches.length === 0 && upcoming.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-12">
              No upcoming matches to predict right now.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {liveMatches.length > 0 && (
                <div className="flex flex-col gap-3">
                  {liveMatches.map(match => (
                    <LiveMatchCard
                      key={match.id}
                      match={match}
                      prediction={predsByMatch.get(match.id)}
                      participants={participants}
                      matchPredictions={allPredsByMatch.get(match.id) ?? []}
                    />
                  ))}
                </div>
              )}
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
          )
        ) : (() => {
          const finished = matches
            .filter(m => m.status === 'FINISHED')
            .sort((a, b) => b.kickoff.toDate().getTime() - a.kickoff.toDate().getTime())
          return finished.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-12">
              No prediction results yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {finished.map(match => (
                <ResultWithPrediction
                  key={match.id}
                  match={match}
                  prediction={predsByMatch.get(match.id)}
                  participants={participants}
                  matchPredictions={allPredsByMatch.get(match.id) ?? []}
                />
              ))}
            </div>
          )
        })()}
      </div>
    </AppShell>
  )
}
