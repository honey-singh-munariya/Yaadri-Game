import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../lib/api'
import { sound } from '../lib/sound'
import { useApp } from '../context/AppContext'
import { useVoice } from '../context/Voice'
import { ErrorState, Loading, PageShell } from '../components/ui'
import Icon from '../components/Icon'
import Yaadri from '../character/Yaadri'
import type { ChapterInfo, JourneyOverview, ScenePayload } from '../types'

interface Hint { level: number; text: string; reveal?: string }

export default function StoryGame() {
  const { t, reward, toast, errText } = useApp()
  const voice = useVoice()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const chapterId = sp.get('chapter')
  const [scene, setScene] = useState<ScenePayload | null>(null)
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(0)
  const [hint, setHint] = useState<Hint | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const timer = useRef<number>()

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = chapterId ? await api.post<JourneyOverview>('/journey/start', { chapterId }) : await api.get<JourneyOverview>('/journey')
      setChapters(r.chapters)
      if (!r.scene) { nav('/journey', { replace: true }); return }
      setScene(r.scene); setShown(0)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [chapterId, nav])
  useEffect(() => { void load() }, [load])
  useEffect(() => () => { voice.stop(); clearTimeout(timer.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal lines one at a time; anyone can tap to reveal everything at once.
  useEffect(() => {
    clearTimeout(timer.current)
    if (!scene || shown >= scene.lines.length) return
    timer.current = window.setTimeout(() => { setShown((s) => s + 1); sound.sfx('tick') }, shown === 0 ? 350 : Math.min(2600, 900 + scene.lines[shown - 1].length * 22))
    return () => clearTimeout(timer.current)
  }, [scene, shown])

  const apply = (r: JourneyOverview & { correct?: boolean }) => {
    setChapters(r.chapters)
    if (r.scene) { setScene(r.scene); setShown(0); setHint(null); setWrong([]) }
    if (r.reward) reward(r.reward)
    if (r.scene?.end) sound.sfx('level')
  }
  const choose = async (id: string) => {
    if (busy) return
    setBusy(true); sound.sfx('click'); voice.stop()
    try { apply(await api.post<JourneyOverview>('/journey/choice', { choiceId: id })) } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }
  const answer = async (id: string) => {
    if (busy || wrong.includes(id)) return
    setBusy(true); voice.stop()
    try {
      const r = await api.post<JourneyOverview & { correct: boolean; hint?: Hint }>('/journey/answer', { optionId: id })
      if (r.correct) { sound.sfx('correct'); apply(r) } else { sound.sfx('wrong'); setHint(r.hint ?? null); setWrong((w) => (w.includes(id) ? w : [...w, id])) }
    } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }

  if (loading && !scene) return <PageShell><Loading /></PageShell>
  if (error && !scene) return <PageShell><ErrorState error={error} onRetry={load} /></PageShell>
  if (!scene) return null

  const idx = chapters.findIndex((c) => c.id === scene.chapterId)
  const next = chapters[idx + 1]
  const all = shown >= scene.lines.length
  const readAloud = () => (voice.state === 'speaking' ? voice.stop() : void voice.speak(scene.lines.join(' '), 'en'))

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-4">
        <Link to="/journey" className="btn btn-ghost btn-sm"><Icon name="back" size={18} /> {t('nav.journey')}</Link>
        <div className="text-center"><div className="text-sm text-dim">{t('story.chapter', { n: idx + 1 })}</div><div className="font-display text-xl">{scene.chapterTitle}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={readAloud} aria-pressed={voice.state === 'speaking'}><Icon name={voice.state === 'speaking' ? 'stop' : 'speaker'} size={18} /> {voice.state === 'speaking' ? t('talk.stop') : t('story.listen')}</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={scene.sceneId + scene.chapterId} className="panel p-5 sm:p-8" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }} onClick={() => setShown(scene.lines.length)}>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            <Yaadri mood={scene.mood} size={132} className="shrink-0" />
            <div className="flex-1 space-y-3 text-xl leading-relaxed min-h-[7rem]" aria-live="polite">
              {scene.lines.slice(0, shown).map((l, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={l.startsWith('“') || l.includes('“') ? 'font-display text-2xl text-glow/95' : ''}>{l}</motion.p>
              ))}
              {!all && <p className="text-sm text-dim" aria-hidden>…</p>}
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="mt-4 space-y-3">
        {all && scene.choices && !scene.end && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3">
            {scene.choices.length > 1 && <p className="text-dim text-center">{t('story.chooseNext')}</p>}
            {scene.choices.map((c) => <button key={c.id} disabled={busy} onClick={() => choose(c.id)} className="btn btn-ghost !justify-start text-left text-xl min-h-[3.8rem] !rounded-2xl hover:!border-glow">{c.label}</button>)}
          </motion.div>
        )}

        {all && scene.challenge && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel p-5">
            <p className="text-dim text-sm">{t('story.question')}</p>
            <h2 className="text-2xl mt-1">{scene.challenge.prompt}</h2>
            <p className="text-dim mt-1">{t('story.tapAnswer')}</p>
            <div className="mt-4 grid gap-3">
              {scene.challenge.options.map((o) => (
                <motion.button key={o.id} disabled={busy || wrong.includes(o.id)} onClick={() => answer(o.id)}
                  animate={hint?.reveal === o.id ? { scale: [1, 1.03, 1] } : wrong.includes(o.id) ? { x: [0, -6, 6, 0] } : {}} transition={{ duration: hint?.reveal === o.id ? 1 : 0.3, repeat: hint?.reveal === o.id ? Infinity : 0 }}
                  className={`btn text-left !justify-start text-xl min-h-[3.6rem] !rounded-2xl border-2 ${hint?.reveal === o.id ? 'border-glow bg-glow/25' : 'border-[color:var(--line)] bg-ink/10'} ${wrong.includes(o.id) ? 'opacity-30' : ''}`}>{o.label}</motion.button>
              ))}
            </div>
            {hint && <motion.div key={hint.level} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-glow/15 border border-glow/40 px-4 py-3 flex gap-3 items-start" role="status"><Yaadri mood="encouraging" size={44} still /><div><p className="text-sm text-dim">{t('story.hint')}</p><p className="text-lg">{hint.text}</p></div></motion.div>}
          </motion.div>
        )}

        {all && scene.end && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="panel !border-glow p-6 text-center shadow-lantern">
            <div className="text-5xl" aria-hidden>🌟</div>
            <h2 className="text-3xl mt-1">{t('story.complete')}</h2>
            <p className="mt-2 text-lg text-dim">{scene.end.outcome}</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              {next && next.status !== 'locked' && <button className="btn btn-primary" onClick={() => nav(`/games/story?chapter=${next.id}`, { replace: true })}>{t('story.nextChapter')}: {next.title}</button>}
              <Link to="/journey" className={`btn ${next ? 'btn-ghost' : 'btn-primary'}`}>{t('story.toJourney')}</Link>
            </div>
          </motion.div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-dim">{t('story.englishOnly')}</p>
    </PageShell>
  )
}
