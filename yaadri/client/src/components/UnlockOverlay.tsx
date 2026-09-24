import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Yaadri from '../character/Yaadri'
import { useApp } from '../context/AppContext'
import { sound } from '../lib/sound'

/** Global celebration layer: XP pop, level-up, achievement unlock. One at a time, never blocks the screen for long. */
export default function UnlockOverlay() {
  const { queue, shiftQueue, t } = useApp()
  const item = queue[0]
  useEffect(() => {
    if (!item) return
    if (item.kind === 'xp') { sound.sfx('notify'); const id = setTimeout(shiftQueue, 1500); return () => clearTimeout(id) }
    sound.sfx(item.kind === 'level' ? 'level' : 'achievement')
    const id = setTimeout(shiftQueue, 7000)
    return () => clearTimeout(id)
  }, [item, shiftQueue])

  return (
    <>
      <AnimatePresence>
        {item?.kind === 'xp' && (
          <motion.div key={`xp${queue.length}`} aria-live="polite" role="status" className="fixed top-20 left-1/2 z-[80] -translate-x-1/2 pointer-events-none"
            initial={{ y: 20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ type: 'spring', damping: 14 }}>
            <span className="btn btn-primary !min-h-0 py-2 text-xl shadow-lantern">{t('unlock.xp', { n: item.n })}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {item && item.kind !== 'xp' && (
          <motion.div key={item.kind === 'level' ? `l${item.level}` : item.a.id} role="dialog" aria-modal="true" aria-label={item.kind === 'level' ? t('ach.levelUp', { n: item.level }) : item.a.name}
            className="fixed inset-0 z-[90] grid place-items-center p-6 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={shiftQueue}>
            <motion.div className="relative panel !bg-surface p-8 text-center max-w-sm w-full overflow-hidden shadow-lantern" initial={{ scale: 0.6, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 12, stiffness: 180 }}>
              <motion.div aria-hidden className="absolute -inset-20 opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgb(var(--c-glow)), transparent 30%, rgb(var(--c-orchid)), transparent 60%, rgb(var(--c-glow)), transparent)' }} animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} />
              <div className="relative">
                <Yaadri mood="celebrating" size={110} className="mx-auto" />
                {item.kind === 'achievement' ? (
                  <>
                    <motion.div className="text-6xl mt-1" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.2, duration: 0.6 }} aria-hidden>{item.a.icon}</motion.div>
                    <p className="text-sm text-dim mt-2">{t('ach.new')}</p>
                    <h2 className="text-3xl mt-1 glowtext">{item.a.name}</h2>
                    <p className="text-dim mt-1">{item.a.description}</p>
                    <p className="chip mt-3 !text-glow">{t('ach.bonus', { n: item.a.xp })}</p>
                  </>
                ) : (
                  <>
                    <motion.h2 className="text-6xl mt-2 glowtext" initial={{ scale: 0.3 }} animate={{ scale: [0.3, 1.25, 1] }} transition={{ duration: 0.6 }}>{t('ach.levelUp', { n: item.level })}</motion.h2>
                    <p className="text-dim mt-2">{t('ach.levelUpBody')}</p>
                  </>
                )}
                <button className="btn btn-primary mt-5" onClick={(e) => { e.stopPropagation(); shiftQueue() }}>{t('common.continue')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
