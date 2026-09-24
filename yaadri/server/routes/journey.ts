import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { HttpError, parse, uid, wrap } from '../util'
import { CHAPTERS, getChapter, correctOption, type Scene } from '../../shared/story'
import { chapterStatus, freshState, getJourney, saveJourney, scenePayload, type JourneyState } from '../services/journey'
import { reward } from '../services/progress'
import { addSystemMemory } from '../services/memory'

export const journey = Router()

function overview(s: JourneyState) {
  return {
    run: s.run,
    stats: s.stats,
    chapters: CHAPTERS.map((c, i) => ({ id: c.id, title: c.title, blurb: c.blurb, icon: c.icon, status: chapterStatus(s, i), ending: s.endings[c.id] ?? null })),
    flags: s.flags,
  }
}

const currentScene = (s: JourneyState): Scene => {
  const sc = s.chapter && s.scene ? getChapter(s.chapter)?.scenes[s.scene] : undefined
  if (!sc) throw new HttpError(409, 'no_active_scene', 'Start a chapter first.')
  return sc
}

/** Move to the next scene, running scene hooks and finishing the chapter if it is an ending. */
async function advance(userId: string, s: JourneyState, nextId: string) {
  const ch = getChapter(s.chapter!)!
  const next = ch.scenes[nextId]
  s.scene = nextId
  if (next.onEnter === 'computeGlow') {
    const n = s.flags.filter((f) => f.startsWith('ind_')).length
    s.flags = s.flags.filter((f) => !f.startsWith('glow_'))
    s.flags.push(n >= 3 ? 'glow_bright' : n >= 1 ? 'glow_steady' : 'glow_soft')
  }
  let rw = null
  if (next.end && !s.completed.includes(ch.id)) {
    s.completed.push(ch.id)
    s.endings[ch.id] = next.end.outcome
    const xp = s.run > 0 ? Math.round(next.end.xp / 2) : next.end.xp
    await db.query(
      `INSERT INTO game_scores (id,user_id,game,level,score,stars,completed,xp_awarded) VALUES ($1,$2,'story-memory',$3,$4,0,TRUE,$5)`,
      [uid(), userId, CHAPTERS.findIndex((c) => c.id === ch.id) + 1, xp * 10, xp],
    )
    await db.query(`INSERT INTO game_progress (user_id,game,best_level,plays) VALUES ($1,'story-memory',$2,1)
       ON CONFLICT (user_id,game) DO UPDATE SET best_level=GREATEST(game_progress.best_level,$2), plays=game_progress.plays+1, updated_at=now()`, [userId, s.completed.length])
    await addSystemMemory(userId, { content: `Finished the story chapter “${ch.title}”.`, kind: 'story', source: 'story', context: next.end.outcome })
    await saveJourney(userId, s) // persist before evaluating achievements (they read journey state)
    rw = await reward(userId, xp)
  }
  await saveJourney(userId, s)
  return rw
}

