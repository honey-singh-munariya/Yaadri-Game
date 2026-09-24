import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAsync, fmtDate } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AsyncView, Modal, PageHeader, PageShell, WeaveBand } from '../components/ui'
import Icon from '../components/Icon'
import Yaadri from '../character/Yaadri'
import { sound } from '../lib/sound'
import type { JourneyOverview } from '../types'

type Res = JourneyOverview & { choices: { chapter_id: string; label: string; created_at: string }[] }

export default function Journey() {
  useVisit('journey')
  const { t, lang, toast, errText } = useApp()
  const nav = useNavigate()
  const s = useAsync(() => api.get<Res>('/journey'), [])
  const [confirm, setConfirm] = useState(false)
  const replay = async () => {
    try { await api.post('/journey/replay'); setConfirm(false); sound.sfx('start'); s.reload() } catch (e) { toast(errText(e), 'error') }
  }
  return (
    <PageShell>
      <PageHeader title={t('nav.journey')} subtitle={t('journey.subtitle')} />
      <WeaveBand className="max-w-xs -mt-3 mb-6" />
      <AsyncView state={s}>{(j) => {
        const done = j.chapters.filter((c) => c.status === 'complete').length
        const max = Math.max(6, j.stats.warmth, j.stats.curiosity, j.stats.courage)
        return (
          <div className="grid lg:grid-cols-[1fr_18rem] gap-6 items-start">
            <ol className="relative space-y-4 pl-0">
              {j.chapters.map((c, i) => {
                const locked = c.status === 'locked', complete = c.status === 'complete'
                return (
                  <motion.li key={c.id} className="relative flex gap-4" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <div className="flex flex-col items-center">
                      <span className={`w-14 h-14 shrink-0 rounded-full grid place-items-center text-2xl border-2 ${complete ? 'bg-tea/25 border-tea' : locked ? 'bg-ink/10 border-[color:var(--line)] grayscale opacity-60' : 'bg-glow/25 border-glow shadow-lantern'}`} aria-hidden>{locked ? '🔒' : complete ? '✓' : c.icon}</span>
                      {i < j.chapters.length - 1 && <span className={`flex-1 w-0.5 mt-1 ${complete ? 'bg-tea/60' : 'bg-ink/20'}`} style={{ backgroundImage: complete ? undefined : 'repeating-linear-gradient(to bottom, currentColor 0 6px, transparent 6px 12px)' }} aria-hidden />}
                    </div>
                    <div className={`panel flex-1 p-4 sm:p-5 mb-1 ${locked ? 'opacity-60' : ''}`}>
                      <p className="text-sm text-dim">{t('story.chapter', { n: i + 1 })}</p>
                      <h2 className="text-2xl">{c.title}</h2>
                      <p className="text-dim mt-1">{c.blurb}</p>
                      {complete && c.ending && <p className="mt-2 text-tea"><span className="text-sm text-dim block">{t('journey.ending')}</span>{c.ending}</p>}
                      <div className="mt-3">
                        {locked ? <p className="text-sm text-dim flex items-center gap-2"><Icon name="lock" size={16} />{t('journey.locked')}</p>
                          : complete ? <span className="chip !text-tea"><Icon name="check" size={14} /> {t('journey.complete')}</span>
                          : <button className="btn btn-primary btn-sm" onClick={() => nav(`/games/story?chapter=${c.id}`)}>{c.status === 'in_progress' ? t('journey.continue') : t('journey.start')}</button>}
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </ol>
            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="panel p-5 text-center"><Yaadri mood={done === 5 ? 'celebrating' : 'happy'} size={90} className="mx-auto" /><p className="font-display text-xl mt-1">{done === 5 ? t('journey.done') : t('journey.progress', { a: done, b: j.chapters.length })}</p>
                {j.run > 0 && <p className="text-sm text-dim">{t('journey.run', { n: j.run + 1 })}</p>}</div>
              <div className="panel p-5"><h2 className="text-xl mb-3">{t('journey.stats')}</h2>
                {(['warmth', 'curiosity', 'courage'] as const).map((k) => (
                  <div key={k} className="mb-3"><div className="flex justify-between text-sm"><span>{t(`journey.${k}` as 'journey.warmth')}</span><span className="text-dim">{j.stats[k]}</span></div>
                    <div className="h-2.5 rounded-full bg-ink/15 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-glow to-orchid" initial={{ width: 0 }} animate={{ width: `${(j.stats[k] / max) * 100}%` }} transition={{ duration: 0.8 }} /></div></div>
                ))}</div>
              <div className="panel p-5"><h2 className="text-xl mb-2">{t('journey.choices')}</h2>
                {j.choices.length === 0 ? <p className="text-dim">{t('journey.noChoices')}</p> : <ul className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">{j.choices.map((c, i) => <li key={i} className="text-sm"><span className="block">{c.label}</span><span className="text-dim text-xs">{fmtDate(c.created_at, lang)}</span></li>)}</ul>}</div>
              {done > 0 && <button className="btn btn-ghost w-full" onClick={() => setConfirm(true)}>{t('journey.replay')}</button>}
              <Link to="/achievements" className="btn btn-ghost w-full"><Icon name="trophy" size={18} /> {t('nav.achievements')}</Link>
            </aside>
            <Modal open={confirm} onClose={() => setConfirm(false)} title={t('journey.replay')}>
              <p className="text-lg">{t('journey.replayConfirm')}</p>
              <div className="mt-5 flex gap-3 justify-end"><button className="btn btn-ghost" onClick={() => setConfirm(false)}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={replay}>{t('journey.replay')}</button></div>
            </Modal>
          </div>
        )
      }}</AsyncView>
    </PageShell>
  )
}
