import type { Point } from './types'

const TOKEN = /[a-df-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

function sampleCubic(p0: Point, c1: Point, c2: Point, p3: Point, n: number, out: Point[]): void {
  for (let s = 1; s <= n; s++) {
    const t = s / n
    const u = 1 - t
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    })
  }
}

/** Converts an SVG path `d` string (M/L/H/V/C/S/Z, absolute or relative) to a polyline. */
export function pathToPoints(d: string, samplesPerCurve = 16): Point[] {
  const tokens = d.match(TOKEN) ?? []
  const pts: Point[] = []
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let lastCtrl: Point | null = null

  const num = (): number => {
    const t = tokens[i++]
    const n = Number(t)
    if (t === undefined || Number.isNaN(n)) throw new Error(`Bad path data near token ${i}: ${d}`)
    return n
  }

  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++]
    else if (!cmd) throw new Error(`Path data must start with a command: ${d}`)

    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? cx : 0
    const oy = rel ? cy : 0

    switch (cmd.toUpperCase()) {
      case 'M': {
        cx = ox + num()
        cy = oy + num()
        startX = cx
        startY = cy
        pts.push({ x: cx, y: cy })
        lastCtrl = null
        cmd = rel ? 'l' : 'L'
        break
      }
      case 'L': {
        cx = ox + num()
        cy = oy + num()
        pts.push({ x: cx, y: cy })
        lastCtrl = null
        break
      }
      case 'H': {
        cx = ox + num()
        pts.push({ x: cx, y: cy })
        lastCtrl = null
        break
      }
      case 'V': {
        cy = oy + num()
        pts.push({ x: cx, y: cy })
        lastCtrl = null
        break
      }
      case 'C': {
        const c1 = { x: ox + num(), y: oy + num() }
        const c2 = { x: ox + num(), y: oy + num() }
        const end = { x: ox + num(), y: oy + num() }
        sampleCubic({ x: cx, y: cy }, c1, c2, end, samplesPerCurve, pts)
        lastCtrl = c2
        cx = end.x
        cy = end.y
        break
      }
      case 'S': {
        const c1: Point = lastCtrl ? { x: 2 * cx - lastCtrl.x, y: 2 * cy - lastCtrl.y } : { x: cx, y: cy }
        const c2 = { x: ox + num(), y: oy + num() }
        const end = { x: ox + num(), y: oy + num() }
        sampleCubic({ x: cx, y: cy }, c1, c2, end, samplesPerCurve, pts)
        lastCtrl = c2
        cx = end.x
        cy = end.y
        break
      }
      case 'Z': {
        cx = startX
        cy = startY
        pts.push({ x: cx, y: cy })
        lastCtrl = null
        cmd = ''
        break
      }
      default:
        throw new Error(`Unsupported path command "${cmd}" in: ${d}`)
    }
  }
  return pts
}
