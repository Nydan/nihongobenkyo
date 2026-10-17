import { href } from '../../core/router'
import type { Script } from './chars'
import { buildPath, isUnlocked, nodeKey } from './path'
import { useKanaProgress } from './progress'

export function PathView({ script }: { script: Script }) {
  const [progress] = useKanaProgress()
  const nodes = buildPath(script)
  return (
    <ol class="path" data-testid="path">
      {nodes.map((n, i) => {
        const passed = progress.passed.includes(nodeKey(script, n.id))
        const target = n.kind === 'row' ? href('kana', script, 'lesson', n.id, '0') : href('kana', script, 'quiz', n.id)
        return (
          <li key={n.id} class={`path-node ${n.kind}`}>
            {isUnlocked(nodes, i, script, progress.passed)
              ? <a class="button" href={target} data-node={n.id}>{passed ? '✅' : '▶️'} <span lang="ja">{n.label}</span></a>
              : <span class="button locked" data-node={n.id} aria-label={`${n.label} (locked)`}>🔒 <span lang="ja">{n.label}</span></span>}
          </li>
        )
      })}
    </ol>
  )
}
