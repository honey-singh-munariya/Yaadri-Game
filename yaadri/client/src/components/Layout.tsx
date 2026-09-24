import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'
import Particles from './Particles'
import WorldScene from './WorldScene'
import UnlockOverlay from './UnlockOverlay'
import LanguageMenu from './LanguageMenu'
import { Avatar, Modal } from './ui'
import { useApp } from '../context/AppContext'
import { PRIMARY, SECONDARY } from '../lib/nav'
import { sound } from '../lib/sound'
import Yaadri from '../character/Yaadri'

export function Wordmark({ small, hideTextOnMobile }: { small?: boolean; hideTextOnMobile?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Yaadri size={small ? 26 : 34} still mood="idle" label="" />
      <span className={`font-display font-extrabold tracking-wide ${small ? 'text-xl' : 'text-2xl'} ${hideTextOnMobile ? 'hidden sm:inline' : ''}`}>YAADRI</span>
    </span>
  )
}

export function SoundButton() {
  const { settings, updateSettings, t } = useApp()
  return (
    <button className="btn btn-ghost btn-sm !px-3" aria-pressed={settings.sound} aria-label={settings.sound ? t('common.soundOn') : t('common.soundOff')}
      onClick={() => { const next = !settings.sound; if (next) { sound.setEnabled(true); sound.sfx('start') } void updateSettings({ sound: next }) }}>
      <Icon name={settings.sound ? 'speaker' : 'speaker-off'} size={20} />
    </button>
  )
}

function XpChip() {
  const { me, t } = useApp()
  if (!me) return null
  const p = me.profile
  const r = 15, c = 2 * Math.PI * r
  return (
    <Link to="/profile" className="hidden sm:flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-ink/10 border border-[color:var(--line)]" aria-label={`${t('common.level', { n: p.level })}, ${t('common.xp', { n: p.xp })}`}>
      <span className="relative w-9 h-9 grid place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" /><circle cx="18" cy="18" r={r} fill="none" stroke="rgb(var(--c-glow))" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p.pct / 100)} style={{ transition: 'stroke-dashoffset .8s' }} /></svg>
        <span className="font-display text-sm font-bold">{p.level}</span>
      </span>
      <span className="text-sm leading-tight"><span className="block font-display whitespace-nowrap">{t('common.xp', { n: p.xp })}</span></span>
    </Link>
  )
}

function TopBar() {
  const { me, t, status } = useApp()
  const [more, setMore] = useState(false)
  const nav = useNavigate()
  const { logout } = useApp()
  const authed = status === 'ready'
  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/70 border-b border-[color:var(--line)]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto max-w-6xl px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
          <Link to="/" aria-label="YAADRI — home" className="shrink-0 rounded-xl"><Wordmark small /></Link>
          <nav aria-label={t('nav.main')} className="hidden lg:flex items-center gap-1 mx-auto">
            {PRIMARY.filter((n) => authed || !n.private).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-xl font-display text-lg whitespace-nowrap transition-colors ${isActive ? 'bg-glow text-onglow' : 'hover:bg-ink/10'}`}>{t(n.key)}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <XpChip />
            <SoundButton />
            <LanguageMenu />
            {authed ? (
              <button className="btn btn-ghost btn-sm !px-3" onClick={() => { sound.sfx('click'); setMore(true) }} aria-label={t('nav.menu')}><Icon name="more" /></button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => nav('/enter')}>{t('nav.signIn')}</button>
            )}
          </div>
        </div>
      </header>
      <Modal open={more} onClose={() => setMore(false)} title={t('nav.menu')} sheet>
        <nav aria-label={t('nav.menu')} className="grid grid-cols-2 gap-2">
          {SECONDARY.filter((n) => authed || !n.private).map((n) => (
            <Link key={n.to} to={n.to} onClick={() => { sound.sfx('click'); setMore(false) }} className="flex items-center gap-3 rounded-2xl px-3 py-3 bg-ink/10 hover:bg-ink/15 font-display text-lg"><Icon name={n.icon} /> {t(n.key)}</Link>
          ))}
        </nav>
        {authed && me && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
            <span className="flex items-center gap-2 min-w-0"><Avatar name={me.profile.avatar} /><span className="truncate">{me.profile.displayName}</span></span>
            <button className="btn btn-ghost btn-sm" onClick={async () => { setMore(false); await logout(); nav('/') }}>{t('nav.signOut')}</button>
          </div>
        )}
      </Modal>
    </>
  )
}

function BottomNav() {
  const { t } = useApp()
  return (
    <nav aria-label={t('nav.main')} className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-[color:var(--line)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-5 max-w-lg mx-auto">
        {PRIMARY.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} onClick={() => sound.sfx('tick')} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2.5 min-h-[3.6rem] text-[.78rem] font-display ${isActive ? 'text-glow' : 'text-dim'}`}>
              {({ isActive }) => (<>
                {isActive && <motion.span layoutId="navdot" className="absolute top-0 h-1 w-8 rounded-b-full bg-glow" />}
                <Icon name={n.icon} size={24} />{t(n.key)}
              </>)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="fixed z-[95] inset-x-0 bottom-24 lg:bottom-6 flex flex-col items-center gap-2 px-3 pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((x) => (
          <motion.div key={x.id} role={x.kind === 'error' ? 'alert' : 'status'} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className={`pointer-events-auto max-w-md w-full rounded-2xl px-4 py-3 shadow-2xl border flex items-start gap-3 ${x.kind === 'error' ? 'bg-surface border-danger text-ink' : x.kind === 'success' ? 'bg-surface border-tea text-ink' : 'bg-surface border-[color:var(--line)] text-ink'}`}>
            <Icon name={x.kind === 'error' ? 'info' : x.kind === 'success' ? 'check' : 'info'} className={x.kind === 'error' ? 'text-danger' : x.kind === 'success' ? 'text-tea' : 'text-glow'} />
            <span className="flex-1">{x.msg}</span>
            <button onClick={() => dismissToast(x.id)} aria-label="Dismiss" className="text-dim"><Icon name="x" size={18} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function Layout() {
  const { status, me, online, t } = useApp()
  const loc = useLocation()
  const landing = loc.pathname === '/'
  useEffect(() => { window.scrollTo(0, 0); document.getElementById('main')?.focus({ preventScroll: true }) }, [loc.pathname])
  return (
    <div className="relative min-h-dvh">
      <a href="#main" className="sr-only-focusable btn btn-primary fixed left-3 top-3 z-[100]">{t('nav.skip')}</a>
      {!landing && (
        <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden><WorldScene soft /><div className="absolute inset-0 bg-bg/55" /><Particles count={12} /></div>
      )}
      {!landing && <TopBar />}
      {!online && <div role="status" className="bg-danger/20 text-center py-2 text-sm px-3">{t('common.offline')}</div>}
      {me?.user.isDemo && !landing && <div className="bg-orchid/20 text-center py-1.5 text-sm px-3">{t('common.demoBanner')}</div>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </AnimatePresence>
      {status === 'ready' && !landing && <BottomNav />}
      <Toasts />
      <UnlockOverlay />
    </div>
  )
}
