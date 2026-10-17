import { useState } from 'preact/hooks'
import { getAppStore, type Store } from '../../core/storage'

export interface KanaProgress {
  /** Best stars per character: 1 traced, 2 copied, 3 tested. */
  stars: Record<string, number>
  /** Passed path nodes, as `${script}:${nodeId}`. */
  passed: string[]
}

export const PROGRESS_NS = 'kana'
export const PROGRESS_VERSION = 1
export const emptyProgress = (): KanaProgress => ({ stars: {}, passed: [] })

export const withStars = (p: KanaProgress, char: string, stars: number): KanaProgress =>
  (p.stars[char] ?? 0) >= stars ? p : { ...p, stars: { ...p.stars, [char]: stars } }

export const withPassed = (p: KanaProgress, key: string): KanaProgress =>
  p.passed.includes(key) ? p : { ...p, passed: [...p.passed, key] }

/** Stars render as `'⭐'.repeat(n) + '☆'.repeat(3 - n)`, which throws outside 0..3. */
const isStarCount = (n: unknown): boolean => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 3

const isProgress = (v: unknown): v is KanaProgress => {
  if (typeof v !== 'object' || v === null) return false
  const { stars, passed } = v as Record<string, unknown>
  return typeof stars === 'object' && stars !== null && !Array.isArray(stars)
    && Object.values(stars).every(isStarCount)
    && Array.isArray(passed) && passed.every(k => typeof k === 'string')
}

/** Stored data of an unknown shape is reset rather than trusted. */
export function loadProgress(store: Store = getAppStore()): KanaProgress {
  const stored = store.read<unknown>(PROGRESS_NS, PROGRESS_VERSION, null)
  return isProgress(stored) ? stored : emptyProgress()
}

export function useKanaProgress(): [KanaProgress, (fn: (p: KanaProgress) => KanaProgress) => void] {
  const [progress, setProgress] = useState(() => loadProgress())
  const update = (fn: (p: KanaProgress) => KanaProgress) => {
    const next = fn(loadProgress())
    getAppStore().write(PROGRESS_NS, PROGRESS_VERSION, next)
    setProgress(next)
  }
  return [progress, update]
}
