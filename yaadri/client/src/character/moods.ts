import type { Mood } from '../types'

/**
 * Character skin contract. To replace the artwork later, keep `MOODS` (behaviour per state) and swap the
 * drawing in <Yaadri/> (or render an <img>/Lottie per mood, using the same keys).
 */
export interface MoodSpec {
  eyes: 'open' | 'happy' | 'wide' | 'soft'
  look: [number, number]
  mouth: 'smile' | 'grin' | 'o' | 'flat' | 'wavy' | 'frown' | 'talk' | 'gentle'
  brows: 'none' | 'raised' | 'worried' | 'skeptic' | 'kind'
  glow: number
  bob: number
  flutter: boolean
  sparkles: boolean
  blush: number
}

export const MOODS: Record<Mood, MoodSpec> = {
  idle: { eyes: 'open', look: [0, 0], mouth: 'smile', brows: 'none', glow: 0.55, bob: 4.2, flutter: false, sparkles: false, blush: 0.25 },
  happy: { eyes: 'happy', look: [0, 0], mouth: 'grin', brows: 'none', glow: 0.8, bob: 2.6, flutter: true, sparkles: false, blush: 0.5 },
  thinking: { eyes: 'open', look: [-3, -4], mouth: 'flat', brows: 'skeptic', glow: 0.5, bob: 5, flutter: false, sparkles: false, blush: 0.15 },
  listening: { eyes: 'wide', look: [0, 0], mouth: 'o', brows: 'raised', glow: 0.75, bob: 3.4, flutter: false, sparkles: false, blush: 0.25 },
  speaking: { eyes: 'open', look: [0, 0], mouth: 'talk', brows: 'none', glow: 0.85, bob: 2.4, flutter: true, sparkles: false, blush: 0.35 },
  celebrating: { eyes: 'happy', look: [0, 0], mouth: 'grin', brows: 'raised', glow: 1, bob: 1.1, flutter: true, sparkles: true, blush: 0.6 },
  confused: { eyes: 'open', look: [3, -2], mouth: 'wavy', brows: 'skeptic', glow: 0.45, bob: 4.6, flutter: false, sparkles: false, blush: 0.1 },
  encouraging: { eyes: 'soft', look: [0, 0], mouth: 'gentle', brows: 'kind', glow: 0.8, bob: 3.2, flutter: false, sparkles: false, blush: 0.45 },
  concerned: { eyes: 'soft', look: [0, 1], mouth: 'frown', brows: 'worried', glow: 0.4, bob: 5.4, flutter: false, sparkles: false, blush: 0.1 },
}
