import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { resizeImage } from '../lib/image'
import { useAsync } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { buildLadder } from '../../../shared/rescue'
import { useApp } from '../context/AppContext'
import { AsyncView, EmptyState, Modal, PageHeader, PageShell, Segmented, Spinner, TextArea, TextField } from '../components/ui'
import Icon from '../components/Icon'
import Yaadri from '../character/Yaadri'
import { sound } from '../lib/sound'
import type { Capsule, Reward, Unlocked } from '../types'

type Tab = 'capsules' | 'practice' | 'care'
const tile = (k: string) => ({ person: '🧑', place: '🏞️', event: '🕯️' }[k] ?? '🏮')

export default function Family() {
  useVisit('family')
  const { t } = useApp()
  const [tab, setTab] = useState<Tab>('capsules')
  const caps = useAsync(() => api.get<{ capsules: Capsule[] }>('/capsules'), [])
  return (
    <PageShell wide>
      <PageHeader title={t('family.title')} subtitle={t('family.subtitle')} />
      <div className="mb-5"><Segmented<Tab> label={t('family.title')} value={tab} onChange={setTab} options={[{ value: 'capsules', label: t('family.tab.capsules') }, { value: 'practice', label: t('family.tab.practice') }, { value: 'care', label: t('family.tab.care') }]} /></div>
      {tab === 'care' ? <Care /> : <AsyncView state={caps}>{({ capsules }) => tab === 'capsules' ? <Capsules list={capsules} state={caps} /> : <Practice list={capsules} />}</AsyncView>}
    </PageShell>
  )
}

