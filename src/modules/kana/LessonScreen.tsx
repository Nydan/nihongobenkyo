import { NotFound } from '../../core/NotFound'
import { href } from '../../core/router'
import { BackLink } from './BackLink'
import { CharacterScreen } from './CharacterScreen'
import type { Script } from './chars'
import { findNode } from './path'

export function LessonScreen({ script, nodeId, index }: { script: Script; nodeId: string; index: number }) {
  const node = findNode(script, nodeId)
  if (!node || node.kind !== 'row' || !Number.isInteger(index) || index < 0 || index >= node.chars.length) return <NotFound />
  const last = index === node.chars.length - 1
  const next = last ? href('kana', script, 'quiz', nodeId) : href('kana', script, 'lesson', nodeId, String(index + 1))
  return (
    <CharacterScreen
      key={node.chars[index]}
      char={node.chars[index]}
      back={<BackLink script={script} to="path" />}
      footer={<>
        <span class="lesson-progress">{index + 1} / {node.chars.length}</span>
        <a class="button primary" href={next}>{last ? '🎯 Row quiz ▶' : 'Next character ▶'}</a>
      </>}
    />
  )
}
