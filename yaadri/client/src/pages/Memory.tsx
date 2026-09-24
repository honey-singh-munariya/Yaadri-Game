import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { useAsync, fmtDate } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AsyncView, EmptyState, Modal, PageHeader, PageShell, Spinner } from '../components/ui'
import Icon from '../components/Icon'
import { sound } from '../lib/sound'
import type { MemoryItem, Unlocked } from '../types'

type Filter = 'all' | 'you' | 'chat' | 'games' | 'story' | 'other'
const bucket = (m: MemoryItem): Filter => (m.source === 'you' ? 'you' : m.source === 'chat' ? 'chat' : m.source === 'games' ? 'games' : m.source === 'story' ? 'story' : 'other')

export default function Memory() {
  useVisit('memory')
  const { t, lang, settings, toast, errText, unlocked, refresh } = useApp()
  const s = useAsync(() => api.get<{ memories: MemoryItem[] }>('/memories'), [])
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [del, setDel] = useState<MemoryItem | 'all' | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)

  const list = useMemo(() => (s.data?.memories ?? []).filter((m) => (filter === 'all' || bucket(m) === filter) && (!q || m.content.toLowerCase().includes(q.toLowerCase()))), [s.data, filter, q])
  const src = (m: MemoryItem) => t(`memory.src.${['you', 'chat', 'games', 'story', 'achievements', 'settings'].includes(m.source) ? m.source : 'you'}` as 'memory.src.you')

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const r = await api.post<{ memory: MemoryItem; unlocked: Unlocked[] }>('/memories', { content: text })
      s.setData((d) => (d ? { memories: [r.memory, ...d.memories] } : d)); setText(''); setFresh(r.memory.id); sound.sfx('memory'); toast(t('memory.saved'), 'success'); unlocked(r.unlocked); void refresh()
      setTimeout(() => setFresh(null), 2500)
    } catch (e2) { setErr(errText(e2)); sound.sfx('wrong') } finally { setBusy(false) }
  }
  const save = async (m: MemoryItem) => {
    try {
      const r = await api.patch<{ memory: MemoryItem }>(`/memories/${m.id}`, { content: draft })
      s.setData((d) => (d ? { memories: d.memories.map((x) => (x.id === m.id ? r.memory : x)) } : d)); setEditing(null); toast(t('memory.updated'), 'success')
    } catch (e) { toast(errText(e), 'error') }
  }
  const remove = async () => {
    const target = del; if (!target) return
    try {
      if (target === 'all') { await api.del('/memories'); s.setData({ memories: [] }) }
      else { await api.del(`/memories/${target.id}`); s.setData((d) => (d ? { memories: d.memories.filter((x) => x.id !== target.id) } : d)) }
      toast(t('memory.deleted'), 'success'); setDel(null); void refresh()
    } catch (e) { toast(e instanceof ApiError && e.status === 404 ? t('memory.deleted') : errText(e), 'error'); setDel(null) }
  }

  const filters: Filter[] = ['all', 'you', 'chat', 'games', 'story', 'other']
  return (
    <PageShell>
      <PageHeader title={t('memory.title')} subtitle={t('memory.subtitle')} />
      {!settings.memoryEnabled && <div className="panel !border-orchid/60 p-4 mb-4 flex flex-wrap items-center justify-between gap-3"><span>{t('memory.off')}</span><Link className="btn btn-ghost btn-sm" to="/settings">{t('memory.turnOn')}</Link></div>}
      <form onSubmit={add} className="panel p-4 sm:p-5 mb-5" noValidate>
        <label htmlFor="newmem" className="font-display text-xl block mb-2">{t('memory.add')}</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input id="newmem" className="field flex-1" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={t('memory.placeholder')} disabled={!settings.memoryEnabled} aria-describedby="memnote" />
          <button className="btn btn-primary" type="submit" disabled={busy || text.trim().length < 2 || !settings.memoryEnabled}>{busy ? <Spinner size={18} /> : <Icon name="plus" size={20} />} {t('memory.addButton')}</button>
        </div>
        <p id="memnote" className="mt-2 text-sm text-dim">{t('memory.sensitiveNote')}</p>
        {err && <p role="alert" className="mt-2 text-danger">{err}</p>}
      </form>

      <AsyncView state={s}>{(d) => (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div role="tablist" aria-label={t('memory.title')} className="flex flex-wrap gap-1.5">
              {filters.map((f) => <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`chip !text-base !py-1.5 ${filter === f ? '!bg-glow !text-onglow' : ''}`}>{t(`memory.filter.${f}` as 'memory.filter.all')}</button>)}
            </div>
            <input className="field !min-h-[2.6rem] max-w-[14rem] ml-auto" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('memory.search')} aria-label={t('memory.search')} />
          </div>
          <p className="text-dim mb-3">{t('memory.count', { n: d.memories.length })}</p>
          {d.memories.length === 0 ? <EmptyState body={t('memory.empty')} action={<Link to="/talk" className="btn btn-primary">{t('nav.talk')}</Link>} />
            : list.length === 0 ? <p className="text-dim">{t('memory.noMatch')}</p> : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {list.map((m) => (
                  <motion.li key={m.id} layout exit={{ opacity: 0, x: 40 }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1, boxShadow: fresh === m.id ? '0 0 0 2px rgb(var(--c-glow)), 0 0 40px rgb(var(--c-glow) / .5)' : '0 0 0 0 transparent' }} transition={{ duration: 0.5 }} className="panel p-4 sm:p-5">
                    {editing === m.id ? (
                      <div className="flex flex-col sm:flex-row gap-3"><input className="field flex-1" value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} aria-label={t('memory.editing')} autoFocus />
                        <div className="flex gap-2"><button className="btn btn-primary btn-sm" onClick={() => save(m)} disabled={draft.trim().length < 2}>{t('common.save')}</button><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>{t('common.cancel')}</button></div></div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                        <div className="min-w-0"><p className="text-xl">{m.content}</p>
                          <p className="mt-1 text-sm text-dim">{fmtDate(m.created_at, lang)} — {t('memory.from', { src: src(m) })}{m.context ? `, ${m.context}` : ''}</p></div>
                        <div className="flex gap-2 shrink-0"><button className="btn btn-ghost btn-sm" onClick={() => { setEditing(m.id); setDraft(m.content) }}><Icon name="pencil" size={16} /> {t('common.edit')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDel(m)}><Icon name="trash" size={16} /> {t('common.delete')}</button></div>
                      </div>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          {d.memories.length > 0 && <div className="mt-8 text-center"><button className="btn btn-danger btn-sm" onClick={() => setDel('all')}>{t('memory.deleteAll')}</button></div>}
        </>
      )}</AsyncView>

      <Modal open={!!del} onClose={() => setDel(null)} title={del === 'all' ? t('memory.deleteAll') : t('common.confirmDelete')}>
        <p className="text-lg">{del === 'all' ? t('memory.deleteAllConfirm') : del ? `“${del.content}”` : ''}</p>
        <p className="text-dim mt-1">{t('common.undone')}</p>
        <div className="mt-5 flex gap-3 justify-end"><button className="btn btn-ghost" onClick={() => setDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={remove}>{t('common.delete')}</button></div>
      </Modal>
    </PageShell>
  )
}