/* ─────────── capsules: add / edit / delete ─────────── */
function Capsules({ list, state }: { list: Capsule[]; state: ReturnType<typeof useAsync<{ capsules: Capsule[] }>> }) {
  const { t, toast, errText, unlocked, refresh, me } = useApp()
  const [edit, setEdit] = useState<Partial<Capsule> | null>(null)
  const [del, setDel] = useState<Capsule | null>(null)
  const del2 = async () => {
    if (!del) return
    try { await api.del(`/capsules/${del.id}`); state.setData((d) => (d ? { capsules: d.capsules.filter((c) => c.id !== del.id) } : d)); toast(t('family.deleted'), 'success'); void refresh() } catch (e) { toast(errText(e), 'error') }
    setDel(null)
  }
  return (
    <>
      <div className="mb-4"><button className="btn btn-primary" onClick={() => setEdit({ kind: 'person', contributor: me?.profile.guardianName ?? '' })}><Icon name="plus" size={20} /> {t('family.add')}</button></div>
      {list.length === 0 ? <EmptyState body={t('family.empty')} /> : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>{list.map((c) => (
            <motion.li key={c.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="panel overflow-hidden flex flex-col">
              <div className="h-40 bg-gradient-to-br from-bg2 to-surface grid place-items-center">{c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" loading="lazy" /> : <span className="text-6xl" aria-hidden>{tile(c.kind)}</span>}</div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap"><h2 className="text-2xl">{c.title}</h2><span className="chip">{t(`family.kind.${c.kind}` as 'family.kind.person')}</span></div>
                {c.relation && <p className="text-glow mt-0.5">{c.relation}</p>}
                {c.clue && <p className="text-dim mt-2">{c.clue}</p>}
                {c.contributor && <p className="text-xs text-dim mt-2">{t('family.f.contributor')}: {c.contributor}</p>}
                <div className="mt-auto pt-3 flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(c)}><Icon name="pencil" size={16} /> {t('common.edit')}</button><button className="btn btn-danger btn-sm" onClick={() => setDel(c)}><Icon name="trash" size={16} /> {t('common.delete')}</button></div>
              </div>
            </motion.li>))}</AnimatePresence>
        </ul>
      )}
      <CapsuleForm value={edit} onClose={() => setEdit(null)} onSaved={(c, u) => {
        state.setData((d) => (d ? { capsules: d.capsules.some((x) => x.id === c.id) ? d.capsules.map((x) => (x.id === c.id ? c : x)) : [c, ...d.capsules] } : d))
        setEdit(null); sound.sfx('memory'); toast(t('family.saved'), 'success'); unlocked(u); void refresh()
      }} />
      <Modal open={!!del} onClose={() => setDel(null)} title={t('common.confirmDelete')}>
        <p className="text-lg">{del?.title}</p><p className="text-dim">{t('common.undone')}</p>
        <div className="mt-5 flex gap-3 justify-end"><button className="btn btn-ghost" onClick={() => setDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={del2}>{t('common.delete')}</button></div>
      </Modal>
    </>
  )
}

function CapsuleForm({ value, onClose, onSaved }: { value: Partial<Capsule> | null; onClose: () => void; onSaved: (c: Capsule, unlocked: Unlocked[]) => void }) {
  const { t, errText } = useApp()
  const [f, setF] = useState<Partial<Capsule>>({})
  const [key, setKey] = useState<string | null>(null)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  // Re-seed the form whenever a different capsule is opened.
  const id = value ? (value.id ?? 'new') : null
  if (id !== key) { setKey(id); setF(value ?? {}); setErrs({}); setErr(null) }
  const set = (k: keyof Capsule) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0]; if (!fl) return
    try { setF({ ...f, photo: await resizeImage(fl) }); setErr(null) } catch (er) { setErr((er as Error).message) }
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null); setErrs({})
    const body = { kind: f.kind ?? 'person', title: f.title ?? '', relation: f.relation ?? '', clue: f.clue ?? '', story: f.story ?? '', contributor: f.contributor ?? '', photo: f.photo ?? null }
    try {
      type R = { capsule: Capsule; unlocked?: Unlocked[] }
      const r = f.id ? await api.patch<R>(`/capsules/${f.id}`, body) : await api.post<R>('/capsules', body)
      onSaved(r.capsule, r.unlocked ?? [])
    } catch (er) {
      setErr(errText(er)); sound.sfx('wrong')
      if (er instanceof ApiError && er.fields) setErrs(Object.fromEntries(Object.entries(er.fields).map(([k, v]) => [k, v[0]])))
    } finally { setBusy(false) }
  }
  return (
    <Modal open={!!value} onClose={onClose} title={f.id ? t('family.edit') : t('family.add')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Segmented label={t('family.kind')} value={(f.kind ?? 'person') as 'person'} onChange={(k) => setF({ ...f, kind: k })} options={(['person', 'place', 'event'] as const).map((k) => ({ value: k, label: t(`family.kind.${k}` as 'family.kind.person') }))} />
        <TextField label={t('family.f.title')} value={f.title ?? ''} onChange={set('title')} maxLength={60} error={errs.title} required />
        <TextField label={t('family.f.relation')} value={f.relation ?? ''} onChange={set('relation')} maxLength={80} hint={t('family.f.relationHelp')} />
        <TextField label={t('family.f.clue')} value={f.clue ?? ''} onChange={set('clue')} maxLength={200} hint={t('family.f.clueHelp')} />
        <TextArea label={t('family.f.story')} value={f.story ?? ''} onChange={set('story')} maxLength={600} />
        <TextField label={t('family.f.contributor')} value={f.contributor ?? ''} onChange={set('contributor')} maxLength={60} />
        <div><p className="font-display text-lg mb-1">{t('family.f.photo')}</p>
          <div className="flex items-center gap-3">{f.photo ? <img src={f.photo} alt="" className="w-20 h-20 rounded-2xl object-cover" /> : <span className="w-20 h-20 rounded-2xl bg-ink/10 grid place-items-center text-3xl" aria-hidden>{tile(f.kind ?? 'person')}</span>}
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="cap-photo" onChange={pick} />
            <label htmlFor="cap-photo" className="btn btn-ghost btn-sm cursor-pointer"><Icon name="camera" size={18} /> {t('family.f.choosePhoto')}</label>
            {f.photo && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, photo: null })}>{t('family.f.removePhoto')}</button>}</div>
          {errs.photo && <p role="alert" className="text-sm text-danger mt-1">{errs.photo}</p>}</div>
        {err && <p role="alert" className="rounded-xl bg-danger/15 border border-danger/40 px-3 py-2 text-danger">{err}</p>}
        <div className="flex gap-3 justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn-primary" disabled={busy || !(f.title ?? '').trim()}>{busy ? <Spinner size={18} /> : null} {t('common.save')}</button></div>
      </form>
    </Modal>
  )
}

