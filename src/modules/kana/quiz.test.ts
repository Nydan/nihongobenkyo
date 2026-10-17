import { describe, expect, it } from 'vitest'
import { answer, createQuiz, currentChar, isDone } from './quiz'

describe('quiz', () => {
  it('shuffles with the given random source', () => {
    expect(createQuiz(['a', 'b', 'c'], () => 0).queue).toEqual(['b', 'c', 'a'])
  })
  it('removes passed characters and re-queues failed ones', () => {
    let s = { queue: ['a', 'b'] }
    s = answer(s, false)
    expect(s.queue).toEqual(['b', 'a'])
    s = answer(s, true)
    expect(currentChar(s)).toBe('a')
    s = answer(s, true)
    expect(isDone(s)).toBe(true)
  })
})
