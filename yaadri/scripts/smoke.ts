/* End-to-end API smoke test. Usage: (server running) npm run smoke */
export {}
const BASE = process.env.BASE ?? 'http://localhost:3001/api'
let cookie = ''
let failures = 0
async function call(method: string, path: string, body?: unknown, opts: { raw?: boolean } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'yaadri', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const sc = res.headers.get('set-cookie')
  if (sc) cookie = sc.split(';')[0]
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: res.status, json, text, res }
}
function check(name: string, ok: boolean, extra?: unknown) {
  if (!ok) failures++
  console.log(`${ok ? '  ok ' : ' FAIL'}  ${name}${ok ? '' : '  ->  ' + JSON.stringify(extra)}`)
}

const email = `smoke-${Date.now()}@example.com`
let r = await call('POST', '/auth/register', { name: 'Smoke', email, password: 'short' })
check('register rejects weak password + missing consent', r.status === 400, r.json)
r = await call('POST', '/auth/register', { name: 'Smoke', email, password: 'longenough1', consentData: true })
check('register ok', r.status === 201, r.json)
r = await call('GET', '/me')
check('me returns profile at level 1', r.status === 200 && r.json.profile.level === 1, r.json)
{
  const saved = cookie; cookie = ''
  const n = await call('GET', '/memories')
  check('unauthenticated request is rejected', n.status === 401, n.json)
  const c = await fetch(BASE + '/memories', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: saved }, body: JSON.stringify({ content: 'x y z' }) })
  check('missing CSRF header is rejected', c.status === 403, c.status)
  cookie = saved
}

// memories
r = await call('POST', '/memories', { content: 'Enjoys puzzle games' })
check('create memory', r.status === 201 && r.json.unlocked.some((a: any) => a.id === 'first_memory'), r.json)
const memId = r.json.memory.id
r = await call('POST', '/memories', { content: 'my phone is 9876543210' })
check('sensitive memory refused', r.status === 422, r.json)
r = await call('PATCH', `/memories/${memId}`, { content: 'Loves puzzle games' })
check('edit memory', r.status === 200 && r.json.memory.content === 'Loves puzzle games', r.json)

// chat (demo AI)
r = await call('POST', '/chat', { message: 'I love bamboo forests.' })
check('chat proposes a memory (not silently saved)', r.status === 200 && r.json.proposals.length === 1 && r.json.remembered.length === 0, r.json)
const convId = r.json.conversationId
r = await call('POST', '/chat', { message: 'hello', conversationId: convId })
check('chat is memory-aware on greeting', /puzzle/i.test(r.json.reply), r.json)
r = await call('POST', '/chat', { message: 'my password is hunter2', conversationId: convId })
check('chat refuses to memorise sensitive text', r.json.proposals.length === 0 && /won.t turn it into a memory/.test(r.json.reply), r.json)
r = await call('GET', `/chat/conversations/${convId}`)
check('conversation history persisted', r.json.messages.length === 6, r.json)

// games
r = await call('POST', '/games/score', { game: 'memory-quest', level: 1, completed: true, score: 400, stars: 3, mistakes: 0, hints: 0, durationMs: 30000, events: [{ key: 'bamboo', label: 'Bamboo', cue: 0, correct: true }] })
check('score awards XP server-side + First Game', r.status === 200 && r.json.xpGained >= 44 && r.json.unlocked.some((a: any) => a.id === 'first_game'), r.json)
r = await call('POST', '/games/score', { game: 'memory-quest', level: 2, completed: false, score: 10, stars: 3, mistakes: 3, hints: 1, durationMs: 9000 })
check('incomplete round earns small XP, no stars', r.status === 200 && r.json.xpGained === 3, r.json)

// journey: play all five chapters
r = await call('GET', '/journey')
check('journey starts with chapter 1 available', r.json.chapters[0].status === 'available' && r.json.chapters[1].status === 'locked', r.json.chapters)
r = await call('POST', '/journey/start', { chapterId: 'forgotten-path' })
check('locked chapter cannot be started', r.status === 403, r.json)
const script: Record<string, string[]> = {
  meet: ['ask_carry', 'give_rain', 'walk_on'],
  'first-memory': ['listen', 'ANSWER:face', 'ANSWER:rain', 'follow_river'],
  'forgotten-path': ['bird', 'on1', 'together', 'through'],
  'memory-challenge': ['ready', 'ANSWER:bird', 'ANSWER:together', 'ANSWER:rain', 'onward'],
  'final-journey': ['ask_hope', 'promise', 'stay'],
}
let lastReward: any
for (const [chapter, steps] of Object.entries(script)) {
  r = await call('POST', '/journey/start', { chapterId: chapter })
  check(`start ${chapter}`, r.status === 200 && !!r.json.scene, r.json)
  for (const step of steps) {
    if (step.startsWith('ANSWER:')) {
      r = await call('POST', '/journey/answer', { optionId: step.slice(7) })
      if (chapter === 'first-memory' && step === 'ANSWER:face') check('wrong answer gives a gentle hint (no failure)', r.status === 200 && r.json.correct === false && !!r.json.hint.text, r.json)
      else check(`answer ${step.slice(7)} in ${chapter}`, r.status === 200 && r.json.correct === true, r.json)
    } else {
      r = await call('POST', '/journey/choice', { choiceId: step })
      check(`choice ${step}`, r.status === 200, r.json)
    }
    if (r.json?.reward) lastReward = r.json.reward
  }
}
r = await call('GET', '/journey')
check('all five chapters complete', r.json.chapters.every((c: any) => c.status === 'complete'), r.json.chapters)
check('ending text reflects choices (stay)', r.json.scene.lines.join(' ').includes('hold the light'), r.json.scene)
r = await call('GET', '/achievements')
const unlocked = r.json.achievements.filter((a: any) => a.unlocked_at).map((a: any) => a.id)
for (const id of ['story_keeper', 'journey_complete', 'gentle_helper']) check(`achievement ${id}`, unlocked.includes(id), unlocked)
r = await call('POST', '/journey/replay')
check('replay resets progress', r.json.chapters[0].status === 'available' && r.json.run === 1, r.json)

