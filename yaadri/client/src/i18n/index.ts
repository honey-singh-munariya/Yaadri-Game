import en, { type Dict, type Key } from './en'
import hi from './hi'
import bn from './bn'
import asm from './as'

export type { Key }
export const DICTS: Record<string, Dict> = { en, hi, bn, as: asm }
const EN_KEYS = Object.keys(en)

/** Percentage of English keys that have a translation in this language. English = 100. */
export function coverage(code: string): number {
  if (code === 'en') return 100
  const d = DICTS[code]
  if (!d) return 0
  return Math.round((Object.keys(d).filter((k) => k in en).length / EN_KEYS.length) * 100)
}

export function translate(lang: string, key: Key, params?: Record<string, string | number>): string {
  const raw = DICTS[lang]?.[key] ?? (en as Record<string, string>)[key] ?? key
  return params ? raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : raw
}
