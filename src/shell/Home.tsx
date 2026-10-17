import type { LearningModule } from '../core/module'
import { href } from '../core/router'

export function Home({ modules }: { modules: LearningModule[] }) {
  return (
    <section class="home">
      <h1>📚 Nihongo Benkyō</h1>
      <div class="tiles">
        {modules.map(m => (
          <a key={m.id} class="tile" href={href(m.id)}>
            <span class="tile-icon" lang="ja">{m.icon}</span>
            <span>{m.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
