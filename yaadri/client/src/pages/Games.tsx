import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AsyncView, PageHeader, PageShell } from '../components/ui'
import { LanternRow, PathFork, Portraits } from '../components/Illustrations'
import Icon from '../components/Icon'
import type { JourneyOverview } from '../types'

interface GamesRes { progress: { game: string; best_level: number; plays: number }[] }

export default function Games() {
  useVisit('games')
  const { t, me } = useApp()
  const s = useAsync(async () => { const [g, j] = await Promise.all([api.get<GamesRes>('/games'), api.get<JourneyOverview>('/journey')]); return { g, j } }, [])
  return (
    <PageShell wide>
      <PageHeader title={t('games.title')} subtitle={t('games.subtitle')} />
      <AsyncView state={s}>{({ g, j }) => {
        const st = (k: string) => g.progress.find((p) => p.game === k)
        const done = j.chapters.filter((c) => c.status === 'complete').length
        const cards = [
          { k: 'quest', to: '/games/quest', art: <LanternRow />, stats: [[t('games.best'), st('memory-quest')?.best_level ?? 0], [t('games.plays'), st('memory-quest')?.plays ?? 0]] },
          { k: 'story', to: '/games/story', art: <PathFork />, stats: [[t('games.chapters'), `${done} / ${j.chapters.length}`]] },
          { k: 'family', to: '/games/quest?mode=family', art: <Portraits />, stats: [[t('games.best'), st('family-faces')?.best_level ?? 0], [t('games.plays'), st('family-faces')?.plays ?? 0]] },
        ]
        return (
          <div className="grid md:grid-cols-3 gap-5">
            {cards.map((c, i) => (
              <motion.article key={c.k} className="panel p-5 flex flex-col" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                {c.art}
                <h2 className="text-2xl mt-4">{t(`games.${c.k}.title` as 'games.quest.title')}</h2>
                <p className="mt-2 text-dim flex-1">{t(`games.${c.k}.body` as 'games.quest.body')}</p>
                <dl className="mt-4 flex gap-6">{c.stats.map(([l, v]) => <div key={String(l)}><dt className="text-sm text-dim">{l}</dt><dd className="font-display text-2xl">{v}</dd></div>)}</dl>
                <div className="mt-4 flex gap-2">
                  <Link to={c.to} className="btn btn-primary flex-1"><Icon name="play" size={18} filled /> {t('games.play')}</Link>
                  <Link to="/how-to-play" className="btn btn-ghost" aria-label={t('games.howTo')}><Icon name="help" size={20} /></Link>
                </div>
                {c.k === 'family' && (me?.counts.capsules ?? 0) === 0 && <p className="mt-3 text-sm text-dim">{t('games.needCapsules')} <Link className="underline" to="/family">{t('nav.family')}</Link></p>}
              </motion.article>
            ))}
          </div>
        )
      }}</AsyncView>
    </PageShell>
  )
}
