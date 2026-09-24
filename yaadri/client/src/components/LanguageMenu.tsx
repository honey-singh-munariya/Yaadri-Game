import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../lib/langs'
import { coverage } from '../i18n'
import { sound } from '../lib/sound'

export default function LanguageMenu() {
  const { lang, setLanguage, t, toast } = useApp()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className="relative" ref={box}>
      <button className="btn btn-ghost btn-sm !px-3 gap-1.5" aria-haspopup="listbox" aria-expanded={open} aria-label={t('common.language')} onClick={() => { sound.sfx('click'); setOpen((o) => !o) }}>
        <Icon name="globe" size={20} /><span className="uppercase text-sm font-display">{lang}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" aria-label={t('common.language')} className="absolute right-0 mt-2 z-50 w-64 max-h-[70dvh] overflow-y-auto panel !bg-surface p-1.5 shadow-2xl" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            {LANGUAGES.map((l) => {
              const cov = coverage(l.code)
              return (
                <li key={l.code} role="option" aria-selected={l.code === lang}>
                  <button className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 hover:bg-ink/10 ${l.code === lang ? 'bg-glow/20' : ''}`}
                    onClick={() => { void setLanguage(l.code); setOpen(false); if (cov === 0) toast(`${l.name}: ${t('lang.none')}`) }}>
                    <span><span className="block font-display">{l.native}</span><span className="text-xs text-dim">{l.name}</span></span>
                    <span className="text-xs text-dim">{cov ? `${cov}%` : '—'}</span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
