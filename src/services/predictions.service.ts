import {
  collection, doc, setDoc, onSnapshot,
  query, where, orderBy, type Unsubscribe, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { recordRead } from './readMeter'
import type { Prediction, LeaderboardEntry, Participant } from '@/types'

// Aggregated leaderboard doc maintained by the sync job (scripts/sync-football.ts).
// Subscribing to this single doc costs 1 read per client, vs reading the whole predictions
// collection on every page load.
export interface LeaderboardDoc {
  points: Record<string, number>
  exact: Record<string, number>
}

export function subscribeToLeaderboard(
  onData: (data: LeaderboardDoc) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'leaderboard', 'current'), snap => {
    recordRead('leaderboard', 1)
    const data = snap.data() as Partial<LeaderboardDoc> | undefined
    onData({ points: data?.points ?? {}, exact: data?.exact ?? {} })
  })
}

// Builds the displayed leaderboard from the aggregated doc + participants, replicating the old
// buildLeaderboard ordering (points desc, then exact-score count desc). Includes every
// participant so those with no points still appear.
export function leaderboardEntries(
  participants: Participant[],
  agg: LeaderboardDoc,
): LeaderboardEntry[] {
  return participants
    .map(p => ({
      participantId: p.id,
      participantName: p.name,
      teamCodes: p.teamCodes,
      totalPoints: agg.points[p.id] ?? 0,
      correctResults: 0,
      exactScores: agg.exact[p.id] ?? 0,
      predictionsSubmitted: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores)
}

export function predictionDocId(participantId: string, matchId: number) {
  return `${participantId}_${matchId}`
}

// Always overwrites the prediction document. Safe because users can only edit
// before kickoff, at which point pointsAwarded is always null.
export async function savePrediction(
  participantId: string,
  uid: string,
  matchId: number,
  predictedHome: number,
  predictedAway: number,
): Promise<void> {
  const id = predictionDocId(participantId, matchId)
  await setDoc(doc(db, 'predictions', id), {
    participantId,
    matchId,
    uid,
    predictedHome,
    predictedAway,
    submittedAt: serverTimestamp(),
    pointsAwarded: null,
  })
}

export function subscribeToPredictionsForParticipant(
  participantId: string,
  onData: (predictions: Prediction[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'predictions'),
    where('participantId', '==', participantId),
    orderBy('submittedAt', 'desc'),
  )
  return onSnapshot(q, snap => {
    recordRead('predictions-mine', snap.docChanges().length)
    onData(snap.docs.map(d => d.data() as Prediction))
  })
}

// Reads one match's predictions directly (~18 docs). Used for LIVE matches so everyone's picks
// appear the instant the predict window closes — no dependency on the sync having run.
export function subscribeToPredictionsForMatch(
  matchId: number,
  onData: (predictions: Prediction[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'predictions'), where('matchId', '==', matchId))
  return onSnapshot(q, snap => {
    recordRead('predictions-live', snap.docChanges().length)
    onData(snap.docs.map(d => d.data() as Prediction))
  })
}

// Reads the sync-maintained aggregate of locked matches' picks — ONE doc instead of the whole
// predictions collection. Reconstructs flat Prediction-shaped records (uid/submittedAt aren't
// needed by the per-match display, which uses participantId/scores/pointsAwarded).
type AggPick = { p: string; h: number; a: number; pts: number | null }
export function subscribeToPredictionsAggregate(
  onData: (predictions: Prediction[]) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'aggregates', 'predictions'), snap => {
    recordRead('predictions-agg', 1)
    const byMatch = (snap.data()?.byMatch ?? {}) as Record<string, AggPick[]>
    const flat: Prediction[] = []
    for (const [matchId, picks] of Object.entries(byMatch)) {
      for (const pk of picks) {
        flat.push({
          participantId: pk.p, matchId: Number(matchId),
          predictedHome: pk.h, predictedAway: pk.a, pointsAwarded: pk.pts,
        } as unknown as Prediction)
      }
    }
    onData(flat)
  })
}
