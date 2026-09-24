import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAsync, fmtDate } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AsyncView, PageHeader, PageShell } from '../components/ui'

interface A { id: string; name: string; description: string; icon: string; xp: number; unlocked_at: string | null }

export default function Achievements() {
  useVisit('achievements')
  const { t, lang } = useApp()
  const s = useAsync(() => api.get<{ achievements: A[] }>('/achievements'), [])
  return (
    <PageShell wide>
      <PageHeader title={t('ach.title')} subtitle={t('ach.subtitle')} />
      <AsyncView state={s}>{({ achievements }) => {
        const n = achievements.filter((a) => a.unlocked_at).length
        return (
          <>
            <p className="font-display text-xl mb-4">{t('ach.progress', { a: n, b: achievements.length })}</p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((a, i) => {
                const got = !!a.unlocked_at
                return (
                  <motion.li key={a.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className={`panel p-5 flex gap-4 items-start ${got ? '!border-glow/70 shadow-lantern' : ''}`}>
                    <span className={`text-5xl ${got ? '' : 'grayscale opacity-30'}`} aria-hidden>{a.icon}</span>
                    <div className="min-w-0">
                      <h2 className="text-xl">{a.name}</h2>
                      <p className="text-dim">{a.description}</p>
                      <p className={`mt-2 text-sm ${got ? 'text-tea' : 'text-dim'}`}>{got ? `${t('ach.unlocked')}: ${fmtDate(a.unlocked_at!, lang)}` : `${t('ach.locked')}: ${t('ach.bonus', { n: a.xp })}`}</p>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </>
        )
      }}</AsyncView>
    </PageShell>
  )
}
