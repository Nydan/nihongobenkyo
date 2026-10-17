import { href } from '../../core/router'
import { kanaByScript, ROWS, type Script } from './chars'
import { useKanaProgress } from './progress'
import { Stars } from './Stars'

export function GridView({ script }: { script: Script }) {
  const [progress] = useKanaProgress()
  const kana = kanaByScript(script)
  return (
    <div class="kana-grid" data-testid="kana-grid">
      {ROWS.map(row => (
        <div class="grid-row" key={row}>
          {[0, 1, 2, 3, 4].map(col => {
            const k = kana.find(x => x.row === row && x.col === col)
            if (!k) return <span key={col} class="grid-cell empty" />
            return (
              <a key={col} class="grid-cell" href={href('kana', script, 'char', k.char)}>
                <span class="grid-char" lang="ja">{k.char}</span>
                <span class="romaji">{k.romaji}</span>
                <Stars n={progress.stars[k.char] ?? 0} />
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
