import type { Mood } from '../../shared/story'
export type { Mood }

export interface Settings {
  sound: boolean; ambience: boolean; voiceEnabled: boolean; autoSpeak: boolean
  motion: 'full' | 'gentle' | 'off'; textSize: 'normal' | 'large' | 'xl'; theme: 'dusk' | 'morning' | 'contrast'
  memoryEnabled: boolean; autoRemember: boolean; saveHistory: boolean
}
export const DEFAULT_SETTINGS: Settings = {
  sound: false, ambience: true, voiceEnabled: true, autoSpeak: false, motion: 'full', textSize: 'normal', theme: 'dusk',
  memoryEnabled: true, autoRemember: false, saveHistory: true,
}

export interface Profile {
  displayName: string; avatar: string; language: string; guardianName: string | null; languagesTried: string[]; createdAt: string
  level: number; xp: number; start: number; next: number; into: number; span: number; pct: number
}
export interface Me {
  user: { id: string; email: string; isDemo: boolean }
  profile: Profile
  settings: Settings
  counts: { memories: number; achievements: number; gamesPlayed: number; capsules: number }
}
export interface Unlocked { id: string; name: string; description: string; icon: string; xp: number }
export interface Reward { xpGained: number; xp: number; level: number; leveledUp: boolean; unlocked: Unlocked[] }

export interface MemoryItem { id: string; content: string; kind: string; source: string; context: string | null; created_at: string; updated_at: string }
export interface Capsule { id: string; kind: 'person' | 'place' | 'event'; title: string; relation: string | null; clue: string | null; story: string | null; photo: string | null; contributor: string | null; created_at: string }
export interface Proposal { content: string; kind: string }
export interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; mood?: Mood | null; proposals?: Proposal[]; fresh?: boolean }

export interface ChapterInfo { id: string; title: string; blurb: string; icon: string; status: 'complete' | 'in_progress' | 'available' | 'locked'; ending: string | null }
export interface ScenePayload {
  chapterId: string; chapterTitle: string; sceneId: string; mood: Mood; lines: string[]
  choices?: { id: string; label: string }[]
  challenge?: { id: string; prompt: string; options: { id: string; label: string }[]; attempts: number }
  end?: { outcome: string; xp: number }
}
export interface JourneyOverview { run: number; stats: { warmth: number; curiosity: number; courage: number }; chapters: ChapterInfo[]; flags: string[]; scene: ScenePayload | null; reward?: Reward | null }
