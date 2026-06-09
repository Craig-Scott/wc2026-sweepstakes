import type { Participant } from '@/types'

// ── Participant list ──────────────────────────────────────────────────────────
// Fill in teamCodes after the in-person draw (each participant gets at least 2).
// Valid FIFA country codes: https://en.wikipedia.org/wiki/List_of_FIFA_country_codes
// hasPaid: update once entry fees are collected.

export const PARTICIPANTS: Omit<Participant, 'uid'>[] = [
  { id: 'eoin',      name: 'Eoin',      teamCodes: [], hasPaid: false },
  { id: 'stephen',   name: 'Stephen',   teamCodes: [], hasPaid: false },
  { id: 'ciaran',    name: 'Ciaran',    teamCodes: [], hasPaid: false },
  { id: 'craig',     name: 'Craig',     teamCodes: [], hasPaid: false },
  { id: 'aarons',    name: 'Aaron S',   teamCodes: [], hasPaid: false },
  { id: 'kevin',     name: 'Kevin',     teamCodes: [], hasPaid: false },
  { id: 'sarai',     name: 'Sarai',     teamCodes: [], hasPaid: false },
  { id: 'sarah',     name: 'Sarah',     teamCodes: [], hasPaid: false },
  { id: 'ciara',     name: 'Ciara',     teamCodes: [], hasPaid: false },
  { id: 'astrid',    name: 'Astrid',    teamCodes: [], hasPaid: false },
  { id: 'luke',      name: 'Luke',      teamCodes: [], hasPaid: false },
  { id: 'dan',       name: 'Dan',       teamCodes: [], hasPaid: false },
  { id: 'aaronmcpo', name: 'Aaron Mcpo',teamCodes: [], hasPaid: false },
  { id: 'david',     name: 'David',     teamCodes: [], hasPaid: false },
  { id: 'clarke',    name: 'Clark',     teamCodes: [], hasPaid: false },
  { id: 'paul',      name: 'Paul',      teamCodes: [], hasPaid: false },
  { id: 'richards',  name: 'Richard S', teamCodes: [], hasPaid: false },
  { id: 'marco',     name: 'Marco',     teamCodes: [], hasPaid: false },
  { id: 'aaronr',    name: 'Aaron R',   teamCodes: [], hasPaid: false },
  { id: 'richardw',  name: 'Richard W', teamCodes: [], hasPaid: false },
  { id: 'kd',        name: 'KD',        teamCodes: [], hasPaid: false },
]

export const getParticipantById = (id: string) =>
  PARTICIPANTS.find(p => p.id === id) ?? null
