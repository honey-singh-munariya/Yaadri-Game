/**
 * Story Memory content. Data-driven: add a chapter by adding an entry to CHAPTERS.
 * The server is authoritative (validates choices, applies effects, resolves conditional lines);
 * the client only renders what the server returns.
 * Story text is English-only for now (see the Languages page: "story content" is tracked separately).
 */
export type Mood = 'idle' | 'happy' | 'thinking' | 'listening' | 'speaking' | 'celebrating' | 'confused' | 'encouraging' | 'concerned'

export interface Cond { flag?: string; notFlag?: string }
export interface TextLine { text: string; if?: Cond }
export interface Effects { warmth?: number; curiosity?: number; courage?: number; flags?: string[]; memory?: string }
export interface Choice { id: string; label: string; next: string; effects?: Effects }
export interface Challenge {
  id: string
  prompt: string
  options: { id: string; label: string }[]
  /** The correct option is whichever the player's own earlier choice produced. */
  answerFrom: { flag: string; option: string }[]
  fallbackAnswer: string
  /** Progressive Memory-Rescue ladder: clue -> option-specific hint -> gentle reveal (automatic). */
  hints: string[]
  optionHints: Record<string, string>
  xp: number
  next: string
}
export interface Scene {
  id: string
  mood: Mood
  lines: TextLine[]
  choices?: Choice[]
  challenge?: Challenge
  end?: { outcome: string; xp: number }
  onEnter?: 'computeGlow'
}
export interface Chapter { id: string; title: string; blurb: string; icon: string; startScene: string; scenes: Record<string, Scene> }

const L = (text: string, cond?: Cond): TextLine => ({ text, if: cond })
const f = (flag: string): Cond => ({ flag })

