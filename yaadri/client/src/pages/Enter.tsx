import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Yaadri from '../character/Yaadri'
import { PageShell, TextField, Segmented, Spinner } from '../components/ui'
import { useApp } from '../context/AppContext'
import { ApiError } from '../lib/api'
import { sound } from '../lib/sound'

type Mode = 'signin' | 'create' | 'demo'

export default function Enter() {
  const { t, login, register, demo, status, errText } = useApp()
  const [mode, setMode] = useState<Mode>('signin')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string[]>>({})
  const [f, setF] = useState({ name: '', email: '', password: '', guardianName: '', consentGuardian: false, consentData: false })
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('next') && sp.get('next')!.startsWith('/') ? sp.get('next')! : '/play'

  if (status === 'ready') return <Navigate to={next} replace />

  const fe = (k: string) => fields[k]?.[0]
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null); setFields({})
    try { await fn(); sound.sfx('start'); nav(next, { replace: true }) }
    catch (e) { setErr(errText(e)); if (e instanceof ApiError && e.fields) setFields(e.fields); sound.sfx('wrong') }
    finally { setBusy(false) }
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') void run(() => login(f.email, f.password))
    else void run(() => register({ name: f.name, email: f.email, password: f.password, guardianName: f.guardianName || undefined, consentData: f.consentData || undefined, consentGuardian: f.guardianName ? f.consentGuardian : undefined }))
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-4"><Yaadri mood={busy ? 'thinking' : err ? 'confused' : 'happy'} size={110} className="mx-auto" /><h1 className="text-4xl mt-1">{t('auth.title')}</h1></div>
        <div className="flex justify-center mb-4">
          <Segmented<Mode> label={t('auth.title')} value={mode} onChange={(m) => { setMode(m); setErr(null); setFields({}) }} options={[{ value: 'signin', label: t('auth.signIn') }, { value: 'create', label: t('auth.create') }, { value: 'demo', label: t('auth.demo') }]} />
        </div>
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel p-5 sm:p-6">
          {mode === 'demo' ? (
            <div className="text-center">
              <h2 className="text-2xl">{t('auth.demoTitle')}</h2>
              <p className="mt-2 text-dim">{t('auth.demoBody')}</p>
              <button className="btn btn-primary mt-5 w-full" disabled={busy} onClick={() => run(demo)}>{busy ? <Spinner size={20} /> : t('auth.demoButton')}</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              {mode === 'create' && <TextField label={t('auth.name')} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fe('name')} required />}
              <TextField label={t('auth.email')} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fe('email')} required />
              <TextField label={t('auth.password')} type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fe('password')} hint={mode === 'create' ? t('auth.passwordHint') : undefined} required />
              {mode === 'create' && (
                <>
                  <TextField label={`${t('auth.guardian')} (${t('common.optional')})`} value={f.guardianName} onChange={(e) => setF({ ...f, guardianName: e.target.value })} hint={t('auth.guardianHelp')} />
                  {f.guardianName.trim() && (
                    <label className="flex gap-3 items-start"><input type="checkbox" className="mt-1.5 w-5 h-5 accent-[rgb(var(--c-glow))]" checked={f.consentGuardian} onChange={(e) => setF({ ...f, consentGuardian: e.target.checked })} /><span>{t('auth.guardianAgree', { name: f.guardianName.trim() })}</span></label>
                  )}
                  <div>
                    <label className="flex gap-3 items-start"><input type="checkbox" className="mt-1.5 w-5 h-5 accent-[rgb(var(--c-glow))]" checked={f.consentData} onChange={(e) => setF({ ...f, consentData: e.target.checked })} aria-describedby="consent-err" /><span>{t('auth.consent')} <Link to="/privacy" className="underline">{t('auth.readPrivacy')}</Link></span></label>
                    {fe('consentData') && <p id="consent-err" role="alert" className="mt-1 text-sm text-danger">{fe('consentData')}</p>}
                  </div>
                </>
              )}
              {err && <p role="alert" className="rounded-xl bg-danger/15 border border-danger/40 px-3 py-2 text-danger">{err}</p>}
              <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? <><Spinner size={20} /> {t('auth.working')}</> : mode === 'signin' ? t('auth.submitSignIn') : t('auth.submitCreate')}</button>
            </form>
          )}
          {mode === 'demo' && err && <p role="alert" className="mt-3 text-danger">{err}</p>}
        </motion.div>
      </div>
    </PageShell>
  )
}
