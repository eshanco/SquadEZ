import { collection, doc } from 'firebase/firestore'
import { db } from './config'

export const usersCollection = () => collection(db, 'users')
export const userDoc = (uid: string) => doc(db, 'users', uid)

export const teamsCollection = () => collection(db, 'teams')
export const teamDoc = (teamId: string) => doc(db, 'teams', teamId)

export const membersCollection = (teamId: string) => collection(db, 'teams', teamId, 'members')
export const memberDoc = (teamId: string, uid: string) =>
  doc(db, 'teams', teamId, 'members', uid)

export const playersCollection = (teamId: string) => collection(db, 'teams', teamId, 'players')
export const playerDoc = (teamId: string, playerId: string) =>
  doc(db, 'teams', teamId, 'players', playerId)

export const eventsCollection = (teamId: string) => collection(db, 'teams', teamId, 'events')
export const eventDoc = (teamId: string, eventId: string) =>
  doc(db, 'teams', teamId, 'events', eventId)

export const rsvpsCollection = (teamId: string, eventId: string) =>
  collection(db, 'teams', teamId, 'events', eventId, 'rsvps')
export const rsvpDoc = (teamId: string, eventId: string, playerId: string) =>
  doc(db, 'teams', teamId, 'events', eventId, 'rsvps', playerId)

export const lineupDoc = (teamId: string, eventId: string) =>
  doc(db, 'teams', teamId, 'events', eventId, 'lineup', 'lineup')
