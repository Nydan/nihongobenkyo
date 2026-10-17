import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { NotFound } from '../../core/NotFound'
import { SpeakButton } from '../../core/SpeakButton'
import { findKana } from './chars'
import { FreeWriteStep } from './FreeWriteStep'
import { TraceStep } from './TraceStep'
import { WatchStep } from './WatchStep'

export type StepId = 'watch' | 'trace' | 'copy' | 'test'

const STEPS: { id: StepId; icon: string; label: string }[] = [
  { id: 'watch', icon: '👀', label: 'Watch' },
  { id: 'trace', icon: '✍️', label: 'Trace' },
  { id: 'copy', icon: '👁️', label: 'Copy' },
  { id: 'test', icon: '🎯', label: 'Test' },
]

/** How long a passed step stays on screen, so its green strokes and message are seen, before the next step opens. */
const ADVANCE_MS = 1200

/** Parent routes must pass `key={char}` so step state resets per character. */
export function CharacterScreen({ char, footer }: { char: string; footer?: ComponentChildren }) {
  const kana = findKana(char)
  const [step, setStep] = useState<StepId>('watch')
  const [visit, setVisit] = useState(0) // keys the step, so tapping its tab again starts it over
  const [passed, setPassed] = useState<StepId | null>(null)
  const next = STEPS[STEPS.findIndex(s => s.id === step) + 1]?.id

  function go(id: StepId) {
    setStep(id)
    setVisit(v => v + 1)
    setPassed(null)
  }

  // Switching tabs during the delay changes `step`, which cancels the pending advance.
  useEffect(() => {
    if (passed !== step || !next) return
    const t = setTimeout(() => go(next), ADVANCE_MS)
    return () => clearTimeout(t)
  }, [passed, step])

  if (!kana) return <NotFound />
  const onPass = () => setPassed(step)

  return (
    <section class="char-screen">
      <header class="char-head">
        <span class="char-big" lang="ja">{char}</span>
        <span class="romaji">{kana.romaji}</span>
        <SpeakButton text={char} />
      </header>
      <nav class="steps" role="tablist">
        {STEPS.map(s => (
          <button key={s.id} role="tab" aria-selected={step === s.id} onClick={() => go(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </nav>
      {step === 'watch' && <WatchStep key={visit} char={char} onNext={() => go('trace')} />}
      {step === 'trace' && <TraceStep key={visit} char={char} onPass={onPass} />}
      {step === 'copy' && <FreeWriteStep key={visit} char={char} showModel stars={2} onPass={onPass} />}
      {step === 'test' && <FreeWriteStep key={visit} char={char} showModel={false} stars={3} onPass={onPass} />}
      {footer && <div class="char-footer">{footer}</div>}
    </section>
  )
}
