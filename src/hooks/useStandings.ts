import { useSyncExternalStore } from 'react'
import { subscribeToStandings } from '@/services/matches.service'
import { createSharedStore } from '@/services/subscriptionStore'
import type { GroupStanding } from '@/types'

const standingsStore = createSharedStore<GroupStanding[]>('standings', subscribeToStandings, [])

export function useStandings() {
  const { data, loaded } = useSyncExternalStore(standingsStore.subscribe, standingsStore.getSnapshot)
  return { standings: data, isLoading: !loaded }
}
