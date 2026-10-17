import { describe, expect, it } from 'vitest'
import { ALL_KANA, kanaByScript } from './chars'
import { getCheckRef, getKanaData, getRefStrokes } from './data'

describe('kana table', () => {
  it('has 46 characters per script with unique chars', () => {
    expect(kanaByScript('hiragana')).toHaveLength(46)
    expect(kanaByScript('katakana')).toHaveLength(46)
    expect(new Set(ALL_KANA.map(k => k.char)).size).toBe(92)
  })
})

describe('kana.json', () => {
  it.each(ALL_KANA.map(k => [k.char, k] as const))('%s has matching, parseable strokes', (char, k) => {
    const d = getKanaData(char)
    expect(d.strokes).toHaveLength(k.strokes)
    expect(d.numbers).toHaveLength(k.strokes)
    expect(d.acceptedCounts[0]).toBe(k.strokes)
    expect(getRefStrokes(char).every(s => s.length >= 2)).toBe(true)
    expect(getCheckRef(char).strokes).toHaveLength(k.strokes)
  })

  it('throws for unknown characters', () => {
    expect(() => getKanaData('漢')).toThrow(/No stroke data/)
  })
})
