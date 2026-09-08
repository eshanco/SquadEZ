import type { CustomFormationDoc, Formation, FormationSlot, PositionGroup } from '../types'

function buildSlots(rows: { label: string; count: number }[]): FormationSlot[] {
  const slots: FormationSlot[] = []
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < row.count; col++) {
      slots.push({
        id: `${rowIndex}-${col}`,
        label: row.count === 1 ? row.label : `${row.label} ${col + 1}`,
        row: rowIndex,
        col,
      })
    }
  })
  return slots
}

const DEFAULT_FORMATION_DEFS: { id: string; name: string; rows: { label: string; count: number }[] }[] = [
  {
    id: 'default:4-4-2',
    name: '4-4-2',
    rows: [
      { label: 'GK', count: 1 },
      { label: 'DEF', count: 4 },
      { label: 'MID', count: 4 },
      { label: 'FWD', count: 2 },
    ],
  },
  {
    id: 'default:4-3-3',
    name: '4-3-3',
    rows: [
      { label: 'GK', count: 1 },
      { label: 'DEF', count: 4 },
      { label: 'MID', count: 3 },
      { label: 'FWD', count: 3 },
    ],
  },
  {
    id: 'default:4-2-3-1',
    name: '4-2-3-1',
    rows: [
      { label: 'GK', count: 1 },
      { label: 'DEF', count: 4 },
      { label: 'DM', count: 2 },
      { label: 'AM', count: 3 },
      { label: 'FWD', count: 1 },
    ],
  },
  {
    id: 'default:3-5-2',
    name: '3-5-2',
    rows: [
      { label: 'GK', count: 1 },
      { label: 'DEF', count: 3 },
      { label: 'MID', count: 5 },
      { label: 'FWD', count: 2 },
    ],
  },
]

export const DEFAULT_FORMATIONS: Formation[] = DEFAULT_FORMATION_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  isCustom: false,
  slots: buildSlots(def.rows),
}))

// Parses a shape string like "4-3-3" (outfield rows, defense to attack) into
// row counts, and labels each row DEF / MID / FWD based on its position —
// first row is DEF, last is FWD, everything between is MID. GK is implicit.
export function parseFormationShape(shapeInput: string): number[] {
  const parts = shapeInput
    .split(/[-,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => Number(p))

  if (parts.length === 0 || parts.some((n) => !Number.isInteger(n) || n < 1 || n > 8)) {
    throw new Error('Enter a shape like "4-3-3" — each number between 1 and 8.')
  }
  return parts
}

export function customFormationToFormation(id: string, doc: CustomFormationDoc): Formation {
  const rows = [{ label: 'GK', count: 1 }]
  doc.shape.forEach((count, i) => {
    let label: string
    if (doc.shape.length === 1) label = 'MID'
    else if (i === 0) label = 'DEF'
    else if (i === doc.shape.length - 1) label = 'FWD'
    else label = 'MID'
    rows.push({ label, count })
  })
  return { id, name: doc.name, isCustom: true, slots: buildSlots(rows) }
}

const POSITION_ORDER: PositionGroup[] = ['GK', 'DEF', 'MID', 'FW']

// Maps a slot's free-text label (e.g. "DEF 2", "DM", "AM", "FWD") to the
// PositionGroup category it represents, so player.positions can be matched
// against it. DM/AM (4-2-3-1) both count as MID.
export function slotPositionGroup(slot: FormationSlot): PositionGroup {
  const key = slot.label.split(' ')[0]
  if (key === 'GK') return 'GK'
  if (key === 'DEF') return 'DEF'
  if (key === 'FWD') return 'FW'
  return 'MID' // MID, DM, AM
}

// The order in which position categories should be listed when picking a
// player for a slot: the slot's own category first, then the rest in their
// usual GK -> DEF -> MID -> FW sequence, wrapping around. e.g. clicking a DEF
// slot yields [DEF, MID, FW, GK].
export function positionPickOrder(start: PositionGroup): PositionGroup[] {
  const i = POSITION_ORDER.indexOf(start)
  return [...POSITION_ORDER.slice(i), ...POSITION_ORDER.slice(0, i)]
}

export function formationRows(formation: Formation): FormationSlot[][] {
  const maxRow = Math.max(...formation.slots.map((s) => s.row))
  const rows: FormationSlot[][] = []
  for (let r = 0; r <= maxRow; r++) {
    rows.push(
      formation.slots.filter((s) => s.row === r).sort((a, b) => a.col - b.col),
    )
  }
  return rows
}
