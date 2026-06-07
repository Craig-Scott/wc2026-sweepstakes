import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

export function formatKickoff(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  return format(date, 'EEE d MMM, HH:mm')
}

export function formatKickoffFull(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  return format(date, 'EEEE d MMMM yyyy, HH:mm')
}

export function timeUntilKickoff(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  if (isPast(date)) return 'Started'
  return `Starts ${formatDistanceToNow(date, { addSuffix: true })}`
}

export function isWithin24Hours(timestamp: Timestamp): boolean {
  const date = timestamp.toDate()
  return !isPast(date) && differenceInHours(date, new Date()) < 24
}

export function formatTimestamp(timestamp: Timestamp): string {
  return format(timestamp.toDate(), 'd MMM yyyy, HH:mm')
}
