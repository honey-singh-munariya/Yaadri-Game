import { db } from '../db'

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export interface Summary {
  name: string
  days: number
  games: number
  cues: { total: number; independent: number; light: number; multiple: number; independentPct: number }
  prevIndependentPct: number | null
  strong: string[]
  needsCues: string[]
  memoriesKept: number
  chaptersDone: number
  sentences: string[]
}

export async function weeklySummary(userId: string): Promise<Summary> {
  const name = (await db.query<{ display_name: string }>('SELECT display_name FROM profiles WHERE user_id=$1', [userId])).rows[0]?.display_name ?? 'Your person'
  const one = async (sql: string) => (await db.query<{ c: number }>(sql, [userId])).rows[0]?.c ?? 0

  const days = await one(`SELECT count(DISTINCT d)::int AS c FROM (
      SELECT date_trunc('day', created_at) AS d FROM game_scores WHERE user_id=$1 AND created_at > now() - interval '7 days'
      UNION SELECT date_trunc('day', created_at) FROM messages WHERE user_id=$1 AND role='user' AND created_at > now() - interval '7 days'
      UNION SELECT date_trunc('day', created_at) FROM cue_events WHERE user_id=$1 AND created_at > now() - interval '7 days') t`)
  const games = await one(`SELECT count(*)::int AS c FROM game_scores WHERE user_id=$1 AND created_at > now() - interval '7 days'`)
  const memoriesKept = await one(`SELECT count(*)::int AS c FROM memories WHERE user_id=$1 AND created_at > now() - interval '7 days'`)
  const chaptersDone = (await db.query<{ state: { completed?: string[] } }>('SELECT state FROM journey_progress WHERE user_id=$1', [userId])).rows[0]?.state?.completed?.length ?? 0

  const cueRow = (await db.query<{ total: number; ind: number; light: number; multi: number }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE correct AND cue_level=0)::int AS ind,
            count(*) FILTER (WHERE correct AND cue_level=1)::int AS light,
            count(*) FILTER (WHERE correct AND cue_level>=2)::int AS multi
       FROM cue_events WHERE user_id=$1 AND created_at > now() - interval '7 days'`, [userId])).rows[0]
  const prev = (await db.query<{ total: number; ind: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE correct AND cue_level=0)::int AS ind
       FROM cue_events WHERE user_id=$1 AND created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days'`, [userId])).rows[0]

  const strong = (await db.query<{ item_label: string }>(
    `SELECT item_label FROM cue_events WHERE user_id=$1 AND created_at > now() - interval '14 days' AND correct AND cue_level=0
      GROUP BY item_label ORDER BY count(*) DESC LIMIT 3`, [userId])).rows.map((r) => r.item_label)
  const needsCues = (await db.query<{ item_label: string }>(
    `SELECT item_label FROM cue_events WHERE user_id=$1 AND created_at > now() - interval '14 days' AND cue_level>=1
      GROUP BY item_label ORDER BY count(*) DESC LIMIT 3`, [userId])).rows.map((r) => r.item_label)

  const cues = { total: cueRow?.total ?? 0, independent: cueRow?.ind ?? 0, light: cueRow?.light ?? 0, multiple: cueRow?.multi ?? 0, independentPct: pct(cueRow?.ind ?? 0, cueRow?.total ?? 0) }
  const prevPct = prev && prev.total >= 3 ? pct(prev.ind, prev.total) : null

  const s: string[] = []
  if (!days && !games) {
    s.push(`${name} has not played or chatted this week yet. A short, relaxed game together is a good way to start.`)
  } else {
    s.push(`${name} spent time with YAADRI on ${days} day${days === 1 ? '' : 's'} this week and played ${games} round${games === 1 ? '' : 's'}.`)
    if (cues.total >= 3) {
      s.push(`Out of ${cues.total} things ${name} was asked to recall, ${cues.independent} came without any help (${cues.independentPct}%), ${cues.light} needed one gentle cue, and ${cues.multiple} needed a few cues.`)
      if (prevPct !== null) {
        const d = cues.independentPct - prevPct
        s.push(Math.abs(d) < 8 ? `That is about the same as the week before (${prevPct}%). Steady is good.` : d > 0 ? `That is up from ${prevPct}% the week before.` : `That is down from ${prevPct}% the week before. Day-to-day ups and downs are normal, so this is only a pattern to keep an eye on kindly.`)
      }
    }
    if (strong.length) s.push(`Recalled most easily: ${strong.join(', ')}.`)
    if (needsCues.length) s.push(`Might enjoy a little more practice with: ${needsCues.join(', ')}.`)
    if (memoriesKept) s.push(`${memoriesKept} new memor${memoriesKept === 1 ? 'y was' : 'ies were'} kept.`)
  }
  s.push('This is a summary of play patterns from the app. It is not a medical assessment.')
  return { name, days, games, cues, prevIndependentPct: prevPct, strong, needsCues, memoriesKept, chaptersDone, sentences: s }
}

/** Rule-based Copilot: answers only from logged activity. (LLM Q&A is a Phase 2 item in the concept doc.) */
export async function askCopilot(userId: string, q: string): Promise<{ answer: string[]; source: 'activity' }> {
  const sum = await weeklySummary(userId)
  const l = q.toLowerCase()
  if (/need|struggl|cue|hint|practice|hard|difficult/.test(l)) {
    return { answer: [sum.needsCues.length ? `Things that needed cues recently: ${sum.needsCues.join(', ')}.` : 'Nothing has needed extra cues recently.', 'Cues are normal and helpful. They show where a gentle hint works.'], source: 'activity' }
  }
  if (/good|well|strong|easy|remember/.test(l) && !/how was/.test(l)) {
    return { answer: [sum.strong.length ? `Recalled most easily: ${sum.strong.join(', ')}.` : 'There is not enough activity yet to say.'], source: 'activity' }
  }
  if (/game|play/.test(l)) {
    return { answer: [`${sum.name} played ${sum.games} round${sum.games === 1 ? '' : 's'} this week across ${sum.days} day${sum.days === 1 ? '' : 's'}.`], source: 'activity' }
  }
  return { answer: sum.sentences, source: 'activity' }
}
