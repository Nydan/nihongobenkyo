import { describe, expect, it } from 'vitest'
import { checkCharacter } from '../../core/stroke/check'
import type { Level } from '../../core/stroke/types'
import { ALL_KANA } from './chars'
import { getCheckRef, getRefStrokes } from './data'

/** へ and ヘ are the same glyph in KanjiVG, so each passes as the other on every level. */
const SAME_GLYPH = ['へ→ヘ', 'ヘ→へ']

/** Every `written→asked` pair where the exact reference glyph of one kana passes as another in free mode. */
function wrongPasses(level: Level): string[] {
  const out: string[] = []
  for (const written of ALL_KANA) {
    for (const asked of ALL_KANA) {
      if (written.char === asked.char) continue
      if (checkCharacter(getRefStrokes(written.char), getCheckRef(asked.char), level, 'free').passed) {
        out.push(`${written.char}→${asked.char}`)
      }
    }
  }
  return out.filter(p => !SAME_GLYPH.includes(p)).sort()
}

/**
 * Known wrong passes of the mean-distance checker. Pairs that differ only in a short part of one stroke (れ/わ differ
 * only in the tail) fall inside the mean tolerance. These lists record the trade-off: any change to the checker that
 * adds or removes a pair must update them, so it shows up in review.
 */
const EXPECTED: Record<Level, string[]> = {
  strict: [],
  normal: ['う→ラ', 'れ→わ', 'わ→れ', 'ナ→ヤ', 'ユ→コ', 'ラ→う'],
  easy: [
    'う→そ', 'う→ラ', 'し→レ', 'す→ヤ', 'そ→る', 'ち→ら', 'つ→フ', 'て→フ', 'に→ロ', 'ぬ→ね', 'ね→ぬ', 'ま→き', 'み→ム',
    'め→わ', 'も→モ', 'ら→ち', 'る→そ', 'れ→わ', 'わ→め', 'わ→れ', 'オ→エ', 'コ→ユ', 'シ→ツ', 'セ→ヒ', 'ソ→ン', 'チ→キ',
    'チ→テ', 'チ→ヲ', 'ツ→シ', 'テ→チ', 'ナ→ヤ', 'ニ→こ', 'ヒ→セ', 'フ→て', 'ミ→エ', 'ヤ→ナ', 'ユ→コ', 'ラ→う', 'リ→ソ',
  ],
}

describe('confusion sweep: one kana written exactly, checked against every other kana', () => {
  it.each(['easy', 'normal', 'strict'] as const)('%s: only the known pairs pass', level => {
    expect(wrongPasses(level)).toEqual(EXPECTED[level])
  })

  it('へ and ヘ pass as each other on every level', () => {
    for (const level of ['easy', 'normal', 'strict'] as const) {
      expect(checkCharacter(getRefStrokes('へ'), getCheckRef('ヘ'), level, 'free').passed, level).toBe(true)
      expect(checkCharacter(getRefStrokes('ヘ'), getCheckRef('へ'), level, 'free').passed, level).toBe(true)
    }
  })
})
