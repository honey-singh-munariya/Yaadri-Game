import { Router } from 'express'
import express from 'express'
import { Readable } from 'node:stream'
import { z } from 'zod'
import { config } from '../config'
import { HttpError, parse, wrap } from '../util'
import { getLanguage, LANGUAGES } from '../../shared/languages'

export const voice = Router()

const ISO3: Record<string, string> = { en: 'eng', hi: 'hin', bn: 'ben', as: 'asm' }

voice.get('/voice/status', (_req, res) => {
  res.json({
    tts: config.eleven.key ? 'elevenlabs' : 'demo',
    stt: config.eleven.key ? 'elevenlabs' : 'browser',
    languages: LANGUAGES.map((l) => ({ code: l.code, voice: l.voice.supported, browserTag: l.browserTag ?? null })),
  })
})

/** Strip things a voice should not read aloud. */
const speakable = (t: string) => t.replace(/\(Demo mode:[^)]*\)/g, '').replace(/[•*_`#>]/g, '').replace(/\s+/g, ' ').trim()

voice.post('/voice/speak', wrap(async (req, res) => {
  const b = parse(z.object({ text: z.string().min(1).max(900), lang: z.string().max(8).default('en') }), req.body)
  const lang = getLanguage(b.lang)
  if (!lang.voice.supported) {
    throw new HttpError(422, 'voice_language_unsupported', `${lang.name} voice is not available yet. YAADRI can speak English, Hindi, Bengali and Assamese.`)
  }
  if (!config.eleven.key) throw new HttpError(501, 'voice_not_configured', 'Studio voice is not set up on this server, so YAADRI is using your device voice.')
  const text = speakable(b.text).slice(0, 700)
  if (!text) throw new HttpError(400, 'nothing_to_say', 'There was nothing to read aloud.')

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 30_000)
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.eleven.voiceId)}?output_format=mp3_44100_64`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'xi-api-key': config.eleven.key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: lang.voice.model, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true } }),
    })
    if (!r.ok || !r.body) {
      console.warn('[voice] ElevenLabs TTS failed with status', r.status)
      throw new HttpError(502, 'voice_unavailable', 'The voice service could not answer just now. Please try again.')
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, max-age=600')
    Readable.fromWeb(r.body as any).pipe(res)
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(502, 'voice_unavailable', 'The voice service could not answer just now. Please try again.')
  } finally {
    clearTimeout(timer)
  }
}))

voice.post('/voice/transcribe', express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '6mb' }), wrap(async (req, res) => {
  if (!config.eleven.key) throw new HttpError(501, 'stt_not_configured', 'Server speech recognition is not set up. Your browser can listen instead.')
  const body = req.body as Buffer
  if (!Buffer.isBuffer(body) || body.length < 500) throw new HttpError(400, 'no_audio', 'No audio was received.')
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(body)], { type: req.get('content-type') || 'audio/webm' }), 'speech.webm')
  form.append('model_id', config.eleven.sttModel)
  const code = ISO3[String(req.query.lang ?? '')]
  if (code) form.append('language_code', code)
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': config.eleven.key }, body: form })
  if (!r.ok) {
    console.warn('[voice] ElevenLabs STT failed with status', r.status)
    throw new HttpError(502, 'stt_unavailable', 'Speech recognition could not answer just now. Please try again or type instead.')
  }
  const data: any = await r.json()
  res.json({ text: String(data.text ?? '').trim() })
}))
