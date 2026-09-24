import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { useVisit } from '../lib/visit'
import { EmptyState, PageHeader, PageShell } from '../components/ui'
import Icon from '../components/Icon'
import { sound } from '../lib/sound'

const N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export default function Help() {
  useVisit('help')
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(1)
  const items = useMemo(() => N.map((n) => ({ n, q: t(`help.q${n}` as 'help.q1'), a: t(`help.a${n}` as 'help.a1') })), [t])
  const list = items.filter((i) => !q.trim() || `${i.q} ${i.a}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <PageShell>
      <PageHeader title={t('help.title')} subtitle={t('help.subtitle')} />
      <div className="relative mb-5">
        <label htmlFor="help-q" className="sr-only">{t('help.search')}</label>
        <input id="help-q" type="search" className="field !pl-12 text-lg" placeholder={t('help.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <Icon name="help" className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
      </div>
      {list.length === 0 ? <EmptyState body={t('help.noResults')} action={<Link to="/contact" className="btn btn-primary">{t('help.contactUs')}</Link>} /> : (
        <ul className="space-y-2.5">
          {list.map((i) => {
            const isOpen = open === i.n || !!q.trim()
            return (
              <li key={i.n} className="panel overflow-hidden">
                <h2><button className="w-full flex items-center justify-between gap-3 text-left px-5 py-4 text-xl font-display" aria-expanded={isOpen} aria-controls={`faq${i.n}`} onClick={() => { sound.sfx('tick'); setOpen(isOpen && !q.trim() ? null : i.n) }}>
                  {i.q}<motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="shrink-0 text-glow"><Icon name="chev" /></motion.span></button></h2>
                <AnimatePresence initial={false}>{isOpen && <motion.div id={`faq${i.n}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="px-5 pb-5 text-lg text-dim">{i.a}</p></motion.div>}</AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}
      <div className="panel p-6 mt-8 flex flex-wrap items-center justify-between gap-3"><span className="font-display text-xl">{t('help.stuck')}</span><Link to="/contact" className="btn btn-primary"><Icon name="mail" size={18} /> {t('help.contactUs')}</Link></div>
    </PageShell>
  )
}
