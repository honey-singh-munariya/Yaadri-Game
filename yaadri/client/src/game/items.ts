import { shuffle } from '../lib/hooks'

export interface Item { id: string; emoji: string; name: string; cat: string }
export const ITEMS: Item[] = [
  { id: 'bamboo', emoji: '🎋', name: 'Bamboo', cat: 'plant' }, { id: 'tea', emoji: '🍃', name: 'Tea leaf', cat: 'plant' },
  { id: 'orchid', emoji: '🌸', name: 'Orchid', cat: 'flower' }, { id: 'rhino', emoji: '🦏', name: 'Rhino', cat: 'animal' },
  { id: 'elephant', emoji: '🐘', name: 'Elephant', cat: 'animal' }, { id: 'bird', emoji: '🐦', name: 'Hill bird', cat: 'animal' },
  { id: 'boat', emoji: '🛶', name: 'River boat', cat: 'boat' }, { id: 'mountain', emoji: '⛰️', name: 'Mountain', cat: 'place' },
  { id: 'rice', emoji: '🌾', name: 'Rice', cat: 'crop' }, { id: 'thread', emoji: '🧶', name: 'Thread', cat: 'thread' },
  { id: 'pineapple', emoji: '🍍', name: 'Pineapple', cat: 'fruit' }, { id: 'chilli', emoji: '🌶️', name: 'Chilli', cat: 'food' },
  { id: 'cup', emoji: '🍵', name: 'Tea', cat: 'drink' }, { id: 'fish', emoji: '🐟', name: 'Fish', cat: 'animal' },
  { id: 'lamp', emoji: '🪔', name: 'Oil lamp', cat: 'light' }, { id: 'drum', emoji: '🥁', name: 'Drum', cat: 'instrument' },
  { id: 'house', emoji: '🏠', name: 'House', cat: 'building' }, { id: 'butterfly', emoji: '🦋', name: 'Butterfly', cat: 'animal' },
  { id: 'mango', emoji: '🥭', name: 'Mango', cat: 'fruit' }, { id: 'banana', emoji: '🍌', name: 'Banana', cat: 'fruit' },
]
export const pickItems = (n: number, exclude: string[] = []) => shuffle(ITEMS.filter((i) => !exclude.includes(i.id))).slice(0, n)

export type Mechanic = 'objects' | 'sequence' | 'pairs' | 'hidden' | 'family'
export interface LevelSpec { level: number; mechanic: Mechanic; n: number; tier: number; game: 'memory-quest' | 'family-faces' }

/** Difficulty rises gently: five mechanics cycle, and every cycle adds a little (one more item, one more lantern…). */
export function levelSpec(level: number, hasCapsules: boolean, familyOnly = false): LevelSpec {
  if (familyOnly) return { level, mechanic: 'family', n: Math.min(3 + Math.floor((level - 1) / 2), 6), tier: level, game: 'family-faces' }
  const cycle: Mechanic[] = ['objects', 'sequence', 'pairs', 'hidden', hasCapsules ? 'family' : 'objects']
  const mechanic = cycle[(level - 1) % 5]
  const tier = Math.min(4, Math.floor((level - 1) / 5))
  const n = { objects: Math.min(3 + tier + (level > 5 && mechanic === 'objects' && level % 5 === 0 ? 1 : 0), 7), sequence: Math.min(3 + tier, 8), pairs: 3 + Math.min(tier, 3), hidden: 4 + tier, family: Math.min(3 + tier, 5) }[mechanic]
  return { level, mechanic, n, tier, game: 'memory-quest' }
}
export const MECH_ICON: Record<Mechanic, string> = { objects: '🎋', sequence: '🏮', pairs: '🃏', hidden: '🧺', family: '🏡' }
export const MAX_LEVEL = 20
