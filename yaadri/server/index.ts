import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import fs from 'node:fs'
import { config, status } from './config'
import { initDb } from './db'
import { csrfGuard, requireAuth } from './auth'
import { errorHandler } from './util'
import { auth } from './routes/auth'
import { me } from './routes/me'
import { memories } from './routes/memories'
import { chat } from './routes/chat'
import { games, achievements } from './routes/games'
import { journey } from './routes/journey'
import { family } from './routes/family'
import { voice } from './routes/voice'
import { misc } from './routes/misc'

const app = express()
app.disable('x-powered-by')
if (config.isProd) app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'media-src': ["'self'", 'blob:', 'data:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'worker-src': ["'self'"],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)
app.use(cookieParser())

const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'rate_limited', message } })

app.use('/api', limiter(15 * 60_000, 600, 'Too many requests. Please slow down for a moment.'))
app.use('/api/auth', limiter(15 * 60_000, 120, 'Too many sign-in attempts. Please wait a few minutes.'))
app.use('/api/auth/demo', limiter(60 * 60_000, 120, 'Too many demo profiles requested. Please try again later.'))
app.use('/api/chat', limiter(10 * 60_000, 80, 'YAADRI needs a short rest. Please try again in a few minutes.'))
app.use('/api/voice', limiter(10 * 60_000, 80, 'Voice needs a short rest. Please try again in a few minutes.'))
app.use('/api/contact', limiter(60 * 60_000, 8, 'You have sent several messages already. Please try again later.'))

// CSRF guard first; the JSON parser ignores non-JSON bodies, so the raw-audio route parses its own body.
app.use('/api', csrfGuard)
app.use(express.json({ limit: '700kb' }))

app.use('/api', auth)
app.use('/api', misc)
app.use('/api', requireAuth, me, memories, chat, games, achievements, journey, family, voice)
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'That API route does not exist.' }))

const clientDir = path.resolve('dist/client')
if (fs.existsSync(clientDir)) {
  app.use('/assets', express.static(path.join(clientDir, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(clientDir, { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache') } }))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')))
}
app.use(errorHandler)

const db = await initDb()
const server = app.listen(config.port, () => {
  const s = status()
  console.log(`\n  YAADRI is awake on http://localhost:${config.port}`)
  console.log(`  database: ${s.db === 'postgres' ? 'PostgreSQL (DATABASE_URL)' : 'embedded PostgreSQL (data/pglite)'}`)
  console.log(`  AI:       ${s.ai === 'live' ? `live (${config.openai.model}, OpenAI Responses API)` : 'DEMO (set OPENAI_API_KEY for the live model)'}`)
  console.log(`  voice:    ${s.voice === 'live' ? 'live (ElevenLabs)' : 'DEMO (set ELEVENLABS_API_KEY for studio voice; browser voice is used meanwhile)'}\n`)
})
const stop = async () => { server.close(); await db.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
