import { db } from '../db'
import { ACHIEVEMENTS, levelFromXp, VISIT_KEYS } from '../../shared/progress'
import { addSystemMemory } from './memory'

export interface Unlocked { id: string; name: string; description: string; icon: string; xp: number }
export interface Reward { xpGained: number; xp: number; level: number; leveledUp: boolean; unlocked: Unlocked[] }

async function bumpXp(userId: string, amount: number): Promise<number> {
  const r = await db.query<{ xp: number }>('UPDATE profiles SET xp = xp + $2, updated_at=now() WHERE user_id=$1 RETURNING xp', [userId, amount])
  return r.rows[0]?.xp ?? 0
}

async function stats(userId: string) {
  const n = async (sql: string) => (await db.query<{ c: number }>(sql, [userId])).rows[0]?.c ?? 0
  const [memories, scores, capsules, userMsgs, helped] = await Promise.all([
    n('SELECT count(*)::int AS c FROM memories WHERE user_id=$1'),
    n('SELECT count(*)::int AS c FROM game_scores WHERE user_id=$1'),
    n('SELECT count(*)::int AS c FROM capsules WHERE user_id=$1'),
    n(`SELECT count(*)::int AS c FROM messages WHERE user_id=$1 AND role='user'`),
    n('SELECT count(*)::int AS c FROM cue_events WHERE user_id=$1 AND correct=TRUE AND cue_level>=1'),
  ])
  const best = (await db.query<{ b: number }>(`SELECT COALESCE(max(best_level),0)::int AS b FROM game_progress WHERE user_id=$1 AND game='memory-quest'`, [userId])).rows[0]?.b ?? 0
  const p = (await db.query<{ visited: string[]; languages_tried: string[] }>('SELECT visited, languages_tried FROM profiles WHERE user_id=$1', [userId])).rows[0]
  const j = (await db.query<{ state: { completed?: string[] } }>('SELECT state FROM journey_progress WHERE user_id=$1', [userId])).rows[0]
  return { memories, scores, capsules, userMsgs, helped, best, visited: p?.visited ?? [], langs: p?.languages_tried ?? [], chapters: j?.state?.completed?.length ?? 0 }
}

export async function evaluateAchievements(userId: string): Promise<Unlocked[]> {
  const s = await stats(userId)
  const rules: Record<string, boolean> = {
    first_memory: s.memories >= 1,
    first_game: s.scores >= 1,
    memory_master: s.best >= 5,
    explorer: s.visited.filter((v) => (VISIT_KEYS as readonly string[]).includes(v)).length >= 6,
    story_keeper: s.chapters >= 3,
    language_explorer: s.langs.length >= 2,
    yaadri_friend: s.userMsgs >= 10,
    journey_complete: s.chapters >= 5,
    family_keeper: s.capsules >= 1,
    gentle_helper: s.helped >= 1,
  }
  const have = new Set((await db.query<{ achievement_id: string }>('SELECT achievement_id FROM user_achievements WHERE user_id=$1', [userId])).rows.map((r) => r.achievement_id))
  const unlocked: Unlocked[] = []
  for (const a of ACHIEVEMENTS) {
    if (rules[a.id] && !have.has(a.id)) {
      await db.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, a.id])
      await bumpXp(userId, a.xp)
      await addSystemMemory(userId, { content: `Unlocked the “${a.name}” achievement.`, kind: 'achievement', source: 'achievements' })
      unlocked.push({ id: a.id, name: a.name, description: a.description, icon: a.icon, xp: a.xp })
    }
  }
  return unlocked
}

/** Award XP for an event, then check achievements (their XP is added on top). */
export async function reward(userId: string, amount: number): Promise<Reward> {
  const before = (await db.query<{ xp: number }>('SELECT xp FROM profiles WHERE user_id=$1', [userId])).rows[0]?.xp ?? 0
  if (amount > 0) await bumpXp(userId, amount)
  const unlocked = await evaluateAchievements(userId)
  const after = (await db.query<{ xp: number }>('SELECT xp FROM profiles WHERE user_id=$1', [userId])).rows[0]?.xp ?? 0
  return { xpGained: after - before, xp: after, level: levelFromXp(after), leveledUp: levelFromXp(after) > levelFromXp(before), unlocked }
}
