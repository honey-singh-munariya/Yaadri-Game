import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { HttpError, parse, uid, wrap } from '../util'
import { getSettings } from '../services/settings'
import { buildContext } from '../services/context'
import { generateReply } from '../services/ai'
import { insertMemory } from '../services/memory'
import { evaluateAchievements } from '../services/progress'

export const chat = Router()

const bodySchema = z.object({
  message: z.string().trim().min(1, 'Type or say something first.').max(1000),
  conversationId: z.string().max(60).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1500) })).max(12).optional(),
})

chat.post('/chat', wrap(async (req, res) => {
  const b = parse(bodySchema, req.body)
  const userId = req.userId!
  const settings = await getSettings(userId)

  let conversationId: string | null = null
  let history = b.history ?? []
  if (settings.saveHistory) {
    if (b.conversationId) {
      const c = await db.query('SELECT id FROM conversations WHERE id=$1 AND user_id=$2', [b.conversationId, userId])
      if (!c.rows[0]) throw new HttpError(404, 'not_found', 'That conversation was not found.')
      conversationId = b.conversationId
    } else {
      conversationId = uid()
      await db.query('INSERT INTO conversations (id,user_id,title) VALUES ($1,$2,$3)', [conversationId, userId, b.message.slice(0, 40)])
    }
    const h = await db.query<{ role: 'user' | 'assistant'; content: string }>(
      'SELECT role, content FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 10', [conversationId])
    history = h.rows.reverse()
  }

  const ctx = await buildContext(userId, b.message)
  const result = await generateReply(ctx, history, b.message)

  if (conversationId) {
    await db.query(`INSERT INTO messages (id,conversation_id,user_id,role,content) VALUES ($1,$2,$3,'user',$4)`, [uid(), conversationId, userId, b.message])
    await db.query(`INSERT INTO messages (id,conversation_id,user_id,role,content,mood) VALUES ($1,$2,$3,'assistant',$4,$5)`, [uid(), conversationId, userId, result.reply, result.mood])
    await db.query('UPDATE conversations SET updated_at=now() WHERE id=$1', [conversationId])
  }

  // Memory: propose by default; save straight away only if the user turned on "Remember automatically".
  let remembered: unknown[] = []
  let proposals = settings.memoryEnabled ? result.proposals : []
  if (settings.memoryEnabled && settings.autoRemember && proposals.length) {
    for (const p of proposals) {
      const m = await insertMemory(userId, { content: p.content, kind: p.kind, source: 'chat', context: 'From a conversation' })
      if (m) remembered.push(m)
    }
    proposals = []
  }
  const unlocked = await evaluateAchievements(userId)
  res.json({ reply: result.reply, mood: result.mood, source: result.source, degraded: result.degraded, conversationId, proposals, remembered, unlocked })
}))

chat.get('/chat/conversations', wrap(async (req, res) => {
  const r = await db.query(`SELECT id, title, updated_at FROM conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50`, [req.userId])
  res.json({ conversations: r.rows })
}))

chat.get('/chat/conversations/:id', wrap(async (req, res) => {
  const c = await db.query('SELECT id,title FROM conversations WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])
  if (!c.rows[0]) throw new HttpError(404, 'not_found', 'That conversation was not found.')
  const m = await db.query('SELECT id, role, content, mood, created_at FROM messages WHERE conversation_id=$1 ORDER BY created_at', [req.params.id])
  res.json({ conversation: c.rows[0], messages: m.rows })
}))

chat.delete('/chat/conversations/:id', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM conversations WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId])
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'That conversation was not found.')
  res.json({ ok: true })
}))
chat.delete('/chat/conversations', wrap(async (req, res) => {
  await db.query('DELETE FROM conversations WHERE user_id=$1', [req.userId])
  res.json({ ok: true })
}))
