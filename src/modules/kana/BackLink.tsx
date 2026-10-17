import { href } from '../../core/router'
import type { Script } from './chars'

/** One tap back to the script's grid or path, to pick another character. */
export function BackLink({ script, to }: { script: Script; to: 'grid' | 'path' }) {
  return to === 'grid'
    ? <a class="button back" href={href('kana', script)}>◀ 🔤 Grid</a>
    : <a class="button back" href={href('kana', script, 'path')}>◀ 🗺️ Path</a>
}
