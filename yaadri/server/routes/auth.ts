import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db'
import { clearSession, issueSession } from '../auth'
import { HttpError, parse, uid, wrap } from '../util'
import { DEFAULT_SETTINGS } from '../services/settings'
import { freshState, saveJourney } from '../services/journey'
import { seedDemo } from '../services/demoSeed'
import { LANGUAGE_CODES } from '../../shared/languages'

export const auth = Router()

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter a name.').max(40),
  email: z.string().trim().toLowerCase().email('Please enter a valid email.').max(120),
  password: z.string().min(8, 'Use at least 8 characters.').max(100),
  guardianName: z.string().trim().max(60).optional(),
  consentData: z.literal(true, { errorMap: () => ({ message: 'Please agree so YAADRI can keep the memories you approve.' }) }),
  consentGuardian: z.boolean().optional(),
  language: z.string().refine((c) => LANGUAGE_CODES.includes(c)).optional(),
})
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(100) })

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

export async function createUser(email: string, password: string, name: string, opts: { demo?: boolean; guardian?: string; language?: string } = {}) {
  const id = uid()
  const hash = await bcrypt.hash(password, 10)
  await db.query('INSERT INTO users (id,email,password_hash,is_demo) VALUES ($1,$2,$3,$4)', [id, email, hash, !!opts.demo])
  await db.query('INSERT INTO profiles (user_id,display_name,guardian_name,language) VALUES ($1,$2,$3,$4)', [id, name, opts.guardian || null, opts.language ?? 'en'])
  await db.query('INSERT INTO settings (user_id,data) VALUES ($1,$2::jsonb)', [id, JSON.stringify(DEFAULT_SETTINGS)])
  await saveJourney(id, freshState())
  return id
}

auth.post('/auth/register', wrap(async (req, res) => {
  const b = parse(registerSchema, req.body)
  if (b.guardianName && !b.consentGuardian) {
    throw new HttpError(400, 'guardian_consent_required', 'Please confirm the guardian or family member agrees.')
  }
  const exists = await db.query('SELECT 1 FROM users WHERE email=$1', [b.email])
  if (exists.rows.length) throw new HttpError(409, 'email_taken', 'An account with this email already exists. Try signing in.')
  const id = await createUser(b.email, b.password, b.name, { guardian: b.guardianName, language: b.language })
  await db.query(`INSERT INTO consents (id,user_id,kind,granted,text_version) VALUES ($1,$2,'data_use',TRUE,'v1')`, [uid(), id])
  if (b.guardianName && b.consentGuardian) {
    await db.query(`INSERT INTO consents (id,user_id,kind,granted,text_version) VALUES ($1,$2,'guardian',TRUE,'v1')`, [uid(), id])
  }
  issueSession(res, id)
  res.status(201).json({ ok: true })
}))

auth.post('/auth/login', wrap(async (req, res) => {
  const b = parse(loginSchema, req.body)
  const r = await db.query<{ id: string; password_hash: string; is_demo: boolean }>('SELECT id,password_hash,is_demo FROM users WHERE email=$1', [b.email])
  const u = r.rows[0]
  const ok = await bcrypt.compare(b.password, u?.password_hash ?? DUMMY_HASH)
  if (!u || !ok) throw new HttpError(401, 'bad_credentials', 'That email and password do not match.')
  issueSession(res, u.id, u.is_demo)
  res.json({ ok: true })
}))

auth.post('/auth/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

/** One-tap demo profile: disposable account seeded with sample data (deleted after 24h). */
auth.post('/auth/demo', wrap(async (_req, res) => {
  const id = await createUser(`demo-${uid().slice(0, 8)}@demo.yaadri.local`, uid(), 'Demo Player', { demo: true })
  await seedDemo(id)
  issueSession(res, id, true)
  res.status(201).json({ ok: true })
}))
