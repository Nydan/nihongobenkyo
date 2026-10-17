import { speak, useJapaneseVoice } from './speech'

export function SpeakButton({ text }: { text: string }) {
  const hasVoice = useJapaneseVoice()
  if (!hasVoice) return null
  return <button class="speak" aria-label="Play pronunciation" onClick={() => speak(text)}>🔊</button>
}
