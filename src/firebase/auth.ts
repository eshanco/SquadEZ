import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { collectionGroup, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, db } from './config'
import { memberDoc } from './firestore'
import type { TeamInvite } from '../types'

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  await setDoc(doc(db, 'users', credential.user.uid), {
    email,
    displayName,
  })
  await joinInvitedTeams(credential.user.uid, email, displayName)
  return credential.user
}

// Someone can be invited to a team before they have an account (see
// TeamSettingsPage's invite flow) - those invites sit as pending docs keyed
// by email. Once that email actually signs up, turn each matching invite
// into a real membership and remove it.
async function joinInvitedTeams(uid: string, email: string, displayName: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const invitesQuery = query(collectionGroup(db, 'invites'), where('email', '==', normalizedEmail))
  const snapshot = await getDocs(invitesQuery)
  await Promise.all(
    snapshot.docs.map(async (inviteSnap) => {
      const teamId = inviteSnap.ref.parent.parent?.id
      if (!teamId) return
      const invite = inviteSnap.data() as TeamInvite
      await setDoc(memberDoc(teamId, uid), {
        uid,
        email,
        displayName,
        role: invite.role,
        addedAt: serverTimestamp(),
        addedBy: invite.invitedBy,
      })
      await deleteDoc(inviteSnap.ref)
    }),
  )
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}
