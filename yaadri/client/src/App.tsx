import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { VoiceProvider } from './context/Voice'
import Layout from './components/Layout'
import { ErrorState, Loading } from './components/ui'
import Landing from './pages/Landing'
import Enter from './pages/Enter'

const page = (f: () => Promise<{ default: React.ComponentType }>) => lazy(f)
const Play = page(() => import('./pages/Play'))
const Games = page(() => import('./pages/Games'))
const MemoryQuest = page(() => import('./game/MemoryQuest'))
const StoryGame = page(() => import('./game/StoryGame'))
const Talk = page(() => import('./pages/Talk'))
const Memory = page(() => import('./pages/Memory'))
const Journey = page(() => import('./pages/Journey'))
const Achievements = page(() => import('./pages/Achievements'))
const Languages = page(() => import('./pages/Languages'))
const HowToPlay = page(() => import('./pages/HowToPlay'))
const HowToUse = page(() => import('./pages/HowToUse'))
const Help = page(() => import('./pages/Help'))
const Contact = page(() => import('./pages/Contact'))
const Profile = page(() => import('./pages/Profile'))
const Settings = page(() => import('./pages/Settings'))
const Privacy = page(() => import('./pages/Privacy'))
const Family = page(() => import('./pages/Family'))
const NotFound = page(() => import('./pages/NotFound'))

function Private({ children }: { children: React.ReactNode }) {
  const { status, refresh } = useApp()
  const loc = useLocation()
  if (status === 'loading') return <Loading />
  if (status === 'error') return <ErrorState error={new Error('network')} onRetry={refresh} />
  if (status === 'guest') return <Navigate to={`/enter?next=${encodeURIComponent(loc.pathname)}`} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <VoiceProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Landing />} />
                <Route path="enter" element={<Enter />} />
                <Route path="play" element={<Private><Play /></Private>} />
                <Route path="games" element={<Private><Games /></Private>} />
                <Route path="games/quest" element={<Private><MemoryQuest /></Private>} />
                <Route path="games/story" element={<Private><StoryGame /></Private>} />
                <Route path="talk" element={<Private><Talk /></Private>} />
                <Route path="memory" element={<Private><Memory /></Private>} />
                <Route path="journey" element={<Private><Journey /></Private>} />
                <Route path="achievements" element={<Private><Achievements /></Private>} />
                <Route path="family" element={<Private><Family /></Private>} />
                <Route path="profile" element={<Private><Profile /></Private>} />
                <Route path="languages" element={<Languages />} />
                <Route path="how-to-play" element={<HowToPlay />} />
                <Route path="how-to-use" element={<HowToUse />} />
                <Route path="help" element={<Help />} />
                <Route path="contact" element={<Contact />} />
                <Route path="settings" element={<Settings />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </VoiceProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
