import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { sound } from '../lib/sound'
import { getLangInfo } from '../lib/langs'
import { useAsync, fmtDate } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { useVoice } from '../context/Voice'
import { Modal, PageShell, Spinner } from '../components/ui'
import Icon from '../components/Icon'
import Yaadri from '../character/Yaadri'
import VoiceOrb from '../character/VoiceOrb'
import type { ChatMsg, Mood, Proposal, Unlocked } from '../types'

interface ChatRes { reply: string; mood: Mood; source: 'openai' | 'demo'; degraded: boolean; conversationId: string | null; proposals: Proposal[]; remembered: unknown[]; unlocked: Unlocked[] }
interface Conv { id: string; title: string; updated_at: string }

/** Reveals a reply word by word: the "typing" feel. Instant when motion is reduced. */
function Typed({ text, on }: { text: string; on: boolean }) {
  const { reduced } = useApp()
  const words = text.split(/(\s+)/)
  const [n, setN] = useState(on && !reduced ? 0 : words.length)
  useEffect(() => {
    if (!on || reduced) { setN(words.length); return }
    setN(0)
    const step = Math.max(18, Math.min(60, 2400 / words.length))
    const id = setInterval(() => setN((x) => { if (x >= words.length) { clearInterval(id); return x } return x + 1 }), step)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, on])
  return <span className="whitespace-pre-wrap">{words.slice(0, n).join('')}</span>
}

