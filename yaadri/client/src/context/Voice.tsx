import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, postBlob } from '../lib/api'
import { sound } from '../lib/sound'
import { getLangInfo } from '../lib/langs'
import { useApp } from './AppContext'

/**
 * Voice pipeline: speech input -> (AI, in the Talk page) -> ElevenLabs speech (server-side key) -> playback.
 * Falls back honestly: device voice when the server has no key, text-only when a language has no voice.
 */
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'
type Engine = 'studio' | 'device' | 'none'

interface VoiceStatus { tts: 'elevenlabs' | 'demo'; stt: 'elevenlabs' | 'browser'; languages: { code: string; voice: boolean; browserTag: string | null }[] }

interface V {
  state: VoiceState
  setThinking: (b: boolean) => void
  transcript: string
  engine: Engine
  ttsMode: 'elevenlabs' | 'demo' | null
  canListen: boolean
  lastText: string
  listen: (onFinal: (text: string) => void, onError: (msg: string) => void) => void
  stopListening: () => void
  speak: (text: string, lang?: string) => Promise<'ok' | 'muted' | 'unsupported' | 'failed'>
  pause: () => void
  resume: () => void
  stop: () => void
  replay: () => void
}
const C = createContext<V>(null as never)
export const useVoice = () => useContext(C)

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { settings, lang, status, t } = useApp()
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [engine, setEngine] = useState<Engine>('none')
  const [vs, setVs] = useState<VoiceStatus | null>(null)
  const [last, setLast] = useState<{ text: string; lang: string }>({ text: '', lang: 'en' })
  const audio = useRef<HTMLAudioElement | null>(null)
  const cache = useRef(new Map<string, string>())
  const rec = useRef<any>(null)
  const media = useRef<{ mr: MediaRecorder; chunks: Blob[]; timer: number } | null>(null)
  const thinking = useRef(false)
  const token = useRef(0)

  useEffect(() => { if (status === 'ready') api.get<VoiceStatus>('/voice/status').then(setVs).catch(() => setVs(null)) }, [status])

  const stopPlayback = useCallback(() => {
    token.current++
    if (audio.current) { audio.current.pause(); audio.current.src = ''; audio.current = null }
    window.speechSynthesis?.cancel()
  }, [])

  const stop = useCallback(() => { stopPlayback(); setState(thinking.current ? 'thinking' : 'idle') }, [stopPlayback])
  useEffect(() => () => { stopPlayback(); rec.current?.abort?.() }, [stopPlayback])
  // Muting the voice stops anything currently playing.
  useEffect(() => { if (!settings.voiceEnabled) stop() }, [settings.voiceEnabled, stop])

  const setThinking = useCallback((b: boolean) => {
    thinking.current = b
    setState((s) => (b ? 'thinking' : s === 'thinking' ? 'idle' : s))
  }, [])

  const deviceSpeak = useCallback((text: string, tag: string | null, my: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis
      if (!synth) return resolve(false)
      const voices = synth.getVoices()
      const pref = tag?.split('-')[0]
      const voice = voices.find((v) => v.lang.toLowerCase() === tag?.toLowerCase()) ?? voices.find((v) => pref && v.lang.toLowerCase().startsWith(pref))
      if (tag && !voice && pref !== 'en') return resolve(false) // no honest voice for this language on this device
      const u = new SpeechSynthesisUtterance(text)
      if (voice) { u.voice = voice; u.lang = voice.lang } else if (tag) u.lang = tag
      u.rate = 0.92; u.pitch = 1.05
      u.onend = () => { if (token.current === my) setState(thinking.current ? 'thinking' : 'idle'); resolve(true) }
      u.onerror = () => { if (token.current === my) setState('idle'); resolve(false) }
      setEngine('device'); setState('speaking')
      synth.cancel(); synth.speak(u)
    })
  }, [])

  const speak = useCallback<V['speak']>(async (text, forLang) => {
    const l = forLang ?? lang
    setLast({ text, lang: l })
    if (!settings.voiceEnabled) return 'muted'
    stopPlayback()
    const my = token.current
    const info = getLangInfo(l)
    const tag = vs?.languages.find((x) => x.code === l)?.browserTag ?? info.browserTag ?? null
    const studioOk = vs?.tts === 'elevenlabs' && info.voice.supported
    setState('speaking')
    if (studioOk) {
      try {
        const key = `${l}|${text}`
        let url = cache.current.get(key)
        if (!url) { url = URL.createObjectURL(await postBlob('/voice/speak', { text, lang: l })); cache.current.set(key, url) }
        if (token.current !== my) return 'ok'
        const a = new Audio(url)
        audio.current = a
        a.onended = () => { if (token.current === my) setState(thinking.current ? 'thinking' : 'idle') }
        a.onerror = () => { if (token.current === my) setState('idle') }
        setEngine('studio')
        sound.sfx('voice')
        await a.play()
        return 'ok'
      } catch (e) {
        if (token.current !== my) return 'ok'
        if (e instanceof ApiError && e.code === 'voice_language_unsupported') { setState('idle'); return 'unsupported' }
        // Studio voice failed (network, quota, autoplay): fall through to the device voice.
      }
    }
    if (!info.voice.supported && !tag) { setState(thinking.current ? 'thinking' : 'idle'); setEngine('none'); return 'unsupported' }
    const ok = await deviceSpeak(text, tag ?? 'en-IN', my)
    if (!ok && token.current === my) { setState(thinking.current ? 'thinking' : 'idle'); return info.voice.supported ? 'failed' : 'unsupported' }
    return ok ? 'ok' : 'failed'
  }, [lang, settings.voiceEnabled, stopPlayback, vs, deviceSpeak])

  const pause = useCallback(() => {
    if (audio.current) audio.current.pause(); else window.speechSynthesis?.pause()
    setState('paused')
  }, [])
  const resume = useCallback(() => {
    if (audio.current) void audio.current.play(); else window.speechSynthesis?.resume()
    setState('speaking')
  }, [])
  const replay = useCallback(() => { if (last.text) void speak(last.text, last.lang) }, [last, speak])

  const stopListening = useCallback(() => {
    rec.current?.stop?.()
    if (media.current) { clearTimeout(media.current.timer); if (media.current.mr.state !== 'inactive') media.current.mr.stop() }
  }, [])

  const canListen = !!SR || (vs?.stt === 'elevenlabs' && typeof MediaRecorder !== 'undefined')

  const listen = useCallback<V['listen']>((onFinal, onError) => {
    stopPlayback()
    setTranscript('')
    const tag = vs?.languages.find((x) => x.code === lang)?.browserTag ?? getLangInfo(lang).browserTag ?? 'en-IN'
    if (SR) {
      const r = new SR()
      rec.current = r
      r.lang = tag; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false
      let finalText = ''
      r.onstart = () => { setState('listening'); sound.sfx('voice') }
      r.onresult = (ev: any) => {
        let interim = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i]
          if (res.isFinal) finalText += res[0].transcript; else interim += res[0].transcript
        }
        setTranscript((finalText + ' ' + interim).trim())
      }
      r.onerror = (ev: any) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') onError(t('talk.micDenied'))
        else if (ev.error === 'no-speech') onError(t('talk.noSpeech'))
        else if (ev.error !== 'aborted') onError(t('talk.noSpeech'))
      }
      r.onend = () => {
        setState((s) => (s === 'listening' ? 'idle' : s))
        const txt = finalText.trim()
        setTranscript('')
        if (txt) onFinal(txt)
      }
      try { r.start() } catch { onError(t('talk.noMic')) }
      return
    }
    if (vs?.stt === 'elevenlabs' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mr = new MediaRecorder(stream)
        const chunks: Blob[] = []
        mr.ondataavailable = (e) => chunks.push(e.data)
        mr.onstart = () => setState('listening')
        mr.onstop = async () => {
          stream.getTracks().forEach((tr) => tr.stop())
          setState('thinking')
          try {
            const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
            const res = await fetch(`/api/voice/transcribe?lang=${encodeURIComponent(lang)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type, 'X-Requested-With': 'yaadri' }, body: blob })
            const data = await res.json()
            setState('idle')
            if (res.ok && data.text) onFinal(data.text); else onError(t('talk.noSpeech'))
          } catch { setState('idle'); onError(t('talk.noSpeech')) }
        }
        const timer = window.setTimeout(() => { if (mr.state !== 'inactive') mr.stop() }, 12000)
        media.current = { mr, chunks, timer }
        mr.start()
      }).catch(() => onError(t('talk.micDenied')))
      return
    }
    onError(t('talk.noMic'))
  }, [lang, stopPlayback, t, vs])

  const value = useMemo<V>(() => ({
    state, setThinking, transcript, engine, ttsMode: vs?.tts ?? null, canListen, lastText: last.text, listen, stopListening, speak, pause, resume, stop, replay,
  }), [state, setThinking, transcript, engine, vs, canListen, last.text, listen, stopListening, speak, pause, resume, stop, replay])
  return <C.Provider value={value}>{children}</C.Provider>
}
