import { useEffect } from 'react'
import { api } from './api'
import { useApp } from '../context/AppContext'
import type { Unlocked } from '../types'
import type { VISIT_KEYS } from '../../../shared/progress'

const done = new Set<string>()
/** Tells the server which section was opened (powers the Explorer achievement). Once per section per session. */
export function useVisit(page: (typeof VISIT_KEYS)[number]) {
  const { status, unlocked } = useApp()
  useEffect(() => {
    if (status !== 'ready' || done.has(page)) return
    done.add(page)
    api.post<{ unlocked: Unlocked[] }>('/visit', { page }).then((r) => unlocked(r.unlocked)).catch(() => done.delete(page))
  }, [status, page, unlocked])
}
