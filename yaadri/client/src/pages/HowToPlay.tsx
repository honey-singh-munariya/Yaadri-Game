import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { PageHeader, PageShell } from '../components/ui'
import { BadgeDemo, CardsDemo, ChoiceDemo, HeartsDemo, KeysDemo, MemoryDemo, StartDemo, TalkDemo, XpDemo } from '../components/Illustrations'
import { sound } from '../lib/sound'

export default function HowToPlay() {
  const { t, status } = useApp()
  const nav = useNavigate()
  const art = [<StartDemo />, <KeysDemo />, <CardsDemo />, <HeartsDemo />, <XpDemo />, <BadgeDemo />, <MemoryDemo />, <ChoiceDemo />, <TalkDemo />]
  const n = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] as const
  return (
    <PageShell wide>
      <PageHeader title={t('howplay.title')} subtitle={t('howplay.subtitle')} />
      <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {n.map((k, i) => (
          <motion.li key={k} className="panel p-5" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.06 }}>
            {art[i]}
            <h2 className="text-2xl mt-4"><span className="text-glow mr-2">{i + 1}.</span>{t(`howplay.${k}.t` as 'howplay.s1.t')}</h2>
            <p className="mt-2 text-dim">{t(`howplay.${k}.b` as 'howplay.s1.b')}</p>
          </motion.li>
        ))}
      </ol>
      <div className="text-center mt-8"><button className="btn btn-primary text-xl px-10" onClick={() => { sound.sfx('start'); nav(status === 'ready' ? '/games' : '/enter?next=/games') }}>{t('howplay.cta')}</button></div>
    </PageShell>
  )
}
