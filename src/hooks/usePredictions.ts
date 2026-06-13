import { useState, useEffect } from 'react'
import { subscribeToPredictionsForParticipant, subscribeToAllPredictions } from '@/services/predictions.service'
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

export function useAllPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToAllPredictions(data => {
      setPredictions(data)
      setIsLoading(false)
    })
    return unsub
  }, [])

  return { predictions, isLoading }
}
