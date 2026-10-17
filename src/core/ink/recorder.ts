import type { Point, Stroke } from '../stroke/types'

export const VIEW = 109

export interface RectLike { left: number; top: number; width: number; height: number }

export const toViewBox = (clientX: number, clientY: number, rect: RectLike): Point => ({
  x: ((clientX - rect.left) / rect.width) * VIEW,
  y: ((clientY - rect.top) / rect.height) * VIEW,
})

export interface StrokeRecorder {
  /**
   * Starts a stroke; returns false if another pointer is already drawing.
   * Exception: a `pen` replaces an in-progress `touch` stroke (a palm that landed first), which is discarded, never submitted.
   */
  down(id: number, p: Point, pointerType?: string): boolean
  move(id: number, ps: Point[]): boolean
  /** Ends the stroke for this pointer and returns it, or null if this pointer wasn't drawing. */
  up(id: number): Stroke | null
  cancel(id: number): void
  current(): Stroke
}

export function createStrokeRecorder(): StrokeRecorder {
  let active: number | null = null
  let activeType: string | undefined
  let pts: Point[] = []
  return {
    down(id, p, pointerType) {
      if (active !== null && !(pointerType === 'pen' && activeType === 'touch')) return false
      active = id; activeType = pointerType; pts = [p]; return true
    },
    move(id, ps) { if (id !== active) return false; pts.push(...ps); return true },
    up(id) { if (id !== active) return null; active = null; const s = pts; pts = []; return s },
    cancel(id) { if (id !== active) return; active = null; pts = [] },
    current: () => pts,
  }
}
