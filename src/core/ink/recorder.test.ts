import { describe, expect, it } from 'vitest'
import { createStrokeRecorder, toViewBox } from './recorder'

const p = (x: number, y: number) => ({ x, y })

describe('toViewBox', () => {
  it('maps client coordinates through the current rect', () => {
    expect(toViewBox(150, 250, { left: 100, top: 200, width: 109, height: 109 })).toEqual({ x: 50, y: 50 })
  })
  it('uses the rect at event time, so a resized box still maps correctly', () => {
    const small = { left: 0, top: 0, width: 218, height: 218 }
    const large = { left: 50, top: 10, width: 436, height: 436 }
    expect(toViewBox(109, 109, small)).toEqual({ x: 54.5, y: 54.5 })
    expect(toViewBox(268, 228, large)).toEqual({ x: 54.5, y: 54.5 })
  })
})

describe('createStrokeRecorder', () => {
  it('records down → move → up as one stroke', () => {
    const r = createStrokeRecorder()
    expect(r.down(1, p(0, 0))).toBe(true)
    expect(r.move(1, [p(1, 1), p(2, 2)])).toBe(true)
    expect(r.up(1)).toEqual([p(0, 0), p(1, 1), p(2, 2)])
    expect(r.current()).toEqual([])
  })

  it('ignores a second pointer while a stroke is in progress', () => {
    const r = createStrokeRecorder()
    r.down(1, p(0, 0))
    expect(r.down(2, p(50, 50))).toBe(false)
    expect(r.move(2, [p(60, 60)])).toBe(false)
    expect(r.up(2)).toBeNull()
    r.cancel(2)
    r.move(1, [p(1, 1)])
    expect(r.up(1)).toEqual([p(0, 0), p(1, 1)])
  })

  it('discards the stroke on cancel', () => {
    const r = createStrokeRecorder()
    r.down(1, p(0, 0))
    r.move(1, [p(5, 5)])
    r.cancel(1)
    expect(r.current()).toEqual([])
    expect(r.up(1)).toBeNull()
    expect(r.down(3, p(9, 9))).toBe(true)
  })

  it('lets a pen take over from an in-progress touch stroke (palm landed first)', () => {
    const r = createStrokeRecorder()
    expect(r.down(1, p(0, 0), 'touch')).toBe(true)
    r.move(1, [p(1, 1)])
    expect(r.down(2, p(50, 50), 'pen')).toBe(true)
    expect(r.current()).toEqual([p(50, 50)])
    expect(r.move(1, [p(2, 2)])).toBe(false)
    expect(r.up(1)).toBeNull()
    expect(r.move(2, [p(51, 51)])).toBe(true)
    expect(r.up(2)).toEqual([p(50, 50), p(51, 51)])
    expect(r.up(1)).toBeNull()
  })

  it('does not let a touch take over from an in-progress pen stroke', () => {
    const r = createStrokeRecorder()
    r.down(1, p(0, 0), 'pen')
    expect(r.down(2, p(50, 50), 'touch')).toBe(false)
    r.move(1, [p(1, 1)])
    expect(r.up(1)).toEqual([p(0, 0), p(1, 1)])
  })

  it('does not let a pen take over from a mouse stroke or another pen stroke', () => {
    const r = createStrokeRecorder()
    r.down(1, p(0, 0), 'mouse')
    expect(r.down(2, p(5, 5), 'pen')).toBe(false)
    r.cancel(1)
    r.down(3, p(0, 0), 'pen')
    expect(r.down(4, p(5, 5), 'pen')).toBe(false)
    expect(r.up(3)).toEqual([p(0, 0)])
  })
})
