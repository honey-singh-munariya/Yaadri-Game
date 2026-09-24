import { useEffect, useId, useRef, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'
import Yaadri from '../character/Yaadri'
import { useApp } from '../context/AppContext'
import type { Async } from '../lib/hooks'
import type { Profile } from '../types'

export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <span role="status" aria-label="Loading" className="inline-flex gap-1.5" style={{ height: size }}>
      {[0, 1, 2].map((i) => <span key={i} className="w-2.5 h-2.5 rounded-full bg-glow animate-dot self-center" style={{ animationDelay: `${i * 0.15}s` }} />)}
    </span>
  )
}

export function Loading({ label }: { label?: string }) {
  const { t } = useApp()
  return <div className="py-16 grid place-items-center gap-3 text-dim"><Yaadri mood="thinking" size={90} /><div className="flex items-center gap-3"><Spinner /><span>{label ?? t('common.loading')}</span></div></div>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, errText } = useApp()
  return (
    <div role="alert" className="panel p-6 text-center max-w-md mx-auto my-10">
      <Yaadri mood="confused" size={90} className="mx-auto" />
      <p className="mt-2 font-display text-xl">{t('common.error')}</p>
      <p className="mt-1 text-dim">{errText(error)}</p>
      {onRetry && <button className="btn btn-primary mt-4" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  )
}

export function EmptyState({ mood = 'encouraging', title, body, action }: { mood?: 'encouraging' | 'idle' | 'happy'; title?: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel p-8 text-center max-w-lg mx-auto">
      <Yaadri mood={mood} size={96} className="mx-auto" />
      {title && <h3 className="mt-2 text-xl">{title}</h3>}
      <p className="mt-2 text-dim">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** Loading / error / content wrapper for useAsync results. */
export function AsyncView<T>({ state, children }: { state: Async<T>; children: (d: T) => ReactNode }) {
  if (state.loading && !state.data) return <Loading />
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload} />
  return <>{state.data ? children(state.data) : null}</>
}

export function PageShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main id="main" tabIndex={-1} className={`mx-auto ${wide ? 'max-w-6xl' : 'max-w-4xl'} px-4 sm:px-6 pt-5 pb-nav outline-none`}>{children}</main>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-4xl sm:text-5xl font-extrabold">{title}</h1>{subtitle && <p className="mt-2 text-dim max-w-prose text-lg">{subtitle}</p>}</div>
      {actions}
    </header>
  )
}

export function Modal({ open, onClose, title, children, sheet }: { open: boolean; onClose: () => void; title: string; children: ReactNode; sheet?: boolean }) {
  const { t } = useApp()
  const box = useRef<HTMLDivElement>(null)
  const prev = useRef<Element | null>(null)
  useEffect(() => {
    if (!open) return
    prev.current = document.activeElement
    const first = box.current?.querySelector<HTMLElement>('input,textarea,select,button,a[href],[tabindex]:not([tabindex="-1"])')
    first?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('input,textarea,select,button,a[href],[tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'))
        if (!f.length) return
        const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; (prev.current as HTMLElement | null)?.focus?.() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`fixed inset-0 z-[70] flex ${sheet ? 'items-end sm:items-center' : 'items-center'} justify-center p-3`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
          <motion.div ref={box} role="dialog" aria-modal="true" aria-label={title} className="relative panel !bg-surface w-full max-w-lg max-h-[88dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl"
            initial={{ y: 40, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}>
            <div className="flex items-start justify-between gap-3 mb-3"><h2 className="text-2xl">{title}</h2>
              <button className="btn btn-ghost btn-sm !px-2.5" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0"><label htmlFor={id} className="font-display text-lg block">{label}</label>{description && <p className="text-sm text-dim">{description}</p>}</div>
      <button id={id} role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${checked ? 'bg-glow' : 'bg-ink/25'} disabled:opacity-40`}>
        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1.5 p-1 rounded-2xl bg-ink/10">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`px-4 min-h-[2.6rem] rounded-xl font-display transition-colors ${value === o.value ? 'bg-glow text-onglow' : 'text-ink hover:bg-ink/10'}`}>{o.label}</button>
      ))}
    </div>
  )
}

interface FieldProps { label: string; error?: string; hint?: string }
export function TextField({ label, error, hint, className = '', ...p }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-display text-lg mb-1">{label}</label>
      <input id={id} className={`field ${error ? '!border-danger' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}e` : hint ? `${id}h` : undefined} {...p} />
      {hint && !error && <p id={`${id}h`} className="mt-1 text-sm text-dim">{hint}</p>}
      {error && <p id={`${id}e`} role="alert" className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}
export function TextArea({ label, error, hint, className = '', ...p }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-display text-lg mb-1">{label}</label>
      <textarea id={id} className={`field py-3 min-h-[7rem] ${error ? '!border-danger' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}e` : hint ? `${id}h` : undefined} {...p} />
      {hint && !error && <p id={`${id}h`} className="mt-1 text-sm text-dim">{hint}</p>}
      {error && <p id={`${id}e`} role="alert" className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

export function XPBar({ profile, compact }: { profile: Profile; compact?: boolean }) {
  const { t } = useApp()
  return (
    <div className="w-full" aria-label={`${t('common.level', { n: profile.level })}, ${profile.into} / ${profile.span} XP`}>
      {!compact && <div className="flex justify-between text-sm text-dim mb-1"><span>{t('common.level', { n: profile.level })}</span><span>{profile.into} / {profile.span} XP</span></div>}
      <div className="h-3 rounded-full bg-ink/15 overflow-hidden" role="progressbar" aria-valuenow={profile.pct} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full rounded-full bg-gradient-to-r from-glow to-orchid" initial={false} animate={{ width: `${Math.max(3, profile.pct)}%` }} transition={{ type: 'spring', damping: 22, stiffness: 120 }} />
      </div>
    </div>
  )
}

export const AVATARS: Record<string, string> = { lantern: '🏮', bamboo: '🎋', hornbill: '🐦', orchid: '🌸', river: '🌊' }
export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <span className="grid place-items-center rounded-full bg-gradient-to-br from-glow/30 to-orchid/30 border border-[color:var(--line)]" style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden>{AVATARS[name] ?? '🏮'}</span>
)

/** Abstract woven-band divider: generic geometry, not any community's textile pattern. */
export function WeaveBand({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-full h-3 text-glow/60 ${className}`} viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden>
      <defs><pattern id="weave" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 12 L6 2 L12 12 L18 2 L24 12" fill="none" stroke="currentColor" strokeWidth="1.6" /></pattern></defs>
      <rect width="240" height="12" fill="url(#weave)" />
    </svg>
  )
}
