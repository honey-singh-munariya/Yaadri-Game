import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { HttpError, parse, uid, wrap } from '../util'
import { evaluateAchievements, reward } from '../services/progress'
import { buildLadder } from '../../shared/rescue'
import { askCopilot, weeklySummary } from '../services/caregiver'
import type { CapsuleRow } from '../services/context'

export const family = Router()

const photo = z
  .string()
  .max(420_000, 'That photo is too large.')
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Please use a JPG, PNG or WebP photo.')
  .nullable()
  .optional()

const capsuleSchema = z.object({
  kind: z.enum(['person', 'place', 'event']).default('person'),
  title: z.string().trim().min(1, 'Add a name or title.').max(60),
  relation: z.string().trim().max(80).optional().or(z.literal('')),
  clue: z.string().trim().max(200).optional().or(z.literal('')),
  story: z.string().trim().max(600).optional().or(z.literal('')),
  contributor: z.string().trim().max(60).optional().or(z.literal('')),
  photo,
})

family.get('/capsules', wrap(async (req, res) => {
  const r = await db.query<CapsuleRow>('SELECT * FROM capsules WHERE user_id=$1 ORDER BY created_at DESC', [req.userId])
  res.json({ capsules: r.rows })
}))

family.post('/capsules', wrap(async (req, res) => {
  const b = parse(capsuleSchema, req.body)
  const r = await db.query<CapsuleRow>(
    `INSERT INTO capsules (id,user_id,kind,title,relation,clue,story,photo,contributor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [uid(), req.userId, b.kind, b.title, b.relation || null, b.clue || null, b.story || null, b.photo ?? null, b.contributor || null],
  )
  res.status(201).json({ capsule: r.rows[0], unlocked: await evaluateAchievements(req.userId!) })
}))

family.patch('/capsules/:id', wrap(async (req, res) => {
  const b = parse(capsuleSchema, req.body)
  const r = await db.query<CapsuleRow>(
    `UPDATE capsules SET kind=$3,title=$4,relation=$5,clue=$6,story=$7,photo=$8,contributor=$9,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
    [req.params.id, req.userId, b.kind, b.title, b.relation || null, b.clue || null, b.story || null, b.photo ?? null, b.contributor || null],
  )
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'That capsule was not found.')
  res.json({ capsule: r.rows[0] })
}))

family.delete('/capsules/:id', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM capsules WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId])
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'That capsule was not found.')
  res.json({ ok: true })
}))

/** Memory Rescue: one rung of the hint ladder, built only from what the family wrote. */
family.get('/capsules/:id/rescue', wrap(async (req, res) => {
  const level = Math.max(1, Math.min(9, Number(req.query.level) || 1))
  const c = (await db.query<CapsuleRow>('SELECT * FROM capsules WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])).rows[0]
  if (!c) throw new HttpError(404, 'not_found', 'That capsule was not found.')
  const ladder = buildLadder(c)
  res.json({ total: ladder.length, rung: ladder[Math.min(level, ladder.length) - 1] })
}))

/** Memory Connection Map: log whether a recall was independent (0), needed one cue (1) or several (2). */
family.post('/capsules/:id/cue', wrap(async (req, res) => {
  const b = parse(z.object({ cue: z.number().int().min(0).max(2), correct: z.boolean() }), req.body)
  const c = (await db.query<CapsuleRow>('SELECT * FROM capsules WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])).rows[0]
  if (!c) throw new HttpError(404, 'not_found', 'That capsule was not found.')
  await db.query(`INSERT INTO cue_events (id,user_id,source,item_key,item_label,cue_level,correct) VALUES ($1,$2,'family',$3,$4,$5,$6)`, [uid(), req.userId, c.id, c.title, b.cue, b.correct])
  const xp = b.correct ? (b.cue === 0 ? 8 : b.cue === 1 ? 5 : 3) : 1
  res.json(await reward(req.userId!, xp))
}))

family.get('/caregiver/summary', wrap(async (req, res) => res.json(await weeklySummary(req.userId!))))
family.get('/caregiver/ask', wrap(async (req, res) => {
  const q = z.string().trim().min(1).max(200).parse(req.query.q ?? '')
  res.json(await askCopilot(req.userId!, q))
}))