/* ─────────── practice with the Memory Rescue ladder ─────────── */
function Practice({ list }: { list: Capsule[] }) {
  const { t, reward, toast, errText } = useApp()
  const usable = list
  const [i, setI] = useState(0)
  const [rung, setRung] = useState(0)
  const [done, setDone] = useState<null | 'solo' | 'help'>(null)
  const cap = usable[i % Math.max(1, usable.length)]
  const ladder = useMemo(() => (cap ? buildLadder(cap) : []), [cap])
  if (!usable.length) return <EmptyState body={t('family.practice.need')} />
  const shown = rung > 0 ? ladder[Math.min(rung, ladder.length) - 1] : null

  const know = async () => {
    setDone(rung === 0 ? 'solo' : 'help'); sound.sfx('correct')
    try { reward(await api.post<Reward>(`/capsules/${cap.id}/cue`, { cue: Math.min(rung, 2), correct: true })) } catch (e) { toast(errText(e), 'error') }
  }
  const next = () => { setI((x) => x + 1); setRung(0); setDone(null); sound.sfx('click') }
  return (
    <div className="panel max-w-xl mx-auto p-5 sm:p-7 text-center">
      <p className="text-lg text-dim mb-3">{t('family.practice.intro')}</p>
      <div className="mx-auto w-56 h-56 rounded-[2rem] overflow-hidden border-2 border-glow/60 bg-gradient-to-br from-bg2 to-surface grid place-items-center shadow-lantern">{cap.photo ? <img src={cap.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-7xl" aria-hidden>{tile(cap.kind)}</span>}</div>
      <div className="min-h-[7rem] mt-4" aria-live="polite">
        {done ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Yaadri mood="celebrating" size={60} className="mx-auto" /><h2 className="text-3xl">{cap.title}</h2>{cap.relation && <p className="text-glow">{cap.relation}</p>}<p className="text-tea mt-1">{done === 'solo' ? t('family.practice.gotIt') : t('family.practice.withHelp')}</p>{cap.story && <p className="text-dim mt-1">{cap.story}</p>}</motion.div>
        ) : shown ? (
          <motion.div key={rung} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-glow/15 border border-glow/40 px-4 py-3"><p className="text-sm text-dim">{t(`quest.rung.${shown.kind}` as 'quest.rung.clue')}</p><p className="text-2xl font-display">{shown.text}</p></motion.div>
        ) : <Yaadri mood="encouraging" size={70} className="mx-auto" />}
      </div>
      {rung > 0 && !done && <p className="text-sm text-dim mt-2">{t('family.practice.hintsUsed', { n: rung })}</p>}
      <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
        {!done ? <>
          <button className="btn btn-ghost" onClick={() => { setRung((r) => Math.min(r + 1, ladder.length)); sound.sfx('click') }} disabled={rung >= ladder.length}><Icon name="help" size={18} /> {t('family.practice.hint')}</button>
          <button className="btn btn-primary" onClick={know}><Icon name="check" size={18} /> {t('family.practice.know')}</button>
        </> : <button className="btn btn-primary" onClick={next}>{t('family.practice.next')}</button>}
      </div>
    </div>
  )
}

/* ─────────── caregiver view (plain-language weekly summary) ─────────── */
interface Summary { name: string; days: number; games: number; cues: { total: number; independent: number; light: number; multiple: number }; strong: string[]; needsCues: string[]; sentences: string[] }
function Care() {
  const { t, toast, errText } = useApp()
  const s = useAsync(() => api.get<Summary>('/caregiver/summary'), [])
  const [ans, setAns] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const ask = async (k: 'family.care.q1' | 'family.care.q2' | 'family.care.q3' | 'family.care.q4') => {
    setBusy(true)
    try { setAns((await api.get<{ answer: string[] }>(`/caregiver/ask?q=${encodeURIComponent(t(k))}`)).answer) } catch (e) { toast(errText(e), 'error') } finally { setBusy(false) }
  }
  return (
    <AsyncView state={s}>{(d) => {
      const total = Math.max(1, d.cues.total)
      const bars: [string, number, string][] = [[t('family.care.independent'), d.cues.independent, 'bg-tea'], [t('family.care.light'), d.cues.light, 'bg-glow'], [t('family.care.multiple'), d.cues.multiple, 'bg-orchid']]
      return (
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="panel p-5 sm:p-6"><h2 className="text-2xl mb-3">{t('family.care.title')}</h2>
            <div className="space-y-2 text-lg">{d.sentences.slice(0, -1).map((x, i) => <p key={i}>{x}</p>)}</div>
            <p className="mt-4 text-sm text-dim">{t('family.care.note')}</p>
            <p className="mt-1 text-sm text-dim">{t('privacy.shared')}</p></section>
          <div className="space-y-5">
            <section className="panel p-5 sm:p-6">
              {d.cues.total === 0 ? <p className="text-dim">{t('family.care.none')}</p> : (
                <div className="space-y-3">{bars.map(([l, n, c]) => <div key={l}><div className="flex justify-between text-sm"><span>{l}</span><span className="text-dim">{n}</span></div><div className="h-3 rounded-full bg-ink/15 overflow-hidden"><motion.div className={`h-full rounded-full ${c}`} initial={{ width: 0 }} animate={{ width: `${(n / total) * 100}%` }} transition={{ duration: 0.8 }} /></div></div>)}</div>
              )}
            </section>
            <section className="panel p-5 sm:p-6"><h2 className="text-2xl mb-3">{t('family.care.ask')}</h2>
              <div className="flex flex-wrap gap-2">{(['family.care.q1', 'family.care.q2', 'family.care.q3', 'family.care.q4'] as const).map((k) => <button key={k} className="chip !text-base !py-2 !text-ink hover:!bg-glow/25" disabled={busy} onClick={() => ask(k)}>{t(k)}</button>)}</div>
              {ans && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2 text-lg" aria-live="polite">{ans.filter((x) => !/not a medical assessment/.test(x)).map((x, i) => <p key={i}>{x}</p>)}</motion.div>}
            </section>
            <p className="text-sm text-dim">{t('family.care.phase2')}</p>
          </div>
        </div>
      )
    }}</AsyncView>
  )
}
