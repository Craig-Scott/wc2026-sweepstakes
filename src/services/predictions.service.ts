import {
  collection, doc, setDoc, getDocs, onSnapshot,
  query, where, orderBy, type Unsubscribe, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Prediction, LeaderboardEntry, Participant } from '@/types'

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
    onData(snap.docs.map(d => d.data() as Prediction))
  })
}

export async function getAllPredictions(): Promise<Prediction[]> {
  const snap = await getDocs(collection(db, 'predictions'))
  return snap.docs.map(d => d.data() as Prediction)
}

export async function buildLeaderboard(participants: Participant[]): Promise<LeaderboardEntry[]> {
  const predictions = await getAllPredictions()

  const byParticipant = new Map<string, {
    totalPoints: number
    correctResults: number
    exactScores: number
    count: number
  }>()

  for (const pred of predictions) {
    if (pred.pointsAwarded === null) continue
    const entry = byParticipant.get(pred.participantId) ?? {
      totalPoints: 0, correctResults: 0, exactScores: 0, count: 0,
    }
    entry.totalPoints += pred.pointsAwarded
    if (pred.pointsAwarded === 6) entry.exactScores++
    if (pred.pointsAwarded >= 3) entry.correctResults++
    entry.count++
    byParticipant.set(pred.participantId, entry)
  }

  return participants
    .map(p => {
      const stats = byParticipant.get(p.id) ?? {
        totalPoints: 0, correctResults: 0, exactScores: 0, count: 0,
      }
      return {
        participantId: p.id,
        participantName: p.name,
        teamCodes: p.teamCodes,
        totalPoints: stats.totalPoints,
        correctResults: stats.correctResults,
        exactScores: stats.exactScores,
        predictionsSubmitted: stats.count,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores)
}
