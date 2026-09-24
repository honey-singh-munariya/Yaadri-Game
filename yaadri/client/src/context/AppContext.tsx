import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { sound } from '../lib/sound'
import { flushOutbox } from '../lib/offline'
import { translate, type Key } from '../i18n'
import { DEFAULT_SETTINGS, type Me, type Reward, type Settings, type Unlocked } from '../types'

type Toast = { id: number; msg: string; kind: 'info' | 'error' | 'success' }
export type UnlockItem = { kind: 'achievement'; a: Unlocked } | { kind: 'level'; level: number } | { kind: 'xp'; n: number }

interface Ctx {
  status: 'loading' | 'ready' | 'guest' | 'error'
  me: Me | null
  settings: Settings
  lang: string
  t: (k: Key, p?: Record<string, string | number>) => string
  reduced: boolean
  online: boolean
  refresh: () => Promise<void>
  updateSettings: (p: Partial<Settings>) => Promise<void>
  setLanguage: (code: string) => Promise<void>
  updateProfile: (p: { displayName?: string; avatar?: string; guardianName?: string | null }) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (b: Record<string, unknown>) => Promise<void>
  demo: () => Promise<void>
  logout: () => Promise<void>
  toast: (msg: string, kind?: Toast['kind']) => void
  toasts: Toast[]
  dismissToast: (id: number) => void
  reward: (r: Reward | null | undefined) => void
  unlocked: (list: Unlocked[] | undefined) => void
  queue: UnlockItem[]
  shiftQueue: () => void
  errText: (e: unknown) => string
}

const C = createContext<Ctx>(null as never)
export const useApp = () => useContext(C)

