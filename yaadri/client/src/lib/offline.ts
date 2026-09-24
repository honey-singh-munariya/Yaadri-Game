import { api, ApiError } from './api'

/** Game results survive going offline: they wait in localStorage and are sent when the connection returns. */
const KEY = 'yaadri_outbox_v1'
type Item = { path: string; body: unknown; at: number }
const read = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const write = (q: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-50))) } catch { /* storage full */ } }

export async function postOrQueue<T>(path: string, body: unknown): Promise<T | null> {
  try {
    return await api.post<T>(path, body)
  } catch (e) {
    if (e instanceof ApiError && e.network) { write([...read(), { path, body, at: Date.now() }]); return null }
    throw e
  }
}

export async function flushOutbox(): Promise<number> {
  const q = read()
  if (!q.length) return 0
  const left: Item[] = []
  let sent = 0
  for (const item of q) {
    try { await api.post(item.path, item.body); sent++ }
    catch (e) { if (e instanceof ApiError && (e.network || e.status === 401)) left.push(item) /* keep for later */ }
  }
  write(left)
  return sent
}
export const pendingCount = () => read().length
