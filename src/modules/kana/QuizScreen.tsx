import { useState } from 'preact/hooks'
import { NotFound } from '../../core/NotFound'
import { href } from '../../core/router'
import { SpeakButton } from '../../core/SpeakButton'
import { findKana, type Script } from './chars'
import { FreeWriteStep } from './FreeWriteStep'
import { findNode, nodeKey } from './path'
import { useKanaProgress, withPassed } from './progress'
import { answer, createQuiz, currentChar, isDone } from './quiz'

export function QuizScreen({ script, nodeId }: { script: Script; nodeId: string }) {
  const node = findNode(script, nodeId)
  const [, updateProgress] = useKanaProgress()
  const [state, setState] = useState(() => createQuiz(node?.chars ?? []))
  const [round, setRound] = useState(0)
  if (!node) return <NotFound />

  if (isDone(state)) {
    return (
      <section class="quiz-done" data-testid="quiz-done">
        <p class="celebrate">{node.kind === 'review' ? '🎉 Review passed!' : '🎉 Row passed!'}</p>
        <a class="button primary" href={href('kana', script)}>🗺️ Back to path</a>
      </section>
    )
  }

  const char = currentChar(state)
  const done = node.chars.length - state.queue.length
  return (
    <section class="quiz">
      <p class="quiz-progress">✅ {done} / {node.chars.length}</p>
      <h2>
        <span class="quiz-script" lang="ja" data-testid="quiz-script">{script === 'hiragana' ? 'ひらがな' : 'カタカナ'}</span>{' '}
        Write: <span class="romaji-big" data-testid="quiz-prompt">{findKana(char)?.romaji}</span> <SpeakButton text={char} />
      </h2>
      <FreeWriteStep
        key={round}
        char={char}
        showModel={false}
        stars={3}
        onDone={passed => {
          const next = answer(state, passed)
          if (isDone(next)) updateProgress(p => withPassed(p, nodeKey(script, nodeId)))
          setState(next)
          setRound(round + 1)
        }}
      />
    </section>
  )
}
