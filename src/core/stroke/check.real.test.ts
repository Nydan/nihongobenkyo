import { describe, expect, it } from 'vitest'
import { ALL_KANA } from '../../modules/kana/chars'
import { getCheckRef, getRefStrokes } from '../../modules/kana/data'
import { checkCharacter, checkStroke } from './check'
import { resample } from './geometry'
import type { Level, Stroke } from './types'

const LEVELS: Level[] = ['easy', 'normal', 'strict']
const CHARS = ['あ', 'き', 'シ', 'ふ']

const reversed = (s: Stroke): Stroke => [...s].reverse()
/** Constant offset of (3, 3) plus a deterministic ±1 wobble. */
const sloppy = (s: Stroke): Stroke =>
  resample(s, 24).map((p, i) => ({ x: p.x + 3 + Math.sin(i * 0.9), y: p.y + 3 + Math.cos(i * 0.7) }))
/** Shifts `s` by `d` units along the start→end direction of `ref` (the worst case for telling direction apart). */
function shiftAlong(s: Stroke, ref: Stroke, d: number): Stroke {
  const a = ref[0]
  const z = ref[ref.length - 1]
  const len = Math.hypot(z.x - a.x, z.y - a.y)
  return s.map(p => ({ x: p.x + (d * (z.x - a.x)) / len, y: p.y + (d * (z.y - a.y)) / len }))
}
function scaleAboutCenter(s: Stroke, k: number): Stroke {
  const cx = s.reduce((t, p) => t + p.x, 0) / s.length
  const cy = s.reduce((t, p) => t + p.y, 0) / s.length
  return s.map(p => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }))
}
const withStroke = (strokes: Stroke[], i: number, s: Stroke): Stroke[] => strokes.map((t, k) => (k === i ? s : t))
function swapped(strokes: Stroke[], i: number, j: number): Stroke[] {
  const out = [...strokes]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

describe('checkCharacter on real KanjiVG kana', () => {
  it.each(CHARS)('%s: exact reference strokes pass on every level in both modes', char => {
    for (const level of LEVELS) {
      for (const mode of ['trace', 'free'] as const) {
        const r = checkCharacter(getRefStrokes(char), getCheckRef(char), level, mode)
        expect(r, `${level} ${mode}`).toMatchObject({ passed: true, hints: [], variant: false })
      }
    }
  })

  it.each(CHARS)('%s: sloppy-but-acceptable strokes pass on easy and normal', char => {
    for (const level of ['easy', 'normal'] as const) {
      for (const mode of ['trace', 'free'] as const) {
        const r = checkCharacter(getRefStrokes(char).map(sloppy), getCheckRef(char), level, mode)
        expect(r, `${level} ${mode}`).toMatchObject({ passed: true, hints: [] })
      }
    }
  })

  it.each([
    { char: 'あ', stroke: 1, label: 'long stroke, exact', draw: (s: Stroke) => reversed(s) },
    { char: 'シ', stroke: 1, label: 'short tick, 80% length, offset 4', draw: (s: Stroke) => shiftAlong(scaleAboutCenter(reversed(s), 0.8), s, 4) },
    { char: 'ふ', stroke: 1, label: 'short dot, offset 4', draw: (s: Stroke) => shiftAlong(reversed(s), s, 4) },
  ])('$char stroke $stroke reversed ($label): direction fails on normal/strict, hint on easy', ({ char, stroke, draw }) => {
    const i = stroke - 1
    const ref = getRefStrokes(char)
    const strokes = withStroke(ref, i, draw(ref[i]))

    for (const level of ['normal', 'strict'] as const) {
      const r = checkCharacter(strokes, getCheckRef(char), level, 'trace')
      expect(r.passed, level).toBe(false)
      expect(r.strokes[i], level).toMatchObject({ ok: false, issue: 'direction', refIndex: i })
    }
    const easy = checkCharacter(strokes, getCheckRef(char), 'easy', 'trace')
    expect(easy.passed).toBe(true)
    expect(easy.hints).toEqual(['direction'])
  })

  it('does not flag direction on a correctly drawn short tick at 80% length, offset 4', () => {
    const s = getRefStrokes('シ')[0]
    for (const level of LEVELS) {
      const r = checkStroke(shiftAlong(scaleAboutCenter(s, 0.8), s, 4), s, level)
      expect(r.ok, level).toBe(true)
      expect(r.issue, level).toBeUndefined()
    }
  })

  it.each([['あ', 1, 2], ['き', 1, 3], ['シ', 1, 3], ['ふ', 1, 2]] as const)(
    '%s strokes %i and %i swapped: order fails on normal/strict, hint on easy',
    (char, a, b) => {
      const [i, j] = [a - 1, b - 1]
      const strokes = swapped(getRefStrokes(char), i, j)
      for (const level of ['normal', 'strict'] as const) {
        const r = checkCharacter(strokes, getCheckRef(char), level, 'trace')
        expect(r.passed, level).toBe(false)
        expect(r.strokes[i], level).toMatchObject({ ok: false, issue: 'order', refIndex: j })
        expect(r.strokes[j], level).toMatchObject({ ok: false, issue: 'order', refIndex: i })
      }
      const easy = checkCharacter(strokes, getCheckRef(char), 'easy', 'trace')
      expect(easy.passed).toBe(true)
      expect(easy.hints).toEqual(['order', 'order'])
    },
  )

  it.each(['あ', 'シ'])('%s with its last stroke missing fails on every level', char => {
    const ref = getRefStrokes(char)
    for (const level of LEVELS) {
      const r = checkCharacter(ref.slice(0, -1), getCheckRef(char), level, 'trace')
      expect(r.passed, level).toBe(false)
      expect(r.strokes[ref.length - 1], level).toMatchObject({ issue: 'missing', refIndex: ref.length - 1 })
    }
  })

  // Dropping one stroke of these gives an accepted variant count, so it must not pass as that variant.
  const JOIN_VARIANTS = ALL_KANA.filter(k => k.variants.includes(k.strokes - 1)).map(k => k.char)

  it('covers every kana whose variant joins two strokes', () => {
    expect(JOIN_VARIANTS).toEqual(['き', 'さ', 'ふ', 'り'])
  })

  it.each(JOIN_VARIANTS)('%s with any one stroke missing fails on every level in both modes', char => {
    const ref = getRefStrokes(char)
    ref.forEach((_, i) => {
      for (const level of LEVELS) {
        for (const mode of ['trace', 'free'] as const) {
          const r = checkCharacter(ref.filter((_, j) => j !== i), getCheckRef(char), level, mode)
          expect(r.passed, `stroke ${i + 1} dropped, ${level} ${mode}`).toBe(false)
        }
      }
    })
  })

  it.each(JOIN_VARIANTS)('%s with two consecutive strokes joined passes as the variant on easy/normal', char => {
    const ref = getRefStrokes(char)
    for (let i = 0; i < ref.length - 1; i++) {
      const joined = [...ref.slice(0, i), [...ref[i], ...ref[i + 1]], ...ref.slice(i + 2)]
      for (const user of [joined, joined.map(sloppy)]) {
        for (const level of ['easy', 'normal'] as const) {
          for (const mode of ['trace', 'free'] as const) {
            const r = checkCharacter(user, getCheckRef(char), level, mode)
            expect(r, `strokes ${i + 1}+${i + 2} joined, ${level} ${mode}`).toMatchObject({ passed: true, variant: true })
          }
        }
      }
    }
  })

  it.each(CHARS)('%s with an extra stroke fails on every level', char => {
    const ref = getRefStrokes(char)
    for (const level of LEVELS) {
      const r = checkCharacter([...ref, ref[0]], getCheckRef(char), level, 'trace')
      expect(r.passed, level).toBe(false)
      expect(r.strokes[ref.length], level).toMatchObject({ issue: 'extra' })
    }
  })

  it('き written in 3 strokes (strokes 3 and 4 joined) passes as a variant on easy/normal, fails on strict', () => {
    const [s1, s2, s3, s4] = getRefStrokes('き')
    expect(getCheckRef('き').acceptedCounts).toEqual([4, 3])
    const user = [s1, s2, [...s3, ...s4]]
    for (const level of ['easy', 'normal'] as const) {
      expect(checkCharacter(user, getCheckRef('き'), level, 'free'), level).toMatchObject({ passed: true, variant: true })
    }
    expect(checkCharacter(user, getCheckRef('き'), 'strict', 'free')).toMatchObject({ passed: false, variant: false })
  })
})

describe('all 92 kana', () => {
  it.each(ALL_KANA.map(k => k.char))('%s: sloppy-but-acceptable strokes pass on easy and normal with no hints', char => {
    for (const level of ['easy', 'normal'] as const) {
      for (const mode of ['trace', 'free'] as const) {
        const r = checkCharacter(getRefStrokes(char).map(sloppy), getCheckRef(char), level, mode)
        expect(r, `${level} ${mode}`).toMatchObject({ passed: true, hints: [] })
      }
    }
  })

  it('direction: a correct stroke is never flagged and a reversed one always is (every stroke, 80-100% length, offset ±4)', () => {
    const wrong: string[] = []
    for (const k of ALL_KANA) {
      getRefStrokes(k.char).forEach((s, i) => {
        for (const scale of [1, 0.8]) {
          for (const d of [4, -4]) {
            const correct = checkStroke(shiftAlong(scaleAboutCenter(s, scale), s, d), s, 'normal')
            const rev = checkStroke(shiftAlong(scaleAboutCenter(reversed(s), scale), s, d), s, 'normal')
            if (correct.issue) wrong.push(`${k.char}${i + 1} ×${scale} ${d}: correct got ${correct.issue}`)
            if (rev.issue !== 'direction') wrong.push(`${k.char}${i + 1} ×${scale} ${d}: reversed got ${rev.issue}`)
          }
        }
      })
    }
    expect(wrong).toEqual([])
  })
})
