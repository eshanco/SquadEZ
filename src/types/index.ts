export type MemberRole = 'owner' | 'coach'

export interface AppUser {
  uid: string
  email: string
  displayName: string
}

export interface Team {
  id: string
  name: string
  ageGroup: string
  season: string
  createdBy: string
  createdAt: number
}

export interface TeamMember {
  uid: string
  email: string
  displayName: string
  role: MemberRole
  addedAt: number
  addedBy: string
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  jerseyNumber: string
  positions: string[]
  parentName: string
  parentPhone: string
  parentEmail: string
  emergencyContactName: string
  emergencyContactPhone: string
  medicalNotes: string
  active: boolean
  createdAt: number
}

export type EventType = 'practice' | 'game'

export interface TeamEvent {
  id: string
  type: EventType
  title: string
  startAt: number
  endAt: number
  location: string
  opponent: string | null
  notes: string
  createdBy: string
  createdAt: number
}

export type RsvpStatus = 'yes' | 'no' | 'maybe' | 'no-response'

export interface Rsvp {
  playerId: string
  status: RsvpStatus
  note: string
  updatedBy: string
  updatedAt: number
}

export interface FormationSlot {
  id: string // stable within a formation, e.g. "1-2" (row-col)
  label: string
  row: number // 0 = goalkeeper row, increasing toward attack
  col: number // 0-indexed position within the row
}

export interface Formation {
  id: string // 'default:4-3-3' for built-ins, Firestore doc id for custom
  name: string
  slots: FormationSlot[]
  isCustom: boolean
}

// Firestore doc shape for a custom formation saved under a team.
export interface CustomFormationDoc {
  name: string
  shape: number[] // outfield rows from defense to attack, e.g. [4, 3, 3] — GK is implicit
  createdBy: string
  createdAt: number
}

export interface LineupAssignment {
  playerId: string
  slotId: string
  position: string // snapshot of the slot's label at assignment time
}

export interface LineupPeriod {
  id: string
  label: string
  durationMinutes: number
  assignments: LineupAssignment[]
}

export interface Lineup {
  formationId: string
  periods: LineupPeriod[]
  updatedBy: string
  updatedAt: number
}
