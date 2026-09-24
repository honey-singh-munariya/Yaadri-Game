/**
 * Language registry. Adding a language = add an entry here + (optionally) a
 * client/src/i18n/<code>.ts dictionary. Nothing else needs to change.
 *
 * Three SEPARATE support tiers are tracked, because they are different things:
 *  - ui:    how much of the interface has reviewed translations (computed at runtime from dictionaries)
 *  - ai:    how well the companion is expected to converse (depends on the configured model; best-effort)
 *  - voice: whether the configured voice provider (ElevenLabs) can speak it
 * Voice claims follow ElevenLabs' published model language lists (Eleven v3 covers
 * Assamese, Bengali, Hindi, English; Bodo, Meitei, Mizo, Khasi, Garo, Nagamese and
 * Kokborok are NOT listed) — re-check https://elevenlabs.io/docs/overview/models before changing.
 */
export type AiLevel = 'good' | 'basic' | 'limited'

export interface LanguageInfo {
  code: string
  name: string
  native: string
  ai: AiLevel
  voice: { supported: boolean; model?: string }
  /** BCP-47 tag for the browser SpeechRecognition / speechSynthesis fallback, if the language plausibly has one */
  browserTag?: string
  region: string
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', native: 'English', ai: 'good', voice: { supported: true, model: 'eleven_multilingual_v2' }, browserTag: 'en-IN', region: 'India / global' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', ai: 'good', voice: { supported: true, model: 'eleven_multilingual_v2' }, browserTag: 'hi-IN', region: 'Pan-India' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', ai: 'basic', voice: { supported: true, model: 'eleven_v3' }, browserTag: 'as-IN', region: 'Assam' },
  { code: 'brx', name: 'Bodo', native: 'बड़ो', ai: 'limited', voice: { supported: false }, region: 'Assam (BTR)' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', ai: 'good', voice: { supported: true, model: 'eleven_v3' }, browserTag: 'bn-IN', region: 'Tripura, Assam (Barak), West Bengal' },
  { code: 'mni', name: 'Meitei (Manipuri)', native: 'Meiteilon', ai: 'limited', voice: { supported: false }, region: 'Manipur' },
  { code: 'lus', name: 'Mizo', native: 'Mizo ṭawng', ai: 'limited', voice: { supported: false }, region: 'Mizoram' },
  { code: 'kha', name: 'Khasi', native: 'Ka Ktien Khasi', ai: 'limited', voice: { supported: false }, region: 'Meghalaya' },
  { code: 'grt', name: 'Garo', native: "A·chik", ai: 'limited', voice: { supported: false }, region: 'Meghalaya' },
  { code: 'nag', name: 'Nagamese', native: 'Nagamese', ai: 'limited', voice: { supported: false }, region: 'Nagaland' },
  { code: 'trp', name: 'Kokborok (Tripuri)', native: 'Kokborok', ai: 'limited', voice: { supported: false }, region: 'Tripura' },
]

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)
export const getLanguage = (code: string): LanguageInfo => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
