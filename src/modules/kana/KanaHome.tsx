import { href } from '../../core/router'
import { SCRIPT_ENTRIES } from './entries'

export function KanaHome() {
  return (
    <section class="kana-home">
      <h1>✍️ Kana Writing</h1>
      <div class="tiles">
        {SCRIPT_ENTRIES.map(e => (
          <a key={e.label} class="tile" href={href('kana', ...e.segments)}><span class="tile-icon" lang="ja">{e.icon}</span><span>{e.label}</span></a>
        ))}
      </div>
    </section>
  )
}
