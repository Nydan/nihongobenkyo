import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { NotFound } from '../../core/NotFound'
import { SpeakButton } from '../../core/SpeakButton'
import { findKana } from './chars'
import { WatchStep } from './WatchStep'

export type StepId = 'watch' | 'trace' | 'copy' | 'test'

const STEPS: { id: StepId; icon: string; label: string }[] = [
  { id: 'watch', icon: '👀', label: 'Watch' },
]

/** Parent routes must pass `key={char}` so step state resets per character. */
export function CharacterScreen({ char, footer }: { char: string; footer?: ComponentChildren }) {
  const kana = findKana(char)
  const [step, setStep] = useState<StepId>('watch')
  if (!kana) return <NotFound />

  return (
    <section class="char-screen">
      <header class="char-head">
        <span class="char-big" lang="ja">{char}</span>
        <span class="romaji">{kana.romaji}</span>
        <SpeakButton text={char} />
      </header>
      <nav class="steps" role="tablist">
        {STEPS.map(s => (
          <button key={s.id} role="tab" aria-selected={step === s.id} onClick={() => setStep(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </nav>
      {step === 'watch' && <WatchStep char={char} />}
      {footer && <div class="char-footer">{footer}</div>}
    </section>
  )
}
