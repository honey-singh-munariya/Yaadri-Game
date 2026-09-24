import { useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { useApp } from '../context/AppContext'
import { PageHeader, PageShell, Spinner, TextArea, TextField } from '../components/ui'
import Yaadri from '../character/Yaadri'
import { sound } from '../lib/sound'

export default function Contact() {
  const { t, me, errText } = useApp()
  const [f, setF] = useState({ name: me?.profile.displayName ?? '', email: me?.user.isDemo ? '' : me?.user.email ?? '', subject: '', message: '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = t('contact.v.name')
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = t('contact.v.email')
    if (f.subject.trim().length < 3) e.subject = t('contact.v.subject')
    if (f.message.trim().length < 10) e.message = t('contact.v.message')
    return e
  }
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate(); setErrs(e)
    if (Object.keys(e).length) { sound.sfx('wrong'); document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return }
    setState('sending'); setMsg('')
    try { await api.post('/contact', f); setState('ok'); sound.sfx('correct') }
    catch (er) {
      setState('error'); setMsg(errText(er))
      if (er instanceof ApiError && er.fields) setErrs(Object.fromEntries(Object.entries(er.fields).map(([k, v]) => [k, v[0]])))
    }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  if (state === 'ok') return (
    <PageShell><motion.div className="panel max-w-lg mx-auto p-8 text-center" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Yaadri mood="celebrating" size={120} className="mx-auto" /><h1 className="text-3xl mt-2" role="status">{t('contact.success')}</h1>
      <p className="mt-2 text-dim text-lg">{t('contact.successBody', { email: f.email })}</p>
      <button className="btn btn-ghost mt-5" onClick={() => { setF({ ...f, subject: '', message: '' }); setState('idle') }}>{t('contact.another')}</button></motion.div></PageShell>
  )
  return (
    <PageShell>
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <form onSubmit={submit} noValidate className="panel p-5 sm:p-7 space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label={t('contact.name')} value={f.name} onChange={set('name')} error={errs.name} autoComplete="name" required />
          <TextField label={t('contact.email')} type="email" value={f.email} onChange={set('email')} error={errs.email} autoComplete="email" required />
        </div>
        <TextField label={t('contact.subject')} value={f.subject} onChange={set('subject')} error={errs.subject} maxLength={120} required />
        <TextArea label={t('contact.message')} value={f.message} onChange={set('message')} error={errs.message} maxLength={2000} required />
        {state === 'error' && <p role="alert" className="rounded-xl bg-danger/15 border border-danger/40 px-3 py-2 text-danger">{t('contact.error')} {msg}</p>}
        <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? <><Spinner size={18} /> {t('common.sending')}</> : t('contact.send')}</button>
      </form>
    </PageShell>
  )
}
