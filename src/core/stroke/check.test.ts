import { describe, expect, it } from 'vitest'
import { checkCharacter, checkStroke, isTap, type CheckRef } from './check'
import type { Stroke } from './types'

function line(x1: number, y1: number, x2: number, y2: number, n = 10): Stroke {
  return Array.from({ length: n }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / (n - 1), y: y1 + ((y2 - y1) * i) / (n - 1) }))
}
const H = line(20, 30, 90, 30)
const V = line(55, 10, 55, 100)
const REF: CheckRef = { strokes: [H, V], acceptedCounts: [2] }
const reversed = (s: Stroke) => [...s].reverse()

describe('isTap', () => {
  it('flags near-zero-length strokes', () => {
    expect(isTap([{ x: 5, y: 5 }])).toBe(true)
    expect(isTap([{ x: 5, y: 5 }, { x: 5.5, y: 5 }])).toBe(true)
    expect(isTap(H)).toBe(false)
  })
})

describe('checkStroke', () => {
  it('passes an exact stroke', () => {
    const r = checkStroke(H, H, 'strict')
    expect(r.ok).toBe(true)
    expect(r.issue).toBeUndefined()
  })
  it('flags a reversed stroke as direction (fail on normal, hint on easy)', () => {
    expect(checkStroke(reversed(H), H, 'normal')).toMatchObject({ ok: false, issue: 'direction' })
    expect(checkStroke(reversed(H), H, 'easy')).toMatchObject({ ok: true, issue: 'direction' })
  })
  it('flags a short reversed stroke as direction even when it is within tolerance forward', () => {
    const tick = line(40, 40, 50, 40)
    expect(checkStroke(reversed(tick), tick, 'normal')).toMatchObject({ ok: false, issue: 'direction' })
    expect(checkStroke(reversed(tick), tick, 'strict')).toMatchObject({ ok: false, issue: 'direction' })
    expect(checkStroke(reversed(tick), tick, 'easy')).toMatchObject({ ok: true, issue: 'direction' })
  })
  it('flags a wrong shape', () => {
    expect(checkStroke(V, H, 'easy')).toMatchObject({ ok: false, issue: 'shape' })
  })
})

describe('checkCharacter', () => {
  it('passes correct strokes on every level', () => {
    for (const level of ['easy', 'normal', 'strict'] as const) {
      expect(checkCharacter([H, V], REF, level, 'free').passed).toBe(true)
    }
  })

  it('accepts a small, off-center character in free mode', () => {
    const shrink = (s: Stroke) => s.map(p => ({ x: p.x * 0.5 + 5, y: p.y * 0.5 + 5 }))
    expect(checkCharacter([shrink(H), shrink(V)], REF, 'strict', 'free').passed).toBe(true)
  })

  it('tolerates mild wobble on normal', () => {
    const wobble = (s: Stroke) => s.map((p, i) => ({ x: p.x + 3 * Math.sin(i * 1.7), y: p.y + 3 * Math.cos(i * 1.3) }))
    expect(checkCharacter([wobble(H), wobble(V)], REF, 'normal', 'free').passed).toBe(true)
  })

  it('reports direction: fail on normal, hint on easy', () => {
    const normal = checkCharacter([reversed(H), V], REF, 'normal', 'free')
    expect(normal.passed).toBe(false)
    expect(normal.strokes[0].issue).toBe('direction')
    const easy = checkCharacter([reversed(H), V], REF, 'easy', 'free')
    expect(easy.passed).toBe(true)
    expect(easy.hints).toEqual(['direction'])
  })

  it('reports swapped strokes as order with the matching reference index', () => {
    const r = checkCharacter([V, H], REF, 'normal', 'free')
    expect(r.passed).toBe(false)
    expect(r.strokes[0]).toMatchObject({ issue: 'order', refIndex: 1 })
    expect(r.strokes[1]).toMatchObject({ issue: 'order', refIndex: 0 })
    expect(checkCharacter([V, H], REF, 'easy', 'free').passed).toBe(true)
  })

  it('reports a missing stroke', () => {
    const r = checkCharacter([H], REF, 'normal', 'trace')
    expect(r.passed).toBe(false)
    expect(r.strokes[0].ok).toBe(true)
    expect(r.strokes[1]).toMatchObject({ ok: false, issue: 'missing', refIndex: 1 })
  })

  it('reports an extra stroke', () => {
    const r = checkCharacter([H, V, line(20, 10, 90, 100)], REF, 'normal', 'free')
    expect(r.passed).toBe(false)
    expect(r.strokes[2]).toMatchObject({ ok: false, issue: 'extra' })
  })

  it('reports a wrong shape', () => {
    const r = checkCharacter([H, line(20, 10, 90, 100)], REF, 'easy', 'trace')
    expect(r.strokes[1]).toMatchObject({ ok: false, issue: 'shape' })
  })

  it('applies per-level tolerance (8-unit offset in trace mode)', () => {
    const shifted = line(63, 10, 63, 100)
    expect(checkCharacter([H, shifted], REF, 'easy', 'trace').passed).toBe(true)
    expect(checkCharacter([H, shifted], REF, 'normal', 'trace').passed).toBe(true)
    expect(checkCharacter([H, shifted], REF, 'strict', 'trace').passed).toBe(false)
  })

  it('ignores taps instead of counting them as extra strokes', () => {
    const r = checkCharacter([H, [{ x: 5, y: 5 }], V, [{ x: 7, y: 7 }, { x: 7.4, y: 7 }]], REF, 'normal', 'free')
    expect(r.passed).toBe(true)
    expect(r.strokes).toHaveLength(2)
  })

  it('treats empty input as all strokes missing', () => {
    const r = checkCharacter([], REF, 'easy', 'free')
    expect(r.passed).toBe(false)
    expect(r.strokes.map(s => s.issue)).toEqual(['missing', 'missing'])
  })

  describe('accepted stroke-count variants', () => {
    const VAR: CheckRef = { strokes: [H, V], acceptedCounts: [2, 1] }
    it('accepts a merged variant on normal by whole shape', () => {
      const r = checkCharacter([[...H, ...V]], VAR, 'normal', 'free')
      expect(r).toMatchObject({ passed: true, variant: true })
    })
    it('rejects a variant-count drawing with the wrong shape', () => {
      const r = checkCharacter([line(20, 10, 90, 100)], VAR, 'normal', 'free')
      expect(r).toMatchObject({ passed: false, variant: true })
    })
    it('does not accept variants on strict', () => {
      const r = checkCharacter([[...H, ...V]], VAR, 'strict', 'free')
      expect(r.passed).toBe(false)
      expect(r.variant).toBe(false)
      expect(r.strokes[1].issue).toBe('missing')
    })
  })
})
