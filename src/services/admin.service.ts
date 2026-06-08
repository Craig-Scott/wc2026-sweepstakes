import {
  doc, setDoc, updateDoc, getDoc, collection, getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { AppConfig, Match, Participant } from '@/types'
import { DEFAULT_CONFIG } from '@/config/prizes'

// ── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
  const snap = await getDoc(doc(db, 'config', 'app'))
  return snap.exists() ? (snap.data() as AppConfig) : DEFAULT_CONFIG
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const sum = Object.values(config.prizes).reduce((a, b) => a + b, 0)
  if (sum !== 100) throw new Error(`Prize percentages must sum to 100, got ${sum}`)
  await setDoc(doc(db, 'config', 'app'), config)
}

// ── Participants ──────────────────────────────────────────────────────────────

export async function setParticipantPaid(
  participantId: string,
  hasPaid: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'participants', participantId), { hasPaid })
}

export async function linkParticipantUid(
  participantId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, 'participants', participantId), { uid })
  await setDoc(doc(db, 'users', uid), { participantId }, { merge: true })
}

// Called by users claiming their own participant slot on first sign-in.
export async function claimParticipant(
  participantId: string,
  uid: string,
  participantName: string,
): Promise<void> {
  await updateDoc(doc(db, 'participants', participantId), { uid })
  await updateDoc(doc(db, 'users', uid), { participantId, participantName })
}

export async function removeParticipantPhoto(participantId: string): Promise<void> {
  await updateDoc(doc(db, 'participants', participantId), { photoURL: null })
}

// Resizes and compresses the image client-side, then stores it as a base64
// data URL directly in Firestore — no Storage plan required.
export async function uploadParticipantPhoto(
  participantId: string,
  file: File,
): Promise<string> {
  const dataURL = await resizeImage(file, 800)
  await updateDoc(doc(db, 'participants', participantId), { photoURL: dataURL })
  return dataURL
}

function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}

export async function updateParticipantTeams(
  participantId: string,
  teamCodes: string[],
): Promise<void> {
  await updateDoc(doc(db, 'participants', participantId), { teamCodes })
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function saveMatchDetails(
  matchId: number,
  partial: Partial<Pick<Match, 'scorers' | 'cards'>>,
): Promise<void> {
  await updateDoc(doc(db, 'matches', String(matchId)), {
    ...partial,
    updatedAt: serverTimestamp(),
  })
}

// ── Seeding ──────────────────────────────────────────────────────────────────

export async function getParticipants(): Promise<Participant[]> {
  const snap = await getDocs(collection(db, 'participants'))
  return snap.docs.map(d => d.data() as Participant)
}
