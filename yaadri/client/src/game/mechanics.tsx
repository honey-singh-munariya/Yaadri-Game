import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { sound } from '../lib/sound'
import { clamp, shuffle, sleep } from '../lib/hooks'
import { buildLadder } from '../../../shared/rescue'
import { pickItems, type Item, type LevelSpec } from './items'
import type { Capsule, Mood } from '../types'

export interface RoundApi {
  correct(key: string, label: string, cue: number, points?: number): void
  wrong(): void
  say(msg: string | null, mood?: Mood): void
  finish(): void
}
export interface MechProps { spec: LevelSpec; api: RoundApi; hintTick: number; capsules: Capsule[] }

/** Runs `fn` whenever the explicit Hint button is pressed (skips the first render). */
function useHintTick(tick: number, fn: () => void) {
  const first = useRef(true)
  const f = useRef(fn); f.current = fn
  useEffect(() => { if (first.current) { first.current = false; return } f.current() }, [tick])
}
const useApi = (api: RoundApi) => { const r = useRef(api); r.current = api; return r }
const cardBase = 'rounded-3xl border-2 transition-[transform,box-shadow,opacity,border-color] duration-200 active:scale-95 select-none'

/* ───────────────────────── 1. Remember the objects ───────────────────────── */
export function Objects({ spec, api, hintTick }: MechProps) {
  const { t } = useApp()
  const A = useApi(api)
  const targets = useMemo(() => pickItems(spec.n), [])
  const options = useMemo(() => shuffle([...targets, ...pickItems(spec.n, targets.map((x) => x.id))]), [targets])
  const [phase, setPhase] = useState<'look' | 'pick'>('look')
  const [chosen, setChosen] = useState<string[]>([])
  const [tapped, setTapped] = useState<string[]>([])
  const [dim, setDim] = useState<string[]>([])
  const [glow, setGlow] = useState<string | null>(null)
  const chosenRef = useRef<string[]>([]); const wrongs = useRef(0); const rung = useRef(0)
  const showMs = Math.max(5500, 10000 - spec.tier * 900) + spec.n * 500

  useEffect(() => {
    A.current.say(t('quest.objects.look'), 'thinking')
    const id = setTimeout(() => setPhase('pick'), showMs)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => { if (phase === 'pick') A.current.say(t('quest.objects.pick', { n: spec.n }), 'encouraging') }, [phase])

  const hint = () => {
    rung.current++
    const remaining = targets.filter((x) => !chosenRef.current.includes(x.id))
    if (!remaining.length) return
    if (rung.current === 1) A.current.say(t('quest.objects.cat', { cat: remaining[0].cat }), 'encouraging')
    else if (rung.current === 2) { setDim(options.filter((o) => !targets.some((x) => x.id === o.id)).map((o) => o.id)); A.current.say(t('quest.objects.dim'), 'encouraging') }
    else { setGlow(remaining[0].id); A.current.say(t('quest.objects.reveal'), 'encouraging') }
  }
  useHintTick(hintTick, () => { if (phase === 'pick') hint() })

  const pick = (it: Item) => {
    if (phase !== 'pick' || chosenRef.current.includes(it.id) || tapped.includes(it.id)) return
    if (targets.some((x) => x.id === it.id)) {
      const cue = clamp(wrongs.current, 0, 2); wrongs.current = 0; setGlow(null)
      chosenRef.current = [...chosenRef.current, it.id]; setChosen(chosenRef.current)
      A.current.correct(it.id, it.name, cue, 100)
      if (chosenRef.current.length === spec.n) setTimeout(() => A.current.finish(), 700)
    } else {
      wrongs.current++; setTapped((x) => [...x, it.id]); A.current.wrong(); hint()
    }
  }

  if (phase === 'look') return (
    <div className="text-center">
      <p className="text-xl mb-4">{t('quest.objects.look')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {targets.map((it, i) => (
          <motion.div key={it.id} className={`${cardBase} border-glow/60 bg-surface w-28 sm:w-32 py-4`} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.15 }}>
            <div className="text-5xl" aria-hidden>{it.emoji}</div><div className="mt-1 font-display text-lg">{it.name}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-5 h-2 max-w-sm mx-auto rounded-full bg-ink/15 overflow-hidden" aria-hidden><motion.div className="h-full bg-glow" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: showMs / 1000, ease: 'linear' }} /></div>
      <button className="btn btn-primary mt-5" onClick={() => { sound.sfx('click'); setPhase('pick') }}>{t('quest.ready')}</button>
    </div>
  )
  return (
    <div className="text-center">
      <p className="text-xl mb-1">{t('quest.objects.pick', { n: spec.n })}</p>
      <p className="text-dim mb-4">{t('quest.foundOf', { a: chosen.length, b: spec.n })}</p>
      <div className={`grid grid-cols-3 ${options.length > 6 ? 'sm:grid-cols-4' : ''} gap-3 max-w-xl mx-auto`}>
        {options.map((it) => {
          const got = chosen.includes(it.id), bad = tapped.includes(it.id), faded = dim.includes(it.id) || bad
          return (
            <motion.button key={it.id} onClick={() => pick(it)} disabled={got || bad} aria-label={it.name}
              className={`${cardBase} py-4 min-h-[6.2rem] ${got ? 'border-tea bg-tea/20' : glow === it.id ? 'border-glow bg-glow/25 shadow-lantern' : 'border-[color:var(--line)] bg-surface hover:border-glow/60'} ${faded ? 'opacity-30' : ''}`}
              animate={glow === it.id ? { scale: [1, 1.08, 1] } : bad ? { x: [0, -5, 5, -3, 0] } : { scale: 1 }} transition={{ duration: glow === it.id ? 1 : 0.35, repeat: glow === it.id ? Infinity : 0 }}>
              <div className="text-4xl sm:text-5xl" aria-hidden>{it.emoji}</div><div className="text-sm sm:text-base font-display mt-1">{it.name}</div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── 2. Lantern song (sequence) ───────────────────────── */
const COLORS = ['#f4b942', '#d98cc0', '#8cc79a', '#7fb7e6', '#f08a7a', '#a58ae8']
export function Sequence({ spec, api, hintTick }: MechProps) {
  const { t } = useApp()
  const A = useApi(api)
  const L = spec.tier >= 2 ? 6 : spec.tier >= 1 ? 5 : 4
  const seq = useMemo(() => { const s: number[] = []; for (let i = 0; i < spec.n; i++) { let x = Math.floor(Math.random() * L); if (s.length && x === s[s.length - 1]) x = (x + 1 + Math.floor(Math.random() * (L - 1))) % L; s.push(x) } return s }, [])
  const [lit, setLit] = useState<number | null>(null)
  const [phase, setPhase] = useState<'watch' | 'repeat'>('watch')
  const [nums, setNums] = useState(false)
  const [guide, setGuide] = useState(false)
  const [next, setNext] = useState<number | null>(null)
  const idx = useRef(0); const wrongs = useRef(0); const rung = useRef(0); const alive = useRef(true); const done = useRef(false)

  const play = async (speed = 1) => {
    setPhase('watch'); setNext(null); A.current.say(t('quest.sequence.watch'), 'listening')
    await sleep(600)
    for (let i = 0; i < seq.length; i++) {
      if (!alive.current) return
      setLit(seq[i]); sound.note(seq[i]); await sleep(650 * speed); setLit(null); await sleep(260 * speed)
    }
    if (!alive.current) return
    idx.current = 0; setPhase('repeat'); A.current.say(t('quest.sequence.repeat'), 'encouraging')
    if (guide) setNext(seq[0])
  }
  useEffect(() => { alive.current = true; void play(); return () => { alive.current = false } }, [])

  const hint = () => {
    rung.current++
    if (rung.current === 1) A.current.say(t('quest.sequence.replay'), 'encouraging')
    else if (rung.current === 2) { setNums(true); A.current.say(t('quest.sequence.numbers'), 'encouraging') }
    else setGuide(true)
    void play(1.5)
  }
  useHintTick(hintTick, () => { if (phase === 'repeat' && !done.current) hint() })

  const tap = (i: number) => {
    if (phase !== 'repeat' || done.current) return
    if (i === seq[idx.current]) {
      sound.note(i); setLit(i); setTimeout(() => setLit(null), 260)
      idx.current++
      if (idx.current === seq.length) {
        done.current = true
        A.current.correct(`seq${spec.n}`, `Lantern song of ${spec.n}`, clamp(wrongs.current, 0, 2), 100 + spec.n * 20)
        setNext(null); setTimeout(() => A.current.finish(), 800)
      } else if (guide) setNext(seq[idx.current])
    } else {
      wrongs.current++; A.current.wrong(); hint()
    }
  }
  const positions = (i: number) => seq.map((s, k) => (s === i ? k + 1 : 0)).filter(Boolean).join(', ')

  return (
    <div className="text-center">
      <p className="text-xl mb-5">{phase === 'watch' ? t('quest.sequence.watch') : t('quest.sequence.repeat')}</p>
      <div className={`grid gap-4 sm:gap-6 justify-center mx-auto ${L === 4 ? 'grid-cols-2 max-w-[15rem] sm:max-w-xs' : 'grid-cols-3 max-w-[19rem] sm:max-w-md'}`}>
        {Array.from({ length: L }, (_, i) => {
          const on = lit === i, guided = next === i
          return (
            <motion.button key={i} onClick={() => tap(i)} disabled={phase !== 'repeat'} aria-label={`Lantern ${i + 1}`}
              className="relative aspect-square border-2 border-white/40 disabled:cursor-default"
              style={{ borderRadius: '38% 38% 44% 44%', background: `radial-gradient(ellipse at 50% 38%, rgba(255,255,255,.9) 0%, ${COLORS[i]} 42%, ${COLORS[i]}d9 100%)`, boxShadow: on ? `0 0 46px 12px ${COLORS[i]}` : guided ? `0 0 26px 6px ${COLORS[i]}` : `0 6px 18px -6px ${COLORS[i]}88`, filter: on || guided ? 'brightness(1.2)' : 'brightness(.8)' }}
              animate={{ scale: on ? 1.14 : guided ? [1, 1.07, 1] : 1 }} transition={{ duration: guided ? 0.9 : 0.15, repeat: guided ? Infinity : 0 }} whileTap={{ scale: 0.94 }}>
              <span aria-hidden className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-1/3 h-3 rounded-md bg-[#8a6a3b]" />
              <span aria-hidden className="absolute inset-y-3 left-1/2 w-px bg-black/15" /><span aria-hidden className="absolute inset-y-4 left-[28%] w-px bg-black/10" /><span aria-hidden className="absolute inset-y-4 right-[28%] w-px bg-black/10" />
              {nums && <span className="absolute inset-x-0 -bottom-6 text-sm text-dim font-display">{positions(i)}</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── 3. Match the pairs ───────────────────────── */
export function Pairs({ spec, api, hintTick }: MechProps) {
  const { t } = useApp()
  const A = useApi(api)
  const cards = useMemo(() => shuffle(pickItems(spec.n).flatMap((it) => [{ uid: `${it.id}a`, it }, { uid: `${it.id}b`, it }])), [])
  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [peek, setPeek] = useState<string[] | null>(null)
  const busy = useRef(false); const since = useRef(0); const total = useRef(0); const matchedRef = useRef<string[]>([])
  useEffect(() => { A.current.say(t('quest.pairs.how'), 'encouraging') }, [])

  const showPeek = () => {
    const left = cards.filter((c) => !matchedRef.current.includes(c.it.id))
    if (!left.length) return
    const id = left[0].it.id
    setPeek(left.filter((c) => c.it.id === id).map((c) => c.uid)); A.current.say(t('quest.pairs.flash'), 'encouraging')
    setTimeout(() => setPeek(null), 1600)
  }
  useHintTick(hintTick, showPeek)

  const flip = (uid: string) => {
    const c = cards.find((x) => x.uid === uid)!
    if (busy.current || peek || flipped.includes(uid) || matchedRef.current.includes(c.it.id)) return
    sound.sfx('flip')
    const nf = [...flipped, uid]; setFlipped(nf)
    if (nf.length < 2) return
    busy.current = true
    const [a, b] = nf.map((u) => cards.find((x) => x.uid === u)!)
    if (a.it.id === b.it.id) {
      setTimeout(() => {
        matchedRef.current = [...matchedRef.current, a.it.id]; setMatched(matchedRef.current); setFlipped([])
        A.current.correct(a.it.id, a.it.name, clamp(since.current, 0, 2), 100); since.current = 0; busy.current = false
        if (matchedRef.current.length === spec.n) setTimeout(() => A.current.finish(), 600)
      }, 450)
    } else {
      total.current++; since.current++
      setTimeout(() => {
        setFlipped([]); busy.current = false
        if (total.current % 3 === 0) A.current.wrong()
        if (since.current === 2 || since.current === 4) showPeek()
      }, 1000)
    }
  }
  const cols = spec.n <= 3 ? 'grid-cols-3 max-w-sm' : 'grid-cols-4 max-w-lg'
  return (
    <div className="text-center">
      <p className="text-xl mb-4">{t('quest.pairs.how')}</p>
      <div className={`grid ${cols} gap-3 mx-auto`} style={{ perspective: 900 }}>
        {cards.map((c) => {
          const up = flipped.includes(c.uid) || matched.includes(c.it.id) || !!peek?.includes(c.uid)
          return (
            <button key={c.uid} onClick={() => flip(c.uid)} aria-label={up ? c.it.name : 'Hidden card'} className="relative aspect-[3/4] min-h-[5.5rem] active:scale-95 transition-transform">
              <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: up ? 180 : 0 }} transition={{ duration: 0.4 }}>
                <div className={`${cardBase} absolute inset-0 grid place-items-center border-glow/50 bg-gradient-to-br from-bg2 to-surface`} style={{ backfaceVisibility: 'hidden' }}><span className="text-3xl opacity-70" aria-hidden>🏮</span></div>
                <div className={`${cardBase} absolute inset-0 grid place-items-center ${matched.includes(c.it.id) ? 'border-tea bg-tea/20' : 'border-glow bg-surface'}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <div><div className="text-4xl sm:text-5xl" aria-hidden>{c.it.emoji}</div><div className="text-xs sm:text-sm font-display mt-1">{c.it.name}</div></div>
                </div>
              </motion.div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── 4. Find the hidden memory ───────────────────────── */
interface Basket { id: number; item: Item | null }
export function Hidden({ spec, api, hintTick }: MechProps) {
  const { t } = useApp()
  const A = useApi(api)
  const B = spec.n
  const nItems = 1 + (spec.tier >= 2 ? 1 : 0) + (spec.tier >= 4 ? 1 : 0)
  const shuffles = spec.tier === 0 ? 0 : spec.tier + 1
  const setup = useMemo(() => {
    const items = pickItems(nItems)
    const slots = shuffle(Array.from({ length: B }, (_, i) => i)).slice(0, nItems)
    const baskets: Basket[] = Array.from({ length: B }, (_, i) => ({ id: i, item: null }))
    items.forEach((it, k) => { baskets[slots[k]].item = it })
    return { items, baskets }
  }, [])
  const [order, setOrder] = useState<number[]>(() => setup.baskets.map((b) => b.id))
  const orderRef = useRef(order)
  const [phase, setPhase] = useState<'show' | 'shuffle' | 'ask'>('show')
  const [lifted, setLifted] = useState<number[]>([])
  const [dim, setDim] = useState<number[]>([])
  const [glow, setGlow] = useState<number | null>(null)
  const [q, setQ] = useState(0)
  const qRef = useRef(0); const wrongs = useRef(0); const rung = useRef(0); const alive = useRef(true); const lock = useRef(false)
  const target = () => setup.baskets.find((b) => b.item?.id === setup.items[qRef.current].id)!

  useEffect(() => {
    alive.current = true
    ;(async () => {
      A.current.say(t('quest.hidden.watch'), 'thinking')
      for (const it of setup.items) {
        if (!alive.current) return
        const b = setup.baskets.find((x) => x.item?.id === it.id)!
        await sleep(500); setLifted([b.id]); sound.sfx('memory'); await sleep(1900); setLifted([])
      }
      setPhase('shuffle')
      for (let s = 0; s < shuffles; s++) {
        if (!alive.current) return
        await sleep(650)
        const o = [...orderRef.current]; const i = Math.floor(Math.random() * B); let j = Math.floor(Math.random() * B); if (j === i) j = (j + 1) % B
        ;[o[i], o[j]] = [o[j], o[i]]; orderRef.current = o; setOrder(o); sound.sfx('tick')
      }
      await sleep(700)
      if (!alive.current) return
      setPhase('ask'); A.current.say(t('quest.hidden.pick', { name: setup.items[0].name }), 'encouraging')
    })()
    return () => { alive.current = false }
  }, [])

  const hint = () => {
    rung.current++
    const tb = target(); const pos = orderRef.current.indexOf(tb.id)
    if (rung.current === 1) A.current.say(pos < B / 2 ? t('quest.hidden.left') : t('quest.hidden.right'), 'encouraging')
    else if (rung.current === 2) { const keep = [tb.id, orderRef.current.find((x) => x !== tb.id)!]; setDim(setup.baskets.map((b) => b.id).filter((id) => !keep.includes(id))); A.current.say(t('quest.objects.dim'), 'encouraging') }
    else { setGlow(tb.id); A.current.say(t('quest.objects.reveal'), 'encouraging') }
  }
  useHintTick(hintTick, () => { if (phase === 'ask') hint() })

  const pick = async (id: number) => {
    if (phase !== 'ask' || lock.current) return
    lock.current = true
    const tb = target()
    setLifted([id])
    if (id === tb.id) {
      A.current.correct(setup.items[qRef.current].id, setup.items[qRef.current].name, clamp(wrongs.current, 0, 2), 100 + spec.tier * 10)
      wrongs.current = 0; rung.current = 0; setGlow(null); setDim([])
      await sleep(1000); setLifted([])
      if (qRef.current === nItems - 1) { A.current.finish(); return }
      qRef.current++; setQ(qRef.current); A.current.say(t('quest.hidden.pick', { name: setup.items[qRef.current].name }), 'encouraging')
    } else {
      wrongs.current++; A.current.wrong(); await sleep(800); setLifted([]); hint()
    }
    lock.current = false
  }
  const name = setup.items[Math.min(q, nItems - 1)].name
  return (
    <div className="text-center">
      <p className="text-xl mb-5">{phase === 'ask' ? t('quest.hidden.pick', { name }) : phase === 'show' ? t('quest.hidden.watch') : '…'}</p>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
        {order.map((id) => {
          const b = setup.baskets[id]
          const up = lifted.includes(id)
          return (
            <motion.button key={id} layout transition={{ type: 'spring', damping: 20, stiffness: 180 }} onClick={() => pick(id)} disabled={phase !== 'ask'} aria-label="Basket"
              className={`relative w-[5.2rem] h-[5.8rem] sm:w-24 sm:h-28 rounded-2xl grid place-items-end justify-center pb-1 ${dim.includes(id) ? 'opacity-25' : ''} ${glow === id ? 'shadow-lantern' : ''}`}>
              <span className="absolute inset-x-0 top-3 text-4xl sm:text-5xl" aria-hidden>{b.item?.emoji ?? ''}</span>
              <motion.span className="relative text-6xl sm:text-7xl leading-none" animate={{ y: up ? -34 : 0, rotate: up ? -10 : 0 }} transition={{ type: 'spring', damping: 14 }} aria-hidden>🧺</motion.span>
              {glow === id && <motion.span className="absolute inset-0 rounded-2xl border-2 border-glow" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── 5. Family faces (Memory Rescue ladder) ───────────────────────── */
const POOLS: Record<string, string[]> = {
  person: ['Asha', 'Ravi', 'Meena', 'Sonam', 'Dilip', 'Priya', 'Kabir'],
  place: ['The old bridge', 'The market', 'The school', 'The temple hill'],
  event: ['A festival day', 'A long walk', 'A rainy evening', 'A family lunch'],
}
export function Family({ spec, api, hintTick, capsules }: MechProps) {
  const { t } = useApp()
  const A = useApi(api)
  const pool = useMemo(() => shuffle(capsules).slice(0, Math.min(spec.n, capsules.length)), [])
  const [q, setQ] = useState(0)
  const [rung, setRung] = useState(0)
  const [bad, setBad] = useState<string[]>([])
  const [ok, setOk] = useState<string | null>(null)
  const [card, setCard] = useState<{ kind: string; text: string } | null>(null)
  const [glow, setGlow] = useState<string | null>(null)
  const rungRef = useRef(0); const qRef = useRef(0); const lock = useRef(false)
  const cap = pool[Math.min(q, pool.length - 1)]
  const ladder = useMemo(() => buildLadder(cap), [cap])
  const options = useMemo(() => {
    const same = capsules.filter((c) => c.id !== cap.id && c.kind === cap.kind).map((c) => c.title)
    const fill = POOLS[cap.kind].filter((x) => x !== cap.title && !same.includes(x))
    return shuffle([cap.title, ...shuffle([...same, ...fill]).slice(0, 3)])
  }, [cap])
  useEffect(() => { A.current.say(cap.kind === 'place' ? t('quest.family.place') : t('quest.family.pick'), 'encouraging') }, [q])

  const hint = () => {
    rungRef.current++; setRung(rungRef.current)
    const r = ladder[Math.min(rungRef.current, ladder.length) - 1]
    if (r.kind === 'reveal') { setGlow(cap.title); A.current.say(t('quest.gentle'), 'encouraging'); return }
    setCard({ kind: r.kind, text: r.text }); A.current.say(t('quest.gentle'), 'encouraging')
  }
  useHintTick(hintTick, () => { if (!ok) hint() })

  const choose = async (title: string) => {
    if (lock.current || ok || bad.includes(title)) return
    if (title === cap.title) {
      lock.current = true
      A.current.correct(cap.id, cap.title, clamp(rungRef.current, 0, 2), 100)
      setOk(rungRef.current ? t('family.practice.withHelp') : t('family.practice.gotIt'))
      await sleep(1900)
      if (qRef.current >= pool.length - 1) { A.current.finish(); return }
      qRef.current++; rungRef.current = 0
      setQ(qRef.current); setRung(0); setBad([]); setOk(null); setCard(null); setGlow(null); lock.current = false
    } else { setBad((b) => [...b, title]); A.current.wrong(); hint() }
  }
  const tile = { person: '🧑', place: '🏞️', event: '🕯️' }[cap.kind] ?? '🏮'
  return (
    <div className="text-center">
      <p className="text-dim mb-2">{q + 1} / {pool.length}</p>
      <div className="mx-auto w-52 h-52 sm:w-60 sm:h-60 rounded-[2rem] overflow-hidden border-2 border-glow/60 bg-gradient-to-br from-bg2 to-surface grid place-items-center shadow-lantern">
        {cap.photo ? <img src={cap.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-7xl" aria-hidden>{tile}</span>}
      </div>
      <p className="text-xl mt-4">{cap.kind === 'place' ? t('quest.family.place') : t('quest.family.pick')}</p>
      {card && <motion.div key={rung} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 mx-auto max-w-md rounded-2xl bg-glow/15 border border-glow/40 px-4 py-3"><p className="text-sm text-dim">{t(`quest.rung.${card.kind}` as 'quest.rung.clue')}</p><p className="text-lg">{card.text}</p></motion.div>}
      <div className="mt-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
        {options.map((o) => (
          <motion.button key={o} onClick={() => choose(o)} disabled={bad.includes(o) || !!ok} animate={glow === o ? { scale: [1, 1.06, 1] } : bad.includes(o) ? { x: [0, -5, 5, 0] } : {}} transition={{ duration: glow === o ? 1 : 0.3, repeat: glow === o ? Infinity : 0 }}
            className={`${cardBase} min-h-[3.6rem] px-3 py-2 font-display text-lg ${ok && o === cap.title ? 'border-tea bg-tea/20' : glow === o ? 'border-glow bg-glow/25' : 'border-[color:var(--line)] bg-surface hover:border-glow/60'} ${bad.includes(o) ? 'opacity-30' : ''}`}>{o}</motion.button>
        ))}
      </div>
      {ok && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-lg text-tea font-display">{ok}{cap.story ? <span className="block text-dim font-body text-base mt-1">{cap.story}</span> : null}</motion.p>}
    </div>
  )
}
