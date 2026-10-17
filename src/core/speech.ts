import { useEffect, useState } from 'preact/hooks'

const isJapanese = (v: { lang: string }): boolean => v.lang.toLowerCase().replace('_', '-').startsWith('ja')

/**
 * Picks a Japanese voice, preferring on-device ones. Remote voices (e.g. Chrome's "Google 日本語") synthesize over the
 * network, so one is used only when no local Japanese voice exists; the browser then makes that request, not the app.
 */
export const findJapaneseVoice = <T extends { lang: string; localService?: boolean }>(voices: readonly T[]): T | undefined => {
  const japanese = voices.filter(isJapanese)
  return japanese.find(v => v.localService !== false) ?? japanese[0]
}

const synth = (): SpeechSynthesis | undefined =>
  typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis

/** True once a Japanese voice is available. Voices load asynchronously on Safari, so this re-checks on `voiceschanged`. */
export function useJapaneseVoice(): boolean {
  const [has, setHas] = useState(() => !!findJapaneseVoice(synth()?.getVoices() ?? []))
  useEffect(() => {
    const s = synth()
    if (!s) return
    const check = () => setHas(!!findJapaneseVoice(s.getVoices()))
    s.addEventListener('voiceschanged', check)
    check()
    return () => s.removeEventListener('voiceschanged', check)
  }, [])
  return has
}

/** Speaks `text` with a Japanese voice. Must be called from a user gesture (iOS requirement). */
export function speak(text: string): void {
  const s = synth()
  const voice = s && findJapaneseVoice(s.getVoices())
  if (!s || !voice) return
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.8
  s.cancel()
  s.speak(u)
}
