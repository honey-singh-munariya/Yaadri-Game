import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useVisit } from '../lib/visit'
import { PageHeader, PageShell, Segmented, Toggle } from '../components/ui'
import { LANGUAGES } from '../lib/langs'
import { coverage } from '../i18n'
import { sound } from '../lib/sound'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="panel p-5 sm:p-6 mb-4"><h2 className="text-2xl mb-2">{title}</h2><div className="divide-y divide-[color:var(--line)]">{children}</div></section>
)

export default function Settings() {
  useVisit('settings')
  const { t, settings, updateSettings, lang, setLanguage, status, reduced } = useApp()
  const authed = status === 'ready'
  return (
    <PageShell>
      <PageHeader title={t('settings.title')} />
      <Section title={t('settings.language')}>
        <div className="py-3"><label htmlFor="lang-sel" className="sr-only">{t('settings.language')}</label>
          <select id="lang-sel" className="field text-lg" value={lang} onChange={(e) => void setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native} ({l.name}){coverage(l.code) ? ` ${coverage(l.code)}%` : ''}</option>)}
          </select>
          <p className="mt-2 text-sm"><Link className="underline" to="/languages">{t('nav.languages')}</Link></p></div>
      </Section>
      <Section title={t('settings.sound')}>
        <Toggle checked={settings.sound} onChange={(v) => { if (v) sound.setEnabled(true); void updateSettings({ sound: v }); if (v) sound.sfx('start') }} label={t('settings.soundMaster')} />
        <Toggle checked={settings.ambience} onChange={(v) => updateSettings({ ambience: v })} label={t('settings.ambience')} disabled={!settings.sound} />
        <div className="py-3"><button className="btn btn-ghost btn-sm" disabled={!settings.sound} onClick={() => sound.sfx('achievement')}>{t('settings.test')}</button></div>
      </Section>
      <Section title={t('settings.voice')}>
        <Toggle checked={settings.voiceEnabled} onChange={(v) => updateSettings({ voiceEnabled: v })} label={t('settings.voiceOn')} />
        <Toggle checked={settings.autoSpeak} onChange={(v) => updateSettings({ autoSpeak: v })} label={t('settings.autoSpeak')} disabled={!settings.voiceEnabled} />
      </Section>
      <Section title={t('settings.motion')}>
        <div className="py-3"><Segmented label={t('settings.motion')} value={settings.motion} onChange={(v) => updateSettings({ motion: v })} options={[{ value: 'full', label: t('settings.motion.full') }, { value: 'gentle', label: t('settings.motion.gentle') }, { value: 'off', label: t('settings.motion.off') }]} />
          <p className="mt-2 text-sm text-dim">{t('settings.motionNote')}{reduced ? ` ${t('common.on')}.` : ''}</p></div>
      </Section>
      <Section title={t('settings.text')}>
        <div className="py-3"><Segmented label={t('settings.text')} value={settings.textSize} onChange={(v) => updateSettings({ textSize: v })} options={[{ value: 'normal', label: t('settings.text.normal') }, { value: 'large', label: t('settings.text.large') }, { value: 'xl', label: t('settings.text.xl') }]} /></div>
      </Section>
      <Section title={t('settings.theme')}>
        <div className="py-3"><Segmented label={t('settings.theme')} value={settings.theme} onChange={(v) => updateSettings({ theme: v })} options={[{ value: 'dusk', label: t('settings.theme.dusk') }, { value: 'morning', label: t('settings.theme.morning') }, { value: 'contrast', label: t('settings.theme.contrast') }]} /></div>
      </Section>
      {authed && (
        <Section title={t('settings.memory')}>
          <Toggle checked={settings.memoryEnabled} onChange={(v) => updateSettings({ memoryEnabled: v, ...(v ? {} : { autoRemember: false }) })} label={t('settings.memoryOn')} />
          <Toggle checked={settings.autoRemember} onChange={(v) => updateSettings({ autoRemember: v })} label={t('settings.autoRemember')} description={t('settings.autoRememberNote')} disabled={!settings.memoryEnabled} />
          <Toggle checked={settings.saveHistory} onChange={(v) => updateSettings({ saveHistory: v })} label={t('settings.saveHistory')} />
          <div className="py-3"><Link className="underline" to="/privacy">{t('settings.privacyLink')}</Link></div>
        </Section>
      )}
    </PageShell>
  )
}
