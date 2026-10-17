export interface QuizState { queue: string[] }

export function createQuiz(chars: string[], random: () => number = Math.random): QuizState {
  const queue = [...chars]
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  return { queue }
}

/** Passed characters leave the queue; failed ones go to the back to retry. */
export function answer(s: QuizState, passed: boolean): QuizState {
  const [head, ...rest] = s.queue
  return { queue: passed ? rest : [...rest, head] }
}

export const currentChar = (s: QuizState): string => s.queue[0]
export const isDone = (s: QuizState): boolean => s.queue.length === 0