export default function Talk() {
  useVisit('talk')
  const { t, me, lang, settings, updateSettings, toast, errText, unlocked, refresh } = useApp()
  const voice = useVoice()
  const st = useAsync(() => api.get<{ ai: 'live' | 'demo' }>('/status'), [])
  const welcome = useCallback((): ChatMsg => ({ id: 'welcome', role: 'assistant', content: t('talk.welcome', { name: me!.profile.displayName }), mood: 'happy' }), [t, me])
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [welcome()])
  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [mood, setMood] = useState<Mood>('happy')
  const [drawer, setDrawer] = useState(false)
  const [micNote, setMicNote] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const { reduced } = useApp()

  useEffect(() => { setMsgs((m) => (m.length === 1 && m[0].id === 'welcome' ? [welcome()] : m)) }, [welcome])
  useEffect(() => { end.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' }) }, [msgs, busy, reduced])
  useEffect(() => () => voice.stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const speakReply = useCallback(async (text: string) => {
    const r = await voice.speak(text, lang)
    if (r === 'unsupported') setMicNote(t('talk.voiceNoLang', { lang: getLangInfo(lang).name }))
    else if (r === 'failed') toast(t('talk.speakFailed'), 'error')
    else setMicNote(null)
  }, [voice, lang, t, toast])

  const send = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    setFailed(null); setInput(''); setBusy(true); voice.setThinking(true); setMood('thinking'); sound.sfx('click')
    const mine: ChatMsg = { id: `u${Date.now()}`, role: 'user', content: text }
    setMsgs((m) => [...m.map((x) => ({ ...x, fresh: false })), mine])
    try {
      const history = msgs.filter((m) => m.id !== 'welcome').slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
      const r = await api.post<ChatRes>('/chat', { message: text, conversationId: convId ?? undefined, history: settings.saveHistory ? undefined : history })
      setConvId(r.conversationId)
      setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: r.reply, mood: r.mood, proposals: r.proposals, fresh: true }])
      setMood(r.mood); sound.sfx('character')
      if (r.remembered.length) { toast(t('talk.kept'), 'success'); sound.sfx('memory'); void refresh() }
      if (r.degraded) toast(t('talk.aiFallback'))
      unlocked(r.unlocked)
      voice.setThinking(false)
      if (settings.autoSpeak && settings.voiceEnabled) void speakReply(r.reply)
    } catch (e) {
      voice.setThinking(false); setMood('confused'); setFailed(text); setInput(text); toast(errText(e), 'error')
    } finally { setBusy(false) }
  }, [busy, msgs, convId, settings.saveHistory, settings.autoSpeak, settings.voiceEnabled, voice, toast, t, unlocked, errText, speakReply, refresh])

  const talk = () => {
    if (voice.state === 'listening') { voice.stopListening(); return }
    setMicNote(null)
    voice.listen((text) => void send(text), (m) => { setMicNote(m); setMood('confused') })
  }
  const keep = async (id: string, p: Proposal) => {
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, proposals: x.proposals?.filter((y) => y.content !== p.content) } : x)))
    try {
      const r = await api.post<{ unlocked: Unlocked[] }>('/memories', { content: p.content, kind: p.kind === 'preference' ? 'preference' : 'note', source: 'chat' })
      sound.sfx('memory'); toast(t('talk.kept'), 'success'); unlocked(r.unlocked); void refresh()
    } catch (e) { toast(errText(e), 'error') }
  }
  const drop = (id: string, p: Proposal) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, proposals: x.proposals?.filter((y) => y.content !== p.content) } : x)))
  const lastReply = [...msgs].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  const newChat = () => { voice.stop(); setConvId(null); setMsgs([welcome()]); setMood('happy'); setFailed(null); setDrawer(false) }
  const info = getLangInfo(lang)

  return (
    <PageShell wide>
      <div className="grid lg:grid-cols-[21rem_1fr] gap-5">
        <aside className="panel p-4 sm:p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap gap-1.5 justify-center mb-2">
            <span className="chip">{st.data?.ai === 'live' ? t('talk.liveAi') : t('talk.demoAi')}</span>
            <span className="chip">{voice.ttsMode === 'elevenlabs' && info.voice.supported ? t('talk.studioVoice') : t('talk.deviceVoice')}</span>
          </div>
          <VoiceOrb state={voice.state} mood={mood} size={typeof window !== 'undefined' && window.innerWidth < 640 ? 170 : 230} onPress={talk} pressLabel={voice.state === 'listening' ? t('talk.stop') : t('talk.talk')} />
          {voice.state === 'listening' && <p className="text-center text-dim min-h-[1.5rem]" role="status">{voice.transcript ? t('talk.heard', { text: voice.transcript }) : t('voice.listeningHint')}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className={`btn btn-sm col-span-3 ${voice.state === 'listening' ? 'btn-danger' : 'btn-primary'} !min-h-[3.2rem] text-lg`} onClick={talk} disabled={busy}><Icon name={voice.state === 'listening' ? 'stop' : 'mic'} /> {voice.state === 'listening' ? t('talk.stop') : t('talk.talk')}</button>
            <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem]" onClick={() => speakReply(lastReply)} disabled={!lastReply}><Icon name="speaker" size={20} /><span className="text-xs">{t('talk.listen')}</span></button>
            {voice.state === 'paused' ? <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem]" onClick={voice.resume}><Icon name="play" size={20} /><span className="text-xs">{t('talk.resume')}</span></button>
              : <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem]" onClick={voice.pause} disabled={voice.state !== 'speaking'}><Icon name="pause" size={20} /><span className="text-xs">{t('talk.pause')}</span></button>}
            <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem]" onClick={voice.stop} disabled={voice.state !== 'speaking' && voice.state !== 'paused'}><Icon name="stop" size={20} /><span className="text-xs">{t('talk.stop')}</span></button>
            <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem] col-span-2" onClick={voice.replay} disabled={!voice.lastText}><Icon name="replay" size={20} /><span className="text-xs">{t('talk.replay')}</span></button>
            <button className="btn btn-ghost btn-sm flex-col !gap-0.5 !py-2 !min-h-[3.4rem]" aria-pressed={!settings.voiceEnabled} onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}><Icon name={settings.voiceEnabled ? 'speaker' : 'speaker-off'} size={20} /><span className="text-xs">{settings.voiceEnabled ? t('talk.mute') : t('talk.unmute')}</span></button>
          </div>
          {micNote && <p role="alert" className="mt-3 text-sm text-orchid">{micNote}</p>}
          {!info.voice.supported && !micNote && <p className="mt-3 text-sm text-dim">{t('talk.voiceNoLang', { lang: info.name })}</p>}
          {voice.ttsMode === 'demo' && info.voice.supported && <p className="mt-3 text-xs text-dim">{t('talk.demoVoiceNote')}</p>}
        </aside>

        <section className="flex flex-col min-h-[60dvh]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-3xl">{t('talk.title')}</h1>
            <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={newChat}><Icon name="plus" size={18} /> {t('talk.newChat')}</button><button className="btn btn-ghost btn-sm" onClick={() => setDrawer(true)}><Icon name="book" size={18} /> {t('talk.history')}</button></div>
          </div>
          {!settings.saveHistory && <p className="chip mb-2 self-start">{t('talk.historyOff')}</p>}
          <div role="log" aria-live="polite" aria-label={t('talk.title')} className="flex-1 space-y-4 pb-4">
            {msgs.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <div className="shrink-0 w-11"><Yaadri mood={m.fresh ? (m.mood ?? 'idle') : 'idle'} size={44} still={!m.fresh} label="" /></div>}
                <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block text-left rounded-3xl px-4 py-3 text-lg leading-snug ${m.role === 'user' ? 'bg-glow text-onglow rounded-br-md' : 'bg-surface border border-[color:var(--line)] rounded-bl-md'}`}>
                    {m.role === 'assistant' ? <Typed text={m.content} on={!!m.fresh} /> : m.content}
                  </div>
                  {m.proposals?.map((p) => (
                    <motion.div key={p.content} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-orchid/15 border border-orchid/40 px-3 py-2 text-left">
                      <span className="text-sm">{t('talk.proposal', { text: p.content })}</span>
                      <button className="btn btn-primary btn-sm" onClick={() => keep(m.id, p)}><Icon name="memory" size={16} /> {t('talk.remember')}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => drop(m.id, p)}>{t('talk.notNow')}</button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
            {busy && <div className="flex gap-3 items-center" role="status" aria-label={t('talk.state.thinking')}><Yaadri mood="thinking" size={44} label="" /><div className="rounded-3xl bg-surface border border-[color:var(--line)] px-4 py-4 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="w-2.5 h-2.5 rounded-full bg-glow animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />)}</div></div>}
            {failed && <div role="alert" className="rounded-2xl bg-danger/15 border border-danger/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2"><span>{t('talk.failed')}</span><button className="btn btn-ghost btn-sm" onClick={() => send(failed)}>{t('common.retry')}</button></div>}
            <div ref={end} />
          </div>

          <div className="sticky bottom-[4.9rem] lg:bottom-4 space-y-2 bg-gradient-to-t from-bg via-bg/90 to-transparent pt-3">
            {msgs.length <= 2 && <div className="flex flex-wrap gap-2">{(['talk.s1', 'talk.s2', 'talk.s3', 'talk.s4'] as const).map((k) => <button key={k} className="chip !text-base !py-2 !text-ink hover:!bg-glow/25" onClick={() => send(t(k))} disabled={busy}>{t(k)}</button>)}</div>}
            <form onSubmit={(e) => { e.preventDefault(); void send(input) }} className="flex gap-2">
              <label htmlFor="chat-in" className="sr-only">{t('talk.placeholder')}</label>
              <input id="chat-in" className="field flex-1 !min-h-[3.4rem] text-lg" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('talk.placeholder')} maxLength={1000} autoComplete="off" />
              <button type="button" className="btn btn-ghost !px-4" onClick={talk} aria-label={t('talk.talk')}><Icon name="mic" /></button>
              <button type="submit" className="btn btn-primary !px-5" disabled={busy || !input.trim()} aria-label={t('talk.send')}>{busy ? <Spinner size={18} /> : <Icon name="send" />}</button>
            </form>
          </div>
        </section>
      </div>

      <History open={drawer} onClose={() => setDrawer(false)} onOpen={(id, title, list) => { setConvId(id); setMsgs(list.length ? list : [welcome()]); setDrawer(false); void title }} onDeleted={(id) => { if (id === convId) newChat() }} saveHistory={settings.saveHistory} />
    </PageShell>
  )
}

function History({ open, onClose, onOpen, onDeleted, saveHistory }: { open: boolean; onClose: () => void; onOpen: (id: string, title: string, msgs: ChatMsg[]) => void; onDeleted: (id: string) => void; saveHistory: boolean }) {
  const { t, lang, toast, errText } = useApp()
  const s = useAsync(() => (open && saveHistory ? api.get<{ conversations: Conv[] }>('/chat/conversations') : Promise.resolve({ conversations: [] as Conv[] })), [open, saveHistory])
  const load = async (c: Conv) => {
    try {
      const r = await api.get<{ messages: { id: string; role: 'user' | 'assistant'; content: string; mood: Mood | null }[] }>(`/chat/conversations/${c.id}`)
      onOpen(c.id, c.title, r.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, mood: m.mood })))
    } catch (e) { toast(errText(e), 'error') }
  }
  const remove = async (c: Conv) => {
    try { await api.del(`/chat/conversations/${c.id}`); s.setData((d) => (d ? { conversations: d.conversations.filter((x) => x.id !== c.id) } : d)); onDeleted(c.id) } catch (e) { toast(errText(e), 'error') }
  }
  return (
    <Modal open={open} onClose={onClose} title={t('talk.history')} sheet>
      {!saveHistory ? <p className="text-dim">{t('talk.historyOff')}</p> : s.loading ? <div className="py-6 grid place-items-center"><Spinner /></div>
        : !s.data?.conversations.length ? <p className="text-dim">{t('talk.noHistory')}</p> : (
        <ul className="space-y-2"><AnimatePresence>{s.data.conversations.map((c) => (
          <motion.li key={c.id} exit={{ opacity: 0, x: 30 }} className="flex items-center gap-2">
            <button className="flex-1 text-left rounded-2xl bg-ink/10 hover:bg-ink/15 px-4 py-3 min-w-0" onClick={() => load(c)}><span className="block truncate font-display text-lg">{c.title}</span><span className="text-xs text-dim">{fmtDate(c.updated_at, lang)}</span></button>
            <button className="btn btn-danger btn-sm !px-3" onClick={() => remove(c)} aria-label={t('talk.deleteChat')}><Icon name="trash" size={18} /></button>
          </motion.li>))}</AnimatePresence></ul>
      )}
    </Modal>
  )
}
