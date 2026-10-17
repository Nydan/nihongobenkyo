import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../test-utils/memory-storage'
import { createStore } from './storage'

describe('createStore', () => {
  it('round-trips versioned data', () => {
    const backend = new MemoryStorage()
    const s = createStore(backend)
    s.write('kana', 1, { stars: { あ: 2 } })
    expect(s.persistent).toBe(true)
    expect(createStore(backend).read('kana', 1, null)).toEqual({ stars: { あ: 2 } })
  })

  it('returns the fallback when nothing is stored', () => {
    expect(createStore(new MemoryStorage()).read('kana', 1, 'empty')).toBe('empty')
  })

  it('resets to fallback on version mismatch without a migration', () => {
    const backend = new MemoryStorage()
    createStore(backend).write('kana', 1, { old: true })
    expect(createStore(backend).read('kana', 2, 'fresh')).toBe('fresh')
  })

  it('uses the migration when provided', () => {
    const backend = new MemoryStorage()
    createStore(backend).write('kana', 1, { n: 1 })
    const out = createStore(backend).read('kana', 2, { n: 0 }, (old, v) => (v === 1 ? { n: (old as { n: number }).n + 10 } : undefined))
    expect(out).toEqual({ n: 11 })
  })

  it('returns fallback for corrupt JSON', () => {
    const backend = new MemoryStorage()
    backend.setItem('nb:kana', '{not json')
    expect(createStore(backend).read('kana', 1, 'ok')).toBe('ok')
  })

  it('falls back to memory when storage throws on access', () => {
    const broken = new MemoryStorage()
    broken.setItem = () => { throw new Error('SecurityError') }
    const s = createStore(broken)
    expect(s.persistent).toBe(false)
    s.write('kana', 1, 'x')
    expect(s.read('kana', 1, 'fallback')).toBe('x')
  })

  it('keeps working in memory when a write fails mid-session', () => {
    const backend = new MemoryStorage()
    const s = createStore(backend)
    expect(s.persistent).toBe(true)
    backend.setItem = () => { throw new Error('QuotaExceededError') }
    s.write('kana', 1, 'after-failure')
    expect(s.persistent).toBe(false)
    expect(s.read('kana', 1, 'fallback')).toBe('after-failure')
  })

  it('still reads other persisted keys after a write fails mid-session', () => {
    const backend = new MemoryStorage()
    const seed = createStore(backend)
    seed.write('b', 1, 'persisted-b')
    seed.write('a', 1, 'old-a')

    const s = createStore(backend)
    backend.setItem = () => { throw new Error('QuotaExceededError') }
    s.write('a', 1, 'new-a')

    expect(s.persistent).toBe(false)
    expect(s.read('a', 1, 'fallback')).toBe('new-a')
    expect(s.read('b', 1, 'fallback')).toBe('persisted-b')
    // a store opened on the now write-broken backend can still read what was saved earlier
    expect(createStore(backend).read('b', 1, 'fallback')).toBe('persisted-b')
  })

  it('returns the fallback when getItem throws mid-session', () => {
    const backend = new MemoryStorage()
    const s = createStore(backend)
    s.write('a', 1, 'x')
    backend.getItem = () => { throw new Error('SecurityError') }
    expect(s.read('b', 1, 'fallback')).toBe('fallback')
    expect(s.read('a', 1, 'fallback')).toBe('x')
  })

  it('works with no backend at all', () => {
    const s = createStore(undefined)
    expect(s.persistent).toBe(false)
    s.write('a', 1, 5)
    expect(s.read('a', 1, 0)).toBe(5)
  })
})
