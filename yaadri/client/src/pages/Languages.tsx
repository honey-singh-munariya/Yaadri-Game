import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LANGUAGES } from '../lib/langs'
import { coverage } from '../i18n'
import { useApp } from '../context/AppContext'
import { useVisit } from '../lib/visit'
import { PageHeader, PageShell, WeaveBand } from '../components/ui'
import Icon from '../components/Icon'

export default function Languages() {
  useVisit('languages')
  const { t, lang, setLanguage, toast } = useApp()
  return (
    <PageShell wide>
      <PageHeader title={t('lang.title')} subtitle={t('lang.subtitle')} />
      <WeaveBand className="max-w-xs -mt-3 mb-6" />
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LANGUAGES.map((l, i) => {
          const cov = coverage(l.code), current = l.code === lang
          return (
            <motion.li key={l.code} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`panel p-5 flex flex-col ${current ? '!border-glow shadow-lantern' : ''}`}>
              <div className="flex items-baseline justify-between gap-2"><h2 className="text-3xl">{l.native}</h2><span className="text-dim">{l.name}</span></div>
              <p className="text-sm text-dim">{l.region}</p>
              <dl className="mt-4 space-y-3 flex-1">
                <div><dt className="text-sm text-dim flex justify-between"><span>{t('lang.ui')}</span><span>{cov === 0 ? t('lang.none') : t('lang.coverage', { n: cov })}</span></dt>
                  <dd><div className="h-2 rounded-full bg-ink/15 mt-1 overflow-hidden"><div className="h-full bg-glow rounded-full" style={{ width: `${cov}%` }} /></div>{cov > 0 && cov < 100 || l.code !== 'en' && cov > 0 ? <span className="text-xs text-orchid">{t('lang.draft')}</span> : null}</dd></div>
                <div className="flex justify-between"><dt className="text-sm text-dim">{t('lang.ai')}</dt><dd className="chip">{t(`lang.ai.${l.ai}` as 'lang.ai.good')}</dd></div>
                <div className="flex justify-between items-center"><dt className="text-sm text-dim">{t('lang.voice')}</dt><dd className={`chip ${l.voice.supported ? '!text-tea' : ''}`}><Icon name={l.voice.supported ? 'speaker' : 'speaker-off'} size={14} /> {l.voice.supported ? t('lang.voiceYes') : t('lang.voiceNo')}</dd></div>
              </dl>
              <button className={`btn mt-4 ${current ? 'btn-ghost' : 'btn-primary'}`} disabled={current} onClick={() => { void setLanguage(l.code); toast(`${t('lang.changed')}: ${l.native}`, 'success') }}>{current ? t('lang.current') : t('lang.select')}</button>
            </motion.li>
          )
        })}
      </ul>
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="panel p-5"><h2 className="text-2xl">{t('lang.helpTitle')}</h2><p className="mt-2 text-dim">{t('lang.helpBody')}</p><Link to="/contact" className="btn btn-primary mt-4">{t('lang.helpButton')}</Link></div>
        <div className="panel p-5 space-y-3 text-dim"><p>{t('lang.storyNote')}</p><p>{t('lang.aiNote')}</p></div>
      </div>
    </PageShell>
  )
}
