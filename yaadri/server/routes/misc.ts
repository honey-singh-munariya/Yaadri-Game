import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'
import { COOKIE } from '../auth'
import { config, status } from '../config'
import { HttpError, parse, uid, wrap } from '../util'
import { LANGUAGES } from '../../shared/languages'
import { payload } from './me'

export const misc = Router()

misc.get('/health', wrap(async (_req, res) => {
  await db.query('SELECT 1')
  res.json({ ok: true, ...status() })
}))
/** Boot check for the client: 200 with `me: null` for guests, so signed-out visits do not log 401 errors. */
misc.get('/session', wrap(async (req, res) => {
  try {
    const id = (jwt.verify(req.cookies?.[COOKIE], config.jwtSecret) as { sub: string }).sub
    return res.json({ me: await payload(id) })
  } catch { return res.json({ me: null }) }
}))
misc.get('/status', (_req, res) => res.json(status()))
misc.get('/languages', (_req, res) => res.json({ languages: LANGUAGES }))

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(80),
  email: z.string().trim().email('Please enter a valid email.').max(120),
  subject: z.string().trim().min(3, 'Add a short subject.').max(120),
  message: z.string().trim().min(10, 'Please write at least a sentence.').max(2000),
})

misc.post('/contact', wrap(async (req, res) => {
  const b = parse(contactSchema, req.body)
  let userId: string | null = null
  try { userId = (jwt.verify(req.cookies?.[COOKIE], config.jwtSecret) as { sub: string }).sub } catch { /* guest */ }
  const id = uid()
  await db.query('INSERT INTO contact_messages (id,user_id,name,email,subject,message) VALUES ($1,$2,$3,$4,$5,$6)', [id, userId, b.name, b.email, b.subject, b.message])
  res.status(201).json({ ok: true, id })
}))

/** Minimal inbox for the site owner (set ADMIN_TOKEN). Email delivery is intentionally not built in. */
misc.get('/admin/contact', wrap(async (req, res) => {
  if (!config.adminToken || req.get('x-admin-token') !== config.adminToken) throw new HttpError(403, 'forbidden', 'Not allowed.')
  const r = await db.query('SELECT id,name,email,subject,message,created_at FROM contact_messages ORDER BY created_at DESC LIMIT 200')
  res.json({ messages: r.rows })
}))
