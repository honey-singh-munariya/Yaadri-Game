import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

interface Fly { x: number; y: number; vx: number; vy: number; ph: number; r: number; sp: number }

/** Firefly field on a single canvas. Sprite-based (cheap), pauses when the tab is hidden, and scales down or vanishes with motion settings. */
export default function Particles({ count = 36, attract = false, focus = null, className = '' }: { count?: number; attract?: boolean; focus?: { x: number; y: number } | null; className?: string }) {
  const { settings, reduced } = useApp()
  const ref = useRef<HTMLCanvasElement>(null)
  const focusRef = useRef(focus)
  focusRef.current = focus
  const n = reduced ? 0 : settings.motion === 'gentle' ? Math.round(count * 0.4) : count

  useEffect(() => {
    const cv = ref.current
    if (!cv || n === 0) { cv?.getContext('2d')?.clearRect(0, 0, cv.width, cv.height); return }
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let W = 0, H = 0, raf = 0, last = performance.now()
    const mouse = { x: -999, y: -999 }
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64
    const sctx = sprite.getContext('2d')!
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,236,170,1)'); g.addColorStop(0.25, 'rgba(255,205,110,.55)'); g.addColorStop(1, 'rgba(244,185,66,0)')
    sctx.fillStyle = g; sctx.fillRect(0, 0, 64, 64)

    const resize = () => {
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const flies: Fly[] = Array.from({ length: n }, () => ({ x: Math.random() * W, y: H * (0.25 + Math.random() * 0.75), vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 10, ph: Math.random() * 6.28, r: 5 + Math.random() * 9, sp: 0.6 + Math.random() * 1.2 }))
    const onMove = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top }
    if (attract) window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (document.hidden) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      ctx.clearRect(0, 0, W, H)
      const f = focusRef.current
      for (const p of flies) {
        p.ph += dt * p.sp
        p.vx += Math.sin(p.ph * 1.3) * 6 * dt; p.vy += Math.cos(p.ph) * 5 * dt
        const tx = f ? f.x * W : attract ? mouse.x : -999, ty = f ? f.y * H : attract ? mouse.y : -999
        const dx = tx - p.x, dy = ty - p.y, d2 = dx * dx + dy * dy
        if (f || (attract && d2 < 220 * 220)) { const k = (f ? 26 : 12) / Math.max(60, Math.sqrt(d2)); p.vx += dx * k * dt; p.vy += dy * k * dt }
        p.vx *= 0.985; p.vy *= 0.985
        p.x += p.vx * dt; p.y += p.vy * dt
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph * 2.1))
        const s = p.r * 2.4
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', resize) }
  }, [n, attract])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 w-full h-full ${className}`} />
}
