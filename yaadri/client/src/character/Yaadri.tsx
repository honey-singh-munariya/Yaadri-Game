import { useId } from 'react'
import { motion } from 'framer-motion'
import { MOODS } from './moods'
import type { Mood } from '../types'

const MOUTHS: Record<string, string> = {
  smile: 'M91 133 Q100 141 109 133',
  gentle: 'M92 133 Q100 139 108 133',
  flat: 'M93 136 Q100 134 107 137',
  wavy: 'M90 136 Q95 130 100 136 T110 136',
  frown: 'M92 140 Q100 132 108 140',
}
const BROWS: Record<string, [string, string] | null> = {
  none: null,
  raised: ['M76 92 Q84 86 92 91', 'M108 91 Q116 86 124 92'],
  worried: ['M76 96 Q84 94 92 88', 'M108 88 Q116 94 124 96'],
  skeptic: ['M76 94 Q84 92 92 94', 'M108 87 Q116 83 124 89'],
  kind: ['M76 93 Q84 89 92 92', 'M108 92 Q116 89 124 93'],
}

interface Props { mood?: Mood; size?: number; className?: string; label?: string; still?: boolean }

export default function Yaadri({ mood = 'idle', size = 200, className, label = 'YAADRI, a friendly lantern spirit', still }: Props) {
  const m = MOODS[mood]
  const id = useId().replace(/:/g, '')
  const [lx, ly] = m.look
  const eye = (cx: number) => {
    if (m.eyes === 'happy') return <path d={`M${cx - 8} 112 Q${cx} 100 ${cx + 8} 112`} stroke="#2a1b12" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    if (m.eyes === 'soft') return <path d={`M${cx - 8} 108 Q${cx} 116 ${cx + 8} 108`} stroke="#2a1b12" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    const ry = m.eyes === 'wide' ? 11 : 9.5
    return (
      <motion.g style={{ transformBox: 'fill-box', transformOrigin: 'center' }} animate={still ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }} transition={{ duration: 5.5, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}>
        <ellipse cx={cx} cy={108} rx={8} ry={ry} fill="#2a1b12" />
        <circle cx={cx + 2.5 + lx} cy={104 + ly} r={3} fill="#fff" />
      </motion.g>
    )
  }
  const brows = BROWS[m.brows]
  return (
    <svg viewBox="0 0 200 230" width={size} height={size * 1.15} className={className} role="img" aria-label={label}>
      <defs>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.9" /><stop offset="1" stopColor="#f4b942" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd066" /><stop offset="0.6" stopColor="#f4b942" /><stop offset="1" stopColor="#e0902b" />
        </linearGradient>
        <radialGradient id={`i${id}`} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.85" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="100" cy="118" r="98" fill={`url(#g${id})`} animate={{ opacity: m.glow }} transition={{ duration: 0.6 }} />
      <motion.g animate={still ? undefined : { y: [0, -7, 0] }} transition={{ duration: m.bob, repeat: Infinity, ease: 'easeInOut' }}>
        {/* hanging string + bamboo cap */}
        <path d="M100 0 V36" stroke="#b98b4f" strokeWidth="2.5" />
        <rect x="70" y="34" width="60" height="17" rx="8.5" fill="#8a6a3b" /><path d="M78 42 H122" stroke="#6b4f27" strokeWidth="1.6" strokeLinecap="round" />
        {/* leaf wings */}
        <g className={m.flutter && !still ? 'animate-flutter' : ''} style={{ transformOrigin: '56px 108px' }}>
          <path d="M58 108 Q26 84 30 116 Q40 130 58 120Z" fill="#7cc08c" /><path d="M58 112 Q42 108 34 114" stroke="#4d9a63" strokeWidth="1.5" fill="none" />
        </g>
        <g className={m.flutter && !still ? 'animate-flutter' : ''} style={{ transformOrigin: '144px 108px', animationDirection: 'reverse' }}>
          <path d="M142 108 Q174 84 170 116 Q160 130 142 120Z" fill="#7cc08c" /><path d="M142 112 Q158 108 166 114" stroke="#4d9a63" strokeWidth="1.5" fill="none" />
        </g>
        {/* lantern body */}
        <path d="M62 56 Q36 112 60 166 Q100 194 140 166 Q164 112 138 56 Q100 44 62 56Z" fill={`url(#b${id})`} />
        <path d="M62 56 Q36 112 60 166 Q100 194 140 166 Q164 112 138 56 Q100 44 62 56Z" fill={`url(#i${id})`} />
        <path d="M84 52 Q66 112 82 176 M116 52 Q134 112 118 176 M100 48 V184" stroke="#c9822a" strokeWidth="1.4" fill="none" opacity="0.45" />
        <rect x="76" y="170" width="48" height="12" rx="6" fill="#8a6a3b" />
        <path d="M86 182 V198 M100 182 V206 M114 182 V198" stroke="#b98b4f" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="86" cy="200" r="3" fill="#d98cc0" /><circle cx="100" cy="209" r="3.4" fill="#f4b942" /><circle cx="114" cy="200" r="3" fill="#d98cc0" />
        {/* face */}
        {eye(85)}{eye(115)}
        {brows && <g stroke="#2a1b12" strokeWidth="3" strokeLinecap="round" fill="none"><path d={brows[0]} /><path d={brows[1]} /></g>}
        <ellipse cx="72" cy="126" rx="8" ry="5" fill="#d98cc0" opacity={m.blush} /><ellipse cx="128" cy="126" rx="8" ry="5" fill="#d98cc0" opacity={m.blush} />
        {m.mouth === 'grin' && <path d="M88 128 Q100 148 112 128 Q100 134 88 128Z" fill="#2a1b12" />}
        {m.mouth === 'o' && <ellipse cx="100" cy="136" rx="4.5" ry="5.5" fill="#2a1b12" />}
        {m.mouth === 'talk' && <motion.ellipse cx="100" cy="136" rx="6" ry="3" fill="#2a1b12" animate={still ? { ry: 3 } : { ry: [2, 7, 3, 6, 2.5, 5, 2] }} transition={{ duration: 0.9, repeat: Infinity }} />}
        {MOUTHS[m.mouth] && <path d={MOUTHS[m.mouth]} stroke="#2a1b12" strokeWidth="3.2" fill="none" strokeLinecap="round" />}
        {m.sparkles && [[34, 50], [166, 44], [22, 140], [178, 150]].map(([x, y], i) => (
          <motion.path key={i} d={`M${x} ${y - 8} L${x + 2.4} ${y - 2.4} L${x + 8} ${y} L${x + 2.4} ${y + 2.4} L${x} ${y + 8} L${x - 2.4} ${y + 2.4} L${x - 8} ${y} L${x - 2.4} ${y - 2.4}Z`} fill="#fff3c4"
            animate={{ scale: [0.4, 1.2, 0.4], opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        ))}
      </motion.g>
    </svg>
  )
}
