import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { Participant } from '@/types'

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(collection(db, 'participants'), snap => {
      const data = snap.docs
        .map(d => d.data() as Participant)
        .sort((a, b) => a.name.localeCompare(b.name))
      setParticipants(data)
      setIsLoading(false)
    })
  }, [])

  return { participants, isLoading }
}
