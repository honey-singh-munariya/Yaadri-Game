import type { Ctx } from './context'
import { extractProposals, isSensitive, type Proposal } from './memory'
import type { Mood } from '../../shared/story'

export interface Reply { reply: string; mood: Mood; proposals: Proposal[] }

const pick = <T,>(a: T[], seed: number) => a[seed % a.length]

const PREF_RE = /^(enjoys|loves|likes|adores|prefers)\s+/i

function prefHint(ctx: Ctx): { text: string; topic: string } | null {
  const pref = ctx.memories.find((m) => PREF_RE.test(m.content))
  if (!pref) return null
  const topic = pref.content.replace(PREF_RE, '').trim()
  return { topic, text: `I remember you enjoy ${topic}.` }
}

function gameNudge(ctx: Ctx, topic?: string): string {
  const next = ctx.games.bestLevel + 1
  if (topic && /puzzle|memory|quiz|riddle|game/i.test(topic)) return `Ready for a harder challenge? Memory Quest level ${next} is waiting.`
  if (topic && /stor|book|read|tale|myth/i.test(topic)) return ctx.journey.nextTitle ? `Shall we continue the story with “${ctx.journey.nextTitle}”?` : 'Shall we replay the journey and choose differently?'
  if (topic && /music|song|sing|hum|dance/i.test(topic)) return 'The humming-song keepsake in the story might be a nice place to visit. Want to continue the journey?'
  return `Would you like to play Memory Quest level ${next}, or continue the story?`
}

const LANG_NOTE = (ctx: Ctx) => (ctx.language !== 'en' ? `\n\n(Demo mode: I can only reply in English right now. With an AI key connected, I can also chat in ${ctx.languageName}.)` : '')

export function demoReply(ctx: Ctx, message: string, seed = Date.now()): Reply {
  const m = message.trim()
  const lower = m.toLowerCase()
  const proposals = extractProposals(m)
  const done = (reply: string, mood: Mood, props: Proposal[] = []): Reply => ({ reply: reply + LANG_NOTE(ctx), mood, proposals: props })

  if (isSensitive(m)) {
    return done('That sounds personal, so I won\'t turn it into a memory. I\'m still glad to listen. For anything about health or money, someone you trust or a professional is the right person to ask.', 'encouraging')
  }
  if (proposals.length) {
    const first = proposals[0].content
    return done(`Lovely. I would like to keep this one: “${first}”. Shall I remember it?`, 'happy', proposals)
  }
  if (/what (do|can) you (remember|know)|remember about me|what have i told/.test(lower)) {
    if (!ctx.memories.length) return done('Nothing yet, and that is fine. Tell me one thing you enjoy, and I will offer to keep it.', 'encouraging')
    const list = ctx.memories.slice(0, 4).map((x) => `• ${x.content}`).join('\n')
    return done(`Here is what I am holding for you:\n${list}\n\nYou can edit or delete any of these in My Memory.`, 'happy')
  }
  const cap = ctx.capsules.find((c) => lower.includes(c.title.toLowerCase().split(' ')[0]))
  if (cap && /who|tell me|about|remember/.test(lower)) {
    const bits = [cap.relation ? `${cap.title} is ${cap.relation}.` : `I have a memory capsule for ${cap.title}.`, cap.clue, cap.story].filter(Boolean)
    return done(`${bits.join(' ')}\n\nThis comes from the capsule your family added. I will not add anything to it.`, 'happy')
  }
  if (/\b(family|people|capsule)s?\b/.test(lower) && ctx.capsules.length) {
    return done(`Your family has shared ${ctx.capsules.length} memory capsules with me: ${ctx.capsules.map((c) => c.title).join(', ')}. Want to look at one together?`, 'happy')
  }
  if (/\b(sad|tired|lonely|worried|scared|confused|anxious|forgot|forget|forgetting|lost)\b/.test(lower)) {
    return done('That is okay. Forgetting a word or a name happens to everyone, and we can go slowly. Would you like a calm game together, or shall we just talk for a while?', 'concerned')
  }
  if (/\b(play|game|games|challenge|puzzle|quest)\b/.test(lower)) {
    const h = prefHint(ctx)
    return done(`${h ? h.text + ' ' : ''}${gameNudge(ctx, h?.topic)}`, 'encouraging')
  }
  if (/\b(story|journey|chapter|lantern|continue)\b/.test(lower)) {
    const gave = ctx.journey.flags.includes('keeps_rain') ? 'the sound of rain' : ctx.journey.flags.includes('keeps_song') ? 'a humming song' : ctx.journey.flags.includes('keeps_face') ? 'a waving face' : null
    const parts = [
      ctx.journey.completed.length ? `You have finished ${ctx.journey.completed.length} of 5 chapters.` : 'Your journey has not started yet.',
      gave ? `I am still keeping ${gave} for you.` : '',
      ctx.journey.nextTitle ? `Next is “${ctx.journey.nextTitle}”.` : 'You have reached the village. You can replay and choose differently.',
    ].filter(Boolean)
    return done(parts.join(' '), 'happy')
  }
  if (/\b(hindi|assamese|bengali|bodo|mizo|khasi|garo|meitei|manipuri|nagamese|kokborok|language|bhasha)\b/.test(lower)) {
    return done('I can show the app in English, Hindi, Bengali and Assamese, with more being added. I can speak in English, Hindi, Bengali and Assamese too. Bodo, Meitei, Mizo, Khasi, Garo, Nagamese and Kokborok do not have a voice yet, and I will not pretend they do. You can check the Languages page for exact details.', 'thinking')
  }
  if (/\b(thanks|thank you|shukriya|dhanyavad)\b/.test(lower)) return done(pick(['You are welcome. It is good to walk with you.', 'Always. Shall we keep going?'], seed), 'happy')
  if (/\b(who are you|what are you|your name)\b/.test(lower)) {
    return done('I am Yaadri, a small lantern spirit. I keep the things you choose to share, and I play games with you so they stay bright. I am not a doctor, and I never make up memories.', 'happy')
  }
  if (/^(hi|hello|hey|namaste|namaskar|nomoskar|good (morning|afternoon|evening))\b/.test(lower)) {
    const h = prefHint(ctx)
    return done(`Hello, ${ctx.name}. ${h ? h.text + ' ' + gameNudge(ctx, h.topic) : 'It is good to see you. What would you like to do today: play, hear a story, or just talk?'}`, 'happy')
  }
  if (/\b(help|how do i|how to)\b/.test(lower)) {
    return done('You can play Memory Quest, follow the story, or just talk to me. Tap the microphone to speak. Everything I keep is in My Memory, and you can change or delete it anytime.', 'encouraging')
  }
  return done(pick(['Tell me more. I am listening.', 'That is interesting. What made you think of it?', 'I like hearing that. Is there a small detail you would like me to keep?'], seed), 'listening')
}
