import { useSyncExternalStore } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { createSharedStore } from '@/services/subscriptionStore'
import { recordRead } from '@/services/readMeter'
import type { Participant } from '@/types'

// One shared listener over the participants collection for the entire app.
// (Previously every consumer — including one per PredictionForm — opened its own.)
const participantsStore = createSharedStore<Participant[]>('participants', onData =>
  onSnapshot(collection(db, 'participants'), snap => {
    recordRead('participants', snap.docChanges().length)
    onData(snap.docs.map(d => d.data() as Participant).sort((a, b) => a.name.localeCompare(b.name)))
  }), [])

export function useParticipants() {
  const { data, loaded } = useSyncExternalStore(participantsStore.subscribe, participantsStore.getSnapshot)
  return { participants: data, isLoading: !loaded }
}
