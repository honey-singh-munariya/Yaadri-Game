import { db } from '../db'
import { CHAPTERS, getChapter, resolveLines, correctOption, type Mood, type Scene } from '../../shared/story'

export interface JourneyState {
  chapter: string | null
  scene: string | null
  stats: { warmth: number; curiosity: number; courage: number }
  flags: string[]
  completed: string[]
  endings: Record<string, string>
  attempts: Record<string, number>
  run: number
}

export const freshState = (): JourneyState => ({ chapter: null, scene: null, stats: { warmth: 0, curiosity: 0, courage: 0 }, flags: [], completed: [], endings: {}, attempts: {}, run: 0 })

export async function getJourney(userId: string): Promise<JourneyState> {
  const r = await db.query<{ state: JourneyState }>('SELECT state FROM journey_progress WHERE user_id=$1', [userId])
  if (r.rows[0]) return { ...freshState(), ...r.rows[0].state }
  const s = freshState()
  await saveJourney(userId, s)
  return s
}
export async function saveJourney(userId: string, s: JourneyState) {
  await db.query(
    `INSERT INTO journey_progress (user_id,state) VALUES ($1,$2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET state=$2::jsonb, updated_at=now()`,
    [userId, JSON.stringify(s)],
  )
}

export const chapterStatus = (s: JourneyState, idx: number): 'complete' | 'in_progress' | 'available' | 'locked' => {
  const c = CHAPTERS[idx]
  if (s.completed.includes(c.id)) return 'complete'
  if (s.chapter === c.id) return 'in_progress'
  if (idx === 0 || s.completed.includes(CHAPTERS[idx - 1].id)) return 'available'
  return 'locked'
}

export interface ScenePayload {
  chapterId: string
  chapterTitle: string
  sceneId: string
  mood: Mood
  lines: string[]
  choices?: { id: string; label: string }[]
  challenge?: { id: string; prompt: string; options: { id: string; label: string }[]; attempts: number }
  end?: { outcome: string; xp: number }
}

export function scenePayload(s: JourneyState): ScenePayload | null {
  if (!s.chapter || !s.scene) return null
  const ch = getChapter(s.chapter)
  const sc: Scene | undefined = ch?.scenes[s.scene]
  if (!ch || !sc) return null
  return {
    chapterId: ch.id,
    chapterTitle: ch.title,
    sceneId: sc.id,
    mood: sc.mood,
    lines: resolveLines(sc.lines, s.flags),
    choices: sc.choices?.map((c) => ({ id: c.id, label: c.label })),
    challenge: sc.challenge ? { id: sc.challenge.id, prompt: sc.challenge.prompt, options: sc.challenge.options, attempts: s.attempts[sc.challenge.id] ?? 0 } : undefined,
    end: sc.end,
  }
}

export { correctOption }