export const CHAPTERS: Chapter[] = [
  {
    id: 'meet', title: 'Meet YAADRI', icon: '🕯️', startScene: 'start',
    blurb: 'Mist settles over the hills, and a small light steps out of the bamboo.',
    scenes: {
      start: {
        id: 'start', mood: 'happy',
        lines: [L('Mist is settling over the hills. A small light drifts out of the bamboo and stops in front of you.'), L('“Oh! Someone who walks slowly enough to notice me. I\'m Yaadri. I carry things people don\'t want to lose.”')],
        choices: [
          { id: 'ask_carry', label: 'Hello, Yaadri. What do you carry?', next: 'carry', effects: { curiosity: 1 } },
          { id: 'ask_firefly', label: 'Are you a firefly?', next: 'firefly', effects: { warmth: 1, flags: ['joked'] } },
          { id: 'smile', label: 'Smile and wait.', next: 'quiet', effects: { warmth: 1, flags: ['patient'] } },
        ],
      },
      firefly: {
        id: 'firefly', mood: 'happy',
        lines: [L('“A firefly? Ha! Fireflies are brave, but they forget where they left their light. I never forget. That is my whole job.”')],
        choices: [{ id: 'ask_job', label: 'Ask what the job is.', next: 'carry' }],
      },
      quiet: {
        id: 'quiet', mood: 'encouraging',
        lines: [L('Yaadri hums, pleased. “Patience. That is rare. Most people ask me to hurry.”')],
        choices: [{ id: 'ask_carry2', label: 'Ask what Yaadri carries.', next: 'carry' }],
      },
      carry: {
        id: 'carry', mood: 'encouraging',
        lines: [
          L('“Small things. The smell of rain on a tin roof. A song someone hummed while cooking. A face that always waved at the door.”'),
          L('“Would you leave one small thing with me? I will keep it safe, and we will find it again together.”'),
        ],
        choices: [
          { id: 'give_rain', label: 'The sound of rain', next: 'glow', effects: { flags: ['keeps_rain'], memory: 'Gave Yaadri the sound of rain to keep.' } },
          { id: 'give_song', label: 'A humming song', next: 'glow', effects: { flags: ['keeps_song'], memory: 'Gave Yaadri a humming song to keep.' } },
          { id: 'give_face', label: 'A waving face', next: 'glow', effects: { flags: ['keeps_face'], memory: 'Gave Yaadri a waving face to keep.' } },
        ],
      },
      glow: {
        id: 'glow', mood: 'celebrating',
        lines: [
          L('You hand over the sound of rain. Yaadri\'s light ripples like water.', f('keeps_rain')),
          L('You hand over the humming song. Yaadri\'s light sways in time.', f('keeps_song')),
          L('You hand over the waving face. Yaadri\'s light warms, like a doorway at night.', f('keeps_face')),
          L('“Kept,” says Yaadri. “Now we are travelling companions.”'),
        ],
        choices: [{ id: 'walk_on', label: 'Walk on together.', next: 'end' }],
      },
      end: {
        id: 'end', mood: 'celebrating',
        lines: [L('The path ahead glows faintly. Yaadri bobs beside you, a little brighter than before.')],
        end: { outcome: 'You met Yaadri and shared your first keepsake.', xp: 40 },
      },
    },
  },
  {
    id: 'first-memory', title: 'First Memory', icon: '🌧️', startScene: 'start',
    blurb: 'Yaadri asks you to recall the very first thing you shared.',
    scenes: {
      start: {
        id: 'start', mood: 'thinking',
        lines: [L('By the bamboo grove, Yaadri\'s light dims and flickers. “Wait. I have something to show you, but you must remember it first.”')],
        choices: [{ id: 'listen', label: 'Listen carefully.', next: 'recall' }],
      },
      recall: {
        id: 'recall', mood: 'thinking',
        lines: [L('“Which small thing did you leave with me?”')],
        challenge: {
          id: 'kept_item', prompt: 'Which small thing did you leave with Yaadri?',
          options: [{ id: 'rain', label: 'The sound of rain' }, { id: 'song', label: 'A humming song' }, { id: 'face', label: 'A waving face' }],
          answerFrom: [{ flag: 'keeps_rain', option: 'rain' }, { flag: 'keeps_song', option: 'song' }, { flag: 'keeps_face', option: 'face' }],
          fallbackAnswer: 'rain',
          hints: ['Think back to the first chapter, when Yaadri asked you to leave something small.'],
          optionHints: { rain: 'It is something you could hear, falling on a roof.', song: 'Someone hummed it while cooking.', face: 'It always waved at the door.' },
          xp: 15, next: 'glow',
        },
      },
      glow: {
        id: 'glow', mood: 'happy',
        lines: [
          L('Rain begins to fall inside the lantern, softly, and the leaves around you drink it in.', f('keeps_rain')),
          L('A warm humming fills the grove, and the bamboo sways in time.', f('keeps_song')),
          L('A small figure waves from the edge of the light, then fades like a friend on a doorstep.', f('keeps_face')),
          L('“You remembered,” Yaadri whispers.'),
        ],
        choices: [
          { id: 'follow_river', label: 'Follow the lantern toward the river.', next: 'end', effects: { courage: 1, flags: ['went_river'] } },
          { id: 'sit_memory', label: 'Sit with the memory a while.', next: 'end', effects: { warmth: 1, flags: ['sat_with_memory'] } },
        ],
      },
      end: {
        id: 'end', mood: 'celebrating',
        lines: [
          L('You walk on with the lantern leading, the river\'s sound growing close.', f('went_river')),
          L('You sit until the memory settles like warm tea. Then Yaadri nudges you gently onward.', f('sat_with_memory')),
        ],
        end: { outcome: 'You remembered your first keepsake.', xp: 50 },
      },
    },
  },
  {
    id: 'forgotten-path', title: 'The Forgotten Path', icon: '🌿', startScene: 'start',
    blurb: 'Three ways open before you, and Yaadri cannot remember which is right.',
    scenes: {
      start: {
        id: 'start', mood: 'concerned',
        lines: [L('The grove opens onto three ways forward. Yaadri hovers, unsure.'), L('“I used to know this place. Now it feels like a word on the tip of my tongue.”')],
        choices: [
          { id: 'bird', label: 'Follow the bird call.', next: 'bird', effects: { curiosity: 1, flags: ['path_bird'] } },
          { id: 'river', label: 'Follow the sound of the river.', next: 'river', effects: { courage: 1, flags: ['path_river'] } },
          { id: 'steps', label: 'Climb the terraced steps.', next: 'steps', effects: { courage: 1, flags: ['path_steps'] } },
        ],
      },
      bird: { id: 'bird', mood: 'happy', lines: [L('A hill bird calls twice, then leads you along a ridge of tall grass.')], choices: [{ id: 'on1', label: 'Keep walking.', next: 'gate' }] },
      river: { id: 'river', mood: 'happy', lines: [L('The river murmurs beside you, cool and steady, and the path follows its bend.')], choices: [{ id: 'on2', label: 'Keep walking.', next: 'gate' }] },
      steps: { id: 'steps', mood: 'happy', lines: [L('Worn stone steps rise through the terraces. Each one is a little higher, a little slower, a little clearer.')], choices: [{ id: 'on3', label: 'Keep walking.', next: 'gate' }] },
      gate: {
        id: 'gate', mood: 'concerned',
        lines: [L('You reach an old stone gate. Yaadri\'s light gutters.'), L('“I am forgetting the way. Is this what it feels like?”')],
        choices: [
          { id: 'together', label: 'Hold Yaadri\'s light and remember together.', next: 'mossy', effects: { warmth: 2, flags: ['helped_together'] } },
          { id: 'landmarks', label: 'Look around for landmarks.', next: 'mossy', effects: { curiosity: 2, flags: ['helped_landmarks'] } },
          { id: 'rest', label: 'Suggest resting a moment.', next: 'mossy', effects: { warmth: 1, courage: 1, flags: ['rested'] } },
        ],
      },
      mossy: {
        id: 'mossy', mood: 'encouraging',
        lines: [
          L('Your hands steady the light. Slowly, the gate\'s carvings begin to glow.', f('helped_together')),
          L('You find a mossy stone carved with a river, a bird and a step: three ways, one path.', f('helped_landmarks')),
          L('You sit with Yaadri until the light steadies by itself.', f('rested')),
          L('“Thank you for not hurrying me,” says Yaadri.'),
        ],
        choices: [{ id: 'through', label: 'Pass through the gate.', next: 'end' }],
      },
      end: {
        id: 'end', mood: 'celebrating',
        lines: [L('Beyond the gate the path is clear again, and Yaadri glows a little braver.')],
        end: { outcome: 'You helped Yaadri find the way again.', xp: 60 },
      },
    },
  },
  {
    id: 'memory-challenge', title: 'Memory Challenge', icon: '🏮', startScene: 'start',
    blurb: 'A ring of lanterns asks three gentle questions about the road so far.',
    scenes: {
      start: {
        id: 'start', mood: 'encouraging',
        lines: [L('Beneath the gate, a ring of small lanterns waits.'), L('“Three questions,” says Yaadri. “Not to test you. To light the way. There is no failing here, only more light.”')],
        choices: [{ id: 'ready', label: 'I\'m ready.', next: 'q1' }],
      },
      q1: {
        id: 'q1', mood: 'thinking',
        lines: [L('The first lantern flickers.')],
        challenge: {
          id: 'path_taken', prompt: 'Which way did you walk to reach the old gate?',
          options: [{ id: 'bird', label: 'Following the bird call' }, { id: 'river', label: 'Following the river' }, { id: 'steps', label: 'Climbing the terraced steps' }],
          answerFrom: [{ flag: 'path_bird', option: 'bird' }, { flag: 'path_river', option: 'river' }, { flag: 'path_steps', option: 'steps' }],
          fallbackAnswer: 'bird',
          hints: ['Think about the moment the grove opened into three ways.'],
          optionHints: { bird: 'You followed something that can fly.', river: 'You followed something that flows.', steps: 'You used your legs, going up.' },
          xp: 15, next: 'q2',
        },
      },
      q2: {
        id: 'q2', mood: 'thinking',
        lines: [L('The second lantern brightens.')],
        challenge: {
          id: 'helped_how', prompt: 'How did you help Yaadri at the gate?',
          options: [{ id: 'together', label: 'Held its light and remembered together' }, { id: 'landmarks', label: 'Looked around for landmarks' }, { id: 'rested', label: 'Rested with it a moment' }],
          answerFrom: [{ flag: 'helped_together', option: 'together' }, { flag: 'helped_landmarks', option: 'landmarks' }, { flag: 'rested', option: 'rested' }],
          fallbackAnswer: 'together',
          hints: ['Yaadri\'s light was flickering. What did you do next to it?'],
          optionHints: { together: 'It involved your hands and its light.', landmarks: 'You used your eyes, looking at the stones.', rested: 'You did something slow and quiet, side by side.' },
          xp: 15, next: 'q3',
        },
      },
      q3: {
        id: 'q3', mood: 'thinking',
        lines: [L('The last lantern hums.')],
        challenge: {
          id: 'kept_item2', prompt: 'Which small thing does Yaadri still keep for you?',
          options: [{ id: 'rain', label: 'The sound of rain' }, { id: 'song', label: 'A humming song' }, { id: 'face', label: 'A waving face' }],
          answerFrom: [{ flag: 'keeps_rain', option: 'rain' }, { flag: 'keeps_song', option: 'song' }, { flag: 'keeps_face', option: 'face' }],
          fallbackAnswer: 'rain',
          hints: ['It was the very first thing you shared, back when you met Yaadri.'],
          optionHints: { rain: 'It falls on tin roofs.', song: 'Someone hummed it while cooking.', face: 'It always waved at the door.' },
          xp: 15, next: 'result',
        },
      },
      result: {
        id: 'result', mood: 'celebrating', onEnter: 'computeGlow',
        lines: [
          L('The ring of lanterns blazes gold. “You carried all of it,” says Yaadri.', f('glow_bright')),
          L('The lanterns glow steady and warm. “Enough to see by, and we will see more together.”', f('glow_steady')),
          L('The lanterns glow softly. “Soft light is still light. We will remember the rest along the way.”', f('glow_soft')),
        ],
        choices: [{ id: 'onward', label: 'Continue.', next: 'end' }],
      },
      end: {
        id: 'end', mood: 'celebrating',
        lines: [L('The lanterns lift one by one and drift ahead, marking the road down to the valley.')],
        end: { outcome: 'You lit the ring of lanterns.', xp: 80 },
      },
    },
  },
  {
    id: 'final-journey', title: 'The Final Journey', icon: '🌄', startScene: 'start',
    blurb: 'Past the gate, a village of small lit windows waits in the valley.',
    scenes: {
      start: {
        id: 'start', mood: 'happy',
        lines: [
          L('Past the gate the hills fall away. Far below, a village of small lit windows waits in the valley.'),
          L('The bird call you followed drifts up from below.', f('path_bird')),
          L('The river you followed shines like a thread of silver.', f('path_river')),
          L('The terraced steps you climbed glow in the dusk like stairs of light.', f('path_steps')),
        ],
        choices: [
          { id: 'walk_down', label: 'Walk down toward the village.', next: 'village', effects: { courage: 1 } },
          { id: 'ask_hope', label: 'Ask Yaadri what it hopes for.', next: 'hope', effects: { warmth: 1, curiosity: 1 } },
        ],
      },
      hope: {
        id: 'hope', mood: 'encouraging',
        lines: [L('“I hope,” says Yaadri slowly, “that someone remembers me the way I remember them.”')],
        choices: [{ id: 'promise', label: '“I will.”', next: 'village', effects: { warmth: 2, flags: ['promised'] } }],
      },
      village: {
        id: 'village', mood: 'happy',
        lines: [
          L('The village windows glow one by one. Someone at a doorway waves.'),
          L('It is the waving face you gave Yaadri, just as you remember.', f('keeps_face')),
          L('Rain begins, gentle on tin roofs, exactly as you remembered.', f('keeps_rain')),
          L('From an open window, someone hums the song you gave Yaadri.', f('keeps_song')),
          L('“You promised,” Yaadri says softly. “I am holding you to it.”', f('promised')),
        ],
        choices: [
          { id: 'stay', label: 'Leave the lantern lit at the doorway.', next: 'end', effects: { warmth: 2, flags: ['ending_stay'] } },
          { id: 'carry', label: 'Carry the lantern with you.', next: 'end', effects: { courage: 2, flags: ['ending_carry'] } },
        ],
      },
      end: {
        id: 'end', mood: 'celebrating',
        lines: [
          L('Yaadri glows in the doorway, watching over everyone who comes home. “I will hold the light,” it says. “You hold the memories.”', f('ending_stay')),
          L('Yaadri floats beside you as you walk on. “Wherever we go,” it says, “I will remember for both of us.”', f('ending_carry')),
        ],
        end: { outcome: 'You reached the village with Yaadri.', xp: 120 },
      },
    },
  },
]

export const getChapter = (id: string) => CHAPTERS.find((c) => c.id === id)

export function condMet(cond: Cond | undefined, flags: string[]): boolean {
  if (!cond) return true
  if (cond.flag && !flags.includes(cond.flag)) return false
  if (cond.notFlag && flags.includes(cond.notFlag)) return false
  return true
}
export const resolveLines = (lines: TextLine[], flags: string[]): string[] => lines.filter((l) => condMet(l.if, flags)).map((l) => l.text)
export function correctOption(ch: Challenge, flags: string[]): string {
  for (const a of ch.answerFrom) if (flags.includes(a.flag)) return a.option
  return ch.fallbackAnswer
}