journey.get('/journey', wrap(async (req, res) => {
  const s = await getJourney(req.userId!)
  const choices = (await db.query('SELECT chapter_id, scene_id, choice_id, label, created_at FROM story_choices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [req.userId])).rows
  res.json({ ...overview(s), scene: scenePayload(s), choices })
}))

journey.post('/journey/start', wrap(async (req, res) => {
  const { chapterId } = parse(z.object({ chapterId: z.string().max(40) }), req.body)
  const s = await getJourney(req.userId!)
  const idx = CHAPTERS.findIndex((c) => c.id === chapterId)
  if (idx < 0) throw new HttpError(404, 'not_found', 'That chapter does not exist.')
  const st = chapterStatus(s, idx)
  if (st === 'locked') throw new HttpError(403, 'locked', 'Finish the earlier chapter first.')
  if (st === 'complete') throw new HttpError(409, 'already_complete', 'You finished this chapter. Use “Play again” to replay the journey.')
  if (s.chapter !== chapterId || !s.scene) {
    s.chapter = chapterId
    s.scene = CHAPTERS[idx].startScene
    s.attempts = {}
    await saveJourney(req.userId!, s)
  }
  res.json({ ...overview(s), scene: scenePayload(s) })
}))

journey.post('/journey/choice', wrap(async (req, res) => {
  const { choiceId } = parse(z.object({ choiceId: z.string().max(40) }), req.body)
  const userId = req.userId!
  const s = await getJourney(userId)
  const sc = currentScene(s)
  const choice = sc.choices?.find((c) => c.id === choiceId)
  if (!choice) throw new HttpError(400, 'bad_choice', 'That choice is not available here.')
  const e = choice.effects
  if (e) {
    s.stats.warmth += e.warmth ?? 0
    s.stats.curiosity += e.curiosity ?? 0
    s.stats.courage += e.courage ?? 0
    for (const f of e.flags ?? []) if (!s.flags.includes(f)) s.flags.push(f)
    if (e.memory) await addSystemMemory(userId, { content: e.memory, kind: 'story', source: 'story', context: getChapter(s.chapter!)?.title })
  }
  await db.query('INSERT INTO story_choices (id,user_id,run,chapter_id,scene_id,choice_id,label) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uid(), userId, s.run, s.chapter, sc.id, choice.id, choice.label])
  const rw = await advance(userId, s, choice.next)
  res.json({ ...overview(s), scene: scenePayload(s), reward: rw })
}))

journey.post('/journey/answer', wrap(async (req, res) => {
  const { optionId } = parse(z.object({ optionId: z.string().max(40) }), req.body)
  const userId = req.userId!
  const s = await getJourney(userId)
  const sc = currentScene(s)
  const ch = sc.challenge
  if (!ch) throw new HttpError(400, 'no_challenge', 'There is no question here.')
  if (!ch.options.some((o) => o.id === optionId)) throw new HttpError(400, 'bad_option', 'That option is not available here.')
  const answer = correctOption(ch, s.flags)
  const attempts = s.attempts[ch.id] ?? 0

  if (optionId !== answer) {
    s.attempts[ch.id] = attempts + 1
    await saveJourney(userId, s)
    const level = attempts + 1
    const label = ch.options.find((o) => o.id === answer)!.label
    const text = level === 1 ? ch.hints[0] : level === 2 ? ch.optionHints[answer] : `Here it is, gently: “${label}”. Tap it when you are ready.`
    return res.json({ correct: false, hint: { level, text, reveal: level >= 3 ? answer : undefined } })
  }

  const cue = Math.min(attempts, 2)
  delete s.attempts[ch.id]
  if (cue === 0 && !s.flags.includes(`ind_${ch.id}`)) s.flags.push(`ind_${ch.id}`)
  await db.query(`INSERT INTO cue_events (id,user_id,source,item_key,item_label,cue_level,correct) VALUES ($1,$2,'story',$3,$4,$5,TRUE)`, [uid(), userId, ch.id, ch.prompt.slice(0, 80), cue])
  const gained = Math.round(ch.xp * (cue === 0 ? 1 : cue === 1 ? 0.7 : 0.5))
  const rw1 = await reward(userId, s.run > 0 ? Math.round(gained / 2) : gained)
  const rw2 = await advance(userId, s, ch.next)
  const merged = rw2 ? { ...rw2, xpGained: rw2.xpGained + rw1.xpGained, unlocked: [...rw1.unlocked, ...rw2.unlocked] } : rw1
  res.json({ correct: true, cue, ...overview(s), scene: scenePayload(s), reward: merged })
}))

journey.post('/journey/replay', wrap(async (req, res) => {
  const s = await getJourney(req.userId!)
  const fresh = freshState()
  fresh.run = s.run + 1
  await saveJourney(req.userId!, fresh)
  res.json({ ...overview(fresh), scene: null })
}))
