import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { AppConfig } from '@/types'
import { DEFAULT_CONFIG } from '@/config/prizes'

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'app'), snap => {
      setConfig(snap.exists() ? (snap.data() as AppConfig) : DEFAULT_CONFIG)
      setIsLoading(false)
    })
  }, [])

  return { config, isLoading }
}
