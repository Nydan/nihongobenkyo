import { describe, expect, it } from 'vitest'
import { bbox, meanDistance, normalizeTo, pathLength, resample } from './geometry'

describe('pathLength', () => {
  it('sums segment lengths', () => {
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11)
  })
})

describe('resample', () => {
  it('spaces points evenly along a line', () => {
    const out = resample([{ x: 0, y: 0 }, { x: 10, y: 0 }], 11)
    out.forEach((p, i) => { expect(p.x).toBeCloseTo(i); expect(p.y).toBe(0) })
  })

  it('keeps corners when sampling a polyline', () => {
    const out = resample([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 3)
    expect(out).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
  })

  it('repeats the point for a zero-length stroke', () => {
    expect(resample([{ x: 4, y: 4 }], 3)).toEqual([{ x: 4, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 4 }])
  })
})

describe('bbox + normalizeTo', () => {
  it('scales and centers strokes into the target box', () => {
    const square = [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]]
    const out = normalizeTo(square, { minX: 50, minY: 50, maxX: 90, maxY: 90 })
    expect(out[0]).toEqual([{ x: 50, y: 50 }, { x: 90, y: 50 }, { x: 90, y: 90 }, { x: 50, y: 90 }])
  })

  it('keeps aspect ratio using the larger dimension', () => {
    const line = [[{ x: 0, y: 0 }, { x: 10, y: 0 }]]
    const out = normalizeTo(line, { minX: 0, minY: 0, maxX: 20, maxY: 40 })
    expect(bbox(out[0])).toEqual({ minX: -10, minY: 20, maxX: 30, maxY: 20 })
  })

  it('does not divide by zero for a single point', () => {
    const out = normalizeTo([[{ x: 3, y: 3 }]], { minX: 0, minY: 0, maxX: 10, maxY: 10 })
    expect(out[0]).toEqual([{ x: 5, y: 5 }])
  })
})

describe('meanDistance', () => {
  it('is zero for identical point lists and the offset for shifted ones', () => {
    const a = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    expect(meanDistance(a, a)).toBe(0)
    expect(meanDistance(a, a.map(p => ({ x: p.x, y: p.y + 3 })))).toBe(3)
  })

  it('throws when lengths differ', () => {
    expect(() => meanDistance([{ x: 0, y: 0 }], [])).toThrow()
  })
})
