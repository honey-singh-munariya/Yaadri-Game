/**
 * Procedural sound system (Web Audio): no audio files to download, works offline, and nothing plays until the
 * person has switched sound on. Ambience is a very quiet generative pad with occasional pentatonic chimes.
 */
type Name = 'click' | 'start' | 'correct' | 'wrong' | 'level' | 'achievement' | 'memory' | 'character' | 'notify' | 'voice' | 'flip' | 'tick'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = false
  private ambienceWanted = false
  private amb: { nodes: AudioNode[]; timer?: number } | null = null

  private ensure(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setEnabled(v: boolean) {
    this.enabled = v
    if (!v) this.stopAmbience()
    else { this.ensure(); this.syncAmbience() }
  }
  setAmbience(v: boolean) { this.ambienceWanted = v; this.syncAmbience() }
  isReady() { return !!this.ctx && this.ctx.state === 'running' }
  /** Browsers block audio until a gesture; call from a global first-interaction listener. */
  unlock() { if (this.enabled) { this.ensure(); this.syncAmbience() } }

  private tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.16, glideTo?: number) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter()
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + at)
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + at + dur)
    f.type = 'lowpass'; f.frequency.value = 4200
    g.gain.setValueAtTime(0.0001, c.currentTime + at)
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur)
    o.connect(f).connect(g).connect(this.master!)
    o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.05)
  }

  /** Musical pitch for game lanterns etc. */
  note(i: number, dur = 0.35) {
    if (!this.ensure()) return
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
    this.tone(scale[i % scale.length], 0, dur, 'triangle', 0.2)
  }

  sfx(name: Name) {
    if (!this.ensure()) return
    switch (name) {
      case 'click': this.tone(660, 0, 0.07, 'sine', 0.09); break
      case 'tick': this.tone(880, 0, 0.04, 'sine', 0.05); break
      case 'flip': this.tone(520, 0, 0.09, 'triangle', 0.1, 700); break
      case 'start': [392, 494, 587, 784].forEach((f, i) => this.tone(f, i * 0.09, 0.28, 'triangle', 0.14)); break
      case 'correct': this.tone(659, 0, 0.16, 'sine', 0.16); this.tone(880, 0.1, 0.3, 'sine', 0.16); break
      case 'wrong': this.tone(300, 0, 0.28, 'sine', 0.1, 240); break // soft, low, never harsh
      case 'level': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.11, 0.4, 'triangle', 0.15)); break
      case 'achievement': [1319, 1568, 1976].forEach((f, i) => { this.tone(f, i * 0.12, 0.9, 'sine', 0.11); this.tone(f * 2.01, i * 0.12, 0.5, 'sine', 0.04) }); break
      case 'memory': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, i * 0.07, 0.6, 'sine', 0.08)); break
      case 'character': this.tone(740, 0, 0.09, 'sine', 0.1, 990); this.tone(880, 0.1, 0.12, 'sine', 0.1, 1175); break
      case 'notify': this.tone(880, 0, 0.14, 'sine', 0.1); this.tone(1175, 0.14, 0.2, 'sine', 0.1); break
      case 'voice': this.tone(520, 0, 0.1, 'sine', 0.08, 780); break
    }
  }

  private syncAmbience() {
    if (this.enabled && this.ambienceWanted) this.startAmbience()
    else this.stopAmbience()
  }
  private startAmbience() {
    const c = this.ensure()
    if (!c || this.amb) return
    const out = c.createGain(); out.gain.value = 0.0001
    out.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 4)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700
    out.connect(lp).connect(this.master!)
    const nodes: AudioNode[] = [out, lp]
    for (const [f, d] of [[110, -4], [164.81, 3], [220, 0], [277.18, -6]] as const) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = d
      const g = c.createGain(); g.gain.value = f < 200 ? 0.5 : 0.22
      const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08
      const lg = c.createGain(); lg.gain.value = 0.18
      lfo.connect(lg).connect(g.gain)
      o.connect(g).connect(out); o.start(); lfo.start()
      nodes.push(o, g, lfo, lg)
    }
    const chimes = [523.25, 587.33, 659.25, 783.99, 880]
    const schedule = () => {
      if (!this.amb || !this.ctx) return
      this.tone(chimes[Math.floor(Math.random() * chimes.length)], 0, 2.4, 'sine', 0.03)
      this.amb.timer = window.setTimeout(schedule, 6000 + Math.random() * 7000)
    }
    this.amb = { nodes }
    this.amb.timer = window.setTimeout(schedule, 3500)
  }
  private stopAmbience() {
    if (!this.amb) return
    clearTimeout(this.amb.timer)
    const c = this.ctx
    const [out] = this.amb.nodes as GainNode[]
    if (c && out) { out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(0.0001, c.currentTime, 0.4) }
    const nodes = this.amb.nodes
    setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop?.() } catch { /* already stopped */ } try { n.disconnect() } catch { /* ok */ } }), 1500)
    this.amb = null
  }
}

export const sound = new SoundEngine()
