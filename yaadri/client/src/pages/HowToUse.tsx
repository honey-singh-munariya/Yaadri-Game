import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { useVisit } from '../lib/visit'
import { PageHeader, PageShell } from '../components/ui'
import { CardsDemo, LangDemo, LanternRow, MemoryDemo, OrbDemo, Portraits, SoundDemo, TalkDemo, XpDemo } from '../components/Illustrations'

export default function HowToUse() {
  useVisit('howto')
  const { t } = useApp()
  const art = [<TalkDemo />, <OrbDemo />, <MemoryDemo />, <LangDemo />, <LanternRow />, <CardsDemo />, <XpDemo />, <SoundDemo />, <Portraits />]
  const n = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] as const
  return (
    <PageShell wide>
      <PageHeader title={t('howuse.title')} subtitle={t('howuse.subtitle')} />
      <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {n.map((k, i) => (
          <motion.li key={k} className="panel p-5" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.06 }}>
            {art[i]}
            <h2 className="text-2xl mt-4"><span className="text-glow mr-2">{i + 1}.</span>{t(`howuse.${k}.t` as 'howuse.s1.t')}</h2>
            <p className="mt-2 text-dim">{t(`howuse.${k}.b` as 'howuse.s1.b')}</p>
          </motion.li>
        ))}
      </ol>
    </PageShell>
  )
}
