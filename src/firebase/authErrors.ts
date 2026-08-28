import { FirebaseError } from 'firebase/app'

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': "That doesn't look like a valid email address.",
  'auth/email-already-in-use': 'That email is already registered — try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return MESSAGES[err.code] ?? 'Something went wrong — please try again.'
  }
  return err instanceof Error ? err.message : 'Something went wrong — please try again.'
}
