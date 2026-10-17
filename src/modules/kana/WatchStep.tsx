import { useState } from 'preact/hooks'
import { Guide } from '../../core/ink/Guide'
import { getKanaData } from './data'

export function WatchStep({ char }: { char: string }) {
  const data = getKanaData(char)
  const n = data.strokes.length
  const [k, setK] = useState(1) // 1..n: animating stroke k; n + 1: final form
  const done = k > n

  return (
    <div class="step watch">
      <div class="writing-box static" data-testid="watch-box">
        <svg class="wb-layer" viewBox="0 0 109 109" aria-label={`${char} stroke ${Math.min(k, n)} of ${n}`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
            </marker>
          </defs>
          <Guide />
          {data.strokes.map((d, i) => {
            if (done || i < k - 1) return <path key={i} d={d} class="ref-stroke" />
            if (i === k - 1) return <path key={`${i}-${k}`} d={d} class="ref-stroke current animate" pathLength={1} />
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
        <button aria-label="Replay" onClick={() => setK(1)}>🔁</button>
      </div>
    </div>
  )
}
