import { useSyncExternalStore, useMemo } from 'react'
import { subscribeToMatches } from '@/services/matches.service'
import { createSharedStore } from '@/services/subscriptionStore'
import type { Match } from '@/types'

// One shared listener over the whole matches collection for the entire app.
const matchesStore = createSharedStore<Match[]>('matches', subscribeToMatches, [])

export function useMatches() {
  const { data, loaded } = useSyncExternalStore(matchesStore.subscribe, matchesStore.getSnapshot)
  return { matches: data, isLoading: !loaded }
}

// Derived from the shared matches store — no extra Firestore listener.
export function useUpcomingMatches(limit_ = 3) {
  const { matches, isLoading } = useMatches()
  const upcoming = useMemo(() => {
    const now = new Date()
    return matches
      .filter(m => ['SCHEDULED', 'TIMED'].includes(m.status) && m.kickoff.toDate() > now)
      .sort((a, b) => a.kickoff.toDate().getTime() - b.kickoff.toDate().getTime())
      .slice(0, limit_)
  }, [matches, limit_])
  return { matches: upcoming, isLoading }
}

export function useLatestMatch() {
  const { matches, isLoading } = useMatches()
  const match = useMemo(() => {
    const finished = matches
      .filter(m => m.status === 'FINISHED')
      .sort((a, b) => b.kickoff.toDate().getTime() - a.kickoff.toDate().getTime())
    return finished[0] ?? null
  }, [matches])
  return { match, isLoading }
}
