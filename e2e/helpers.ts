import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { pathToPoints } from '../src/core/stroke/path'
import type { Point } from '../src/core/stroke/types'

/** URL for the app served by `vite preview` at the given hash route. */
export const appUrl = (hash = ''): string => `/#/${hash}`
/** file:// URL of the built single-file app. */
export const fileUrl = (hash = ''): string => `${pathToFileURL(resolve('dist/index.html')).href}#/${hash}`

const KANA = JSON.parse(readFileSync('data/kanjivg/kana.json', 'utf8')) as Record<string, { strokes: string[] }>

/** Reference strokes with 4 samples per curve: enough geometry (the checker resamples to 32) and fast to replay. */
export const refStrokes = (char: string): Point[][] => KANA[char].strokes.map(d => pathToPoints(d, 4))

/** Draws strokes (in 0..109 viewBox units) into the writing box with the mouse. */
export async function drawStrokes(page: Page, strokes: Point[][], transform: (p: Point) => Point = p => p) {
  const box = await page.getByTestId('writing-box').boundingBox()
  if (!box) throw new Error('writing box not visible')
  for (const stroke of strokes) {
    const pts = stroke.map(transform).map(p => ({ x: box.x + (p.x / 109) * box.width, y: box.y + (p.y / 109) * box.height }))
    await page.mouse.move(pts[0].x, pts[0].y)
    await page.mouse.down()
    for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y)
    await page.mouse.up()
  }
}
