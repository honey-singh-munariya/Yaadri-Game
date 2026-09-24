import { useMemo } from 'react'

/** Layered misty-hills scene: ridges, terraced slopes, bamboo groves, mist. Abstract and place-inspired, not tied to any one community's symbols. */
function ridge(seed: number, base: number, amp: number, step = 24) {
  let d = `M0 900 L0 ${base}`
  for (let x = 0; x <= 1600; x += step) {
    const y = base - amp * (0.5 * Math.sin(x * 0.004 + seed) + 0.32 * Math.sin(x * 0.011 + seed * 2.3) + 0.18 * Math.sin(x * 0.027 + seed * 0.7))
    d += ` L${x} ${y.toFixed(1)}`
  }
  return d + ' L1600 900 Z'
}
const ridgeY = (seed: number, base: number, amp: number, x: number) => base - amp * (0.5 * Math.sin(x * 0.004 + seed) + 0.32 * Math.sin(x * 0.011 + seed * 2.3) + 0.18 * Math.sin(x * 0.027 + seed * 0.7))

function Bamboo({ x, h, delay, tone = 'var(--bamboo)' }: { x: number; h: number; delay: number; tone?: string }) {
  const nodes = Math.floor(h / 95)
  return (
    <g className="animate-sway" style={{ transformOrigin: `${x}px 900px`, animationDelay: `${delay}s`, animationDuration: `${6 + (delay % 3)}s` }}>
      <rect x={x - 6} y={900 - h} width="12" height={h} rx="6" fill={tone} />
      {Array.from({ length: nodes }, (_, i) => <rect key={i} x={x - 8} y={900 - 70 - i * 95} width="16" height="4" rx="2" fill={tone} opacity=".85" />)}
      {[0, 1, 2, 3].map((i) => {
        const y = 900 - h + 30 + i * 60
        const dir = i % 2 ? 1 : -1
        return <path key={i} d={`M${x} ${y} q${dir * 60} -26 ${dir * 120} 6 q${-dir * 60} -4 ${-dir * 120} -6z`} fill={tone} opacity=".9" />
      })}
    </g>
  )
}

export default function WorldScene({ soft = false }: { soft?: boolean }) {
  const paths = useMemo(() => ({
    r1: ridge(1.2, 520, 140), r2: ridge(3.4, 640, 130), r3: ridge(5.1, 740, 90), r4: ridge(7.7, 850, 60),
    terr: Array.from({ length: 9 }, (_, j) => {
      let d = ''
      for (let x = 0; x <= 1600; x += 24) d += `${x === 0 ? 'M' : 'L'}${x} ${(ridgeY(3.4, 640, 130, x) + 14 + j * 17).toFixed(1)} `
      return d
    }),
  }), [])
  const stars = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (i * 373) % 1600, y: (i * 197) % 360, r: 0.8 + ((i * 7) % 5) * 0.3, o: 0.35 + ((i * 13) % 6) * 0.1 })), [])
  const par = (d: number) => ({ transform: `translate3d(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d * 0.5}px), 0)` } as const)
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky-a)" /><stop offset=".55" stopColor="var(--sky-b)" /><stop offset="1" stopColor="var(--sky-c)" /></linearGradient>
        <radialGradient id="moon" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff4d0" stopOpacity=".95" /><stop offset=".35" stopColor="#ffd98a" stopOpacity=".35" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--mist))" stopOpacity="0" /><stop offset=".5" stopColor="rgb(var(--mist))" stopOpacity=".22" /><stop offset="1" stopColor="rgb(var(--mist))" stopOpacity="0" /></linearGradient>
        <clipPath id="clip2"><path d={paths.r2} /></clipPath>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      <g style={{ opacity: 'var(--stars)' }}>{stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}</g>
      <g className="parallax" style={par(6)}><circle cx="1180" cy="230" r="150" fill="url(#moon)" /><circle cx="1180" cy="230" r="34" fill="#fff1c6" opacity=".92" /></g>
      <g className="parallax" style={par(10)}><path d={paths.r1} fill="var(--ridge-1)" /></g>
      <g className="parallax" style={par(16)}>
        <path d={paths.r2} fill="var(--ridge-2)" />
        <g clipPath="url(#clip2)" fill="none" stroke="rgb(var(--mist))" strokeOpacity=".13" strokeWidth="2">{paths.terr.map((d, i) => <path key={i} d={d} />)}</g>
      </g>
      <g className="animate-drift" style={{ opacity: soft ? 0.5 : 1 }}><rect x="-100" y="500" width="1800" height="170" fill="url(#mist)" /></g>
      <g className="parallax" style={par(24)}><path d={paths.r3} fill="var(--ridge-3)" /></g>
      {!soft && (
        <g className="parallax" style={par(34)}>
          <Bamboo x={70} h={620} delay={0} /><Bamboo x={128} h={520} delay={1.2} tone="var(--bamboo-2)" /><Bamboo x={196} h={700} delay={0.6} /><Bamboo x={262} h={470} delay={2} tone="var(--bamboo-2)" />
          <Bamboo x={1330} h={480} delay={0.9} tone="var(--bamboo-2)" /><Bamboo x={1398} h={690} delay={0.3} /><Bamboo x={1466} h={560} delay={1.7} tone="var(--bamboo-2)" /><Bamboo x={1536} h={650} delay={1} />
        </g>
      )}
      <g className="animate-drift" style={{ animationDuration: '20s', opacity: soft ? 0.4 : 0.9 }}><rect x="-100" y="690" width="1800" height="150" fill="url(#mist)" /></g>
      <g className="parallax" style={par(44)}><path d={paths.r4} fill="var(--ridge-4)" /></g>
    </svg>
  )
}
