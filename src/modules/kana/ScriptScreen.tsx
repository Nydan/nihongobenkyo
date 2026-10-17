import { href } from '../../core/router'
import type { Script } from './chars'
import { GridView } from './GridView'
import { PathView } from './PathView'

export function ScriptScreen({ script, tab }: { script: Script; tab: 'path' | 'grid' }) {
  return (
    <section class="script-screen">
      <h1 lang="ja">{script === 'hiragana' ? 'ひらがな' : 'カタカナ'} <small lang="en">{script === 'hiragana' ? 'Hiragana' : 'Katakana'}</small></h1>
      <nav class="tabs">
        <a class="button" href={href('kana', script)} aria-current={tab === 'path' ? 'page' : undefined}>🗺️ Path</a>
        <a class="button" href={href('kana', script, 'grid')} aria-current={tab === 'grid' ? 'page' : undefined}>🔤 Grid</a>
      </nav>
      {tab === 'path' ? <PathView script={script} /> : <GridView script={script} />}
    </section>
  )
}
