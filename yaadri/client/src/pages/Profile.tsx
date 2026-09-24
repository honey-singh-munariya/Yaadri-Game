import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useVisit } from '../lib/visit'
import { useApp } from '../context/AppContext'
import { AVATARS, Avatar, PageShell, Spinner, TextField, Toggle, XPBar } from '../components/ui'
import LanguageMenu from '../components/LanguageMenu'
import Icon from '../components/Icon'
import { getLangInfo } from '../lib/langs'
import type { JourneyOverview } from '../types'

export default function Profile() {
  useVisit('profile')
  const { t, me, updateProfile, settings, updateSettings, toast, errText, logout, lang } = useApp()
  const nav = useNavigate()
  const j = useAsync(() => api.get<JourneyOverview>('/journey'), [])
  const p = me!.profile
  const [name, setName] = useState(p.displayName)
  const [avatar, setAvatar] = useState(p.avatar)
  const [busy, setBusy] = useState(false)
  const dirty = name.trim() !== p.displayName || avatar !== p.avatar
  const done = j.data?.chapters.filter((c) => c.status === 'complete').length ?? 0

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try { await updateProfile({ displayName: name.trim(), avatar }); toast(t('profile.saved'), 'success') } catch (er) { toast(errText(er), 'error') } finally { setBusy(false) }
  }
  const tiles: [string, string | number][] = [
    [t('profile.level'), p.level], [t('profile.xp'), p.xp], [t('profile.games'), me!.counts.gamesPlayed],
    [t('profile.achievements'), `${me!.counts.achievements} / 10`], [t('profile.memories'), me!.counts.memories], [t('profile.journey'), `${done} / 5`],
  ]
  return (
    <PageShell>
      <header className="flex items-center gap-4 mb-6"><Avatar name={p.avatar} size={84} /><div className="min-w-0"><h1 className="text-4xl truncate">{p.displayName}</h1><p className="text-dim">{me!.user.isDemo ? 'Demo profile' : me!.user.email}</p></div></header>
      <div className="panel p-5 mb-4"><div className="flex justify-between items-end mb-2"><span className="font-display text-2xl">{t('common.level', { n: p.level })}</span><span className="text-dim">{t('profile.toNext', { n: p.span - p.into, l: p.level + 1 })}</span></div><XPBar profile={p} compact /></div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">{tiles.map(([l, v]) => <div key={l} className="panel p-4"><dt className="text-sm text-dim">{l}</dt><dd className="font-display text-3xl">{v}</dd></div>)}</dl>

      <form onSubmit={save} className="panel p-5 sm:p-6 space-y-4 mb-4">
        <h2 className="text-2xl">{t('profile.edit')}</h2>
        <TextField label={t('profile.name')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <fieldset><legend className="font-display text-lg mb-2">{t('profile.avatar')}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('profile.avatar')}>{Object.keys(AVATARS).map((a) => (
            <button key={a} type="button" role="radio" aria-checked={avatar === a} aria-label={a} onClick={() => setAvatar(a)} className={`rounded-full p-1 border-2 ${avatar === a ? 'border-glow shadow-lantern' : 'border-transparent'}`}><Avatar name={a} size={52} /></button>))}</div></fieldset>
        <button className="btn btn-primary" disabled={!dirty || busy || name.trim().length < 1}>{busy ? <Spinner size={18} /> : null} {t('common.save')}</button>
      </form>

      <section className="panel p-5 sm:p-6 mb-4">
        <h2 className="text-2xl mb-1">{t('profile.quick')}</h2>
        <div className="flex items-center justify-between py-3"><span className="font-display text-lg">{t('profile.language')}: {getLangInfo(lang).native}</span><LanguageMenu /></div>
        <Toggle checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} label={t('settings.soundMaster')} />
        <Toggle checked={settings.voiceEnabled} onChange={(v) => updateSettings({ voiceEnabled: v })} label={t('settings.voiceOn')} />
        <Toggle checked={settings.memoryEnabled} onChange={(v) => updateSettings({ memoryEnabled: v })} label={t('settings.memoryOn')} />
      </section>
      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/family" className="btn btn-ghost"><Icon name="family" size={18} /> {t('profile.family')}</Link>
        <Link to="/privacy" className="btn btn-ghost"><Icon name="lock" size={18} /> {t('profile.privacy')}</Link>
        <button className="btn btn-ghost" onClick={async () => { await logout(); nav('/') }}>{t('profile.signOut')}</button>
      </div>
    </PageShell>
  )
}
