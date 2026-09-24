# YAADRI — a world that remembers you

A cognitive game and AI memory companion (SIH26003). Play memory games, follow a story, talk with a lantern
spirit, and let family add photos and stories that become gentle hints.

> Supports memory practice and companionship. It is **not** a medical device and does not diagnose or treat anything.

## Run it

Requires Node 20+. Works on Windows, macOS and Linux.

```bash
npm install
npm run dev            # easiest: API on :3001 + web on http://localhost:5173, no configuration needed
```

Production (serves the built app and the API together on http://localhost:3001):

```bash
npm run build
npm run secret         # prints a random secret: copy it
# create a file named .env in the project folder containing one line:
#   JWT_SECRET=<paste the secret>
npm start
```

Do not type `JWT_SECRET=... npm start` on Windows: that is bash-only syntax. Use the `.env` file instead.
Optional keys (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `DATABASE_URL`) go in the same `.env` file; see `.env.example`.

With no API keys it runs in **demo mode**: embedded PostgreSQL, scripted AI replies, device voice. Each is labelled in
the UI. Try the "Explore the demo" tab on the sign-in page for a seeded profile (deleted after 24 h).

```bash
npm run typecheck
npm run smoke          # end-to-end API checks against a running server (66 checks)
```

## Architecture

```
client/   React + TS + Tailwind + Framer Motion (Vite)
  src/game/          Memory Quest (5 mechanics) and Story Memory
  src/character/     Yaadri SVG character (moods.ts = swap-able skin contract) and the voice orb
  src/context/       App state, settings, Voice pipeline (speech in -> AI -> ElevenLabs -> playback)
  src/i18n/          en.ts (source) + hi/bn/as drafts; coverage computed at runtime
  src/lib/sound.ts   procedural Web Audio (no audio files; nothing plays until sound is switched on)
server/  Express + zod + JWT cookie auth
  services/ai.ts     OpenAI Responses API (server-side key), demoAi.ts fallback
  routes/voice.ts    ElevenLabs TTS proxy + optional STT; keys never reach the browser
  db.ts, schema.ts   PostgreSQL (pg) or embedded PGlite
shared/  story chapters, achievements, language registry, hint ladder (used by client and server)
```

Data model: users, profiles, settings, consents, memories, conversations, messages, game_progress, game_scores,
achievements, user_achievements, journey_progress, story_choices, languages, capsules, cue_events, contact_messages.

## Design decisions worth knowing

- **Gentle failure.** Losing all three lanterns shows "Time to rest", not "Game over". Unfinished rounds still earn a little XP.
- **Memory is consent-based.** YAADRI proposes; you approve (unless you switch on auto-remember). Sensitive text is never turned into a memory.
- **No invented memories.** Hints and capsule answers come only from what family typed. The AI prompt forbids inventing facts.
- **Honest language support.** UI coverage, conversation level and voice are tracked separately in `shared/languages.ts`.
  Voice is offered only where ElevenLabs lists the language (English, Hindi, Bengali, Assamese at time of writing; re-check before changing).
- **Adding a language:** add an entry in `shared/languages.ts` and a dictionary file in `client/src/i18n/`. Missing keys fall back to English.
  Hindi/Bengali/Assamese here are drafts and need native-speaker review before use with patients.
- **XP is computed on the server**, never trusted from the client.

## Not built yet

Family voice recordings, separate caregiver login, multi-user family linking, LLM-written caregiver Q&A, email delivery for the
contact form (messages are stored; read them via `ADMIN_TOKEN`), Bodo/Meitei/Mizo/Khasi/Garo/Nagamese/Kokborok translations and voices.
