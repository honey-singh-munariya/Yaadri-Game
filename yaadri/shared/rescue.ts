/**
 * Memory Rescue ladder (pure; used by server and client).
 * Content is drawn ONLY from fields a family member entered on the capsule. No language model is involved,
 * so a hint can never present an invented memory. (The "familiar voice" rung from the concept doc needs
 * family voice recordings: Phase 2.)
 */
export interface CapsuleLike {
  kind: string
  title: string
  relation?: string | null
  clue?: string | null
  story?: string | null
  photo?: string | null
}
export interface Rung { level: number; kind: 'clue' | 'relationship' | 'memory' | 'reveal'; text: string; photo?: string | null }

const firstSentence = (s: string) => (s.match(/^[^.!?]{4,180}[.!?]?/)?.[0] ?? s).trim()

export function buildLadder(c: CapsuleLike): Rung[] {
  const rungs: Omit<Rung, 'level'>[] = []
  const fallback = c.kind === 'place' ? 'This is a place that matters to you.' : c.kind === 'event' ? 'This is a moment that matters to you.' : 'This is a person who matters to you.'
  rungs.push({ kind: 'clue', text: c.clue?.trim() || fallback })
  if (c.relation?.trim()) rungs.push({ kind: 'relationship', text: c.relation.trim() })
  if (c.story?.trim() || c.photo) rungs.push({ kind: 'memory', text: c.story?.trim() ? firstSentence(c.story) : 'Look at the picture together.', photo: c.photo })
  rungs.push({ kind: 'reveal', text: c.title })
  return rungs.map((r, i) => ({ ...r, level: i + 1 }))
}
