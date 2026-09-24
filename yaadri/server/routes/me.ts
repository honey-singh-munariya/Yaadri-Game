import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { clearSession } from '../auth'
import { HttpError, parse, uid, wrap } from '../util'
import { getSettings, saveSettings, settingsSchema } from '../services/settings'
import { evaluateAchievements } from '../services/progress'
import { addSystemMemory } from '../services/memory'
import { levelInfo, VISIT_KEYS } from '../../shared/progress'
import { getLanguage, LANGUAGE_CODES } from '../../shared/languages'

export const me = Router()

export async function payload(userId: string) {
  const u = (await db.query<{ id: string; email: string; is_demo: boolean }>('SELECT id,email,is_demo FROM users WHERE id=$1', [userId])).rows[0]
  if (!u) throw new HttpError(401, 'not_signed_in', 'Please sign in to continue.')
  const p = (await db.query<any>('SELECT display_name, avatar, language, xp, guardian_name, languages_tried, created_at FROM profiles WHERE user_id=$1', [userId])).rows[0]
  const count = async (sql: string) => (await db.query<{ c: number }>(sql, [userId])).rows[0]?.c ?? 0
  return {
    user: { id: u.id, email: u.email, isDemo: u.is_demo },
    profile: {
      displayName: p.display_name, avatar: p.avatar, language: p.language, guardianName: p.guardian_name,
      languagesTried: p.languages_tried, createdAt: p.created_at, ...levelInfo(p.xp),
    },
    settings: await getSettings(userId),
    counts: {
      memories: await count('SELECT count(*)::int AS c FROM memories WHERE user_id=$1'),
      achievements: await count('SELECT count(*)::int AS c FROM user_achievements WHERE user_id=$1'),
      gamesPlayed: await count('SELECT count(*)::int AS c FROM game_scores WHERE user_id=$1'),
      capsules: await count('SELECT count(*)::int AS c FROM capsules WHERE user_id=$1'),
    },
  }
}

me.get('/me', wrap(async (req, res) => res.json(await payload(req.userId!))))

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  avatar: z.enum(['lantern', 'bamboo', 'hornbill', 'orchid', 'river']).optional(),
  language: z.string().refine((c) => LANGUAGE_CODES.includes(c)).optional(),
  guardianName: z.string().trim().max(60).nullable().optional(),
})

me.patch('/profile', wrap(async (req, res) => {
  const b = parse(profileSchema, req.body)
  const id = req.userId!
  const cur = (await db.query<{ language: string; languages_tried: string[] }>('SELECT language, languages_tried FROM profiles WHERE user_id=$1', [id])).rows[0]
  const tried = new Set(cur.languages_tried)
  if (b.language) tried.add(b.language)
  await db.query(
    `UPDATE profiles SET display_name=COALESCE($2,display_name), avatar=COALESCE($3,avatar), language=COALESCE($4,language),
       guardian_name = CASE WHEN $6 THEN $5 ELSE guardian_name END, languages_tried=$7::jsonb, updated_at=now() WHERE user_id=$1`,
    [id, b.displayName ?? null, b.avatar ?? null, b.language ?? null, b.guardianName ?? null, b.guardianName !== undefined, JSON.stringify([...tried])],
  )
  if (b.language && b.language !== cur.language) {
    await addSystemMemory(id, { content: `Chose ${getLanguage(b.language).name} as the app language.`, kind: 'language', source: 'settings' })
  }
  const unlocked = await evaluateAchievements(id)
  res.json({ ...(await payload(id)), unlocked })
}))

me.put('/settings', wrap(async (req, res) => {
  const patch = parse(settingsSchema, req.body)
  await saveSettings(req.userId!, patch)
  res.json({ settings: await getSettings(req.userId!) })
}))

me.post('/visit', wrap(async (req, res) => {
  const { page } = parse(z.object({ page: z.enum(VISIT_KEYS) }), req.body)
  const id = req.userId!
  await db.query(
    `UPDATE profiles SET visited = (SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb) FROM jsonb_array_elements_text(visited || to_jsonb($2::text)) AS v) WHERE user_id=$1`,
    [id, page],
  )
  res.json({ unlocked: await evaluateAchievements(id) })
}))

me.get('/consents', wrap(async (req, res) => {
  const r = await db.query('SELECT kind, granted, text_version, created_at FROM consents WHERE user_id=$1 ORDER BY created_at DESC', [req.userId])
  res.json({ consents: r.rows })
}))
me.post('/consents', wrap(async (req, res) => {
  const b = parse(z.object({ kind: z.enum(['data_use', 'guardian']), granted: z.boolean() }), req.body)
  await db.query(`INSERT INTO consents (id,user_id,kind,granted,text_version) VALUES ($1,$2,$3,$4,'v1')`, [uid(), req.userId, b.kind, b.granted])
  if (b.kind === 'data_use' && !b.granted) await saveSettings(req.userId!, { memoryEnabled: false, autoRemember: false })
  const r = await db.query('SELECT kind, granted, text_version, created_at FROM consents WHERE user_id=$1 ORDER BY created_at DESC', [req.userId])
  res.json({ consents: r.rows, settings: await getSettings(req.userId!) })
}))

/** Data portability: everything YAADRI holds about this account, as JSON. */
me.get('/export', wrap(async (req, res) => {
  const id = req.userId!
  const all = async (t: string) => (await db.query(`SELECT * FROM ${t} WHERE user_id=$1`, [id])).rows
  const out = {
    exportedAt: new Date().toISOString(),
    profile: (await db.query('SELECT display_name, avatar, language, xp, guardian_name, languages_tried, created_at FROM profiles WHERE user_id=$1', [id])).rows[0],
    settings: await getSettings(id),
    memories: await all('memories'), capsules: await all('capsules'), conversations: await all('conversations'), messages: await all('messages'),
    gameScores: await all('game_scores'), gameProgress: await all('game_progress'), cueEvents: await all('cue_events'),
    storyChoices: await all('story_choices'), journey: (await db.query('SELECT state FROM journey_progress WHERE user_id=$1', [id])).rows[0]?.state,
    achievements: await all('user_achievements'), consents: await all('consents'),
  }
  res.setHeader('Content-Disposition', 'attachment; filename="yaadri-export.json"')
  res.json(out)
}))

me.delete('/account', wrap(async (req, res) => {
  const b = parse(z.object({ confirm: z.literal('DELETE') }), req.body)
  void b
  await db.query('DELETE FROM contact_messages WHERE user_id=$1', [req.userId])
  await db.query('DELETE FROM users WHERE id=$1', [req.userId]) // everything else cascades
  clearSession(res)
  res.json({ ok: true })
}))
