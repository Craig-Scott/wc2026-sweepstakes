import {
  collection, doc, getDoc, getDocs, onSnapshot,
  query, orderBy, where, type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Match, GroupStanding } from '@/types'

export function subscribeToMatches(
  onData: (matches: Match[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as Match))
  })
}

export function subscribeToUpcomingMatches(
  limit_: number,
  onData: (matches: Match[]) => void,
): Unsubscribe {
  const now = new Date()
  const q = query(
    collection(db, 'matches'),
    where('status', 'in', ['SCHEDULED', 'TIMED']),
    orderBy('kickoff', 'asc'),
  )
  return onSnapshot(q, snap => {
    const upcoming = snap.docs
      .map(d => ({ ...d.data() } as unknown as Match))
      .filter(m => m.kickoff.toDate() > now)
      .slice(0, limit_)
    onData(upcoming)
  })
}

export function subscribeToLatestFinishedMatch(
  onData: (match: Match | null) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'matches'),
    where('status', '==', 'FINISHED'),
    orderBy('kickoff', 'desc'),
  )
  return onSnapshot(q, snap => {
    onData(snap.docs.length > 0
      ? (snap.docs[0].data() as unknown as Match)
      : null)
  })
}

export async function getMatch(matchId: number): Promise<Match | null> {
  const snap = await getDoc(doc(db, 'matches', String(matchId)))
  return snap.exists() ? (snap.data() as unknown as Match) : null
}

export function subscribeToStandings(
  onData: (standings: GroupStanding[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'standings'), snap => {
    const standings = snap.docs
      .map(d => d.data() as GroupStanding)
      .sort((a, b) => a.group.localeCompare(b.group))
    onData(standings)
  })
}

export async function getFinishedMatches(): Promise<Match[]> {
  const q = query(
    collection(db, 'matches'),
    where('status', '==', 'FINISHED'),
    orderBy('kickoff', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as unknown as Match)
}
