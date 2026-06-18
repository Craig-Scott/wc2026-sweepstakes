import type { Unsubscribe } from 'firebase/firestore'

/**
 * Wraps a Firestore subscription in a process-wide singleton, so that every
 * component using a given collection shares ONE `onSnapshot` listener instead
 * of each opening its own (which re-reads the whole collection on attach).
 *
 * The underlying Firestore listener is started lazily on first subscriber and
 * then kept alive for the session — it acts as a cache, so navigating between
 * pages or mounting many consumers costs no extra reads. After the initial
 * attach, Firestore only bills for documents that actually change.
 *
 * Use with React's useSyncExternalStore: getSnapshot returns a stable object
 * reference that only changes identity when new data arrives.
 */
type Subscribe<T> = (onData: (data: T) => void) => Unsubscribe

export interface SharedStore<T> {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => { data: T; loaded: boolean }
}

export function createSharedStore<T>(name: string, subscribe: Subscribe<T>, initial: T): SharedStore<T> {
  let snapshot = { data: initial, loaded: false }
  let firestoreUnsub: Unsubscribe | null = null
  const subscribers = new Set<() => void>()

  const ensureStarted = () => {
    if (firestoreUnsub) return
    if (import.meta.env.DEV) console.debug(`[reads] opening Firestore listener: ${name}`)
    firestoreUnsub = subscribe(data => {
      snapshot = { data, loaded: true }
      if (import.meta.env.DEV) console.debug(`[reads] ${name} delivered`)
      subscribers.forEach(fn => fn())
    })
  }

  return {
    subscribe(onChange) {
      ensureStarted()
      subscribers.add(onChange)
      // Intentionally never tears the Firestore listener down — keeping it alive
      // across unmounts/navigation is what avoids repeated full-collection reads.
      return () => { subscribers.delete(onChange) }
    },
    getSnapshot() {
      return snapshot
    },
  }
}
