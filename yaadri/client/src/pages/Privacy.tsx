import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAsync, fmtDate } from '../lib/hooks'
import { useApp } from '../context/AppContext'
import { Modal, PageHeader, PageShell, TextField, WeaveBand } from '../components/ui'
import Icon from '../components/Icon'

interface Consent { kind: 'data_use' | 'guardian'; granted: boolean; created_at: string }

export default function Privacy() {
  const { t, status, lang, toast, errText, logout, refresh } = useApp()
  const nav = useNavigate()
  const authed = status === 'ready'
  const c = useAsync(() => (authed ? api.get<{ consents: Consent[] }>('/consents') : Promise.resolve({ consents: [] as Consent[] })), [authed])
  const [del, setDel] = useState(false)
  const [word, setWord] = useState('')
  const latest = (k: Consent['kind']) => c.data?.consents.find((x) => x.kind === k)

  const withdraw = async () => {
    try { await api.post('/consents', { kind: 'data_use', granted: false }); toast(t('settings.saved'), 'success'); c.reload(); void refresh() } catch (e) { toast(errText(e), 'error') }
  }
  const download = async () => {
    try {
      const res = await fetch('/api/export', { credentials: 'same-origin', headers: { 'X-Requested-With': 'yaadri' } })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = 'yaadri-export.json'; a.click(); URL.revokeObjectURL(url)
    } catch (e) { toast(errText(e), 'error') }
  }
  const remove = async () => {
    try { await api.del('/account', { confirm: 'DELETE' }); toast(t('privacy.deleted'), 'success'); await logout(); nav('/') } catch (e) { toast(errText(e), 'error') }
  }
  const blocks = [1, 2, 3, 4, 5, 6] as const
  return (
    <PageShell>
      <PageHeader title={t('privacy.title')} subtitle={t('privacy.subtitle')} />
      <WeaveBand className="max-w-xs -mt-3 mb-6" />
      <div className="space-y-4">
        {blocks.map((n) => <section key={n} className="panel p-5"><h2 className="text-2xl">{t(`privacy.h${n}` as 'privacy.h1')}</h2><p className="mt-2 text-lg text-dim">{t(`privacy.p${n}` as 'privacy.p1')}</p></section>)}
        {authed && (
          <>
            <section className="panel p-5"><h2 className="text-2xl mb-3">{t('privacy.consents')}</h2>
              <ul className="space-y-2">{(['data_use', 'guardian'] as const).map((k) => { const x = latest(k); if (!x) return null
                return <li key={k} className="flex items-center justify-between gap-3 flex-wrap"><span>{t(`privacy.consent.${k}` as 'privacy.consent.data_use')}</span><span className={`chip ${x.granted ? '!text-tea' : '!text-danger'}`}>{x.granted ? t('privacy.granted') : t('privacy.withdrawn')} — {fmtDate(x.created_at, lang)}</span></li> })}</ul>
              {latest('data_use')?.granted !== false && <button className="btn btn-ghost btn-sm mt-4" onClick={withdraw}>{t('privacy.withdraw')}</button>}
              <p className="mt-4 text-sm text-dim">{t('privacy.shared')}</p></section>
            <section className="panel p-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl">{t('privacy.export')}</h2><p className="text-dim">{t('privacy.exportBody')}</p></div><button className="btn btn-ghost" onClick={download}><Icon name="download" size={18} /> {t('privacy.export')}</button></section>
            <section className="panel !border-danger/50 p-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl">{t('privacy.delete')}</h2><p className="text-dim">{t('privacy.deleteBody')}</p></div><button className="btn btn-danger" onClick={() => setDel(true)}><Icon name="trash" size={18} /> {t('privacy.delete')}</button></section>
          </>
        )}
        {!authed && <p className="text-dim"><Link className="underline" to="/enter">{t('nav.signIn')}</Link></p>}
      </div>
      <Modal open={del} onClose={() => setDel(false)} title={t('privacy.delete')}>
        <p className="text-lg">{t('privacy.deleteBody')}</p><p className="text-dim">{t('common.undone')}</p>
        <TextField className="mt-4" label={t('privacy.deleteType')} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />
        <div className="mt-5 flex gap-3 justify-end"><button className="btn btn-ghost" onClick={() => setDel(false)}>{t('common.cancel')}</button><button className="btn btn-danger" disabled={word !== 'DELETE'} onClick={remove}>{t('privacy.delete')}</button></div>
      </Modal>
    </PageShell>
  )
}
