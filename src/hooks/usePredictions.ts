import { useState, useEffect, useSyncExternalStore } from 'react'
import {
  subscribeToPredictionsForParticipant, subscribeToPredictionsAggregate, subscribeToPredictionsForMatch,
} from '@/services/predictions.service'
import { createSharedStore } from '@/services/subscriptionStore'
import type { Prediction } from '@/types'

export function usePredictionsForParticipant(participantId: string | null) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!participantId) {
      setIsLoading(false)
      return
    }
    const unsub = subscribeToPredictionsForParticipant(participantId, data => {
      setPredictions(data)
      setIsLoading(false)
    })
    return unsub
  }, [participantId])

  return { predictions, isLoading }
}

export function usePredictionForMatch(
  predictions: Prediction[],
  matchId: number,
): Prediction | undefined {
  return predictions.find(p => p.matchId === matchId)
}

// Live matches read their own predictions directly so everyone's picks appear the instant the
// match begins — independent of the sync/aggregate. Pass null to disable (e.g. non-live matches).
export function useMatchPredictions(matchId: number | null) {
  const [predictions, setPredictions] = useState<Prediction[]>([])

  useEffect(() => {
    if (matchId == null) { setPredictions([]); return }
    const unsub = subscribeToPredictionsForMatch(matchId, setPredictions)
    return unsub
  }, [matchId])

  return predictions
}

// One shared listener over the single sync-maintained aggregate doc — 1 read per session,
// vs the ~500-doc predictions-collection listener this replaced.
const allPredictionsStore = createSharedStore<Prediction[]>('allPredictions', subscribeToPredictionsAggregate, [])

export function useAllPredictions() {
  const { data, loaded } = useSyncExternalStore(allPredictionsStore.subscribe, allPredictionsStore.getSnapshot)
  return { predictions: data, isLoading: !loaded }
}
