import { useSyncExternalStore } from 'react'
import {
  subscribeToLeaderboard, leaderboardEntries, type LeaderboardDoc,
} from '@/services/predictions.service'
import { createSharedStore } from '@/services/subscriptionStore'
import { useParticipants } from '@/hooks/useParticipants'

import { LeaderboardSkeleton } from '@/components/shared/Skeleton'

const leaderboardStore = createSharedStore<LeaderboardDoc>(
  'leaderboard', subscribeToLeaderboard, { points: {}, exact: {} },
)

export function PredictionLeaderboard() {
  const { participants, isLoading: participantsLoading } = useParticipants()
  const { data: agg, loaded } = useSyncExternalStore(leaderboardStore.subscribe, leaderboardStore.getSnapshot)

  if (participantsLoading || !loaded) return <LeaderboardSkeleton />

  const entries = leaderboardEntries(participants, agg)

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-navy-900 mb-3">🔮 Predictions Leaderboard</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No predictions yet — be the first!</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li key={entry.participantId} className="flex items-center gap-2">
              <span className={`text-xs font-bold w-4 text-left shrink-0 ${
                i === 0 ? 'text-gold-500' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-amber-600' : 'text-gray-400'
              }`}>
                {i + 1}
              </span>
              <span className="text-sm flex-1 truncate">{entry.participantName}</span>
              <span className="text-sm font-bold text-gray-700 tabular-nums">
                {entry.totalPoints}
                <span className="text-xs text-gray-500 font-normal ml-0.5">pts</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
