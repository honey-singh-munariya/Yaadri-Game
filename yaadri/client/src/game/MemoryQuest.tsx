import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api as http, ApiError } from '../lib/api'
import { postOrQueue } from '../lib/offline'
import { useAsync } from '../lib/hooks'
import { sound } from '../lib/sound'
import { useApp } from '../context/AppContext'
import { EmptyState, ErrorState, Loading, PageShell } from '../components/ui'
import Icon from '../components/Icon'
import Yaadri from '../character/Yaadri'
import { MAX_LEVEL, MECH_ICON, levelSpec, type LevelSpec } from './items'
import { Family, Hidden, Objects, Pairs, Sequence, type RoundApi } from './mechanics'
import type { Capsule, Mood, Reward } from '../types'

interface GamesRes { progress: { game: string; best_level: number; plays: number }[] }
type Phase = 'menu' | 'playing' | 'complete' | 'rest'
interface Ev { key: string; label: string; cue: number; correct: boolean }
interface Result { stars: number; score: number; reward: (Reward & { bestLevel: number }) | null; queued: boolean }

export default function MemoryQuest() {
  const { t, reward, toast, errText } = useApp()
  const [sp] = useSearchParams()
  const familyMode = sp.get('mode') === 'family'
  const game = familyMode ? 'family-faces' : 'memory-quest'
  const data = useAsync(async () => {
    const [g, c] = await Promise.all([http.get<GamesRes>('/games'), http.get<{ capsules: Capsule[] }>('/capsules')])
    return { best: g.progress.find((p) => p.game === game)?.best_level ?? 0, capsules: c.capsules }
  }, [game])

  const [phase, setPhase] = useState<Phase>('menu')
  const [level, setLevel] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [score, setScore] = useState(0)
  const [hintTick, setHintTick] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [mood, setMood] = useState<Mood>('idle')
  const [result, setResult] = useState<Result | null>(null)
  const [localBest, setLocalBest] = useState<number | null>(null)
  const heartsRef = useRef(3); const scoreRef = useRef(0); const mistakes = useRef(0); const hints = useRef(0)
  const events = useRef<Ev[]>([]); const started = useRef(0); const ended = useRef(false)
  const auto = useRef(false)

  const offline = !!data.error && data.error instanceof ApiError && data.error.network
  const capsules = data.data?.capsules ?? []
  const best = localBest ?? data.data?.best ?? 0
  const spec: LevelSpec = useMemo(() => levelSpec(level, capsules.length > 0, familyMode), [level, capsules.length, familyMode])

  const begin = (lv: number) => {
    heartsRef.current = 3; scoreRef.current = 0; mistakes.current = 0; hints.current = 0; events.current = []; ended.current = false; started.current = Date.now()
    setLevel(lv); setHearts(3); setScore(0); setHintTick(0); setMsg(null); setMood('happy'); setResult(null); setAttempt((a) => a + 1); setPhase('playing')
    sound.sfx('start')
  }
  useEffect(() => {
    const lv = Number(sp.get('level'))
    if (!auto.current && lv >= 1 && (data.data || offline)) { auto.current = true; begin(Math.min(lv, best + 1)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.data, offline])

  const submit = async (completed: boolean, stars: number, total: number, sp2: LevelSpec) => {
    const payload = { game: sp2.game, level: sp2.level, completed, score: total, stars, mistakes: Math.min(mistakes.current, 999), hints: Math.min(hints.current, 999), durationMs: Math.min(Date.now() - started.current, 3_600_000), events: events.current.slice(0, 30).map((e) => ({ ...e, key: e.key.slice(0, 60), label: e.label.slice(0, 80) })) }
    try {
      const r = await postOrQueue<Reward & { bestLevel: number }>('/games/score', payload)
      setResult({ stars, score: total, reward: r, queued: !r })
      if (r) { reward(r); setLocalBest(r.bestLevel) }
      else if (completed) setLocalBest((b) => Math.max(b ?? best, sp2.level))
    } catch (e) { setResult({ stars, score: total, reward: null, queued: false }); toast(errText(e), 'error') }
  }

  const finish = () => {
    if (ended.current) return
    ended.current = true
    const m = mistakes.current, h = hints.current
    const stars = m === 0 && h === 0 ? 3 : m + h <= 2 ? 2 : 1
    const total = scoreRef.current + stars * 150
    setScore(total); setMood('celebrating'); sound.sfx('level'); setPhase('complete')
    void submit(true, stars, total, spec)
  }
  const rest = () => {
    if (ended.current) return
    ended.current = true
    setMood('encouraging'); setPhase('rest')
    void submit(false, 0, scoreRef.current, spec)
  }

  const roundApi = useMemo<RoundApi>(() => ({
    correct: (key, label, cue, points = 100) => { events.current.push({ key, label, cue, correct: true }); scoreRef.current += points; setScore(scoreRef.current); sound.sfx('correct'); setMood('happy') },
    wrong: () => {
      mistakes.current++; sound.sfx('wrong'); setMood('encouraging')
      heartsRef.current = Math.max(0, heartsRef.current - 1); setHearts(heartsRef.current)
      if (heartsRef.current === 0) setTimeout(rest, 900)
    },
    say: (m, md) => { setMsg(m); if (md) setMood(md) },
    finish: () => finish(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [attempt, spec])

  if (data.loading && !data.data) return <PageShell><Loading /></PageShell>
  if (data.error && !offline) return <PageShell><ErrorState error={data.error} onRetry={data.reload} /></PageShell>
  if (familyMode && !capsules.length) return (
    <PageShell><EmptyState title={t('games.family.title')} body={t('games.needCapsules')} action={<Link className="btn btn-primary" to="/family">{t('nav.family')}</Link>} /></PageShell>
  )

  const unlockedMax = Math.min(MAX_LEVEL, best + 1)
  const title = (s: LevelSpec) => t(`quest.${s.mechanic}.title` as 'quest.objects.title')

  if (phase === 'menu') return (
    <PageShell>
      <div className="text-center mb-6">
        <Yaadri mood="happy" size={120} className="mx-auto" />
        <h1 className="text-4xl sm:text-5xl mt-1">{familyMode ? t('games.family.title') : t('quest.menuTitle')}</h1>
        <p className="mt-2 text-dim text-lg">{t('quest.menuBody')}</p>
        {offline && <p className="mt-2 chip">{t('common.offline')}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {Array.from({ length: Math.min(MAX_LEVEL, best + 3) }, (_, i) => i + 1).map((lv) => {
          const s = levelSpec(lv, capsules.length > 0, familyMode)
          const open = lv <= unlockedMax
          return (
            <motion.button key={lv} disabled={!open} onClick={() => begin(lv)} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: open ? 1 : 0.4, y: 0 }} transition={{ delay: lv * 0.03 }}
              className={`panel p-4 text-left min-h-[7rem] ${lv === unlockedMax ? '!border-glow shadow-lantern' : ''} disabled:cursor-not-allowed`}>
              <div className="flex items-center justify-between"><span className="font-display text-2xl">{t('quest.level', { n: lv })}</span><span className="text-3xl" aria-hidden>{open ? MECH_ICON[s.mechanic] : '🔒'}</span></div>
              <div className="text-dim mt-1">{title(s)}</div>
              {lv <= best && <div className="mt-1 text-tea flex items-center gap-1 text-sm"><Icon name="check" size={16} /> {t('journey.complete')}</div>}
            </motion.button>
          )
        })}
      </div>
      <div className="text-center mt-8"><button className="btn btn-primary text-xl px-10" onClick={() => begin(Math.min(unlockedMax, best + 1))}>{t('quest.startLevel', { n: Math.min(unlockedMax, best + 1) })}</button></div>
    </PageShell>
  )

  if (phase === 'complete' || phase === 'rest') {
    const won = phase === 'complete'
    return (
      <PageShell>
        <motion.div className="panel max-w-md mx-auto p-8 text-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
          <Yaadri mood={won ? 'celebrating' : 'encouraging'} size={130} className="mx-auto" />
          <h1 className="text-4xl mt-2">{won ? t('quest.complete') : t('quest.rest.title')}</h1>
          {won ? (
            <>
              <div className="flex justify-center gap-2 mt-4" aria-label={t('quest.stars', { n: result?.stars ?? 0 })}>
                {[1, 2, 3].map((n) => <motion.span key={n} className={`text-5xl ${n <= (result?.stars ?? 0) ? '' : 'grayscale opacity-25'}`} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + n * 0.25, type: 'spring', damping: 8 }}>⭐</motion.span>)}
              </div>
              <p className="mt-3 text-2xl font-display">{t('quest.score')}: {score}</p>
              <p className="mt-1 text-dim">{result?.reward ? t('quest.xpGained', { n: result.reward.xpGained }) : result?.queued ? t('quest.saveLater') : t('quest.saving')}</p>
            </>
          ) : <p className="mt-3 text-lg text-dim">{t('quest.rest.body', { n: level })}</p>}
          <div className="mt-6 flex flex-col gap-2.5">
            {won && level < MAX_LEVEL && <button className="btn btn-primary" onClick={() => begin(level + 1)}>{t('quest.nextLevel')}</button>}
            <button className={`btn ${won ? 'btn-ghost' : 'btn-primary'}`} onClick={() => begin(level)}>{won ? t('common.playAgain') : t('quest.tryAgain')}</button>
            <button className="btn btn-ghost" onClick={() => { sound.sfx('click'); setPhase('menu') }}>{t('quest.menu')}</button>
          </div>
        </motion.div>
      </PageShell>
    )
  }

  const mechProps = { spec, api: roundApi, hintTick, capsules }
  return (
    <PageShell>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => { sound.sfx('click'); setPhase('menu') }} aria-label={t('quest.menu')}><Icon name="back" /><Icon name="x" size={18} /></button>
        <div className="text-center min-w-0"><div className="font-display text-xl leading-tight">{t('quest.level', { n: level })}</div><div className="text-sm text-dim truncate">{title(spec)}</div></div>
        <div className="text-right"><div className="font-display text-xl leading-tight">{score}</div><div className="text-sm text-dim">{t('quest.score')}</div></div>
      </div>
      <div className="flex justify-center gap-1.5 mb-3" role="img" aria-label={`${t('quest.hearts')}: ${hearts} / 3`}>
        {[0, 1, 2].map((i) => <motion.span key={i} className="text-3xl" animate={{ opacity: i < hearts ? 1 : 0.2, scale: i < hearts ? 1 : 0.8, filter: i < hearts ? 'grayscale(0)' : 'grayscale(1)' }} aria-hidden>🏮</motion.span>)}
      </div>
      <section className="panel p-4 sm:p-7 min-h-[22rem]" aria-live="off">
        <AnimatePresence mode="wait">
          <motion.div key={`${level}-${attempt}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {spec.mechanic === 'objects' && <Objects {...mechProps} />}
            {spec.mechanic === 'sequence' && <Sequence {...mechProps} />}
            {spec.mechanic === 'pairs' && <Pairs {...mechProps} />}
            {spec.mechanic === 'hidden' && <Hidden {...mechProps} />}
            {spec.mechanic === 'family' && capsules.length > 0 && <Family {...mechProps} />}
          </motion.div>
        </AnimatePresence>
      </section>
      <div className="mt-4 flex items-center gap-3">
        <Yaadri mood={mood} size={64} />
        <div role="status" aria-live="polite" className="flex-1 min-w-0 rounded-2xl rounded-bl-sm bg-surface/90 border border-[color:var(--line)] px-4 py-3 min-h-[3.2rem] text-lg">{msg ?? '…'}</div>
        <button className="btn btn-ghost shrink-0" aria-label={t('quest.hint')} onClick={() => { hints.current++; setHintTick((n) => n + 1); sound.sfx('click') }}><Icon name="help" /><span className="hidden sm:inline">{t('quest.hint')}</span></button>
      </div>
    </PageShell>
  )
}
