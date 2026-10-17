import { describe, expect, it } from 'vitest'
import { buildPath, findNode, isUnlocked, nodeKey } from './path'

describe('buildPath', () => {
  const nodes = buildPath('hiragana')
  it('has 11 rows plus a review after every 3 rows', () => {
    expect(nodes.map(n => n.id)).toEqual([
      'a', 'ka', 'sa', 'review-1', 'ta', 'na', 'ha', 'review-2', 'ma', 'ya', 'ra', 'review-3', 'wa', 'n',
    ])
  })
  it('fills rows and reviews with characters', () => {
    expect(nodes[0].chars).toEqual(['あ', 'い', 'う', 'え', 'お'])
    expect(nodes[3]).toMatchObject({ kind: 'review' })
    expect(nodes[3].chars).toHaveLength(15)
    expect(findNode('katakana', 'n')?.chars).toEqual(['ン'])
    expect(findNode('hiragana', 'nope')).toBeUndefined()
  })
})

describe('isUnlocked', () => {
  const nodes = buildPath('hiragana')
  it('unlocks the first node and nodes after a passed one', () => {
    expect(isUnlocked(nodes, 0, 'hiragana', [])).toBe(true)
    expect(isUnlocked(nodes, 1, 'hiragana', [])).toBe(false)
    expect(isUnlocked(nodes, 1, 'hiragana', [nodeKey('hiragana', 'a')])).toBe(true)
  })
  it('keeps a passed node unlocked and keeps scripts separate', () => {
    expect(isUnlocked(nodes, 13, 'hiragana', [nodeKey('hiragana', 'n')])).toBe(true)
    expect(isUnlocked(nodes, 1, 'hiragana', [nodeKey('katakana', 'a')])).toBe(false)
  })
})
