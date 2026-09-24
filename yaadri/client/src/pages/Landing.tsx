import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import WorldScene from '../components/WorldScene'
import Particles from '../components/Particles'
import Yaadri from '../character/Yaadri'
import Icon from '../components/Icon'
import A11yMenu from '../components/A11yMenu'
import LanguageMenu from '../components/LanguageMenu'
import { SoundButton, Wordmark } from '../components/Layout'
import { WeaveBand } from '../components/ui'
import { useApp } from '../context/AppContext'
import { sound } from '../lib/sound'
import { LANGUAGES } from '../lib/langs'
import type { Mood } from '../types'

const seen = () => { try { const s = sessionStorage.getItem('yaadri_intro'); sessionStorage.setItem('yaadri_intro', '1'); return !!s } catch { return false } }

export default function Landing() {
  const { t, status, settings, updateSettings, reduced, me } = useApp()
  const nav = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  const [mood, setMood] = useState<Mood>('idle')
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null)
  const [returning] = useState(seen)
  const d = (n: number) => (returning ? n * 0.25 : n)

  useEffect(() => {
    if (reduced) return
    const el = root.current!
    const move = (e: PointerEvent) => { el.style.setProperty('--px', String(((e.clientX / window.innerWidth) - 0.5) * 2)); el.style.setProperty('--py', String(((e.clientY / window.innerHeight) - 0.5) * 2)) }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced])

  const go = (path: string) => { sound.sfx('start'); nav(status === 'ready' ? path : `/enter?next=${encodeURIComponent(path)}`) }
  const poke = () => {
    sound.sfx('character'); setMood('celebrating'); setFocus({ x: 0.72, y: 0.55 })
    setTimeout(() => { setMood('idle'); setFocus(null) }, 2200)
  }
  const letters = 'YAADRI'.split('')

  return (
    <div ref={root} className="relative">
      <section className="relative min-h-dvh overflow-hidden flex flex-col">
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: returning ? 0.4 : 1.6 }}>
          <WorldScene />
          <Particles count={46} attract focus={focus} />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/10 to-transparent lg:from-bg/60" aria-hidden />
        </motion.div>

        <header className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-8 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <Link to="/" aria-label="YAADRI"><Wordmark hideTextOnMobile /></Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SoundButton /><LanguageMenu /><A11yMenu />
            {status === 'ready' ? <Link to="/play" className="btn btn-ghost btn-sm">{t('nav.menu')}</Link> : <Link to="/enter" className="btn btn-ghost btn-sm whitespace-nowrap">{t('nav.signIn')}</Link>}
          </div>
        </header>

        <div className="relative z-10 flex-1 grid lg:grid-cols-2 items-center gap-2 px-5 sm:px-10 lg:px-16 pb-24 pt-4">
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <h1 className="text-[clamp(4.2rem,15vw,9.5rem)] font-extrabold leading-[.9] tracking-wide flex justify-center lg:justify-start" aria-label="YAADRI">
              {letters.map((l, i) => (
                <motion.span key={i} aria-hidden className="glowtext inline-block" initial={{ opacity: 0.08, filter: 'blur(8px)', y: 14 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} transition={{ delay: d(1.5) + i * (returning ? 0.03 : 0.16), duration: 0.9 }}>{l}</motion.span>
              ))}
            </h1>
            <motion.p className="mt-4 text-xl sm:text-2xl max-w-md mx-auto lg:mx-0 text-ink/90" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(2.7), duration: 0.8 }}>{t('brand.tagline')}</motion.p>
            <motion.div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center lg:justify-start" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(3.3), duration: 0.7 }}>
              <button className="btn btn-primary text-xl min-h-[3.6rem] px-8 whitespace-nowrap" onClick={() => go('/journey')}>{t('landing.start')}</button>
              <button className="btn btn-ghost text-xl min-h-[3.6rem] px-8 whitespace-nowrap" onClick={() => go('/games')}>{t('landing.play')}</button>
              <button className="btn btn-ghost text-xl min-h-[3.6rem] px-8 whitespace-nowrap" onClick={() => go('/talk')}><Icon name="mic" size={20} />{t('landing.talk')}</button>
            </motion.div>
            <motion.nav aria-label="Guides" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(3.9) }}>
              <Link className="underline underline-offset-4 decoration-glow/60" to="/how-to-play">{t('nav.howToPlay')}</Link>
              <Link className="underline underline-offset-4 decoration-glow/60" to="/how-to-use">{t('nav.howToUse')}</Link>
              <Link className="underline underline-offset-4 decoration-glow/60" to="/help">{t('nav.help')}</Link>
              <Link className="underline underline-offset-4 decoration-glow/60" to="/contact">{t('nav.contact')}</Link>
            </motion.nav>
          </div>
          <motion.div className="order-1 lg:order-2 grid place-items-center" initial={{ opacity: 0, y: 90 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(0.8), duration: 1.4, type: 'spring', damping: 16, stiffness: 50 }}>
            <button onClick={poke} aria-label={t('landing.tapMe')} className="relative rounded-full p-4 focus-visible:ring-4 ring-glow/60">
              <Yaadri mood={mood} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 170 : 300} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 chip whitespace-nowrap">{t('landing.tapMe')}</span>
            </button>
          </motion.div>
        </div>

        {!settings.sound && (
          <motion.button className="absolute z-10 left-4 bottom-4 chip !py-2 !text-sm !bg-surface/90 hover:!bg-surface" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(4.5) }}
            onClick={() => { sound.setEnabled(true); sound.sfx('start'); void updateSettings({ sound: true }) }}>
            <Icon name="speaker" size={16} /> {t('landing.soundPrompt')}
          </motion.button>
        )}
      </section>

      <section className="relative bg-bg px-5 sm:px-10 lg:px-16 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl mb-2">{t('brand.motto')}</h2>
          <WeaveBand className="max-w-xs mb-8" />
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { k: 'play', to: '/games', c: 'md:col-span-2', mood: 'encouraging' as Mood },
              { k: 'remember', to: '/memory', c: 'md:col-span-2', mood: 'happy' as Mood },
              { k: 'connect', to: '/talk', c: 'md:col-span-1', mood: 'listening' as Mood },
            ].map((p, i) => (
              <motion.div key={p.k} className={`panel p-6 flex flex-col ${p.c}`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.08 }}>
                <Yaadri mood={p.mood} size={72} still />
                <h3 className="text-2xl mt-3">{t(`landing.${p.k}Title` as 'landing.playTitle')}</h3>
                <p className="mt-2 text-dim flex-1">{t(`landing.${p.k}Body` as 'landing.playBody')}</p>
                <button className="btn btn-ghost btn-sm mt-4 self-start" onClick={() => go(p.to)}>{t('common.open')}</button>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-2xl mb-3">{t('nav.languages')}</h3>
              <ul className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => <li key={l.code} className="chip !text-base !py-1.5 !text-ink">{l.native}{l.voice.supported && <Icon name="speaker" size={14} className="text-glow" />}</li>)}
              </ul>
              <Link to="/languages" className="inline-block mt-3 underline underline-offset-4 decoration-glow/60">{t('nav.languages')}</Link>
            </div>
            <p className="text-dim text-lg max-w-prose">{t('landing.honest')}</p>
          </div>
          <footer className="mt-14 pt-6 border-t border-[color:var(--line)] text-dim flex flex-wrap items-center justify-between gap-3">
            <span>{t('landing.footer')}</span>
            <nav className="flex gap-5"><Link to="/privacy" className="underline underline-offset-4">{t('nav.privacy')}</Link><Link to="/contact" className="underline underline-offset-4">{t('nav.contact')}</Link>{me && <Link to="/play" className="underline underline-offset-4">{t('nav.play')}</Link>}</nav>
          </footer>
        </div>
      </section>
    </div>
  )
}
