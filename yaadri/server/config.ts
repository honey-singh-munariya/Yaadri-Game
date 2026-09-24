import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const isProd = process.env.NODE_ENV === 'production'
const dataDir = path.resolve(process.env.DATA_DIR ?? 'data')
fs.mkdirSync(dataDir, { recursive: true })

function jwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 24) return process.env.JWT_SECRET
  if (isProd) throw new Error('JWT_SECRET (>= 24 chars) is required when NODE_ENV=production. Generate one with: openssl rand -hex 32')
  // Development only: persist a random secret so dev sessions survive restarts.
  const file = path.join(dataDir, '.dev-jwt-secret')
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
  const s = crypto.randomBytes(32).toString('hex')
  fs.writeFileSync(file, s, { mode: 0o600 })
  return s
}

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3001),
  dataDir,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: jwtSecret(),
  adminToken: process.env.ADMIN_TOKEN || '',
  openai: {
    key: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  eleven: {
    key: process.env.ELEVENLABS_API_KEY || '',
    // Default: ElevenLabs premade "Rachel". Override with any voice you have access to.
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    sttModel: process.env.ELEVENLABS_STT_MODEL || 'scribe_v1',
  },
}

export const status = () => ({
  ai: config.openai.key ? 'live' : 'demo',
  voice: config.eleven.key ? 'live' : 'demo',
  db: config.databaseUrl ? 'postgres' : 'embedded',
})
