import type { Point, Stroke } from './types'

export interface BBox { minX: number; minY: number; maxX: number; maxY: number }

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export function pathLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  return total
}

/** Returns `n` points evenly spaced by arc length along the polyline. */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) throw new Error('Cannot resample an empty stroke')
  const total = pathLength(points)
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }))

  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]))

  const step = total / (n - 1)
  const out: Point[] = []
  let seg = 1
  for (let k = 0; k < n; k++) {
    const target = k === n - 1 ? total : k * step
    while (seg < points.length - 1 && cum[seg] < target) seg++
    const a = points[seg - 1]
    const b = points[seg]
    const segLen = cum[seg] - cum[seg - 1]
    const t = segLen === 0 ? 0 : (target - cum[seg - 1]) / segLen
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}

export function bbox(points: Point[]): BBox {
  if (points.length === 0) throw new Error('Cannot compute bbox of no points')
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/** Uniformly scales and translates all strokes so their joint bbox matches `target` (by its larger side, centered). */
export function normalizeTo(strokes: Stroke[], target: BBox): Stroke[] {
  const ub = bbox(strokes.flat())
  const uSize = Math.max(ub.maxX - ub.minX, ub.maxY - ub.minY)
  const tSize = Math.max(target.maxX - target.minX, target.maxY - target.minY)
  const s = uSize === 0 ? 1 : tSize / uSize
  const ucx = (ub.minX + ub.maxX) / 2
  const ucy = (ub.minY + ub.maxY) / 2
  const tcx = (target.minX + target.maxX) / 2
  const tcy = (target.minY + target.maxY) / 2
  return strokes.map(st => st.map(p => ({ x: tcx + (p.x - ucx) * s, y: tcy + (p.y - ucy) * s })))
}

export function meanDistance(a: Point[], b: Point[]): number {
  if (a.length !== b.length) throw new Error(`Point lists differ in length: ${a.length} vs ${b.length}`)
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i])
  return sum / a.length
}
