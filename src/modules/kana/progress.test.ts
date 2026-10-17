import { describe, expect, it } from 'vitest'
import { createStore } from '../../core/storage'
import { MemoryStorage } from '../../test-utils/memory-storage'
import { emptyProgress, loadProgress, PROGRESS_NS, PROGRESS_VERSION, withPassed, withStars } from './progress'

describe('progress', () => {
  it('keeps the best star count', () => {
    let p = withStars(emptyProgress(), 'あ', 2)
    p = withStars(p, 'あ', 1)
    expect(p.stars['あ']).toBe(2)
    expect(withStars(p, 'あ', 3).stars['あ']).toBe(3)
  })
  it('records passed nodes once', () => {
    const p = withPassed(withPassed(emptyProgress(), 'hiragana:a'), 'hiragana:a')
    expect(p.passed).toEqual(['hiragana:a'])
  })
  it('loads empty progress from an empty store and saved progress otherwise', () => {
    const store = createStore(new MemoryStorage())
    expect(loadProgress(store)).toEqual(emptyProgress())
    store.write(PROGRESS_NS, PROGRESS_VERSION, withStars(emptyProgress(), 'い', 1))
    expect(loadProgress(store).stars['い']).toBe(1)
  })
  it('round-trips a valid saved value unchanged', () => {
    const store = createStore(new MemoryStorage())
    const saved = withPassed(withStars(emptyProgress(), 'う', 3), 'hiragana:a')
    store.write(PROGRESS_NS, PROGRESS_VERSION, saved)
    expect(loadProgress(store)).toEqual(saved)
  })
  it('resets stored data of an unknown shape instead of crashing', () => {
    const store = createStore(new MemoryStorage())
    for (const bad of [{}, { stars: null, passed: 'x' }, { stars: { あ: 'x' }, passed: [] }, { stars: {}, passed: [1] }, null, 'x']) {
      store.write(PROGRESS_NS, PROGRESS_VERSION, bad)
      expect(loadProgress(store)).toEqual(emptyProgress())
    }
  })
  it('resets stored star counts outside 0..3 or not whole', () => {
    const store = createStore(new MemoryStorage())
    for (const n of [7, -1, 1.5, NaN]) {
      store.write(PROGRESS_NS, PROGRESS_VERSION, { stars: { あ: n }, passed: [] })
      expect(loadProgress(store), String(n)).toEqual(emptyProgress())
    }
  })
})
