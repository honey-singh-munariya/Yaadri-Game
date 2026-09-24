import { db } from '../db'
import { CHAPTERS } from '../../shared/story'
import { levelFromXp } from '../../shared/progress'
import { getLanguage } from '../../shared/languages'
import { preferenceMemories, relevantMemories, type MemoryRow } from './memory'
import { getJourney } from './journey'

export interface CapsuleRow { id: string; kind: string; title: string; relation: string | null; clue: string | null; story: string | null; photo: string | null; contributor: string | null; created_at: string }

export interface Ctx {
  name: string
  language: string
  languageName: string
  level: number
  memories: MemoryRow[]
  capsules: CapsuleRow[]
  journey: { completed: string[]; nextTitle: string | null; flags: string[] }
  games: { bestLevel: number; plays: number }
}

export async function buildContext(userId: string, message: string): Promise<Ctx> {
  const p = (await db.query<{ display_name: string; language: string; xp: number }>('SELECT display_name, language, xp FROM profiles WHERE user_id=$1', [userId])).rows[0]
  const relevant = await relevantMemories(userId, message, 6)
  const seen = new Set(relevant.map((m) => m.id))
  const memories = [...relevant, ...(await preferenceMemories(userId, 3)).filter((m) => !seen.has(m.id))]
  const capsules = (await db.query<CapsuleRow>('SELECT * FROM capsules WHERE user_id=$1 ORDER BY created_at', [userId])).rows
  const j = await getJourney(userId)
  const next = CHAPTERS.find((c) => !j.completed.includes(c.id))
  const g = (await db.query<{ best_level: number; plays: number }>(`SELECT best_level, plays FROM game_progress WHERE user_id=$1 AND game='memory-quest'`, [userId])).rows[0]
  return {
    name: p?.display_name ?? 'friend',
    language: p?.language ?? 'en',
    languageName: getLanguage(p?.language ?? 'en').name,
    level: levelFromXp(p?.xp ?? 0),
    memories,
    capsules,
    journey: { completed: j.completed, nextTitle: next?.title ?? null, flags: j.flags },
    games: { bestLevel: g?.best_level ?? 0, plays: g?.plays ?? 0 },
  }
}
