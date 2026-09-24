import { db } from '../db'
import { uid } from '../util'
import { freshState, saveJourney } from './journey'
import { DEFAULT_SETTINGS } from './settings'

const avatar = (initials: string, hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,38%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="82" r="34" fill="rgba(255,255,255,.35)"/><path d="M40 190c8-44 36-62 60-62s52 18 60 62z" fill="rgba(255,255,255,.35)"/><text x="100" y="112" font-family="Georgia,serif" font-size="44" text-anchor="middle" fill="#fff">${initials}</text></svg>`,
  )}`

/** Sample data so the whole product can be explored without external APIs. Clearly flagged as demo in the UI. */
export async function seedDemo(userId: string) {
  await db.query(`UPDATE profiles SET xp=340, languages_tried='["en","hi"]'::jsonb, visited='["home","play","games","talk","memory","journey","family"]'::jsonb WHERE user_id=$1`, [userId])
  await db.query(`INSERT INTO settings (user_id,data) VALUES ($1,$2::jsonb) ON CONFLICT (user_id) DO UPDATE SET data=$2::jsonb`, [userId, JSON.stringify({ ...DEFAULT_SETTINGS, autoRemember: false })])

  const mems: [string, string, string][] = [
    ['Enjoys puzzle games', 'preference', 'chat'],
    ['Favourite tree: bamboo', 'preference', 'chat'],
    ['Likes to be called Demo', 'preference', 'chat'],
    ['Gave Yaadri the sound of rain to keep.', 'story', 'story'],
    ['Cleared Memory Quest level 3.', 'game', 'games'],
    ['Unlocked the “First Memory” achievement.', 'achievement', 'achievements'],
  ]
  for (const [i, m] of mems.entries()) {
    await db.query(`INSERT INTO memories (id,user_id,content,kind,source,created_at) VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' hours')::interval)`, [uid(), userId, m[0], m[1], m[2], String((mems.length - i) * 7)])
  }

  const caps: [string, string, string, string, string, number][] = [
    ['Rina', 'person', 'Your granddaughter', 'She lives near the tea garden and loves to draw.', 'Rina draws the hills every evening and always leaves one picture on your table.', 20],
    ['Bimal', 'person', 'Your younger brother', 'He taught you to fish by the river.', 'Bimal laughs so loudly that the fish swim away. You both keep going back anyway.', 200],
    ['The river bend', 'place', 'Where the family picnics', 'A quiet bend with flat stones you can sit on.', 'Every spring the family carries a big pot of rice and dal there and eats on the stones.', 150],
    ['Weaving evenings', 'event', 'A Saturday tradition', 'The sound of a loom in the next room.', 'Your sister wove while you sang softly. The whole house smelled of woodsmoke and tea.', 300],
  ]
  for (const c of caps) {
    await db.query(
      `INSERT INTO capsules (id,user_id,kind,title,relation,clue,story,photo,contributor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Demo family')`,
      [uid(), userId, c[1], c[0], c[2], c[3], c[4], avatar(c[0].slice(0, 1).toUpperCase(), c[5])],
    )
  }

  await db.query(`INSERT INTO game_progress (user_id,game,best_level,plays) VALUES ($1,'memory-quest',3,6) ON CONFLICT (user_id,game) DO UPDATE SET best_level=3, plays=6`, [userId])
  for (let i = 0; i < 6; i++) {
    await db.query(
      `INSERT INTO game_scores (id,user_id,game,level,score,stars,completed,xp_awarded,hints_used,mistakes,duration_ms,created_at)
       VALUES ($1,$2,'memory-quest',$3,$4,$5,TRUE,$6,$7,$8,$9, now() - ($10 || ' hours')::interval)`,
      [uid(), userId, Math.min(3, 1 + Math.floor(i / 2)), 300 + i * 90, 2 + (i % 2), 30 + i * 4, i % 3, i % 2, 42000 + i * 3000, String(i * 20 + 3)],
    )
  }
  const cueRows: [string, string, number, boolean, number][] = [
    ['quest', 'Rina', 0, true, 5], ['quest', 'Bimal', 1, true, 5], ['quest', 'The river bend', 0, true, 30], ['quest', 'Rina', 0, true, 30],
    ['story', 'kept_item', 0, true, 50], ['quest', 'Weaving evenings', 2, true, 70], ['quest', 'Bimal', 1, true, 120], ['quest', 'Rina', 0, true, 120],
    ['quest', 'Bimal', 0, true, 220], ['quest', 'Weaving evenings', 1, true, 220],
  ]
  for (const c of cueRows) {
    await db.query(`INSERT INTO cue_events (id,user_id,source,item_key,item_label,cue_level,correct,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' hours')::interval)`, [uid(), userId, c[0], c[1].toLowerCase(), c[1], c[2], c[3], String(c[4])])
  }
  for (const a of ['first_memory', 'first_game', 'explorer', 'family_keeper', 'gentle_helper', 'language_explorer']) {
    await db.query(`INSERT INTO user_achievements (user_id,achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, a])
  }
  const st = freshState()
  st.completed = ['meet', 'first-memory']
  st.flags = ['keeps_rain', 'went_river', 'joked']
  st.stats = { warmth: 1, curiosity: 1, courage: 1 }
  st.endings = { meet: 'You met Yaadri and shared your first keepsake.', 'first-memory': 'You remembered your first keepsake.' }
  await saveJourney(userId, st)

  const conv = uid()
  await db.query(`INSERT INTO conversations (id,user_id,title) VALUES ($1,$2,'Welcome')`, [conv, userId])
  const msgs: [string, string, string][] = [
    ['user', 'Hello Yaadri! I love puzzle games.', ''],
    ['assistant', 'Lovely. I would like to keep this one: “Enjoys puzzle games”. Shall I remember it?', 'happy'],
    ['user', 'Yes please.', ''],
    ['assistant', 'Kept. Next time I will remember it. Shall we play Memory Quest?', 'encouraging'],
  ]
  for (const [i, m] of msgs.entries()) {
    await db.query(`INSERT INTO messages (id,conversation_id,user_id,role,content,mood,created_at) VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' minutes')::interval)`, [uid(), conv, userId, m[0], m[1], m[2] || null, String((msgs.length - i) * 2)])
  }
  await db.query(`INSERT INTO consents (id,user_id,kind,granted,text_version) VALUES ($1,$2,'data_use',TRUE,'v1'), ($3,$2,'guardian',TRUE,'v1')`, [uid(), userId, uid()])
}
