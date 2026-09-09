export type MemberRole = 'owner' | 'coach' | 'viewer'
// Roles that can be granted via an invite - 'owner' is only ever set by the
// team-creation bootstrap, never handed out through the invite flow.
export type InviteRole = 'coach' | 'viewer'

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
  jerseyColor?: string
  jerseyTrimColor?: string
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

// A pending invite for someone who doesn't have a SquadEZ account yet -
// keyed by their (lowercased) email, since there's no uid to key it by
// until they sign up. Consumed into a TeamMember doc at signup time.
export interface TeamInvite {
  email: string
  role: InviteRole
  invitedBy: string
  invitedAt: number
}

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FW'

export interface Player {
  id: string
  firstName: string
  lastName: string
  jerseyNumber: string
  positions: PositionGroup[]
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
export type CompetitionType = 'league' | 'cup' | 'friendly'
export type HomeAway = 'home' | 'away'

// Goals scored by the home team and away team - independent of which side
// this team played on, so it reads the same as a scoreboard. Use the
// event's `homeAway` to work out which column is "us" for a given game.
export interface GameScore {
  halftimeHome: number | null
  halftimeAway: number | null
  fulltimeHome: number | null
  fulltimeAway: number | null
}

export interface TeamEvent {
  id: string
  type: EventType
  title: string
  startAt: number
  endAt: number
  location: string
  opponent: string | null
  competition: CompetitionType | null
  homeAway: HomeAway | null
  score: GameScore | null
  cancelled: boolean
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
  unavailablePlayerIds: string[]
  updatedBy: string
  updatedAt: number
}
