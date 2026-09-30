import { getDoc, getDocs } from 'firebase/firestore'
import { lineupDoc, rsvpsCollection } from '../firebase/firestore'
import type { Lineup, Player, Rsvp, TeamEvent } from '../types'
import { buildXlsx, downloadBlob, type CellValue } from './xlsx'

function eventColumnLabel(event: TeamEvent) {
  const date = new Date(event.startAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${event.title} (${date})`
}

const fullName = (p: Player) => `${p.firstName} ${p.lastName}`

// Builds and downloads a workbook with Squad / Matches / Training tabs.
// Uses the same rules as the in-app stats: only past events count,
// cancelled events are left out, match minutes come from the lineup, and
// training attendance is a 'yes' RSVP (anything else counts as absent).
export async function exportSquadStats(
  teamId: string,
  teamName: string,
  players: Player[],
  events: TeamEvent[],
) {
  const now = Date.now()
  const past = events
    .filter((e) => e.startAt < now && !e.cancelled)
    .sort((a, b) => a.startAt - b.startAt)
  const matches = past.filter((e) => e.type === 'game')
  const sessions = past.filter((e) => e.type === 'practice')

  const sortedPlayers = [...players].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  )
  const activePlayers = sortedPlayers.filter((p) => p.active)

  const [lineupSnaps, rsvpSnaps] = await Promise.all([
    Promise.all(matches.map((e) => getDoc(lineupDoc(teamId, e.id)))),
    Promise.all(sessions.map((e) => getDocs(rsvpsCollection(teamId, e.id)))),
  ])

  // minutesByMatch[i] maps playerId -> minutes in matches[i]
  const minutesByMatch = lineupSnaps.map((snap) => {
    const minutes = new Map<string, number>()
    if (!snap.exists()) return minutes
    for (const period of (snap.data() as Lineup).periods) {
      for (const a of period.assignments) {
        minutes.set(a.playerId, (minutes.get(a.playerId) ?? 0) + (period.durationMinutes || 0))
      }
    }
    return minutes
  })

  // attendedBySession[i] is the set of playerIds marked attended at sessions[i]
  const attendedBySession = rsvpSnaps.map(
    (snap) =>
      new Set(
        snap.docs
          .map((d) => d.data() as Rsvp)
          .filter((r) => r.status === 'yes')
          .map((r) => r.playerId),
      ),
  )

  const squadRows: CellValue[][] = [
    [
      'First name',
      'Last name',
      'Jersey #',
      'Positions',
      'Active',
      'Parent name',
      'Parent phone',
      'Parent email',
      'Emergency contact',
      'Emergency phone',
      'Medical notes',
    ],
    ...sortedPlayers.map((p) => [
      p.firstName,
      p.lastName,
      p.jerseyNumber,
      p.positions.join(', '),
      p.active ? 'Yes' : 'No',
      p.parentName,
      p.parentPhone,
      p.parentEmail,
      p.emergencyContactName,
      p.emergencyContactPhone,
      p.medicalNotes,
    ]),
  ]

  const matchRows: CellValue[][] = [
    ['Player', ...matches.map(eventColumnLabel), 'Total minutes'],
    ...activePlayers.map((p) => {
      const perMatch = minutesByMatch.map((m) => m.get(p.id) ?? 0)
      return [fullName(p), ...perMatch, perMatch.reduce((sum, n) => sum + n, 0)]
    }),
  ]

  const trainingRows: CellValue[][] = [
    ['Player', ...sessions.map(eventColumnLabel), 'Attended', 'Attendance %'],
    ...activePlayers.map((p) => {
      const perSession = attendedBySession.map((s) => (s.has(p.id) ? 1 : 0))
      const attended = perSession.reduce<number>((sum, n) => sum + n, 0)
      const percent = sessions.length ? Math.round((attended / sessions.length) * 100) : 0
      return [fullName(p), ...perSession, attended, percent]
    }),
  ]

  const blob = buildXlsx([
    { name: 'Squad', rows: squadRows },
    { name: 'Matches', rows: matchRows, freezeFirstColumn: true },
    { name: 'Training', rows: trainingRows, freezeFirstColumn: true },
  ])

  const safeTeamName = teamName.replace(/[^\w -]+/g, '').trim() || 'squad'
  const today = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `${safeTeamName} stats ${today}.xlsx`)
}
