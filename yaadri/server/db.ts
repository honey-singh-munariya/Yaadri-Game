import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { config } from './config'
import { SCHEMA } from './schema'
import { ACHIEVEMENTS } from '../shared/progress'
import { LANGUAGES } from '../shared/languages'

export interface DB {
  kind: 'postgres' | 'embedded'
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
  close(): Promise<void>
}

async function open(): Promise<DB & { exec(sql: string): Promise<void> }> {
  if (config.databaseUrl) {
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined })
    return {
      kind: 'postgres',
      query: (t, p) => pool.query(t, p as any[]) as any,
      exec: async (s) => { await pool.query(s) },
      close: () => pool.end(),
    }
  }
  // Embedded PostgreSQL (WASM) — real Postgres SQL with zero setup, persisted to ./data/pglite.
  const db = new PGlite(path.join(config.dataDir, 'pglite'))
  await db.waitReady
  return {
    kind: 'embedded',
    query: (t, p) => db.query(t, p as any[]) as any,
    exec: async (s) => { await db.exec(s) },
    close: () => db.close(),
  }
}

export let db!: DB

export async function initDb() {
  const d = await open()
  await d.exec(SCHEMA)
  db = d
  for (const a of ACHIEVEMENTS) {
    await db.query(
      `INSERT INTO achievements (id,name,description,icon,xp) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, icon=$4, xp=$5`,
      [a.id, a.name, a.description, a.icon, a.xp],
    )
  }
  for (const l of LANGUAGES) {
    await db.query(
      `INSERT INTO languages (code,name,native_name,ai_level,voice_supported,voice_model,region) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (code) DO UPDATE SET name=$2, native_name=$3, ai_level=$4, voice_supported=$5, voice_model=$6, region=$7`,
      [l.code, l.name, l.native, l.ai, l.voice.supported, l.voice.model ?? null, l.region],
    )
  }
  // Housekeeping: demo accounts are disposable.
  await db.query(`DELETE FROM users WHERE is_demo = TRUE AND created_at < now() - interval '24 hours'`)
  return db
}
