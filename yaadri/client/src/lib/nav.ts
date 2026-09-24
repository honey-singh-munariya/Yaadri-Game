import type { Key } from '../i18n'
export interface NavItem { to: string; key: Key; icon: string; private?: boolean; visit?: string }

export const PRIMARY: NavItem[] = [
  { to: '/play', key: 'nav.play', icon: 'play', private: true },
  { to: '/games', key: 'nav.games', icon: 'games', private: true },
  { to: '/talk', key: 'nav.talkShort', icon: 'talk', private: true },
  { to: '/memory', key: 'nav.memory', icon: 'memory', private: true },
  { to: '/journey', key: 'nav.journey', icon: 'journey', private: true },
]
export const SECONDARY: NavItem[] = [
  { to: '/', key: 'nav.home', icon: 'home' },
  { to: '/achievements', key: 'nav.achievements', icon: 'trophy', private: true },
  { to: '/family', key: 'nav.family', icon: 'family', private: true },
  { to: '/languages', key: 'nav.languages', icon: 'globe' },
  { to: '/how-to-play', key: 'nav.howToPlay', icon: 'games' },
  { to: '/how-to-use', key: 'nav.howToUse', icon: 'book' },
  { to: '/help', key: 'nav.help', icon: 'help' },
  { to: '/contact', key: 'nav.contact', icon: 'mail' },
  { to: '/settings', key: 'nav.settings', icon: 'gear' },
  { to: '/profile', key: 'nav.profile', icon: 'user', private: true },
  { to: '/privacy', key: 'nav.privacy', icon: 'lock' },
]
