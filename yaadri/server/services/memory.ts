import { db } from '../db'
import { uid } from '../util'
import { getSettings } from './settings'

export interface MemoryRow { id: string; content: string; kind: string; source: string; context: string | null; created_at: string; updated_at: string }

/**
 * Anything that looks like identifiers, contact details, secrets, health or other sensitive personal
 * information is NEVER turned into a memory automatically. (Chat history is stored separately, is visible
 * to the user, and can be deleted.)
 */
const SENSITIVE: RegExp[] = [
  /\d[\d\s-]{8,}\d/, // long digit runs: phone, card, Aadhaar…
  /[\w.+-]+@[\w-]+\.[\w.-]+/, // email
  /\b(password|passcode|pin|otp|cvv|aadhaar|aadhar|pan card|passport|ssn|bank account|ifsc|upi)\b/i,
  /\b(diagnos|prescri|medicin|medicat|tablet|dosage|cancer|diabet|hiv|depress|suicid|self[- ]?harm|dementia|alzheimer|surgery|blood pressure|therapy|illness|disease)\w*/i,
  /\b(my address|i live at|house number|pin ?code|home address)\b/i,
  /\b(religion|caste|political party|voted for|salary|income)\b/i,
]
export const isSensitive = (t: string) => SENSITIVE.some((r) => r.test(t))

export interface Proposal { content: string; kind: 'preference' | 'note' }

const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '').trim()

export function extractProposals(text: string): Proposal[] {
  if (isSensitive(text)) return []
  const out: Proposal[] = []
  const like = text.match(/\bI\s+(?:really\s+|absolutely\s+|always\s+)?(love|like|enjoy|adore|prefer)\s+(?:to\s+)?([^.!?,;\n]{2,60})/i)
  if (like) out.push({ content: `Enjoys ${clean(like[2])}`, kind: 'preference' })
  const fav = text.match(/\bmy\s+favou?rite\s+([a-z][a-z\s]{1,24}?)\s+(?:is|are)\s+([^.!?,;\n]{2,40})/i)
  if (fav) out.push({ content: `Favourite ${clean(fav[1])}: ${clean(fav[2])}`, kind: 'preference' })
  const call = text.match(/\b(?:call me|my name is|i'm called)\s+([A-Za-z][A-Za-z'’-]{1,24})/i)
  if (call) out.push({ content: `Likes to be called ${clean(call[1])}`, kind: 'preference' })
  return out.slice(0, 2)
}

export async function listMemories(userId: string): Promise<MemoryRow[]> {
  const r = await db.query<MemoryRow>('SELECT * FROM memories WHERE user_id=$1 ORDER BY created_at DESC', [userId])
  return r.rows
}

export async function insertMemory(userId: string, m: { content: string; kind: string; source: string; context?: string | null }): Promise<MemoryRow | null> {
  const dup = await db.query('SELECT id FROM memories WHERE user_id=$1 AND lower(content)=lower($2)', [userId, m.content])
  if (dup.rows.length) return null
  const r = await db.query<MemoryRow>(
    'INSERT INTO memories (id,user_id,content,kind,source,context) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [uid(), userId, m.content, m.kind, m.source, m.context ?? null],
  )
  return r.rows[0]
}

/** Gameplay/story milestones. Visible in My Memory with their source, editable and deletable. Off when memory is off. */
export async function addSystemMemory(userId: string, m: { content: string; kind: string; source: string; context?: string }) {
  const s = await getSettings(userId)
  if (!s.memoryEnabled) return null
  return insertMemory(userId, m)
}

const STOP = new Set(['the', 'and', 'you', 'that', 'this', 'with', 'what', 'have', 'about', 'your', 'from', 'are', 'was', 'for', 'how', 'can', 'yaadri', 'please', 'tell', 'remember'])
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9\u0900-\u097f\u0980-\u09ff]+/).filter((w) => w.length > 2 && !STOP.has(w))

export async function relevantMemories(userId: string, query: string, limit = 6): Promise<MemoryRow[]> {
  const s = await getSettings(userId)
  if (!s.memoryEnabled) return []
  const all = (await listMemories(userId)).slice(0, 200)
  const q = new Set(tokens(query))
  const scored = all.map((m, i) => {
    const t = tokens(m.content)
    const overlap = t.filter((w) => q.has(w) || [...q].some((x) => x.length > 4 && w.startsWith(x.slice(0, 5)))).length
    const isPref = m.kind === 'preference' ? 0.5 : 0
    return { m, score: overlap * 3 + isPref + Math.max(0, 1 - i / 40) }
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.m)
}

/** A few recent taste/preference memories, so greetings and suggestions can be personal even when the message itself is generic. */
export async function preferenceMemories(userId: string, limit = 3): Promise<MemoryRow[]> {
  const s = await getSettings(userId)
  if (!s.memoryEnabled) return []
  const r = await db.query<MemoryRow>(
    `SELECT * FROM memories WHERE user_id=$1 AND (kind='preference' OR content ~* '^(enjoys|loves|likes|adores|prefers) ') ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  )
  return r.rows
}
