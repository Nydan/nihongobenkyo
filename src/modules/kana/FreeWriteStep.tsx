import { useState } from 'preact/hooks'
import { WritingBox } from '../../core/ink/WritingBox'
import { useSettings } from '../../core/settings'
import { checkCharacter, isTap, type CharacterResult } from '../../core/stroke/check'
import type { Stroke } from '../../core/stroke/types'
import { getCheckRef, getKanaData } from './data'
import { resultMessages } from './messages'
import { ModelCard } from './ModelCard'
import { useKanaProgress, withStars } from './progress'

function strokeColor(r: CharacterResult, i: number): string | undefined {
  const s = r.strokes[i]
  if (!s) return undefined
  if (!s.ok) return 'var(--bad)'
  return s.issue ? 'var(--warn)' : 'var(--good)'
}

export interface FreeWriteStepProps {
  char: string
  showModel: boolean
  /** Stars awarded on a pass: 2 for Copy, 3 for Test. */
  stars: 2 | 3
  /** When set (quiz), shows "Next ▶" after checking instead of "Try again". */
  onDone?: (passed: boolean) => void
}

export function FreeWriteStep({ char, showModel, stars, onDone }: FreeWriteStepProps) {
  const paths = getKanaData(char).strokes
  const [settings] = useSettings()
  const [, updateProgress] = useKanaProgress()
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [result, setResult] = useState<CharacterResult | null>(null)

  function check() {
    const r = checkCharacter(strokes, getCheckRef(char), settings.level, 'free')
    setResult(r)
    if (r.passed) updateProgress(p => withStars(p, char, stars))
  }
  const reset = () => { setStrokes([]); setResult(null) }

  // A stroke already in progress when the box becomes disabled still arrives here, so guard on `result`.
  // Taps (resting palm, pen bounce) are ignored rather than counted as an extra stroke.
  function onStroke(s: Stroke) {
    if (result || isTap(s)) return
    setStrokes(prev => [...prev, s])
  }

  return (
    <div class="step free">
      <div class="free-layout">
        {showModel && <ModelCard char={char} />}
        <WritingBox
          strokes={strokes}
          strokeColors={result ? strokes.map((_, i) => strokeColor(result, i)) : []}
          disabled={!!result}
          onStroke={onStroke}
        >
          {result && !result.passed && !result.variant && result.strokes.map((r, i) =>
            // Non-variant results are positional: result i is about expected stroke i ('extra' ones lie past the end).
            !r.ok && i < paths.length ? <path key={i} d={paths[i]} class="ref-stroke dashed" /> : null)}
        </WritingBox>
      </div>
      <ul class="message" role="status" data-testid="message">
        {result && resultMessages(result).map(m => <li key={m}>{m}</li>)}
      </ul>
      <div class="controls">
        {!result && (
          <>
            <button aria-label="Undo stroke" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}>↩️</button>
            <button aria-label="Clear" disabled={!strokes.length} onClick={reset}>🗑️</button>
            <button class="primary" aria-label="Check" disabled={!strokes.length} onClick={check}>✓ Check</button>
          </>
        )}
        {result && (onDone
          ? <button class="primary" onClick={() => onDone(result.passed)}>Next ▶</button>
          : <button class="primary" onClick={reset}>🔄 Try again</button>)}
      </div>
    </div>
  )
}
