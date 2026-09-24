import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { parse, uid, wrap } from '../util'
import { reward } from '../services/progress'
import { addSystemMemory } from '../services/memory'

export const games = Router()

games.get('/games', wrap(async (req, res) => {
  const progress = (await db.query('SELECT game, best_level, plays FROM game_progress WHERE user_id=$1', [req.userId])).rows
  const recent = (await db.query(
    `SELECT game, level, score, stars, completed, xp_awarded, created_at FROM game_scores WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [req.userId])).rows
  const best = (await db.query(`SELECT game, COALESCE(max(score),0)::int AS best_score FROM game_scores WHERE user_id=$1 GROUP BY game`, [req.userId])).rows
  res.json({ progress, recent, best })
}))

const scoreSchema = z.object({
  game: z.enum(['memory-quest', 'family-faces']),
  level: z.number().int().min(1).max(99),
  completed: z.boolean(),
  score: z.number().int().min(0).max(1_000_000),
  stars: z.number().int().min(0).max(3),
  mistakes: z.number().int().min(0).max(999),
  hints: z.number().int().min(0).max(999),
  durationMs: z.number().int().min(0).max(3_600_000),
  events: z.array(z.object({ key: z.string().max(60), label: z.string().max(80), cue: z.number().int().min(0).max(2), correct: z.boolean() })).max(30).default([]),
})

/** XP is computed here, never trusted from the client. Not finishing a level still earns a little: no punishment. */
games.post('/games/score', wrap(async (req, res) => {
  const b = parse(scoreSchema, req.body)
  const userId = req.userId!
  const xp = b.completed ? 20 + b.level * 4 + b.stars * 6 : 3
  const score = Math.min(b.score, 3000 + b.level * 1500)

  await db.query(
    `INSERT INTO game_scores (id,user_id,game,level,score,stars,completed,xp_awarded,hints_used,mistakes,duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [uid(), userId, b.game, b.level, score, b.completed ? b.stars : 0, b.completed, xp, b.hints, b.mistakes, b.durationMs],
  )
  await db.query(
    `INSERT INTO game_progress (user_id,game,best_level,plays) VALUES ($1,$2,$3,1)
     ON CONFLICT (user_id,game) DO UPDATE SET best_level=GREATEST(game_progress.best_level,$3), plays=game_progress.plays+1, updated_at=now()`,
    [userId, b.game, b.completed ? b.level : 0],
  )
  for (const e of b.events) {
    await db.query(`INSERT INTO cue_events (id,user_id,source,item_key,item_label,cue_level,correct) VALUES ($1,$2,'quest',$3,$4,$5,$6)`, [uid(), userId, e.key, e.label, e.cue, e.correct])
  }
  if (b.completed && (b.level === 1 || b.level % 3 === 0)) {
    await addSystemMemory(userId, { content: `Cleared Memory Quest level ${b.level}.`, kind: 'game', source: 'games', context: `${b.stars} star${b.stars === 1 ? '' : 's'}` })
  }
  const r = await reward(userId, xp)
  const best = (await db.query<{ best_level: number }>(`SELECT best_level FROM game_progress WHERE user_id=$1 AND game=$2`, [userId, b.game])).rows[0]?.best_level ?? 0
  res.json({ ...r, bestLevel: best })
}))

export const achievements = Router()
achievements.get('/achievements', wrap(async (req, res) => {
  const r = await db.query(
    `SELECT a.id, a.name, a.description, a.icon, a.xp, u.unlocked_at FROM achievements a
     LEFT JOIN user_achievements u ON u.achievement_id=a.id AND u.user_id=$1 ORDER BY (u.unlocked_at IS NULL), u.unlocked_at, a.xp`, [req.userId])
  res.json({ achievements: r.rows })
}))
