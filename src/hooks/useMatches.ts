import { useState, useEffect } from 'react'
import {
  subscribeToMatches,
  subscribeToUpcomingMatches,
  subscribeToLatestFinishedMatch,
} from '@/services/matches.service'
import type { Match } from '@/types'

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToMatches(data => {
      setMatches(data)
      setIsLoading(false)
    })
    return unsub
  }, [])

  return { matches, isLoading }
}

export function useUpcomingMatches(limit_ = 3) {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToUpcomingMatches(limit_, data => {
      setMatches(data)
      setIsLoading(false)
    })
    return unsub
  }, [limit_])

  return { matches, isLoading }
}

export function useLatestMatch() {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToLatestFinishedMatch(data => {
      setMatch(data)
      setIsLoading(false)
    })
    return unsub
  }, [])

  return { match, isLoading }
}
