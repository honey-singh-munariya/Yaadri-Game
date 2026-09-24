import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Yaadri from '../character/Yaadri'
import VoiceOrb from '../character/VoiceOrb'
import type { VoiceState } from '../context/Voice'

const COL = ['#f4b942', '#d98cc0', '#8cc79a', '#7fb7e6']
const box = 'h-28 w-full grid place-items-center overflow-hidden rounded-2xl bg-bg/50 border border-[color:var(--line)]'

export const LanternRow = () => (
  <div className={box} aria-hidden><div className="flex gap-3">{COL.map((c, i) => (
    <motion.span key={i} className="w-11 h-11 rounded-[42%]" style={{ background: c }} animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1.12, 0.92] }} transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.7 }} />
  ))}</div></div>
)
export const PathFork = () => (
  <div className={box} aria-hidden>
    <svg viewBox="0 0 220 100" className="w-full h-full"><path d="M20 80 Q80 80 100 50 T200 20 M100 50 Q130 70 200 80" fill="none" stroke="rgb(var(--c-dim))" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      <motion.circle r="7" cx={20} cy={80} fill="rgb(var(--c-glow))" animate={{ cx: [20, 100, 200, 20], cy: [80, 50, 20, 80] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} /></svg>
  </div>
)
export const Portraits = () => (
  <div className={box} aria-hidden><div className="flex -space-x-3">{['🧑', '👵', '🏞️'].map((e, i) => <motion.span key={i} className="w-14 h-14 rounded-full bg-surface border-2 border-glow/60 grid place-items-center text-3xl" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}>{e}</motion.span>)}</div></div>
)
export const HeartsDemo = () => (
  <div className={box} aria-hidden><div className="flex gap-2 text-4xl">{[0, 1, 2].map((i) => <motion.span key={i} animate={i === 2 ? { opacity: [1, 1, 0.2, 0.2, 1], filter: ['grayscale(0)', 'grayscale(0)', 'grayscale(1)', 'grayscale(1)', 'grayscale(0)'] } : {}} transition={{ duration: 5, repeat: Infinity }}>🏮</motion.span>)}</div></div>
)
export const XpDemo = () => (
  <div className={box} aria-hidden><div className="w-48"><div className="h-3 rounded-full bg-ink/15 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-glow to-orchid" animate={{ width: ['10%', '78%', '78%', '10%'] }} transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.4, 0.85, 1] }} /></div>
    <motion.p className="mt-1.5 text-center font-display text-glow" animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -6] }} transition={{ duration: 4.5, repeat: Infinity, times: [0.3, 0.42, 0.8, 0.9] }}>+40 XP</motion.p></div></div>
)
export const BadgeDemo = () => (
  <div className={box} aria-hidden><motion.span className="text-5xl" animate={{ scale: [0.6, 1.25, 1, 1, 0.6], rotate: [-15, 8, 0, 0, -15] }} transition={{ duration: 3.4, repeat: Infinity }}>🏆</motion.span></div>
)
export const CardsDemo = () => (
  <div className={box} aria-hidden><div className="flex gap-3">{[0, 1].map((i) => <motion.div key={i} className="w-14 h-[4.6rem] rounded-xl border-2 border-glow/60 bg-surface grid place-items-center text-3xl" animate={{ rotateY: [0, 180, 180, 0] }} style={{ transformStyle: 'preserve-3d' }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}><span style={{ display: 'inline-block' }}>{i ? '🍍' : '🍍'}</span></motion.div>)}</div></div>
)
export const MemoryDemo = () => (
  <div className={box} aria-hidden><div className="flex items-center gap-3"><Yaadri mood="happy" size={54} still /><motion.div className="rounded-xl bg-surface border border-glow/50 px-3 py-2 text-sm" animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity }}>Keep “Enjoys puzzles”?</motion.div></div></div>
)
export const ChoiceDemo = () => (
  <div className={box} aria-hidden><div className="w-52 space-y-2">{['Follow the river', 'Climb the steps'].map((l, i) => <motion.div key={l} className="rounded-xl border border-[color:var(--line)] bg-surface px-3 py-1.5 text-sm" animate={i === 0 ? { borderColor: ['rgba(255,255,255,.15)', 'rgb(244,185,66)', 'rgba(255,255,255,.15)'] } : {}} transition={{ duration: 3, repeat: Infinity }}>{l}</motion.div>)}</div></div>
)
export const KeysDemo = () => (
  <div className={box} aria-hidden><div className="flex gap-2 font-display">{['Tab', 'Enter', 'Space'].map((k) => <span key={k} className="px-3 py-2 rounded-lg bg-surface border-b-4 border border-[color:var(--line)]">{k}</span>)}</div></div>
)
export const StartDemo = () => (
  <div className={box} aria-hidden><motion.span className="btn btn-primary" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}>▶ Play</motion.span></div>
)
export function OrbDemo() {
  const seq: VoiceState[] = ['idle', 'listening', 'thinking', 'speaking']
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % seq.length), 2200); return () => clearInterval(id) }, [])
  return <div className={`${box} !h-40`} aria-hidden><VoiceOrb state={seq[i]} size={110} /></div>
}
export const TalkDemo = () => (
  <div className={box} aria-hidden><div className="flex items-center gap-3"><span className="w-12 h-12 rounded-full bg-glow text-onglow grid place-items-center text-2xl">🎤</span><motion.div className="flex gap-1 items-end h-8" >{[0, 1, 2, 3, 4].map((i) => <motion.span key={i} className="w-1.5 rounded-full bg-glow" animate={{ height: [6, 26, 10, 20, 6] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12 }} />)}</motion.div></div></div>
)
export const LangDemo = () => (
  <div className={box} aria-hidden><div className="flex gap-2 text-lg font-display">{['EN', 'हि', 'অ', 'বা'].map((l, i) => <motion.span key={l} className="w-11 h-11 grid place-items-center rounded-full bg-surface border border-[color:var(--line)]" animate={{ borderColor: ['rgba(255,255,255,.15)', 'rgb(244,185,66)', 'rgba(255,255,255,.15)'] }} transition={{ duration: 4, repeat: Infinity, delay: i }}>{l}</motion.span>)}</div></div>
)
export const SoundDemo = () => (
  <div className={box} aria-hidden><div className="flex items-center gap-3 text-3xl"><span>🔊</span><span className="flex gap-1 items-end h-7">{[0, 1, 2, 3].map((i) => <motion.span key={i} className="w-1.5 rounded-full bg-tea" animate={{ height: [4, 22, 8, 18, 4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }} />)}</span></div></div>
)
