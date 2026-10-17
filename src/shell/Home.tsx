import type { LearningModule } from '../core/module'
import { href } from '../core/router'

export function Home({ modules }: { modules: LearningModule[] }) {
  const single = modules.filter(m => !m.entries)
  return (
    <section class="home">
      <h1>📚 Nihongo Benkyō</h1>
      {modules.filter(m => m.entries).map(m => (
        <section key={m.id} class="home-module">
          <h2>{m.icon} {m.title}</h2>
          <div class="tiles">
            {m.entries!.map(e => (
              <a key={e.label} class="tile" href={href(m.id, ...e.segments)}>
                <span class="tile-icon" lang="ja">{e.icon}</span>
                <span>{e.label}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
      {single.length > 0 && (
        <div class="tiles">
          {single.map(m => (
            <a key={m.id} class="tile" href={href(m.id)}>
              <span class="tile-icon" lang="ja">{m.icon}</span>
              <span>{m.title}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
