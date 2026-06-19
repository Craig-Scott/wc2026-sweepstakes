import { useState, useEffect, useSyncExternalStore } from 'react'
import { subscribeToPredictionsForParticipant, subscribeToPredictionsAggregate } from '@/services/predictions.service'
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

// One shared listener over the single sync-maintained aggregate doc — 1 read per session,
// vs the ~500-doc predictions-collection listener this replaced.
const allPredictionsStore = createSharedStore<Prediction[]>('allPredictions', subscribeToPredictionsAggregate, [])

export function useAllPredictions() {
  const { data, loaded } = useSyncExternalStore(allPredictionsStore.subscribe, allPredictionsStore.getSnapshot)
  return { predictions: data, isLoading: !loaded }
}