const LS = 'yaadri_guest_v1'
const readGuest = (): { settings: Settings; lang: string } => {
  try { const j = JSON.parse(localStorage.getItem(LS) || '{}'); return { settings: { ...DEFAULT_SETTINGS, ...j.settings }, lang: j.lang || 'en' } } catch { return { settings: DEFAULT_SETTINGS, lang: 'en' } }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Ctx['status']>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const [guest, setGuest] = useState(readGuest)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [queue, setQueue] = useState<UnlockItem[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [osReduced, setOsReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const toastId = useRef(0)

  const settings = me?.settings ?? guest.settings
  const lang = me?.profile.language ?? guest.lang
  const reduced = osReduced || settings.motion === 'off'
  const t = useCallback((k: Key, p?: Record<string, string | number>) => translate(lang, k, p), [lang])

  const persistGuest = (next: { settings: Settings; lang: string }) => {
    setGuest(next)
    try { localStorage.setItem(LS, JSON.stringify(next)) } catch { /* private mode */ }
  }

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastId.current
    setToasts((x) => [...x.slice(-3), { id, msg, kind }])
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), kind === 'error' ? 7000 : 3800)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((x) => x.filter((y) => y.id !== id)), [])

  const errText = useCallback((e: unknown) => {
    if (e instanceof ApiError) {
      if (e.network) return translate(lang, 'err.network')
      if (e.code === 'not_signed_in') return translate(lang, 'err.not_signed_in')
      if (e.code === 'rate_limited') return translate(lang, 'err.rate_limited')
      return e.message
    }
    return translate(lang, 'common.error')
  }, [lang])

  const refresh = useCallback(async () => {
    try {
      const { me: m } = await api.get<{ me: Me | null }>('/session')
      if (m) { setMe(m); setStatus('ready') } else { setMe(null); setStatus('guest') }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.code === 'session_expired')) { setMe(null); setStatus('guest') }
      else setStatus((s) => (s === 'loading' ? 'error' : s))
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  // Keep guest preferences in sync with the account's, so a signed-out landing page looks the same.
  useEffect(() => { if (me) { try { localStorage.setItem(LS, JSON.stringify({ settings: me.settings, lang: me.profile.language })) } catch { /* ok */ } } }, [me])

  // Apply settings to the document + sound engine.
  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = settings.theme; el.dataset.text = settings.textSize; el.dataset.motion = reduced ? 'off' : settings.motion
    el.lang = lang === 'brx' || lang === 'mni' || lang === 'lus' || lang === 'kha' || lang === 'grt' || lang === 'nag' || lang === 'trp' ? 'en' : lang
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', settings.theme === 'morning' ? '#eef3ee' : settings.theme === 'contrast' ? '#000000' : '#0f1f29')
  }, [settings.theme, settings.textSize, settings.motion, reduced, lang])
  useEffect(() => { sound.setEnabled(settings.sound); sound.setAmbience(settings.ambience) }, [settings.sound, settings.ambience])
  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock, { once: false, passive: true })
    window.addEventListener('keydown', unlock, { passive: true })
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const on = () => setOsReduced(!!mq?.matches)
    mq?.addEventListener?.('change', on)
    const up = () => { setOnline(true); void flushOutbox().then((n) => { if (n) void refresh() }) }
    const down = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { mq?.removeEventListener?.('change', on); window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [refresh])
  useEffect(() => { if (status === 'ready') void flushOutbox() }, [status])
  useEffect(() => { if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => { /* optional */ }) }, [])

  const unlocked = useCallback((list: Unlocked[] | undefined) => {
    if (!list?.length) return
    setQueue((q) => [...q, ...list.map((a) => ({ kind: 'achievement' as const, a }))])
  }, [])
  const reward = useCallback((r: Reward | null | undefined) => {
    if (!r) return
    setQueue((q) => [
      ...q,
      ...(r.xpGained > 0 ? [{ kind: 'xp' as const, n: r.xpGained }] : []),
      ...(r.leveledUp ? [{ kind: 'level' as const, level: r.level }] : []),
      ...r.unlocked.map((a) => ({ kind: 'achievement' as const, a })),
    ])
    void refresh()
  }, [refresh])
  const shiftQueue = useCallback(() => setQueue((q) => q.slice(1)), [])

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!me) { persistGuest({ ...guest, settings: { ...guest.settings, ...patch } }); return }
    const prev = me
    setMe({ ...me, settings: { ...me.settings, ...patch } })
    try { await api.put('/settings', patch) } catch (e) { setMe(prev); toast(errText(e), 'error') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, guest, toast, errText])

  const setLanguage = useCallback(async (code: string) => {
    if (!me) { persistGuest({ ...guest, lang: code }); return }
    try {
      const r = await api.patch<Me & { unlocked: Unlocked[] }>('/profile', { language: code })
      setMe(r); unlocked(r.unlocked)
    } catch (e) { toast(errText(e), 'error') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, guest, toast, errText, unlocked])

  const updateProfile = useCallback(async (p: { displayName?: string; avatar?: string; guardianName?: string | null }) => {
    const r = await api.patch<Me & { unlocked: Unlocked[] }>('/profile', p)
    setMe(r); unlocked(r.unlocked)
  }, [unlocked])

  const login = useCallback(async (email: string, password: string) => { await api.post('/auth/login', { email, password }); await refresh() }, [refresh])
  const register = useCallback(async (b: Record<string, unknown>) => { await api.post('/auth/register', { ...b, language: lang }); await refresh() }, [refresh, lang])
  const demo = useCallback(async () => { await api.post('/auth/demo'); await refresh() }, [refresh])
  const logout = useCallback(async () => { try { await api.post('/auth/logout') } finally { sound.setEnabled(false); setMe(null); setStatus('guest'); setQueue([]) } }, [])

  const value = useMemo<Ctx>(() => ({
    status, me, settings, lang, t, reduced, online, refresh, updateSettings, setLanguage, updateProfile, login, register, demo, logout,
    toast, toasts, dismissToast, reward, unlocked, queue, shiftQueue, errText,
  }), [status, me, settings, lang, t, reduced, online, refresh, updateSettings, setLanguage, updateProfile, login, register, demo, logout, toast, toasts, dismissToast, reward, unlocked, queue, shiftQueue, errText])

  return (
    <C.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </C.Provider>
  )
}
