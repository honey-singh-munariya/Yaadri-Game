import { useCallback, useEffect, useRef, useState } from 'react'

export interface Async<T> { data: T | null; error: Error | null; loading: boolean; reload: () => void; setData: (d: T | null | ((p: T | null) => T | null)) => void }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fn().then((d) => { if (!cancelled) { setData(d); setLoading(false) } }).catch((e) => { if (!cancelled) { setError(e); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}

export function useTimeout() {
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    ids.current.push(id)
    return id
  }, [])
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
export const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
export const fmtDate = (iso: string, lang = 'en') => new Date(iso).toLocaleString(lang === 'en' ? 'en-IN' : lang, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
