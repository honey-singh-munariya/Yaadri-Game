/** XP / level maths shared by client and server. Level n starts at 40 * (n-1)^2 XP. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1
}
export function levelStartXp(level: number): number {
  return 40 * (level - 1) * (level - 1)
}
export function levelInfo(xp: number) {
  const level = levelFromXp(xp)
  const start = levelStartXp(level)
  const next = levelStartXp(level + 1)
  return { level, xp, start, next, into: xp - start, span: next - start, pct: Math.min(100, Math.round(((xp - start) / (next - start)) * 100)) }
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  xp: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_memory', name: 'First Memory', description: 'Keep your first memory with YAADRI.', icon: '🕯️', xp: 20 },
  { id: 'first_game', name: 'First Game', description: 'Finish a round of any game.', icon: '🎮', xp: 20 },
  { id: 'memory_master', name: 'Memory Master', description: 'Clear level 5 of Memory Quest.', icon: '🏔️', xp: 60 },
  { id: 'explorer', name: 'Explorer', description: 'Visit six different parts of YAADRI.', icon: '🧭', xp: 30 },
  { id: 'story_keeper', name: 'Story Keeper', description: 'Finish three story chapters.', icon: '📖', xp: 40 },
  { id: 'language_explorer', name: 'Language Explorer', description: 'Try YAADRI in a second language.', icon: '🌏', xp: 25 },
  { id: 'yaadri_friend', name: 'YAADRI Friend', description: 'Share ten messages with YAADRI.', icon: '💛', xp: 40 },
  { id: 'journey_complete', name: 'Journey Complete', description: 'Finish all five chapters of the journey.', icon: '🌄', xp: 100 },
  { id: 'family_keeper', name: 'Family Keeper', description: 'Add your first Memory Capsule.', icon: '🏡', xp: 30 },
  { id: 'gentle_helper', name: 'Gentle Helper', description: 'Recall something with the help of a hint.', icon: '🪔', xp: 20 },
]

export const VISIT_KEYS = ['home', 'play', 'games', 'talk', 'memory', 'journey', 'achievements', 'languages', 'family', 'howto', 'help', 'profile', 'settings'] as const
