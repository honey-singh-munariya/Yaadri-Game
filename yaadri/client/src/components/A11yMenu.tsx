import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Segmented } from './ui'
import { useApp } from '../context/AppContext'

export default function A11yMenu() {
  const { settings, updateSettings, t } = useApp()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className="relative" ref={box}>
      <button className="btn btn-ghost btn-sm !px-3" aria-expanded={open} aria-haspopup="dialog" aria-label={t('common.a11y')} onClick={() => setOpen((o) => !o)}><Icon name="eye" size={20} /></button>
      {open && (
        <div role="dialog" aria-label={t('common.a11y')} className="absolute right-0 mt-2 z-50 w-72 panel !bg-surface p-4 shadow-2xl space-y-4">
          <div><p className="font-display mb-1.5">{t('settings.text')}</p>
            <Segmented label={t('settings.text')} value={settings.textSize} onChange={(v) => updateSettings({ textSize: v })} options={[{ value: 'normal', label: 'A' }, { value: 'large', label: 'A+' }, { value: 'xl', label: 'A++' }]} /></div>
          <div><p className="font-display mb-1.5">{t('settings.motion')}</p>
            <Segmented label={t('settings.motion')} value={settings.motion} onChange={(v) => updateSettings({ motion: v })} options={[{ value: 'full', label: t('settings.motion.full') }, { value: 'gentle', label: t('settings.motion.gentle') }, { value: 'off', label: t('settings.motion.off') }]} /></div>
          <div><p className="font-display mb-1.5">{t('settings.theme')}</p>
            <Segmented label={t('settings.theme')} value={settings.theme} onChange={(v) => updateSettings({ theme: v })} options={[{ value: 'dusk', label: t('settings.theme.dusk') }, { value: 'morning', label: t('settings.theme.morning') }, { value: 'contrast', label: 'AA+' }]} /></div>
        </div>
      )}
    </div>
  )
}
