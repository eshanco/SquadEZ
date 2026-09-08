import type { MemberRole } from '../types'

// Owners and coaches can edit team data; viewers are read-only. Mirrors the
// canEdit() check in firestore.rules, which is the actual enforcement point
// - this is only for UI gating (hiding/disabling controls a viewer's writes
// would be rejected for anyway).
export function canEdit(role: MemberRole | null): boolean {
  return role === 'owner' || role === 'coach'
}
