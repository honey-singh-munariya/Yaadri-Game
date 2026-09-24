import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAsync, fmtDate } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AsyncView, PageShell, XPBar } from '../components/ui'
import Yaadri from '../character/Yaadri'
import Icon from '../components/Icon'
import { LanternRow, PathFork, Portraits } from '../components/Illustrations'
import type { JourneyOverview } from '../types'

interface GamesRes { progress: { game: string; best_level: number; plays: number }[]; recent: { game: string; level: number; score: number; stars: number; completed: boolean; xp_awarded: number; created_at: string }[] }

export default function Play() {
  useVisit('play')
  const { t, me, lang } = useApp()
  const s = useAsync(async () => { const [g, j] = await Promise.all([api.get<GamesRes>('/games'), api.get<JourneyOverview>('/journey')]); return { g, j } }, [])
  const p = me!.profile
  return (
    <PageShell wide>
      <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Yaadri mood="happy" size={92} />
            <div className="min-w-0"><h1 className="text-3xl sm:text-4xl">{t('play.greeting', { name: p.displayName })}</h1><p className="text-dim text-lg mt-1">{t('play.next')}</p></div>
          </div>
          <AsyncView state={s}>{({ g, j }) => {
            const quest = g.progress.find((x) => x.game === 'memory-quest'), inProg = j.chapters.find((c) => c.status === 'in_progress'), avail = j.chapters.find((c) => c.status === 'available')
            const story = inProg ?? avail
            return (
              <>
                <motion.div className="panel !border-glow/60 shadow-lantern p-5 sm:p-6 grid sm:grid-cols-[1fr_auto] gap-4 items-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div>
                    <p className="text-dim">{t('play.bestLevel', { n: quest?.best_level ?? 0 })}</p>
                    <h2 className="text-3xl mt-1">{t('play.continueQuest', { n: (quest?.best_level ?? 0) + 1 })}</h2>
                  </div>
                  <Link to={`/games/quest?level=${(quest?.best_level ?? 0) + 1}`} className="btn btn-primary text-xl min-h-[3.6rem] px-8"><Icon name="play" filled /> {t('games.play')}</Link>
                </motion.div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="panel p-5"><PathFork /><h3 className="text-2xl mt-3">{story ? (inProg ? t('play.continueStory', { title: story.title }) : t('play.startStory')) : t('journey.done')}</h3>
                    <p className="text-dim mt-1">{story?.blurb ?? j.chapters[j.chapters.length - 1].ending}</p>
                    <Link to={story ? `/games/story?chapter=${story.id}` : '/journey'} className="btn btn-ghost btn-sm mt-3">{story ? t('journey.continue') : t('nav.journey')}</Link></div>
                  <div className="panel p-5"><Portraits /><h3 className="text-2xl mt-3">{t('games.family.title')}</h3><p className="text-dim mt-1">{t('games.family.body')}</p>
                    <Link to="/games/quest?mode=family" className="btn btn-ghost btn-sm mt-3">{t('games.play')}</Link></div>
                </div>
                <div className="panel p-5 mt-4 flex items-center gap-4"><Yaadri mood="listening" size={56} still /><div className="flex-1"><h3 className="text-xl">{t('play.quickTalk')}</h3></div><Link to="/talk" className="btn btn-ghost btn-sm"><Icon name="mic" size={18} />{t('nav.talkShort')}</Link></div>
                <h2 className="text-2xl mt-8 mb-3">{t('play.recent')}</h2>
                {g.recent.length === 0 ? <p className="text-dim">{t('play.noRecent')}</p> : (
                  <ul className="space-y-2">{g.recent.map((r, i) => (
                    <li key={i} className="panel px-4 py-3 flex items-center justify-between gap-3">
                      <span><span className="font-display text-lg">{r.game === 'story-memory' ? t('games.story.title') : r.game === 'family-faces' ? t('games.family.title') : t('games.quest.title')}</span> <span className="text-dim">{t('common.level', { n: r.level })}</span><span className="block text-sm text-dim">{fmtDate(r.created_at, lang)}</span></span>
                      <span className="text-right">{r.completed && r.game !== 'story-memory' ? <span aria-label={t('quest.stars', { n: r.stars })}>{'⭐'.repeat(r.stars)}</span> : null}<span className="block text-glow font-display">{t('unlock.xp', { n: r.xp_awarded })}</span></span>
                    </li>))}</ul>
                )}
              </>
            )
          }}</AsyncView>
        </div>
        <aside className="panel p-5 lg:sticky lg:top-24"><XPBar profile={p} /><LanternRow /><Link to="/achievements" className="btn btn-ghost btn-sm mt-4 w-full"><Icon name="trophy" size={18} /> {t('nav.achievements')}</Link></aside>
      </div>
    </PageShell>
  )
}
