import { useState, useEffect } from 'react'
import { subscribeToStandings } from '@/services/matches.service'
import type { GroupStanding } from '@/types'

export function useStandings() {
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToStandings(data => {
      setStandings(data)
      setIsLoading(false)
    })
    return unsub
  }, [])

  return { standings, isLoading }
}
