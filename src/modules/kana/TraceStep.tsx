import { useEffect, useState } from 'preact/hooks'
import { WritingBox } from '../../core/ink/WritingBox'
import { useSettings } from '../../core/settings'
import { speak } from '../../core/speech'
import { checkStroke, isTap } from '../../core/stroke/check'
import type { Stroke } from '../../core/stroke/types'
import { getKanaData, getRefStrokes } from './data'
import { issueMessage } from './messages'
import { useKanaProgress, withStars } from './progress'

export function TraceStep({ char, onPass }: { char: string; onPass: () => void }) {
  const paths = getKanaData(char).strokes
  const ref = getRefStrokes(char)
  const [settings] = useSettings()
  const [, updateProgress] = useKanaProgress()
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [wrong, setWrong] = useState<Stroke | null>(null)
  const [message, setMessage] = useState('')
  const idx = strokes.length
  const complete = idx >= ref.length

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(() => setWrong(null), 700)
    return () => clearTimeout(t)
  }, [wrong])

  function onStroke(s: Stroke) {
    if (complete || isTap(s)) return
    const res = checkStroke(s, ref[idx], settings.level)
    if (!res.ok) {
      setWrong(s)
      setMessage(issueMessage(res.issue!, idx + 1))
      return
    }
    const next = [...strokes, s]
    setStrokes(next)
    if (next.length === ref.length) {
      updateProgress(p => withStars(p, char, 1))
      setMessage('⭐ Traced!')
      speak(char) // here rather than after a delay: iOS only speaks inside the user's gesture
      onPass()
    } else {
      setMessage(res.issue ? issueMessage(res.issue, idx + 1) : '')
    }
  }

  const shown = wrong ? [...strokes, wrong] : strokes
  const colors = wrong ? [...strokes.map(() => undefined), 'var(--bad)'] : []

  return (
    <div class="step trace">
      <WritingBox strokes={shown} strokeColors={colors} onStroke={onStroke} disabled={complete}>
        {paths.map((d, i) => <path key={i} d={d} class={`ref-stroke ${i === idx ? 'next' : 'faint'}`} />)}
        {!complete && <circle class="start-dot" cx={ref[idx][0].x} cy={ref[idx][0].y} r="3.5" />}
      </WritingBox>
      <p class="message" role="status" data-testid="message">{message}</p>
      <div class="controls">
        <button aria-label="Undo stroke" disabled={idx === 0} onClick={() => { setStrokes(strokes.slice(0, -1)); setMessage('') }}>↩️</button>
        <button aria-label="Clear" disabled={idx === 0} onClick={() => { setStrokes([]); setMessage('') }}>🗑️</button>
      </div>
    </div>
  )
}