// family
r = await call('POST', '/capsules', { kind: 'person', title: 'Rina', relation: 'Your granddaughter', clue: 'She draws.', story: 'She draws the hills every evening.', photo: 'data:text/html;base64,AAAA' })
check('capsule rejects non-image photo', r.status === 400, r.json)
r = await call('POST', '/capsules', { kind: 'person', title: 'Rina', relation: 'Your granddaughter', clue: 'She draws.', story: 'She draws the hills every evening. She is kind.' })
check('create capsule', r.status === 201, r.json)
const capId = r.json.capsule.id
for (const [lvl, kind] of [[1, 'clue'], [2, 'relationship'], [3, 'memory'], [4, 'reveal']] as const) {
  r = await call('GET', `/capsules/${capId}/rescue?level=${lvl}`)
  check(`rescue rung ${lvl} = ${kind}`, r.json.rung?.kind === kind, r.json)
}
r = await call('POST', `/capsules/${capId}/cue`, { cue: 1, correct: true })
check('cue logged', r.status === 200, r.json)
r = await call('GET', '/caregiver/summary')
check('caregiver summary has plain-language sentences + disclaimer', r.json.sentences.length >= 2 && /not a medical assessment/.test(r.json.sentences.at(-1)), r.json)
r = await call('POST', '/chat', { message: 'who is Rina?' })
check('chat answers from capsule only', /granddaughter/.test(r.json.reply), r.json)

// settings / profile / privacy
r = await call('PUT', '/settings', { memoryEnabled: false })
r = await call('POST', '/memories', { content: 'Loves tea' })
check('memory off blocks saving', r.status === 403, r.json)
r = await call('PUT', '/settings', { memoryEnabled: true, hacker: 1 })
check('unknown settings rejected', r.status === 400, r.json)
r = await call('PATCH', '/profile', { language: 'as' })
check('language change unlocks Language Explorer', r.json.unlocked?.some((a: any) => a.id === 'language_explorer'), r.json)
r = await call('POST', '/visit', { page: 'home' })
check('visit tracked', r.status === 200, r.json)

// voice + status + contact
r = await call('GET', '/voice/status')
check('voice status lists language support', r.json.languages.find((l: any) => l.code === 'as').voice === true && r.json.languages.find((l: any) => l.code === 'mni').voice === false, r.json)
r = await call('POST', '/voice/speak', { text: 'Hello', lang: 'mni' })
check('unsupported voice language refused honestly', r.status === 422 && r.json.error === 'voice_language_unsupported', r.json)
r = await call('POST', '/voice/speak', { text: 'Hello', lang: 'en' })
check('no key => clear demo fallback signal (501)', r.status === 501 && r.json.error === 'voice_not_configured', r.json)
r = await call('POST', '/contact', { name: 'A', email: 'bad', subject: 'x', message: 'short' })
check('contact validation', r.status === 400 && r.json.fields.email, r.json)
r = await call('POST', '/contact', { name: 'Asha', email: 'asha@example.com', subject: 'Hello there', message: 'Testing the contact form works.' })
check('contact stored', r.status === 201, r.json)

// export + delete
r = await call('GET', '/export')
check('export includes memories and capsules', r.json.memories.length >= 1 && r.json.capsules.length === 1, Object.keys(r.json))
r = await call('DELETE', '/account', { confirm: 'DELETE' })
check('account deletion', r.status === 200, r.json)
cookie = ''
r = await call('POST', '/auth/login', { email, password: 'longenough1' })
check('deleted account cannot sign in', r.status === 401, r.json)

// demo profile
r = await call('POST', '/auth/demo')
check('demo profile created', r.status === 201, r.json)
r = await call('GET', '/me')
check('demo has sample data + isDemo flag', r.json.user.isDemo === true && r.json.counts.memories >= 5 && r.json.counts.capsules === 4, r.json)
r = await call('GET', '/caregiver/summary')
check('demo caregiver summary has trend data', r.json.cues.total >= 5, r.json)

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
