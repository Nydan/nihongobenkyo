import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Stroke } from '../stroke/types'
import { Guide } from './Guide'
import { acceptPointer } from './pointer'
import { createStrokeRecorder, toViewBox, VIEW } from './recorder'

export interface WritingBoxProps {
  strokes: Stroke[]
  strokeColors?: (string | undefined)[]
  onStroke: (s: Stroke) => void
  disabled?: boolean
  /** SVG elements in 0..109 coordinates, drawn under the ink (guides, references, feedback). */
  children?: ComponentChildren
}

const toPoints = (s: Stroke) => s.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

/** Square drawing surface. The in-progress stroke is drawn on a canvas; finished strokes are SVG so they can be recolored. */
export function WritingBox({ strokes, strokeColors = [], onStroke, disabled, children }: WritingBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rec] = useState(createStrokeRecorder)

  function drawLive() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pts = rec.current()
    if (pts.length === 0) return
    ctx.setTransform(canvas.width / VIEW, 0, 0, canvas.height / VIEW, 0, 0)
    ctx.strokeStyle = getComputedStyle(canvas).color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y)
    ctx.stroke()
  }

  useEffect(() => {
    const box = boxRef.current!
    const canvas = canvasRef.current!
    const fit = () => {
      const r = box.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      drawLive()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    fit()
    return () => ro.disconnect()
  }, [])

  const point = (e: PointerEvent) => toViewBox(e.clientX, e.clientY, boxRef.current!.getBoundingClientRect())

  return (
    <div
      ref={boxRef}
      class={`writing-box${disabled ? ' disabled' : ''}`}
      data-testid="writing-box"
      onPointerDown={(e: PointerEvent) => {
        if (disabled || !acceptPointer(e.pointerType)) return
        if (!rec.down(e.pointerId, point(e), e.pointerType)) return
        try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* capture is best-effort */ }
        e.preventDefault()
        drawLive()
      }}
      onPointerMove={(e: PointerEvent) => {
        const coalesced = e.getCoalescedEvents?.()
        const events = coalesced && coalesced.length ? coalesced : [e]
        if (rec.move(e.pointerId, events.map(point))) drawLive()
      }}
      onPointerUp={(e: PointerEvent) => {
        const s = rec.up(e.pointerId)
        if (!s) return
        drawLive()
        onStroke(s)
      }}
      onPointerCancel={(e: PointerEvent) => { rec.cancel(e.pointerId); drawLive() }}
    >
      <svg class="wb-layer" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
        <Guide />
        {children}
        {strokes.map((s, i) => (
          <polyline key={i} class="ink" points={toPoints(s)} style={strokeColors[i] ? { stroke: strokeColors[i] } : undefined} />
        ))}
      </svg>
      <canvas ref={canvasRef} class="wb-layer wb-live" />
    </div>
  )
}
