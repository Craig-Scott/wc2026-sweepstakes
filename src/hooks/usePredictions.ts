import { useState, useEffect, useSyncExternalStore } from 'react'
import { subscribeToPredictionsForParticipant, subscribeToAllPredictions } from '@/services/predictions.service'
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

// One shared listener over the whole predictions collection for the entire app —
// previously each of the home/results/predictions pages re-read all ~500 docs per load.
const allPredictionsStore = createSharedStore<Prediction[]>('allPredictions', subscribeToAllPredictions, [])

export function useAllPredictions() {
  const { data, loaded } = useSyncExternalStore(allPredictionsStore.subscribe, allPredictionsStore.getSnapshot)
  return { predictions: data, isLoading: !loaded }
}
