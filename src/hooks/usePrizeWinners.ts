import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { PrizeWinners } from '@/types'

export function usePrizeWinners() {
  const [winners, setWinners] = useState<PrizeWinners | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(doc(db, 'prizeWinners', 'current'), snap => {
      setWinners(snap.exists() ? (snap.data() as PrizeWinners) : null)
      setIsLoading(false)
    })
  }, [])

  return { winners, isLoading }
}
