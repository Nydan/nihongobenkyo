import { useState } from 'preact/hooks'
import { Guide } from '../../core/ink/Guide'
import { getKanaData } from './data'

export function WatchStep({ char, onNext }: { char: string; onNext: () => void }) {
  const data = getKanaData(char)
  const n = data.strokes.length
  const [k, setK] = useState(1) // 1..n: animating stroke k; n + 1: final form
  const [replays, setReplays] = useState(0) // keys the animated path, so Replay restarts it even at stroke 1
  const done = k > n

  return (
    <div class="step watch">
      <div class="writing-box static" data-testid="watch-box">
        <svg class="wb-layer" viewBox="0 0 109 109" aria-label={`${char} stroke ${Math.min(k, n)} of ${n}`}>
          <defs>
            {/* 2 stroke widths = 10 viewBox units, under the shortest stroke (シ 1: 14.6); the tip sits on the stroke end. */}
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="2" markerHeight="2" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
            </marker>
          </defs>
          <Guide />
          {data.strokes.map((d, i) => {
            if (done || i < k - 1) return <path key={i} d={d} class="ref-stroke" />
            if (i === k - 1) return <path key={`${i}-${k}-${replays}`} d={d} class="ref-stroke current animate" pathLength={1} />
            return <path key={i} d={d} class="ref-stroke upcoming" />
          })}
          {!done && data.numbers.slice(0, k).map(([x, y], i) => (
            <text key={i} x={x} y={y} class={`stroke-num${i === k - 1 ? ' current' : ''}`}>{i + 1}</text>
          ))}
        </svg>
      </div>
      <div class="controls">
        <button aria-label="Previous stroke" disabled={k === 1} onClick={() => setK(k - 1)}>◀</button>
        <span class="watch-progress" data-testid="watch-progress">{done ? '✅ Done' : `${k} / ${n}`}</span>
        <button aria-label="Next stroke" disabled={done} onClick={() => setK(k + 1)}>▶</button>
        <button aria-label="Replay" onClick={() => { setK(1); setReplays(replays + 1) }}>🔁</button>
        {done && <button class="primary" onClick={onNext}>Next: ✍️ Trace ▶</button>}
      </div>
    </div>
  )
}
