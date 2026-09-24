import { z } from 'zod'
import { db } from '../db'

export const DEFAULT_SETTINGS = {
  sound: false,
  ambience: true,
  voiceEnabled: true,
  autoSpeak: false,
  motion: 'full' as 'full' | 'gentle' | 'off',
  textSize: 'normal' as 'normal' | 'large' | 'xl',
  theme: 'dusk' as 'dusk' | 'morning' | 'contrast',
  memoryEnabled: true,
  autoRemember: false,
  saveHistory: true,
}
export type Settings = typeof DEFAULT_SETTINGS

export const settingsSchema = z
  .object({
    sound: z.boolean(),
    ambience: z.boolean(),
    voiceEnabled: z.boolean(),
    autoSpeak: z.boolean(),
    motion: z.enum(['full', 'gentle', 'off']),
    textSize: z.enum(['normal', 'large', 'xl']),
    theme: z.enum(['dusk', 'morning', 'contrast']),
    memoryEnabled: z.boolean(),
    autoRemember: z.boolean(),
    saveHistory: z.boolean(),
  })
  .partial()
  .strict()

export async function getSettings(userId: string): Promise<Settings> {
  const r = await db.query<{ data: Partial<Settings> }>('SELECT data FROM settings WHERE user_id=$1', [userId])
  return { ...DEFAULT_SETTINGS, ...(r.rows[0]?.data ?? {}) }
}
export async function saveSettings(userId: string, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings(userId)), ...patch }
  await db.query(
    `INSERT INTO settings (user_id,data) VALUES ($1,$2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET data=$2::jsonb, updated_at=now()`,
    [userId, JSON.stringify(next)],
  )
  return next
}
