import { describe, expect, it } from 'vitest'
import { pathToPoints } from './path'

describe('pathToPoints', () => {
  it('parses absolute move and line', () => {
    expect(pathToPoints('M10,10L20,10')).toEqual([{ x: 10, y: 10 }, { x: 20, y: 10 }])
  })

  it('parses relative move and line', () => {
    expect(pathToPoints('m10,10l10,0')).toEqual([{ x: 10, y: 10 }, { x: 20, y: 10 }])
  })

  it('treats extra pairs after M as implicit line-to', () => {
    expect(pathToPoints('M0,0 10,0 10,10')).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
    ])
  })

  it('splits numbers that are joined by a minus sign', () => {
    expect(pathToPoints('M1.12-0.02')).toEqual([{ x: 1.12, y: -0.02 }])
  })

  it('samples a cubic curve', () => {
    const pts = pathToPoints('M0,0C0,10,10,10,10,0', 16)
    expect(pts).toHaveLength(17)
    expect(pts[16]).toEqual({ x: 10, y: 0 })
    expect(pts[8].x).toBeCloseTo(5)
    expect(pts[8].y).toBeCloseTo(7.5)
  })

  it('reflects the control point for relative s after c', () => {
    const pts = pathToPoints('M0,0c0,10,10,10,10,0s10,-10,10,0', 16)
    expect(pts).toHaveLength(33)
    expect(pts[32].x).toBeCloseTo(20)
    expect(pts[32].y).toBeCloseTo(0)
    expect(pts[24].x).toBeCloseTo(15)
    expect(pts[24].y).toBeCloseTo(-7.5)
  })

  it('throws on unsupported commands', () => {
    expect(() => pathToPoints('M0,0A1,1,0,0,1,5,5')).toThrow(/Unsupported/)
  })
})
