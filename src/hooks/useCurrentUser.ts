import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '@/services/firebase'
import type { UserRecord } from '@/types'

interface CurrentUser {
  firebaseUser: User | null
  userRecord: UserRecord | null
  isAdmin: boolean
  isLoading: boolean
}

export function useCurrentUser(): CurrentUser {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      setFirebaseUser(user)
      if (!user) {
        setUserRecord(null)
        setIsLoading(false)
        return
      }
      // Read admin claim from the token, then sync it + identity fields to Firestore.
      // Never overwrite participantId — that is managed by the claim flow.
      const tokenResult = await user.getIdTokenResult()
      const userRef = doc(db, 'users', user.uid)
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isAdmin: tokenResult.claims['admin'] === true,
        },
        { merge: true },
      )
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    // includeMetadataChanges lets us distinguish cache hits from server responses.
    // We update userRecord on every snapshot but only clear isLoading once the
    // server has confirmed the data — preventing a flash from stale cache.
    return onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      { includeMetadataChanges: true },
      snap => {
        if (snap.exists()) {
          setUserRecord(snap.data() as UserRecord)
        }
        // Only mark loaded once we have server-confirmed, write-settled data —
        // avoids flash from optimistic pending-write snapshots.
        if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
          setIsLoading(false)
        }
      },
    )
  }, [firebaseUser])

  return {
    firebaseUser,
    userRecord,
    isAdmin: userRecord?.isAdmin ?? false,
    isLoading,
  }
}
