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

export interface LineupAssignment {
  playerId: string
  position: string
}

export interface LineupPeriod {
  label: string
  assignments: LineupAssignment[]
}

export interface Lineup {
  formation: string
  periods: LineupPeriod[]
  updatedBy: string
  updatedAt: number
}
