import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { HttpError, parse, wrap } from '../util'
import { evaluateAchievements } from '../services/progress'
import { insertMemory, isSensitive, listMemories } from '../services/memory'
import { getSettings } from '../services/settings'

export const memories = Router()

const createSchema = z.object({
  content: z.string().trim().min(2, 'Write a few words to remember.').max(300),
  kind: z.enum(['preference', 'note', 'chat']).default('note'),
  source: z.enum(['you', 'chat']).default('you'),
  context: z.string().trim().max(200).optional(),
})

memories.get('/memories', wrap(async (req, res) => res.json({ memories: await listMemories(req.userId!) })))

memories.post('/memories', wrap(async (req, res) => {
  const b = parse(createSchema, req.body)
  const s = await getSettings(req.userId!)
  if (!s.memoryEnabled) throw new HttpError(403, 'memory_off', 'Memory is switched off in Settings.')
  if (isSensitive(b.content)) throw new HttpError(422, 'sensitive', 'That looks like personal or sensitive information. YAADRI does not keep those. Try something like a favourite or a hobby.')
  const m = await insertMemory(req.userId!, { content: b.content, kind: b.kind, source: b.source === 'chat' ? 'chat' : 'you', context: b.context ?? (b.source === 'chat' ? 'From a conversation' : 'Added by you') })
  if (!m) throw new HttpError(409, 'duplicate', 'YAADRI already remembers that.')
  res.status(201).json({ memory: m, unlocked: await evaluateAchievements(req.userId!) })
}))

memories.patch('/memories/:id', wrap(async (req, res) => {
  const b = parse(z.object({ content: z.string().trim().min(2).max(300) }), req.body)
  if (isSensitive(b.content)) throw new HttpError(422, 'sensitive', 'That looks like personal or sensitive information. YAADRI does not keep those.')
  const r = await db.query('UPDATE memories SET content=$3, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.userId, b.content])
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'That memory was not found.')
  res.json({ memory: r.rows[0] })
}))

memories.delete('/memories/:id', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM memories WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId])
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'That memory was not found.')
  res.json({ ok: true })
}))

memories.delete('/memories', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM memories WHERE user_id=$1 RETURNING id', [req.userId])
  res.json({ ok: true, deleted: r.rows.length })
}))
