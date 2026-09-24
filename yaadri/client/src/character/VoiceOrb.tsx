import { motion } from 'framer-motion'
import Yaadri from './Yaadri'
import type { Mood } from '../types'
import type { VoiceState } from '../context/Voice'
import { useApp } from '../context/AppContext'

const MOOD_FOR: Record<VoiceState, Mood> = { idle: 'idle', listening: 'listening', thinking: 'thinking', speaking: 'speaking', paused: 'encouraging' }

/** The living voice orb: rings and character react to IDLE / LISTENING / THINKING / SPEAKING / PAUSED. */
export default function VoiceOrb({ state, mood, size = 220, onPress, pressLabel }: { state: VoiceState; mood?: Mood; size?: number; onPress?: () => void; pressLabel?: string }) {
  const { t } = useApp()
  const m: Mood = state === 'idle' && mood ? mood : MOOD_FOR[state]
  const ring = state === 'listening' ? 'border-tea' : state === 'speaking' ? 'border-glow' : state === 'thinking' ? 'border-orchid' : 'border-ink/20'
  const body = (
    <div className="relative grid place-items-center" style={{ width: size, height: size * 1.05 }}>
      {(state === 'listening' || state === 'speaking') && [0, 1, 2].map((i) => (
        <span key={i} aria-hidden className={`absolute inset-4 rounded-full border-2 ${ring} animate-pulseRing`} style={{ animationDelay: `${i * 0.6}s`, animationDuration: state === 'speaking' ? '1.4s' : '2.2s' }} />
      ))}
      {state === 'thinking' && (
        <motion.span aria-hidden className="absolute inset-3 rounded-full border-2 border-dashed border-orchid/70" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
      )}
      <span aria-hidden className={`absolute inset-6 rounded-full border ${state === 'paused' ? 'border-dashed' : ''} ${ring} bg-glow/5`} />
      <Yaadri mood={m} size={size * 0.62} />
    </div>
  )
  return (
    <div className="flex flex-col items-center">
      {onPress ? (
        <button type="button" onClick={onPress} aria-label={pressLabel ?? t('voice.orb')} className="rounded-full focus-visible:ring-4 ring-glow/60">{body}</button>
      ) : body}
      <p role="status" aria-live="polite" className="mt-1 text-sm text-dim font-display">{t(`talk.state.${state}` as const)}</p>
    </div>
  )
}
