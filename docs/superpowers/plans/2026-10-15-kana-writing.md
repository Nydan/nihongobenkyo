# Kana Writing (Module 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline web app (one self-contained `index.html`) that teaches hiragana and katakana writing stroke by stroke — Watch, Trace, Copy, Test — with on-device stroke checking, a guided path, a browse grid, and a module shell ready for a future grammar module.

**Architecture:** Preact app bundled by Vite + `vite-plugin-singlefile`. `src/core/` holds framework pieces with no app knowledge (stroke geometry/checking, ink input, storage, router, speech, module contract). `src/shell/` is the app frame. `src/modules/kana/` is the first `LearningModule`. Stroke data is KanjiVG converted once to `data/kanjivg/kana.json` and inlined at build time.

**Tech Stack:** TypeScript, Preact, Vite, vite-plugin-singlefile, Vitest (unit), Playwright/WebKit (smoke), tsx (scripts), GitHub Pages (hosting).

**Spec:** `docs/superpowers/specs/2026-10-15-kana-writing-design.md`

## Global Constraints

- Output: `npm run build` → `dist/index.html` fully self-contained (no `<script src>`, no external stylesheet); plus `sw.js`, `manifest.webmanifest`, icons for hosted/offline use.
- No network calls at runtime. No external services. No `vite-plugin-pwa`.
- Vite `base: './'`; hash routing (`#/kana/hiragana/char/あ`).
- Stroke coordinates are KanjiVG viewBox units: `0 0 109 109`.
- UI text is icon-first with short English labels.
- `src/modules/*` import only from `src/core/*` and their own folder — never from `src/shell/` or another module.
- Character set: 46 basic hiragana + 46 basic katakana (92). No voiced/small kana.
- Levels: `easy` / `normal` / `strict`, default `normal`. Easy: order + direction are hints only.
- Code license MIT; `data/kanjivg/` is CC BY-SA 3.0 with attribution to Ulrich Apel / KanjiVG.
- Commit messages: Conventional Commits, **no `Co-Authored-By` lines**.
- Never push to any remote without the user's explicit confirmation at that time.

## Review Focus

1. **Accidental taps** (resting palm, double tap, pen bounce) produce near-zero-length strokes → they must be ignored, never counted as an `extra` stroke. Pinned in Task 2 (`ignores taps`) and Task 9/10 UIs via `isTap`.
2. **A second pointer touching the box while a stroke is in progress** (palm, second finger) → ignored; the in-progress stroke continues uncorrupted. Pinned in Task 7 recorder tests.
3. **Kana in the URL hash arrives percent-encoded on some browsers and raw on others** → both must route to the same character. Pinned in Task 5 router tests.
4. **Storage that fails mid-session** (Safari private mode, quota exceeded on write) → app keeps working from memory and reports `persistent: false` so the banner shows. Pinned in Task 4 storage tests.
5. **The writing box changes size between strokes** (iPad rotation, window resize) → points map through the box rect at event time, so strokes stay in correct viewBox coordinates. Pinned in Task 7 `toViewBox` tests.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html, .gitignore, LICENSE
src/
  main.tsx                       mounts <App modules=[kanaModule]>, registers SW
  core/
    stroke/types.ts              Point, Stroke, Level, Issue
    stroke/path.ts               SVG path "d" → polyline points
    stroke/geometry.ts           dist, pathLength, resample, bbox, normalizeTo, meanDistance
    stroke/check.ts              TOLERANCE, isTap, checkStroke, checkCharacter
    ink/pointer.ts               palm rejection (acceptPointer, resetPenDetection)
    ink/recorder.ts              VIEW, toViewBox, createStrokeRecorder
    ink/Guide.tsx                田 practice guide (SVG)
    ink/WritingBox.tsx           drawing surface
    storage.ts                   createStore, getAppStore
    settings.ts                  Settings, loadSettings, saveSettings, useSettings
    router.ts                    parseHash, href, navigate, matchRoute, useHashSegments
    module.ts                    Route, LearningModule, resolveModuleRoute
    speech.ts                    findJapaneseVoice, useJapaneseVoice, speak
    SpeakButton.tsx
    NotFound.tsx
    sw-register.ts               shouldRegisterServiceWorker, registerServiceWorker
  shell/  App.tsx Home.tsx Settings.tsx About.tsx Banner.tsx styles.css
  modules/kana/
    index.tsx                    kanaModule (routes)
    chars.ts                     ROWS, ALL_KANA, kanaByScript, findKana
    data.ts                      getKanaData, getRefStrokes, getCheckRef
    progress.ts                  KanaProgress, withStars, withPassed, useKanaProgress
    messages.ts                  issueMessage, resultMessages
    path.ts                      buildPath, nodeKey, isUnlocked, findNode
    quiz.ts                      createQuiz, answer, currentChar, isDone
    KanaHome.tsx ScriptScreen.tsx GridView.tsx PathView.tsx Stars.tsx
    CharacterScreen.tsx WatchStep.tsx TraceStep.tsx FreeWriteStep.tsx ModelCard.tsx
    LessonScreen.tsx QuizScreen.tsx
  test-utils/memory-storage.ts
scripts/ kanjivg.ts build-kana-data.ts make-icons.ts
data/kanjivg/ kana.json LICENSE README.md
public/ sw.js manifest.webmanifest icon-180.png icon-512.png
e2e/ helpers.ts shell.spec.ts character.spec.ts path.spec.ts pwa.spec.ts
.github/workflows/pages.yml
docs/ipad-checklist.md
```

---

### Task 1: Project scaffold + stroke geometry

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `LICENSE`, `src/main.tsx`
- Create: `src/core/stroke/types.ts`, `src/core/stroke/path.ts`, `src/core/stroke/geometry.ts`
- Test: `src/core/stroke/path.test.ts`, `src/core/stroke/geometry.test.ts`

**Interfaces:**
- Produces:
  - `type Point = { x: number; y: number }`, `type Stroke = Point[]`, `type Level = 'easy' | 'normal' | 'strict'`, `type Issue = 'shape' | 'direction' | 'order' | 'missing' | 'extra'`
  - `pathToPoints(d: string, samplesPerCurve?: number): Point[]`
  - `dist(a, b): number`, `pathLength(points): number`, `resample(points, n): Point[]`, `interface BBox { minX; minY; maxX; maxY }`, `bbox(points): BBox`, `normalizeTo(strokes: Stroke[], target: BBox): Stroke[]`, `meanDistance(a, b): number`

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/d-aguswahyudi/Documents/projects/nohonggobenkyo
npm init -y
npm install preact
npm install -D vite @preact/preset-vite vite-plugin-singlefile typescript vitest tsx @playwright/test @types/node
```

If npm reports a peer-dependency conflict between `vite` and `vite-plugin-singlefile`, install the newest `vite` major that `vite-plugin-singlefile` lists in its `peerDependencies` (`npm view vite-plugin-singlefile peerDependencies`).

Replace `package.json` `name`/`scripts`/`type` fields so it contains (keep the dependency blocks npm wrote):

```json
{
  "name": "nihongo-benkyo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "serve": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "npm run build && playwright test",
    "data:kana": "tsx scripts/build-kana-data.ts"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Nihongo Benkyō</title>
    <!--
      Nihongo Benkyō. Code: MIT License.
      Stroke data: KanjiVG (c) Ulrich Apel, CC BY-SA 3.0 — https://kanjivg.tagaini.net/
      https://creativecommons.org/licenses/by-sa/3.0/
    -->
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (temporary; replaced in Task 6):

```tsx
import { render } from 'preact'

render(<h1>Nihongo Benkyō</h1>, document.getElementById('app')!)
```

`.gitignore`:

```
node_modules/
dist/
test-results/
playwright-report/
.DS_Store
```

`LICENSE`: the standard MIT License text with the line `Copyright (c) 2026 Nihongo Benkyō contributors`, followed by a final paragraph:

```
The stroke data in data/kanjivg/ is NOT covered by this license. It is derived
from KanjiVG (c) Ulrich Apel and distributed under CC BY-SA 3.0; see
data/kanjivg/LICENSE.
```

Run: `npm run build && grep -c '<script type="module" src' dist/index.html`
Expected: build succeeds; grep prints `0` (script was inlined).

- [ ] **Step 2: Write the types**

`src/core/stroke/types.ts`:

```ts
/** A point in KanjiVG viewBox units (0..109). */
export type Point = { x: number; y: number }
export type Stroke = Point[]
export type Level = 'easy' | 'normal' | 'strict'
export type Issue = 'shape' | 'direction' | 'order' | 'missing' | 'extra'
```

- [ ] **Step 3: Write failing path parser tests**

`src/core/stroke/path.test.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/core/stroke/path.test.ts`
Expected: FAIL — cannot resolve `./path`.

- [ ] **Step 5: Implement the parser**

`src/core/stroke/path.ts`:

```ts
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
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/core/stroke/path.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Write failing geometry tests**

`src/core/stroke/geometry.test.ts`:

```ts
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
```

- [ ] **Step 8: Run to verify failure**

Run: `npx vitest run src/core/stroke/geometry.test.ts`
Expected: FAIL — cannot resolve `./geometry`.

- [ ] **Step 9: Implement geometry**

`src/core/stroke/geometry.ts`:

```ts
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
```

- [ ] **Step 10: Run all unit tests**

Run: `npm test`
Expected: PASS (path + geometry suites).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite/Preact app and add stroke geometry"
```

---

### Task 2: Stroke checker

**Files:**
- Create: `src/core/stroke/check.ts`
- Test: `src/core/stroke/check.test.ts`

**Interfaces:**
- Consumes: `resample`, `meanDistance`, `bbox`, `normalizeTo`, `pathLength` (Task 1); types from `types.ts`.
- Produces:
  - `TOLERANCE: Record<Level, number>`, `SAMPLES = 32`, `MERGED_SAMPLES = 128`, `MIN_STROKE_LENGTH = 1.5`
  - `isTap(stroke: Stroke): boolean`
  - `interface StrokeResult { ok: boolean; issue?: Issue; refIndex?: number; distance: number }`
  - `interface CheckRef { strokes: Stroke[]; acceptedCounts: number[] }` — `strokes` are polylines; `acceptedCounts[0] === strokes.length`
  - `interface CharacterResult { passed: boolean; strokes: StrokeResult[]; hints: Issue[]; variant: boolean }`
  - `checkStroke(user: Stroke, ref: Stroke, level: Level): StrokeResult` — `ok: true` with an `issue` means "hint only"
  - `checkCharacter(user: Stroke[], ref: CheckRef, level: Level, mode: 'trace' | 'free'): CharacterResult`

- [ ] **Step 1: Write failing tests**

`src/core/stroke/check.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/stroke/check.test.ts`
Expected: FAIL — cannot resolve `./check`.

- [ ] **Step 3: Implement the checker**

`src/core/stroke/check.ts`:

```ts
import { bbox, meanDistance, normalizeTo, pathLength, resample } from './geometry'
import type { Issue, Level, Stroke } from './types'

export const SAMPLES = 32
export const MERGED_SAMPLES = 128
/** Strokes shorter than this (viewBox units) are taps and are ignored. */
export const MIN_STROKE_LENGTH = 1.5
/** Max mean point distance (viewBox units, 0..109) for a stroke to match. Tune with real handwriting. */
export const TOLERANCE: Record<Level, number> = { easy: 14, normal: 10, strict: 7 }
const HINT_ONLY: Record<Level, Issue[]> = { easy: ['direction', 'order'], normal: [], strict: [] }

export interface StrokeResult { ok: boolean; issue?: Issue; refIndex?: number; distance: number }
export interface CheckRef { strokes: Stroke[]; acceptedCounts: number[] }
export interface CharacterResult { passed: boolean; strokes: StrokeResult[]; hints: Issue[]; variant: boolean }

export const isTap = (s: Stroke): boolean => s.length === 0 || pathLength(s) < MIN_STROKE_LENGTH

/** Compares one stroke. `ok: true` together with `issue` means the issue is a hint at this level. */
export function checkStroke(user: Stroke, ref: Stroke, level: Level): StrokeResult {
  const tol = TOLERANCE[level]
  const u = resample(user, SAMPLES)
  const r = resample(ref, SAMPLES)
  const forward = meanDistance(u, r)
  if (forward <= tol) return { ok: true, distance: forward }
  const backward = meanDistance([...u].reverse(), r)
  if (backward <= tol) return { ok: HINT_ONLY[level].includes('direction'), issue: 'direction', distance: backward }
  return { ok: false, issue: 'shape', distance: forward }
}

function checkVariant(user: Stroke[], ref: CheckRef, level: Level): CharacterResult {
  const d = meanDistance(resample(user.flat(), MERGED_SAMPLES), resample(ref.strokes.flat(), MERGED_SAMPLES))
  const ok = d <= TOLERANCE[level]
  return {
    passed: ok,
    strokes: user.map(() => (ok ? { ok, distance: d } : { ok, issue: 'shape' as const, distance: d })),
    hints: [],
    variant: true,
  }
}

export function checkCharacter(raw: Stroke[], ref: CheckRef, level: Level, mode: 'trace' | 'free'): CharacterResult {
  const cleaned = raw.filter(s => !isTap(s))
  const expected = ref.strokes.length
  if (cleaned.length === 0) {
    return {
      passed: false,
      strokes: ref.strokes.map((_, i) => ({ ok: false, issue: 'missing' as const, refIndex: i, distance: Infinity })),
      hints: [],
      variant: false,
    }
  }

  const user = mode === 'free' ? normalizeTo(cleaned, bbox(ref.strokes.flat())) : cleaned

  if (user.length !== expected && level !== 'strict' && ref.acceptedCounts.includes(user.length)) {
    return checkVariant(user, ref, level)
  }

  const results: StrokeResult[] = []
  for (let i = 0; i < Math.max(user.length, expected); i++) {
    if (i >= user.length) { results.push({ ok: false, issue: 'missing', refIndex: i, distance: Infinity }); continue }
    if (i >= expected) { results.push({ ok: false, issue: 'extra', distance: Infinity }); continue }

    let res = checkStroke(user[i], ref.strokes[i], level)
    if (res.issue === 'shape') {
      const j = ref.strokes.findIndex((rs, k) => k !== i && checkStroke(user[i], rs, level).issue === undefined)
      if (j >= 0) res = { ok: HINT_ONLY[level].includes('order'), issue: 'order', refIndex: j, distance: res.distance }
    }
    results.push({ ...res, refIndex: res.refIndex ?? i })
  }

  return {
    passed: results.every(r => r.ok),
    strokes: results,
    hints: results.filter(r => r.ok && r.issue).map(r => r.issue!),
    variant: false,
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/core/stroke/check.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/stroke
git commit -m "feat: add stroke checker with levels, order and variant handling"
```

---

### Task 3: Kana character table + KanjiVG data

**Files:**
- Create: `src/modules/kana/chars.ts`, `scripts/kanjivg.ts`, `scripts/build-kana-data.ts`, `src/modules/kana/data.ts`
- Create (generated): `data/kanjivg/kana.json`; Create: `data/kanjivg/LICENSE`, `data/kanjivg/README.md`
- Test: `scripts/kanjivg.test.ts`, `src/modules/kana/data.test.ts`

**Interfaces:**
- Consumes: `pathToPoints` (Task 1), `CheckRef` (Task 2).
- Produces:
  - `type Script = 'hiragana' | 'katakana'`, `type RowId = 'a'|'ka'|'sa'|'ta'|'na'|'ha'|'ma'|'ya'|'ra'|'wa'|'n'`
  - `interface KanaChar { char: string; romaji: string; script: Script; row: RowId; col: number; strokes: number; variants: number[] }`
  - `ROWS: RowId[]`, `ALL_KANA: KanaChar[]`, `kanaByScript(script): KanaChar[]`, `findKana(char): KanaChar | undefined`
  - `parseKanjiVG(svg: string, code: string): { strokes: string[]; numbers: [number, number][] }`
  - `interface KanaData { strokes: string[]; numbers: [number, number][]; acceptedCounts: number[] }`
  - `getKanaData(char): KanaData` (throws if unknown), `getRefStrokes(char): Stroke[]` (memoized), `getCheckRef(char): CheckRef`

- [ ] **Step 1: Write the character table**

`src/modules/kana/chars.ts`:

```ts
export type Script = 'hiragana' | 'katakana'
export type RowId = 'a' | 'ka' | 'sa' | 'ta' | 'na' | 'ha' | 'ma' | 'ya' | 'ra' | 'wa' | 'n'

export interface KanaChar {
  char: string
  romaji: string
  script: Script
  row: RowId
  /** Gojūon column 0..4 (a, i, u, e, o). */
  col: number
  /** Expected stroke count; must equal the KanjiVG count (checked by scripts/build-kana-data.ts). */
  strokes: number
  /** Other stroke counts accepted in Easy/Normal (common handwritten forms). */
  variants: number[]
}

export const ROWS: RowId[] = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n']

type Entry = [char: string, romaji: string, row: RowId, col: number, strokes: number, variants?: number[]]

const HIRAGANA: Entry[] = [
  ['あ', 'a', 'a', 0, 3], ['い', 'i', 'a', 1, 2], ['う', 'u', 'a', 2, 2], ['え', 'e', 'a', 3, 2], ['お', 'o', 'a', 4, 3],
  ['か', 'ka', 'ka', 0, 3], ['き', 'ki', 'ka', 1, 4, [3]], ['く', 'ku', 'ka', 2, 1], ['け', 'ke', 'ka', 3, 3], ['こ', 'ko', 'ka', 4, 2],
  ['さ', 'sa', 'sa', 0, 3, [2]], ['し', 'shi', 'sa', 1, 1], ['す', 'su', 'sa', 2, 2], ['せ', 'se', 'sa', 3, 3], ['そ', 'so', 'sa', 4, 1, [2]],
  ['た', 'ta', 'ta', 0, 4], ['ち', 'chi', 'ta', 1, 2], ['つ', 'tsu', 'ta', 2, 1], ['て', 'te', 'ta', 3, 1], ['と', 'to', 'ta', 4, 2],
  ['な', 'na', 'na', 0, 4], ['に', 'ni', 'na', 1, 3], ['ぬ', 'nu', 'na', 2, 2], ['ね', 'ne', 'na', 3, 2], ['の', 'no', 'na', 4, 1],
  ['は', 'ha', 'ha', 0, 3], ['ひ', 'hi', 'ha', 1, 1], ['ふ', 'fu', 'ha', 2, 4, [3]], ['へ', 'he', 'ha', 3, 1], ['ほ', 'ho', 'ha', 4, 4],
  ['ま', 'ma', 'ma', 0, 3], ['み', 'mi', 'ma', 1, 2], ['む', 'mu', 'ma', 2, 3], ['め', 'me', 'ma', 3, 2], ['も', 'mo', 'ma', 4, 3],
  ['や', 'ya', 'ya', 0, 3], ['ゆ', 'yu', 'ya', 2, 2], ['よ', 'yo', 'ya', 4, 2],
  ['ら', 'ra', 'ra', 0, 2], ['り', 'ri', 'ra', 1, 2, [1]], ['る', 'ru', 'ra', 2, 1], ['れ', 're', 'ra', 3, 2], ['ろ', 'ro', 'ra', 4, 1],
  ['わ', 'wa', 'wa', 0, 2], ['を', 'wo', 'wa', 4, 3],
  ['ん', 'n', 'n', 0, 1],
]

const KATAKANA: Entry[] = [
  ['ア', 'a', 'a', 0, 2], ['イ', 'i', 'a', 1, 2], ['ウ', 'u', 'a', 2, 3], ['エ', 'e', 'a', 3, 3], ['オ', 'o', 'a', 4, 3],
  ['カ', 'ka', 'ka', 0, 2], ['キ', 'ki', 'ka', 1, 3], ['ク', 'ku', 'ka', 2, 2], ['ケ', 'ke', 'ka', 3, 3], ['コ', 'ko', 'ka', 4, 2],
  ['サ', 'sa', 'sa', 0, 3], ['シ', 'shi', 'sa', 1, 3], ['ス', 'su', 'sa', 2, 2], ['セ', 'se', 'sa', 3, 2], ['ソ', 'so', 'sa', 4, 2],
  ['タ', 'ta', 'ta', 0, 3], ['チ', 'chi', 'ta', 1, 3], ['ツ', 'tsu', 'ta', 2, 3], ['テ', 'te', 'ta', 3, 3], ['ト', 'to', 'ta', 4, 2],
  ['ナ', 'na', 'na', 0, 2], ['ニ', 'ni', 'na', 1, 2], ['ヌ', 'nu', 'na', 2, 2], ['ネ', 'ne', 'na', 3, 4], ['ノ', 'no', 'na', 4, 1],
  ['ハ', 'ha', 'ha', 0, 2], ['ヒ', 'hi', 'ha', 1, 2], ['フ', 'fu', 'ha', 2, 1], ['ヘ', 'he', 'ha', 3, 1], ['ホ', 'ho', 'ha', 4, 4],
  ['マ', 'ma', 'ma', 0, 2], ['ミ', 'mi', 'ma', 1, 3], ['ム', 'mu', 'ma', 2, 2], ['メ', 'me', 'ma', 3, 2], ['モ', 'mo', 'ma', 4, 3],
  ['ヤ', 'ya', 'ya', 0, 2], ['ユ', 'yu', 'ya', 2, 2], ['ヨ', 'yo', 'ya', 4, 3],
  ['ラ', 'ra', 'ra', 0, 2], ['リ', 'ri', 'ra', 1, 2], ['ル', 'ru', 'ra', 2, 2], ['レ', 're', 'ra', 3, 1], ['ロ', 'ro', 'ra', 4, 3],
  ['ワ', 'wa', 'wa', 0, 2], ['ヲ', 'wo', 'wa', 4, 3],
  ['ン', 'n', 'n', 0, 2],
]

const toKana = (script: Script) => ([char, romaji, row, col, strokes, variants = []]: Entry): KanaChar =>
  ({ char, romaji, script, row, col, strokes, variants })

export const ALL_KANA: KanaChar[] = [...HIRAGANA.map(toKana('hiragana')), ...KATAKANA.map(toKana('katakana'))]

export const kanaByScript = (script: Script): KanaChar[] => ALL_KANA.filter(k => k.script === script)
export const findKana = (char: string): KanaChar | undefined => ALL_KANA.find(k => k.char === char)
```

- [ ] **Step 2: Write failing KanjiVG parser test**

`scripts/kanjivg.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseKanjiVG } from './kanjivg'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_03044" style="fill:none;stroke:#000000;stroke-width:3;">
<g id="kvg:03044" kvg:element="い">
	<path id="kvg:03044-s2" kvg:type="㇀" d="M70,30c5,10,10,20,12,35"/>
	<path id="kvg:03044-s1" kvg:type="㇑" d="M30,25c0,20,2,40,10,50"/>
	<path id="kvg:09999-s1" d="M0,0L1,1"/>
</g>
</g>
<g id="kvg:StrokeNumbers_03044" style="font-size:8;fill:#808080">
	<text transform="matrix(1 0 0 1 22.50 26.13)">1</text>
	<text transform="matrix(1 0 0 1 66.25 28.50)">2</text>
</g>
</svg>`

describe('parseKanjiVG', () => {
  it('returns stroke paths in stroke order, only for the given code point', () => {
    expect(parseKanjiVG(SVG, '03044').strokes).toEqual(['M30,25c0,20,2,40,10,50', 'M70,30c5,10,10,20,12,35'])
  })
  it('returns stroke number positions', () => {
    expect(parseKanjiVG(SVG, '03044').numbers).toEqual([[22.5, 26.13], [66.25, 28.5]])
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run scripts/kanjivg.test.ts`
Expected: FAIL — cannot resolve `./kanjivg`.

- [ ] **Step 4: Implement the parser and the data script**

`scripts/kanjivg.ts`:

```ts
/** Extracts stroke paths and number positions for one character from a KanjiVG SVG file. */
export function parseKanjiVG(svg: string, code: string): { strokes: string[]; numbers: [number, number][] } {
  const strokes: { n: number; d: string }[] = []
  for (const tag of svg.match(/<path\b[^>]*>/g) ?? []) {
    const id = /\bid="kvg:([0-9a-f]{5})-s(\d+)"/.exec(tag)
    const d = /\sd="([^"]+)"/.exec(tag)
    if (id && d && id[1] === code) strokes.push({ n: Number(id[2]), d: d[1] })
  }
  strokes.sort((a, b) => a.n - b.n)

  const numbers: [number, number][] = []
  for (const m of svg.matchAll(/<text[^>]*transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)"[^>]*>(\d+)<\/text>/g)) {
    numbers[Number(m[3]) - 1] = [Number(m[1]), Number(m[2])]
  }
  return { strokes: strokes.map(s => s.d), numbers }
}
```

`scripts/build-kana-data.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToPoints } from '../src/core/stroke/path'
import { ALL_KANA } from '../src/modules/kana/chars'
import type { KanaData } from '../src/modules/kana/data'
import { parseKanjiVG } from './kanjivg'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: npm run data:kana -- <path-to-kanjivg-svg-dir>')
  process.exit(1)
}

const out: Record<string, KanaData> = {}
const errors: string[] = []

for (const k of ALL_KANA) {
  const code = k.char.codePointAt(0)!.toString(16).padStart(5, '0')
  const file = join(dir, `${code}.svg`)
  if (!existsSync(file)) { errors.push(`${k.char} (${code}.svg): file missing`); continue }

  const { strokes, numbers } = parseKanjiVG(readFileSync(file, 'utf8'), code)
  if (strokes.length !== k.strokes) errors.push(`${k.char}: KanjiVG has ${strokes.length} strokes, table expects ${k.strokes}`)
  if (numbers.length !== strokes.length) errors.push(`${k.char}: ${numbers.length} stroke numbers for ${strokes.length} strokes`)
  strokes.forEach((d, i) => {
    try { pathToPoints(d) } catch (e) { errors.push(`${k.char} stroke ${i + 1}: ${(e as Error).message}`) }
  })
  out[k.char] = { strokes, numbers, acceptedCounts: [k.strokes, ...k.variants] }
}

if (errors.length) {
  console.error(`KanjiVG data check failed:\n${errors.join('\n')}`)
  process.exit(1)
}
writeFileSync('data/kanjivg/kana.json', JSON.stringify(out) + '\n')
console.log(`Wrote ${Object.keys(out).length} characters to data/kanjivg/kana.json`)
```

`src/modules/kana/data.ts`:

```ts
import raw from '../../../data/kanjivg/kana.json'
import type { CheckRef } from '../../core/stroke/check'
import { pathToPoints } from '../../core/stroke/path'
import type { Stroke } from '../../core/stroke/types'

export interface KanaData { strokes: string[]; numbers: [number, number][]; acceptedCounts: number[] }

const DATA = raw as unknown as Record<string, KanaData>
const strokeCache = new Map<string, Stroke[]>()

export function getKanaData(char: string): KanaData {
  const d = DATA[char]
  if (!d) throw new Error(`No stroke data for "${char}"`)
  return d
}

export function getRefStrokes(char: string): Stroke[] {
  let s = strokeCache.get(char)
  if (!s) { s = getKanaData(char).strokes.map(d => pathToPoints(d)); strokeCache.set(char, s) }
  return s
}

export const getCheckRef = (char: string): CheckRef =>
  ({ strokes: getRefStrokes(char), acceptedCounts: getKanaData(char).acceptedCounts })
```

- [ ] **Step 5: Run parser test**

Run: `npx vitest run scripts/kanjivg.test.ts`
Expected: PASS.

- [ ] **Step 6: Download KanjiVG (untrusted data → its own empty dir)**

```bash
DL="$TMPDIR/kanjivg-dl" && rm -rf "$DL" && mkdir -p "$DL"
gh release list -R KanjiVG/kanjivg --limit 3
gh release download -R KanjiVG/kanjivg --pattern '*-main.zip' -D "$DL"
cd "$DL" && unzip -q ./*-main.zip && ls "$DL" && ls "$DL/kanji" | head -3
```

Expected: a `kanji/` directory containing files like `03042.svg`. Note the release tag printed by `gh release list` (newest) — it goes into `data/kanjivg/README.md`. Use the session scratchpad directory instead of `$TMPDIR` if one is provided.

- [ ] **Step 7: Generate the data and resolve stroke-count mismatches**

```bash
cd /Users/d-aguswahyudi/Documents/projects/nohonggobenkyo
mkdir -p data/kanjivg
npm run data:kana -- "$DL/kanji"
```

Expected: `Wrote 92 characters to data/kanjivg/kana.json`.

If it fails with `KanjiVG has N strokes, table expects M`: open that SVG, count `kvg:XXXXX-sN` paths, and edit that character's entry in `chars.ts` so `strokes` equals the KanjiVG count; if the table's previous count is a legitimate handwritten form, move it into `variants` (e.g. if KanjiVG has そ as 2 strokes: `['そ', 'so', 'sa', 4, 2, [1]]`). Re-run until it succeeds. Record every change in the commit message body.

- [ ] **Step 8: Add data license and provenance**

`data/kanjivg/LICENSE` — copy the copyright comment block verbatim from the top of `$DL/kanji/03042.svg`, then append:

```
This directory contains data derived from KanjiVG (https://kanjivg.tagaini.net/),
copyright Ulrich Apel, licensed under the Creative Commons Attribution-Share
Alike 3.0 license: https://creativecommons.org/licenses/by-sa/3.0/

kana.json (stroke paths and stroke-number positions for 92 kana, extracted
unmodified from KanjiVG and re-encoded as JSON) is distributed under the same
license.
```

`data/kanjivg/README.md`:

```markdown
# KanjiVG stroke data

- Source: KanjiVG release `<TAG FROM STEP 6>` (`*-main.zip`) — https://github.com/KanjiVG/kanjivg/releases
- License: CC BY-SA 3.0 (see `LICENSE`)
- Regenerate: download and unzip the release, then `npm run data:kana -- <unzipped>/kanji`
```

- [ ] **Step 9: Write the data integrity test**

`src/modules/kana/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_KANA, kanaByScript } from './chars'
import { getCheckRef, getKanaData, getRefStrokes } from './data'

describe('kana table', () => {
  it('has 46 characters per script with unique chars', () => {
    expect(kanaByScript('hiragana')).toHaveLength(46)
    expect(kanaByScript('katakana')).toHaveLength(46)
    expect(new Set(ALL_KANA.map(k => k.char)).size).toBe(92)
  })
})

describe('kana.json', () => {
  it.each(ALL_KANA.map(k => [k.char, k] as const))('%s has matching, parseable strokes', (char, k) => {
    const d = getKanaData(char)
    expect(d.strokes).toHaveLength(k.strokes)
    expect(d.numbers).toHaveLength(k.strokes)
    expect(d.acceptedCounts[0]).toBe(k.strokes)
    expect(getRefStrokes(char).every(s => s.length >= 2)).toBe(true)
    expect(getCheckRef(char).strokes).toHaveLength(k.strokes)
  })

  it('throws for unknown characters', () => {
    expect(() => getKanaData('漢')).toThrow(/No stroke data/)
  })
})
```

- [ ] **Step 10: Run all unit tests**

Run: `npm test`
Expected: PASS, including 92 per-character cases.

- [ ] **Step 11: Commit**

```bash
git add src/modules/kana scripts data
git commit -m "feat: add kana table and KanjiVG stroke data pipeline"
```

---

### Task 4: Storage + settings

**Files:**
- Create: `src/core/storage.ts`, `src/core/settings.ts`, `src/test-utils/memory-storage.ts`
- Test: `src/core/storage.test.ts`, `src/core/settings.test.ts`

**Interfaces:**
- Consumes: `Level` (Task 1).
- Produces:
  - `interface Store { readonly persistent: boolean; read<T>(ns: string, version: number, fallback: T, migrate?: (old: unknown, oldVersion: unknown) => T | undefined): T; write<T>(ns: string, version: number, data: T): void }`
  - `createStore(backend?: Storage): Store`, `getAppStore(): Store` (lazy singleton over `localStorage`)
  - `interface Settings { level: Level }`, `DEFAULT_SETTINGS`, `loadSettings(store?)`, `saveSettings(s, store?)`, `useSettings(): [Settings, (patch: Partial<Settings>) => void]`
  - `class MemoryStorage implements Storage` (tests only)

- [ ] **Step 1: Write the test helper**

`src/test-utils/memory-storage.ts`:

```ts
export class MemoryStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
}
```

- [ ] **Step 2: Write failing storage tests**

`src/core/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../test-utils/memory-storage'
import { createStore } from './storage'

describe('createStore', () => {
  it('round-trips versioned data', () => {
    const backend = new MemoryStorage()
    const s = createStore(backend)
    s.write('kana', 1, { stars: { あ: 2 } })
    expect(s.persistent).toBe(true)
    expect(createStore(backend).read('kana', 1, null)).toEqual({ stars: { あ: 2 } })
  })

  it('returns the fallback when nothing is stored', () => {
    expect(createStore(new MemoryStorage()).read('kana', 1, 'empty')).toBe('empty')
  })

  it('resets to fallback on version mismatch without a migration', () => {
    const backend = new MemoryStorage()
    createStore(backend).write('kana', 1, { old: true })
    expect(createStore(backend).read('kana', 2, 'fresh')).toBe('fresh')
  })

  it('uses the migration when provided', () => {
    const backend = new MemoryStorage()
    createStore(backend).write('kana', 1, { n: 1 })
    const out = createStore(backend).read('kana', 2, { n: 0 }, (old, v) => (v === 1 ? { n: (old as { n: number }).n + 10 } : undefined))
    expect(out).toEqual({ n: 11 })
  })

  it('returns fallback for corrupt JSON', () => {
    const backend = new MemoryStorage()
    backend.setItem('nb:kana', '{not json')
    expect(createStore(backend).read('kana', 1, 'ok')).toBe('ok')
  })

  it('falls back to memory when storage throws on access', () => {
    const broken = new MemoryStorage()
    broken.setItem = () => { throw new Error('SecurityError') }
    const s = createStore(broken)
    expect(s.persistent).toBe(false)
    s.write('kana', 1, 'x')
    expect(s.read('kana', 1, 'fallback')).toBe('x')
  })

  it('keeps working in memory when a write fails mid-session', () => {
    const backend = new MemoryStorage()
    const s = createStore(backend)
    expect(s.persistent).toBe(true)
    backend.setItem = () => { throw new Error('QuotaExceededError') }
    s.write('kana', 1, 'after-failure')
    expect(s.persistent).toBe(false)
    expect(s.read('kana', 1, 'fallback')).toBe('after-failure')
  })

  it('works with no backend at all', () => {
    const s = createStore(undefined)
    expect(s.persistent).toBe(false)
    s.write('a', 1, 5)
    expect(s.read('a', 1, 0)).toBe(5)
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/core/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 4: Implement storage**

`src/core/storage.ts`:

```ts
export interface Store {
  readonly persistent: boolean
  read<T>(ns: string, version: number, fallback: T, migrate?: (old: unknown, oldVersion: unknown) => T | undefined): T
  write<T>(ns: string, version: number, data: T): void
}

const PREFIX = 'nb:'

function probe(s: Storage): boolean {
  try { s.setItem(`${PREFIX}__probe`, '1'); s.removeItem(`${PREFIX}__probe`); return true } catch { return false }
}

/** Versioned, namespaced key-value store. Falls back to memory when `backend` is missing or throws. */
export function createStore(backend: Storage | undefined): Store {
  const memory = new Map<string, string>()
  let persistent = !!backend && probe(backend)

  const getRaw = (k: string): string | null => {
    if (memory.has(k)) return memory.get(k)!
    if (persistent) { try { return backend!.getItem(k) } catch { persistent = false } }
    return null
  }
  const setRaw = (k: string, v: string): void => {
    memory.set(k, v)
    if (persistent) { try { backend!.setItem(k, v) } catch { persistent = false } }
  }

  return {
    get persistent() { return persistent },
    read(ns, version, fallback, migrate) {
      const raw = getRaw(PREFIX + ns)
      if (raw == null) return fallback
      try {
        const parsed = JSON.parse(raw) as { v?: unknown; data?: unknown } | null
        if (parsed && parsed.v === version) return parsed.data as typeof fallback
        return migrate?.(parsed?.data, parsed?.v) ?? fallback
      } catch {
        return fallback
      }
    },
    write(ns, version, data) {
      setRaw(PREFIX + ns, JSON.stringify({ v: version, data }))
    },
  }
}

let appStore: Store | undefined

/** The app-wide store over `localStorage`, created on first use. */
export function getAppStore(): Store {
  if (!appStore) {
    let ls: Storage | undefined
    try { ls = globalThis.localStorage } catch { ls = undefined }
    appStore = createStore(ls)
  }
  return appStore
}
```

- [ ] **Step 5: Run storage tests**

Run: `npx vitest run src/core/storage.test.ts`
Expected: PASS.

- [ ] **Step 6: Write failing settings test**

`src/core/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../test-utils/memory-storage'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'
import { createStore } from './storage'

describe('settings', () => {
  it('defaults to normal', () => {
    expect(loadSettings(createStore(new MemoryStorage()))).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.level).toBe('normal')
  })
  it('persists the level', () => {
    const store = createStore(new MemoryStorage())
    saveSettings({ level: 'strict' }, store)
    expect(loadSettings(store).level).toBe('strict')
  })
})
```

- [ ] **Step 7: Implement settings**

`src/core/settings.ts`:

```ts
import { useState } from 'preact/hooks'
import { getAppStore, type Store } from './storage'
import type { Level } from './stroke/types'

export interface Settings { level: Level }
export const DEFAULT_SETTINGS: Settings = { level: 'normal' }
const NS = 'settings'
const VERSION = 1

export const loadSettings = (store: Store = getAppStore()): Settings =>
  ({ ...DEFAULT_SETTINGS, ...store.read<Partial<Settings>>(NS, VERSION, {}) })

export const saveSettings = (s: Settings, store: Store = getAppStore()): void => store.write(NS, VERSION, s)

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(() => loadSettings())
  const update = (patch: Partial<Settings>) => {
    const next = { ...loadSettings(), ...patch }
    saveSettings(next)
    setSettings(next)
  }
  return [settings, update]
}
```

- [ ] **Step 8: Run all unit tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/storage.ts src/core/storage.test.ts src/core/settings.ts src/core/settings.test.ts src/test-utils
git commit -m "feat: add versioned storage with memory fallback and settings"
```

---

### Task 5: Router + module contract

**Files:**
- Create: `src/core/router.ts`, `src/core/module.ts`
- Test: `src/core/router.test.ts`, `src/core/module.test.ts`

**Interfaces:**
- Produces:
  - `parseHash(hash: string): string[]`, `href(...segments: string[]): string`, `navigate(...segments: string[]): void`, `matchRoute(pattern: string, segments: string[]): Record<string, string> | null`, `useHashSegments(): string[]`
  - `interface Route { path: string; render: (params: Record<string, string>) => ComponentChildren }`
  - `interface LearningModule { id: string; title: string; icon: string; routes: Route[]; progressKey: string }`
  - `resolveModuleRoute(modules: LearningModule[], segments: string[]): { module: LearningModule; route: Route; params: Record<string, string> } | null`

- [ ] **Step 1: Write failing tests**

`src/core/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { href, matchRoute, parseHash } from './router'

describe('parseHash', () => {
  it('splits a hash into segments', () => {
    expect(parseHash('#/kana/hiragana')).toEqual(['kana', 'hiragana'])
    expect(parseHash('')).toEqual([])
    expect(parseHash('#/')).toEqual([])
  })
  it('decodes percent-encoded kana and accepts raw kana', () => {
    expect(parseHash('#/kana/hiragana/char/%E3%81%82')).toEqual(['kana', 'hiragana', 'char', 'あ'])
    expect(parseHash('#/kana/hiragana/char/あ')).toEqual(['kana', 'hiragana', 'char', 'あ'])
  })
  it('keeps malformed escapes as-is', () => {
    expect(parseHash('#/x/%E3')).toEqual(['x', '%E3'])
  })
})

describe('href', () => {
  it('encodes segments and round-trips through parseHash', () => {
    const h = href('kana', 'hiragana', 'char', 'あ')
    expect(h).toBe('#/kana/hiragana/char/%E3%81%82')
    expect(parseHash(h)).toEqual(['kana', 'hiragana', 'char', 'あ'])
    expect(href()).toBe('#/')
  })
})

describe('matchRoute', () => {
  it('matches literals and params', () => {
    expect(matchRoute(':script/char/:char', ['hiragana', 'char', 'あ'])).toEqual({ script: 'hiragana', char: 'あ' })
    expect(matchRoute('', [])).toEqual({})
  })
  it('rejects different lengths or literals', () => {
    expect(matchRoute(':script/grid', ['hiragana'])).toBeNull()
    expect(matchRoute(':script/grid', ['hiragana', 'path'])).toBeNull()
  })
})
```

`src/core/module.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveModuleRoute, type LearningModule } from './module'

const mod: LearningModule = {
  id: 'kana', title: 'Kana', icon: 'あ', progressKey: 'kana',
  routes: [
    { path: '', render: () => 'home' },
    { path: ':script', render: p => `script:${p.script}` },
  ],
}

describe('resolveModuleRoute', () => {
  it('finds the module and route', () => {
    const r = resolveModuleRoute([mod], ['kana', 'hiragana'])
    expect(r?.module.id).toBe('kana')
    expect(r?.params).toEqual({ script: 'hiragana' })
    expect(resolveModuleRoute([mod], ['kana'])?.route.path).toBe('')
  })
  it('returns null for unknown modules or paths', () => {
    expect(resolveModuleRoute([mod], ['grammar'])).toBeNull()
    expect(resolveModuleRoute([mod], ['kana', 'a', 'b', 'c'])).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/router.test.ts src/core/module.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/core/router.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

const decode = (s: string): string => { try { return decodeURIComponent(s) } catch { return s } }

export const parseHash = (hash: string): string[] =>
  hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode)

export const href = (...segments: string[]): string => '#/' + segments.map(encodeURIComponent).join('/')

export function navigate(...segments: string[]): void {
  location.hash = href(...segments)
}

export function matchRoute(pattern: string, segments: string[]): Record<string, string> | null {
  const parts = pattern.split('/').filter(Boolean)
  if (parts.length !== segments.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(':')) params[parts[i].slice(1)] = segments[i]
    else if (parts[i] !== segments[i]) return null
  }
  return params
}

export function useHashSegments(): string[] {
  const [segments, setSegments] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => { setSegments(parseHash(location.hash)); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return segments
}
```

`src/core/module.ts`:

```ts
import type { ComponentChildren } from 'preact'
import { matchRoute } from './router'

export interface Route {
  /** Path under `#/<module id>/`, e.g. ":script/char/:char". "" is the module's home. */
  path: string
  render: (params: Record<string, string>) => ComponentChildren
}

export interface LearningModule {
  id: string
  title: string
  icon: string
  routes: Route[]
  /** Storage namespace for this module's progress. */
  progressKey: string
}

export interface ResolvedRoute { module: LearningModule; route: Route; params: Record<string, string> }

export function resolveModuleRoute(modules: LearningModule[], segments: string[]): ResolvedRoute | null {
  const [id, ...rest] = segments
  const module = modules.find(m => m.id === id)
  if (!module) return null
  for (const route of module.routes) {
    const params = matchRoute(route.path, rest)
    if (params) return { module, route, params }
  }
  return null
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/router.ts src/core/router.test.ts src/core/module.ts src/core/module.test.ts
git commit -m "feat: add hash router and learning module contract"
```

---

### Task 6: App shell + e2e harness

**Files:**
- Create: `src/shell/App.tsx`, `src/shell/Home.tsx`, `src/shell/Settings.tsx`, `src/shell/About.tsx`, `src/shell/Banner.tsx`, `src/shell/styles.css`, `src/core/NotFound.tsx`, `src/modules/kana/index.tsx`, `src/modules/kana/KanaHome.tsx`
- Modify: `src/main.tsx`
- Create: `playwright.config.ts`, `e2e/helpers.ts`
- Test: `e2e/shell.spec.ts`

**Interfaces:**
- Consumes: `useHashSegments`, `href`, `resolveModuleRoute`, `LearningModule` (Task 5); `useSettings`, `getAppStore` (Task 4).
- Produces: `App({ modules })`, `NotFound()`, `kanaModule: LearningModule`, `appUrl(hash?: string): string` (e2e), CSS tokens `--ink --guide --good --bad --warn --ref --faint --accent`.

- [ ] **Step 1: Write the shell components**

`src/core/NotFound.tsx`:

```tsx
import { href } from './router'

export function NotFound() {
  return (
    <section class="not-found">
      <p>🤔 Page not found</p>
      <a class="button" href={href()}>🏠 Home</a>
    </section>
  )
}
```

`src/shell/Banner.tsx`:

```tsx
import { getAppStore } from '../core/storage'

export function Banner() {
  if (getAppStore().persistent) return null
  return <div class="banner" role="status">⚠️ Progress won't be saved on this device</div>
}
```

`src/shell/Home.tsx`:

```tsx
import type { LearningModule } from '../core/module'
import { href } from '../core/router'

export function Home({ modules }: { modules: LearningModule[] }) {
  return (
    <section class="home">
      <h1>📚 Nihongo Benkyō</h1>
      <div class="tiles">
        {modules.map(m => (
          <a key={m.id} class="tile" href={href(m.id)}>
            <span class="tile-icon" lang="ja">{m.icon}</span>
            <span>{m.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
```

`src/shell/Settings.tsx`:

```tsx
import { useSettings } from '../core/settings'
import type { Level } from '../core/stroke/types'

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'easy', label: '🐣 Easy', hint: 'Order and direction mistakes are only hints' },
  { id: 'normal', label: '🙂 Normal', hint: 'Order and direction must be right' },
  { id: 'strict', label: '🎓 Strict', hint: 'Tight shapes, textbook stroke counts only' },
]

export function Settings() {
  const [settings, update] = useSettings()
  return (
    <section class="settings">
      <h1>⚙️ Settings</h1>
      <fieldset>
        <legend>Checking level</legend>
        {LEVELS.map(l => (
          <label key={l.id} class="radio-card">
            <input type="radio" name="level" value={l.id} checked={settings.level === l.id} onChange={() => update({ level: l.id })} />
            <span>{l.label}</span>
            <small>{l.hint}</small>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
```

`src/shell/About.tsx`:

```tsx
export function About() {
  return (
    <section class="about">
      <h1>ℹ️ About</h1>
      <p>Nihongo Benkyō helps you learn to write Japanese, one stroke at a time.</p>
      <h2>Credits</h2>
      <p>
        Stroke order data from <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a>,
        © Ulrich Apel, licensed under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>.
      </p>
      <p>App code: MIT License.</p>
    </section>
  )
}
```

`src/shell/App.tsx`:

```tsx
import type { LearningModule } from '../core/module'
import { resolveModuleRoute } from '../core/module'
import { NotFound } from '../core/NotFound'
import { href, useHashSegments } from '../core/router'
import { About } from './About'
import { Banner } from './Banner'
import { Home } from './Home'
import { Settings } from './Settings'

function renderRoute(modules: LearningModule[], segments: string[]) {
  if (segments.length === 0) return <Home modules={modules} />
  if (segments.length === 1 && segments[0] === 'settings') return <Settings />
  if (segments.length === 1 && segments[0] === 'about') return <About />
  const resolved = resolveModuleRoute(modules, segments)
  return resolved ? resolved.route.render(resolved.params) : <NotFound />
}

export function App({ modules }: { modules: LearningModule[] }) {
  const segments = useHashSegments()
  return (
    <div class="app">
      <nav class="topbar">
        <a href={href()} aria-label="Home">🏠</a>
        <span class="topbar-right">
          <a href={href('settings')} aria-label="Settings">⚙️</a>
          <a href={href('about')} aria-label="About">ℹ️</a>
        </span>
      </nav>
      <Banner />
      <main>{renderRoute(modules, segments)}</main>
    </div>
  )
}
```

`src/modules/kana/KanaHome.tsx`:

```tsx
import { href } from '../../core/router'

export function KanaHome() {
  return (
    <section class="kana-home">
      <h1>✍️ Kana Writing</h1>
      <div class="tiles">
        <a class="tile" href={href('kana', 'hiragana')}><span class="tile-icon" lang="ja">あ</span><span>Hiragana</span></a>
        <a class="tile" href={href('kana', 'katakana')}><span class="tile-icon" lang="ja">ア</span><span>Katakana</span></a>
      </div>
    </section>
  )
}
```

`src/modules/kana/index.tsx`:

```tsx
import type { LearningModule } from '../../core/module'
import { KanaHome } from './KanaHome'

export const kanaModule: LearningModule = {
  id: 'kana',
  title: 'Kana Writing',
  icon: 'あ',
  progressKey: 'kana',
  routes: [{ path: '', render: () => <KanaHome /> }],
}
```

`src/main.tsx`:

```tsx
import { render } from 'preact'
import { kanaModule } from './modules/kana'
import { App } from './shell/App'
import './shell/styles.css'

render(<App modules={[kanaModule]} />, document.getElementById('app')!)
```

- [ ] **Step 2: Write the stylesheet**

`src/shell/styles.css`:

```css
:root {
  --bg: #fffaf3;
  --surface: #ffffff;
  --text: #2b2b2b;
  --muted: #6b6b6b;
  --accent: #ff7043;
  --accent-text: #ffffff;
  --ink: #1f3a93;
  --guide: #e0c9b6;
  --ref: #2b2b2b;
  --faint: #e6ddd3;
  --good: #2e9d4f;
  --bad: #d64545;
  --warn: #d99a00;
  --radius: 16px;
  font-family: "Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1d1b19; --surface: #2a2724; --text: #f2ede8; --muted: #b3aaa1;
    --ink: #8fb4ff; --guide: #5a4d42; --ref: #f2ede8; --faint: #3d3732;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); }
a { color: inherit; }
.app { max-width: 960px; margin: 0 auto; padding: env(safe-area-inset-top) 16px 32px; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
.topbar a { font-size: 1.6rem; text-decoration: none; padding: 8px; }
.topbar-right { display: flex; gap: 8px; }
.banner { background: var(--warn); color: #000; padding: 8px 12px; border-radius: var(--radius); margin-bottom: 12px; }
button, .button {
  font: inherit; font-size: 1.1rem; min-height: 48px; min-width: 48px; padding: 8px 16px;
  border-radius: var(--radius); border: 2px solid var(--faint); background: var(--surface); color: var(--text);
  cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
button:disabled { opacity: 0.4; cursor: default; }
.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.tile {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 12px;
  background: var(--surface); border-radius: var(--radius); text-decoration: none; font-size: 1.2rem;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}
.tile-icon { font-size: 3.5rem; }
fieldset { border: none; padding: 0; display: grid; gap: 12px; }
legend { font-weight: bold; margin-bottom: 8px; }
.radio-card { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; align-items: center; padding: 12px; background: var(--surface); border-radius: var(--radius); }
.radio-card input { width: 24px; height: 24px; }
.radio-card small { grid-column: 2; color: var(--muted); }
.not-found { text-align: center; padding: 48px 0; font-size: 1.3rem; }
```

- [ ] **Step 3: Configure Playwright**

```bash
npx playwright install webkit
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'webkit', use: { ...devices['iPad (gen 7) landscape'], browserName: 'webkit' } }],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: false },
})
```

If `devices['iPad (gen 7) landscape']` is undefined in the installed Playwright, use `{ browserName: 'webkit', viewport: { width: 1080, height: 810 }, hasTouch: true }`.

`e2e/helpers.ts`:

```ts
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

/** URL for the app served by `vite preview` at the given hash route. */
export const appUrl = (hash = ''): string => `/#/${hash}`
/** file:// URL of the built single-file app. */
export const fileUrl = (hash = ''): string => `${pathToFileURL(resolve('dist/index.html')).href}#/${hash}`
```

- [ ] **Step 4: Write the e2e tests**

`e2e/shell.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { appUrl, fileUrl } from './helpers'

test('dist/index.html is self-contained and carries both license notices', () => {
  const html = readFileSync('dist/index.html', 'utf8')
  expect(html).not.toMatch(/<script[^>]+src=/)
  expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/)
  expect(html).toContain('CC BY-SA 3.0')
  expect(html).toContain('MIT')
})

test('home shows the Kana Writing tile', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(appUrl())
  await expect(page.getByRole('link', { name: /Kana Writing/ })).toBeVisible()
  await expect(page.locator('.banner')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('opens from file:// as a single file', async ({ page }) => {
  await page.goto(fileUrl())
  await expect(page.getByRole('link', { name: /Kana Writing/ })).toBeVisible()
})

test('settings level persists across reloads', async ({ page }) => {
  await page.goto(appUrl('settings'))
  await expect(page.getByLabel(/Normal/)).toBeChecked()
  await page.getByLabel(/Strict/).check()
  await page.reload()
  await expect(page.getByLabel(/Strict/)).toBeChecked()
})

test('unknown routes show not found', async ({ page }) => {
  await page.goto(appUrl('nope'))
  await expect(page.getByText('Page not found')).toBeVisible()
})
```

- [ ] **Step 5: Run unit + e2e**

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell, settings, about and e2e harness"
```

---

### Task 7: Ink input + WritingBox

**Files:**
- Create: `src/core/ink/pointer.ts`, `src/core/ink/recorder.ts`, `src/core/ink/Guide.tsx`, `src/core/ink/WritingBox.tsx`
- Modify: `src/shell/Settings.tsx` (stylus reset), `src/shell/styles.css` (append)
- Test: `src/core/ink/pointer.test.ts`, `src/core/ink/recorder.test.ts`

**Interfaces:**
- Consumes: `Point`, `Stroke` (Task 1).
- Produces:
  - `acceptPointer(pointerType: string): boolean`, `resetPenDetection(): void`, `isPenMode(): boolean`
  - `VIEW = 109`, `interface RectLike { left; top; width; height }`, `toViewBox(clientX, clientY, rect: RectLike): Point`
  - `interface StrokeRecorder { down(id, p): boolean; move(id, ps: Point[]): boolean; up(id): Stroke | null; cancel(id): void; current(): Stroke }`, `createStrokeRecorder(): StrokeRecorder`
  - `Guide()` SVG group; `WritingBox(props: { strokes: Stroke[]; strokeColors?: (string | undefined)[]; onStroke: (s: Stroke) => void; disabled?: boolean; children?: ComponentChildren })` — root has `data-testid="writing-box"`; `children` are SVG elements in 0..109 coordinates drawn under the ink.

- [ ] **Step 1: Write failing tests**

`src/core/ink/pointer.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { acceptPointer, isPenMode, resetPenDetection } from './pointer'

describe('palm rejection', () => {
  beforeEach(() => resetPenDetection())

  it('accepts touch and mouse before any pen is seen', () => {
    expect(acceptPointer('touch')).toBe(true)
    expect(acceptPointer('mouse')).toBe(true)
    expect(isPenMode()).toBe(false)
  })

  it('ignores touch after a pen is seen, but keeps pen and mouse', () => {
    expect(acceptPointer('pen')).toBe(true)
    expect(isPenMode()).toBe(true)
    expect(acceptPointer('touch')).toBe(false)
    expect(acceptPointer('mouse')).toBe(true)
  })

  it('reset re-enables touch', () => {
    acceptPointer('pen')
    resetPenDetection()
    expect(acceptPointer('touch')).toBe(true)
  })
})
```

`src/core/ink/recorder.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/ink`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement pointer + recorder**

`src/core/ink/pointer.ts`:

```ts
let penSeen = false

/** Once a pen (Apple Pencil) is used, finger touches are ignored so a resting palm doesn't draw. */
export function acceptPointer(pointerType: string): boolean {
  if (pointerType === 'pen') { penSeen = true; return true }
  return !(penSeen && pointerType === 'touch')
}

export function resetPenDetection(): void { penSeen = false }
export const isPenMode = (): boolean => penSeen
```

`src/core/ink/recorder.ts`:

```ts
import type { Point, Stroke } from '../stroke/types'

export const VIEW = 109

export interface RectLike { left: number; top: number; width: number; height: number }

export const toViewBox = (clientX: number, clientY: number, rect: RectLike): Point => ({
  x: ((clientX - rect.left) / rect.width) * VIEW,
  y: ((clientY - rect.top) / rect.height) * VIEW,
})

export interface StrokeRecorder {
  /** Starts a stroke; returns false if another pointer is already drawing. */
  down(id: number, p: Point): boolean
  move(id: number, ps: Point[]): boolean
  /** Ends the stroke for this pointer and returns it, or null if this pointer wasn't drawing. */
  up(id: number): Stroke | null
  cancel(id: number): void
  current(): Stroke
}

export function createStrokeRecorder(): StrokeRecorder {
  let active: number | null = null
  let pts: Point[] = []
  return {
    down(id, p) { if (active !== null) return false; active = id; pts = [p]; return true },
    move(id, ps) { if (id !== active) return false; pts.push(...ps); return true },
    up(id) { if (id !== active) return null; active = null; const s = pts; pts = []; return s },
    cancel(id) { if (id !== active) return; active = null; pts = [] },
    current: () => pts,
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/core/ink`
Expected: PASS.

- [ ] **Step 5: Implement Guide and WritingBox**

`src/core/ink/Guide.tsx`:

```tsx
/** The dotted 田 practice-sheet guide, in 0..109 viewBox units. */
export function Guide() {
  return (
    <g class="guide">
      <rect x="1" y="1" width="107" height="107" rx="4" />
      <line class="guide-dash" x1="54.5" y1="2" x2="54.5" y2="107" />
      <line class="guide-dash" x1="2" y1="54.5" x2="107" y2="54.5" />
    </g>
  )
}
```

`src/core/ink/WritingBox.tsx`:

```tsx
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
        if (!rec.down(e.pointerId, point(e))) return
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
```

- [ ] **Step 6: Append CSS**

Append to `src/shell/styles.css`:

```css
.writing-box {
  position: relative; width: min(90vw, 56vh, 480px); aspect-ratio: 1; margin: 0 auto;
  background: var(--surface); border-radius: var(--radius); box-shadow: 0 2px 10px rgb(0 0 0 / 0.1);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.writing-box.disabled { opacity: 0.85; }
.wb-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.wb-live { color: var(--ink); }
.guide { fill: none; stroke: var(--guide); stroke-width: 0.6; }
.guide-dash { stroke-dasharray: 2 2; }
.ink { fill: none; stroke: var(--ink); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
```

- [ ] **Step 7: Add the stylus reset to Settings**

In `src/shell/Settings.tsx`, add the import and a second fieldset after the level fieldset:

```tsx
import { resetPenDetection } from '../core/ink/pointer'
```

```tsx
      <fieldset>
        <legend>Stylus</legend>
        <p>✏️ When an Apple Pencil is used, finger touches in the writing box are ignored.</p>
        <button onClick={() => { resetPenDetection(); alert('Finger drawing is back on.') }}>☝️ Allow finger drawing again</button>
      </fieldset>
```

- [ ] **Step 8: Verify build + tests**

Run: `npm test && npm run build`
Expected: PASS; build succeeds (WritingBox is exercised end-to-end in Task 9).

- [ ] **Step 9: Commit**

```bash
git add src/core/ink src/shell
git commit -m "feat: add writing box with stroke recorder and palm rejection"
```

---

### Task 8: Character screen + Watch step + pronunciation

**Files:**
- Create: `src/core/speech.ts`, `src/core/SpeakButton.tsx`, `src/modules/kana/CharacterScreen.tsx`, `src/modules/kana/WatchStep.tsx`
- Modify: `src/modules/kana/index.tsx` (route), `src/shell/styles.css` (append)
- Test: `src/core/speech.test.ts`, `e2e/character.spec.ts`

**Interfaces:**
- Consumes: `getKanaData` (Task 3), `findKana` (Task 3), `Guide` (Task 7), `NotFound` (Task 6).
- Produces:
  - `findJapaneseVoice<T extends { lang: string }>(voices: readonly T[]): T | undefined`, `useJapaneseVoice(): boolean`, `speak(text: string): void`
  - `SpeakButton({ text })` — renders nothing until a Japanese voice is confirmed
  - `type StepId = 'watch' | 'trace' | 'copy' | 'test'`, `CharacterScreen({ char, footer? })` — `.char-big` shows the char; step buttons are `role="tab"`
  - `WatchStep({ char })` — `data-testid="watch-progress"` text is `"k / n"` or `"✅ Done"`
  - Route `kana/:script/char/:char`

- [ ] **Step 1: Write failing speech test**

`src/core/speech.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { findJapaneseVoice } from './speech'

describe('findJapaneseVoice', () => {
  it('finds ja-JP and Android-style ja_JP voices', () => {
    expect(findJapaneseVoice([{ lang: 'en-US' }, { lang: 'ja-JP' }])?.lang).toBe('ja-JP')
    expect(findJapaneseVoice([{ lang: 'ja_JP' }])?.lang).toBe('ja_JP')
  })
  it('returns undefined when there is no Japanese voice', () => {
    expect(findJapaneseVoice([{ lang: 'en-US' }, { lang: 'id-ID' }])).toBeUndefined()
    expect(findJapaneseVoice([])).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/speech.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement speech + SpeakButton**

`src/core/speech.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

export const findJapaneseVoice = <T extends { lang: string }>(voices: readonly T[]): T | undefined =>
  voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))

const synth = (): SpeechSynthesis | undefined =>
  typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis

/** True once a Japanese voice is available. Voices load asynchronously on Safari, so this re-checks on `voiceschanged`. */
export function useJapaneseVoice(): boolean {
  const [has, setHas] = useState(() => !!findJapaneseVoice(synth()?.getVoices() ?? []))
  useEffect(() => {
    const s = synth()
    if (!s) return
    const check = () => setHas(!!findJapaneseVoice(s.getVoices()))
    s.addEventListener('voiceschanged', check)
    check()
    return () => s.removeEventListener('voiceschanged', check)
  }, [])
  return has
}

/** Speaks `text` with a Japanese voice. Must be called from a user gesture (iOS requirement). */
export function speak(text: string): void {
  const s = synth()
  const voice = s && findJapaneseVoice(s.getVoices())
  if (!s || !voice) return
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.8
  s.cancel()
  s.speak(u)
}
```

`src/core/SpeakButton.tsx`:

```tsx
import { speak, useJapaneseVoice } from './speech'

export function SpeakButton({ text }: { text: string }) {
  const hasVoice = useJapaneseVoice()
  if (!hasVoice) return null
  return <button class="speak" aria-label="Play pronunciation" onClick={() => speak(text)}>🔊</button>
}
```

- [ ] **Step 4: Implement WatchStep and CharacterScreen**

`src/modules/kana/WatchStep.tsx`:

```tsx
import { useState } from 'preact/hooks'
import { Guide } from '../../core/ink/Guide'
import { getKanaData } from './data'

export function WatchStep({ char }: { char: string }) {
  const data = getKanaData(char)
  const n = data.strokes.length
  const [k, setK] = useState(1) // 1..n: animating stroke k; n + 1: final form
  const done = k > n

  return (
    <div class="step watch">
      <div class="writing-box static" data-testid="watch-box">
        <svg class="wb-layer" viewBox="0 0 109 109" aria-label={`${char} stroke ${Math.min(k, n)} of ${n}`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
            </marker>
          </defs>
          <Guide />
          {data.strokes.map((d, i) => {
            if (done || i < k - 1) return <path key={i} d={d} class="ref-stroke" />
            if (i === k - 1) return <path key={`${i}-${k}`} d={d} class="ref-stroke current animate" pathLength={1} />
            return <path key={i} d={d} class="ref-stroke upcoming" />
          })}
          {!done && data.numbers.slice(0, k).map(([x, y], i) => (
            <text key={i} x={x} y={y} class={`stroke-num${i === k - 1 ? ' current' : ''}`}>{i + 1}</text>
          ))}
        </svg>
      </div>
      <div class="controls">
        <button aria-label="Previous stroke" disabled={k === 1} onClick={() => setK(k - 1)}>◀</button>
        <span class="watch-progress" data-testid="watch-progress">{done ? '✅ Done' : `${k} / ${n}`}</span>
        <button aria-label="Next stroke" disabled={done} onClick={() => setK(k + 1)}>▶</button>
        <button aria-label="Replay" onClick={() => setK(1)}>🔁</button>
      </div>
    </div>
  )
}
```

`src/modules/kana/CharacterScreen.tsx`:

```tsx
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { NotFound } from '../../core/NotFound'
import { SpeakButton } from '../../core/SpeakButton'
import { findKana } from './chars'
import { WatchStep } from './WatchStep'

export type StepId = 'watch' | 'trace' | 'copy' | 'test'

const STEPS: { id: StepId; icon: string; label: string }[] = [
  { id: 'watch', icon: '👀', label: 'Watch' },
]

/** Parent routes must pass `key={char}` so step state resets per character. */
export function CharacterScreen({ char, footer }: { char: string; footer?: ComponentChildren }) {
  const kana = findKana(char)
  const [step, setStep] = useState<StepId>('watch')
  if (!kana) return <NotFound />

  return (
    <section class="char-screen">
      <header class="char-head">
        <span class="char-big" lang="ja">{char}</span>
        <span class="romaji">{kana.romaji}</span>
        <SpeakButton text={char} />
      </header>
      <nav class="steps" role="tablist">
        {STEPS.map(s => (
          <button key={s.id} role="tab" aria-selected={step === s.id} onClick={() => setStep(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </nav>
      {step === 'watch' && <WatchStep char={char} />}
      {footer && <div class="char-footer">{footer}</div>}
    </section>
  )
}
```

- [ ] **Step 5: Register the route**

In `src/modules/kana/index.tsx`, replace the file with:

```tsx
import type { ComponentChildren } from 'preact'
import type { LearningModule } from '../../core/module'
import { NotFound } from '../../core/NotFound'
import { CharacterScreen } from './CharacterScreen'
import type { Script } from './chars'
import { KanaHome } from './KanaHome'

const asScript = (s: string): Script | null => (s === 'hiragana' || s === 'katakana' ? s : null)
const withScript = (render: (script: Script, p: Record<string, string>) => ComponentChildren) =>
  (p: Record<string, string>) => {
    const script = asScript(p.script)
    return script ? render(script, p) : <NotFound />
  }

export const kanaModule: LearningModule = {
  id: 'kana',
  title: 'Kana Writing',
  icon: 'あ',
  progressKey: 'kana',
  routes: [
    { path: '', render: () => <KanaHome /> },
    { path: ':script/char/:char', render: withScript((_, p) => <CharacterScreen key={p.char} char={p.char} />) },
  ],
}
```

- [ ] **Step 6: Append CSS**

Append to `src/shell/styles.css`:

```css
.char-screen { display: grid; gap: 16px; justify-items: center; }
.char-head { display: flex; align-items: center; gap: 16px; }
.char-big { font-size: 4rem; line-height: 1; }
.romaji { font-size: 1.5rem; color: var(--muted); }
.steps { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.steps [aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.step { display: grid; gap: 12px; justify-items: center; width: 100%; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }
.watch-progress { min-width: 80px; text-align: center; font-size: 1.2rem; }
.ref-stroke { fill: none; stroke: var(--ref); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.ref-stroke.upcoming { stroke: var(--faint); }
.ref-stroke.current { stroke: var(--accent); marker-end: url(#arrow); }
.ref-stroke.animate { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-stroke 0.9s ease forwards; }
.arrow-head { fill: var(--accent); }
.stroke-num { font-size: 8px; fill: var(--muted); }
.stroke-num.current { fill: var(--accent); font-weight: bold; }
@keyframes draw-stroke { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .ref-stroke.animate { animation: none; stroke-dashoffset: 0; } }
.char-footer { display: flex; gap: 12px; align-items: center; }
```

- [ ] **Step 7: Write the e2e test**

`e2e/character.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { appUrl } from './helpers'

test('watch steps through あ stroke by stroke', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await expect(page.locator('.char-big')).toHaveText('あ')
  await expect(page.locator('.romaji').first()).toHaveText('a')
  const progress = page.getByTestId('watch-progress')
  await expect(progress).toHaveText('1 / 3')
  const next = page.getByRole('button', { name: 'Next stroke' })
  await next.click()
  await expect(progress).toHaveText('2 / 3')
  await next.click()
  await next.click()
  await expect(progress).toHaveText('✅ Done')
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(progress).toHaveText('1 / 3')
})

test('percent-encoded character URLs work', async ({ page }) => {
  await page.goto(appUrl('kana/katakana/char/%E3%82%A2'))
  await expect(page.locator('.char-big')).toHaveText('ア')
})

test('unknown character or script shows not found', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/漢'))
  await expect(page.getByText('Page not found')).toBeVisible()
  await page.goto(appUrl('kana/klingon/char/あ'))
  await expect(page.getByText('Page not found')).toBeVisible()
})
```

- [ ] **Step 8: Run unit + e2e**

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add character screen with stroke-by-stroke watch and pronunciation"
```

---

### Task 9: Trace step + progress + messages

**Files:**
- Create: `src/modules/kana/progress.ts`, `src/modules/kana/messages.ts`, `src/modules/kana/TraceStep.tsx`
- Modify: `src/modules/kana/CharacterScreen.tsx`, `src/modules/kana/index.tsx` (`progressKey`), `src/shell/styles.css` (append)
- Create: e2e helpers in `e2e/helpers.ts` (append)
- Test: `src/modules/kana/progress.test.ts`, `src/modules/kana/messages.test.ts`, `e2e/character.spec.ts` (append)

**Interfaces:**
- Consumes: `checkStroke`, `isTap`, `CharacterResult`, `Issue` (Task 2); `getKanaData`, `getRefStrokes` (Task 3); `getAppStore`, `Store`, `useSettings` (Task 4); `WritingBox` (Task 7).
- Produces:
  - `interface KanaProgress { stars: Record<string, number>; passed: string[] }`, `PROGRESS_NS = 'kana'`, `PROGRESS_VERSION = 1`, `emptyProgress()`, `withStars(p, char, stars)`, `withPassed(p, key)`, `loadProgress(store?)`, `useKanaProgress(): [KanaProgress, (fn: (p: KanaProgress) => KanaProgress) => void]`
  - `issueMessage(issue: Issue, strokeNo: number, refIndex?: number): string`, `resultMessages(r: CharacterResult): string[]`
  - `TraceStep({ char, onNext })` — status text in `data-testid="message"`; completion text `⭐ Traced!`
  - e2e: `refStrokes(char): Point[][]`, `drawStrokes(page, strokes, transform?)`

- [ ] **Step 1: Write failing unit tests**

`src/modules/kana/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createStore } from '../../core/storage'
import { MemoryStorage } from '../../test-utils/memory-storage'
import { emptyProgress, loadProgress, PROGRESS_NS, PROGRESS_VERSION, withPassed, withStars } from './progress'

describe('progress', () => {
  it('keeps the best star count', () => {
    let p = withStars(emptyProgress(), 'あ', 2)
    p = withStars(p, 'あ', 1)
    expect(p.stars['あ']).toBe(2)
    expect(withStars(p, 'あ', 3).stars['あ']).toBe(3)
  })
  it('records passed nodes once', () => {
    const p = withPassed(withPassed(emptyProgress(), 'hiragana:a'), 'hiragana:a')
    expect(p.passed).toEqual(['hiragana:a'])
  })
  it('loads empty progress from an empty store and saved progress otherwise', () => {
    const store = createStore(new MemoryStorage())
    expect(loadProgress(store)).toEqual(emptyProgress())
    store.write(PROGRESS_NS, PROGRESS_VERSION, withStars(emptyProgress(), 'い', 1))
    expect(loadProgress(store).stars['い']).toBe(1)
  })
})
```

`src/modules/kana/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { issueMessage, resultMessages } from './messages'

describe('issueMessage', () => {
  it('describes each issue', () => {
    expect(issueMessage('direction', 2)).toBe('↔️ Stroke 2 goes the other way')
    expect(issueMessage('order', 2, 2)).toBe('🔢 This was stroke 3 — do stroke 2 first')
    expect(issueMessage('missing', 3)).toBe('➕ Stroke 3 is missing')
    expect(issueMessage('extra', 4)).toBe('✂️ Stroke 4 is extra')
    expect(issueMessage('shape', 1)).toBe("✏️ Stroke 1 doesn't match — try again")
  })
})

describe('resultMessages', () => {
  it('celebrates a pass and lists hints', () => {
    expect(resultMessages({ passed: true, variant: false, hints: ['direction'], strokes: [
      { ok: true, issue: 'direction', refIndex: 0, distance: 1 }, { ok: true, refIndex: 1, distance: 1 },
    ] })).toEqual(['✅ Correct!', '↔️ Stroke 1 goes the other way'])
  })
  it('lists failures', () => {
    expect(resultMessages({ passed: false, variant: false, hints: [], strokes: [
      { ok: true, refIndex: 0, distance: 1 }, { ok: false, issue: 'missing', refIndex: 1, distance: Infinity },
    ] })).toEqual(['➕ Stroke 2 is missing'])
  })
  it('reports variants', () => {
    expect(resultMessages({ passed: true, variant: true, hints: [], strokes: [] })).toEqual(['✅ Accepted variant'])
    expect(resultMessages({ passed: false, variant: true, hints: [], strokes: [] })).toEqual(["✏️ The shape doesn't match — try again"])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/modules/kana/progress.test.ts src/modules/kana/messages.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement progress + messages**

`src/modules/kana/progress.ts`:

```ts
import { useState } from 'preact/hooks'
import { getAppStore, type Store } from '../../core/storage'

export interface KanaProgress {
  /** Best stars per character: 1 traced, 2 copied, 3 tested. */
  stars: Record<string, number>
  /** Passed path nodes, as `${script}:${nodeId}`. */
  passed: string[]
}

export const PROGRESS_NS = 'kana'
export const PROGRESS_VERSION = 1
export const emptyProgress = (): KanaProgress => ({ stars: {}, passed: [] })

export const withStars = (p: KanaProgress, char: string, stars: number): KanaProgress =>
  (p.stars[char] ?? 0) >= stars ? p : { ...p, stars: { ...p.stars, [char]: stars } }

export const withPassed = (p: KanaProgress, key: string): KanaProgress =>
  p.passed.includes(key) ? p : { ...p, passed: [...p.passed, key] }

export const loadProgress = (store: Store = getAppStore()): KanaProgress =>
  store.read(PROGRESS_NS, PROGRESS_VERSION, emptyProgress())

export function useKanaProgress(): [KanaProgress, (fn: (p: KanaProgress) => KanaProgress) => void] {
  const [progress, setProgress] = useState(() => loadProgress())
  const update = (fn: (p: KanaProgress) => KanaProgress) => {
    const next = fn(loadProgress())
    getAppStore().write(PROGRESS_NS, PROGRESS_VERSION, next)
    setProgress(next)
  }
  return [progress, update]
}
```

`src/modules/kana/messages.ts`:

```ts
import type { CharacterResult } from '../../core/stroke/check'
import type { Issue } from '../../core/stroke/types'

export function issueMessage(issue: Issue, strokeNo: number, refIndex?: number): string {
  switch (issue) {
    case 'direction': return `↔️ Stroke ${strokeNo} goes the other way`
    case 'order': return `🔢 This was stroke ${(refIndex ?? 0) + 1} — do stroke ${strokeNo} first`
    case 'missing': return `➕ Stroke ${strokeNo} is missing`
    case 'extra': return `✂️ Stroke ${strokeNo} is extra`
    case 'shape': return `✏️ Stroke ${strokeNo} doesn't match — try again`
  }
}

export function resultMessages(r: CharacterResult): string[] {
  if (r.variant) return [r.passed ? '✅ Accepted variant' : "✏️ The shape doesn't match — try again"]
  const issues = r.strokes.flatMap((s, i) => (s.issue ? [issueMessage(s.issue, i + 1, s.refIndex)] : []))
  return r.passed ? ['✅ Correct!', ...issues] : issues
}
```

In `src/modules/kana/index.tsx`, add `import { PROGRESS_NS } from './progress'` and change `progressKey: 'kana'` to `progressKey: PROGRESS_NS`.

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement TraceStep**

`src/modules/kana/TraceStep.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks'
import { WritingBox } from '../../core/ink/WritingBox'
import { useSettings } from '../../core/settings'
import { checkStroke, isTap } from '../../core/stroke/check'
import type { Stroke } from '../../core/stroke/types'
import { getKanaData, getRefStrokes } from './data'
import { issueMessage } from './messages'
import { useKanaProgress, withStars } from './progress'

export function TraceStep({ char, onNext }: { char: string; onNext: () => void }) {
  const paths = getKanaData(char).strokes
  const ref = getRefStrokes(char)
  const [settings] = useSettings()
  const [, updateProgress] = useKanaProgress()
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [wrong, setWrong] = useState<Stroke | null>(null)
  const [message, setMessage] = useState('')
  const idx = strokes.length
  const complete = idx >= ref.length

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(() => setWrong(null), 700)
    return () => clearTimeout(t)
  }, [wrong])

  function onStroke(s: Stroke) {
    if (complete || isTap(s)) return
    const res = checkStroke(s, ref[idx], settings.level)
    if (!res.ok) {
      setWrong(s)
      setMessage(issueMessage(res.issue!, idx + 1))
      return
    }
    const next = [...strokes, s]
    setStrokes(next)
    if (next.length === ref.length) {
      updateProgress(p => withStars(p, char, 1))
      setMessage('⭐ Traced!')
    } else {
      setMessage(res.issue ? issueMessage(res.issue, idx + 1) : '')
    }
  }

  const shown = wrong ? [...strokes, wrong] : strokes
  const colors = wrong ? [...strokes.map(() => undefined), 'var(--bad)'] : []

  return (
    <div class="step trace">
      <WritingBox strokes={shown} strokeColors={colors} onStroke={onStroke} disabled={complete}>
        {paths.map((d, i) => <path key={i} d={d} class={`ref-stroke ${i === idx ? 'next' : 'faint'}`} />)}
        {!complete && <circle class="start-dot" cx={ref[idx][0].x} cy={ref[idx][0].y} r="3.5" />}
      </WritingBox>
      <p class="message" role="status" data-testid="message">{message}</p>
      <div class="controls">
        <button aria-label="Undo stroke" disabled={idx === 0} onClick={() => { setStrokes(strokes.slice(0, -1)); setMessage('') }}>↩️</button>
        <button aria-label="Clear" disabled={idx === 0} onClick={() => { setStrokes([]); setMessage('') }}>🗑️</button>
        {complete && <button class="primary" onClick={onNext}>Next: 👁️ Copy ▶</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add Trace to CharacterScreen**

In `src/modules/kana/CharacterScreen.tsx`: add `import { TraceStep } from './TraceStep'`, add `{ id: 'trace', icon: '✍️', label: 'Trace' },` to `STEPS` after watch, and render it after the watch line:

```tsx
      {step === 'trace' && <TraceStep char={char} onNext={() => setStep('copy')} />}
```

(`'copy'` renders nothing until Task 10 adds it; the button only appears after tracing.)

- [ ] **Step 7: Append CSS**

Append to `src/shell/styles.css`:

```css
.ref-stroke.faint { stroke: var(--faint); }
.ref-stroke.next { stroke: var(--accent); opacity: 0.45; }
.start-dot { fill: var(--good); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .start-dot { animation: none; } }
.message { min-height: 1.5em; margin: 0; font-size: 1.2rem; text-align: center; list-style: none; padding: 0; }
```

- [ ] **Step 8: Add e2e helpers and tests**

Append to `e2e/helpers.ts`:

```ts
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { pathToPoints } from '../src/core/stroke/path'
import type { Point } from '../src/core/stroke/types'

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
```

(Move the new `import` lines to the top of the file with the existing imports.)

Append to `e2e/character.spec.ts` (and add `drawStrokes, refStrokes` to the helpers import):

```ts
test('tracing あ correctly earns a star message', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, refStrokes('あ'))
  await expect(page.getByTestId('message')).toHaveText('⭐ Traced!')
  await expect(page.getByRole('button', { name: /Next: 👁️ Copy/ })).toBeVisible()
})

test('tracing a stroke backwards is rejected with a direction hint', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, [[...refStrokes('あ')[0]].reverse()])
  await expect(page.getByTestId('message')).toHaveText('↔️ Stroke 1 goes the other way')
  await expect(page.getByRole('button', { name: 'Undo stroke' })).toBeDisabled()
})
```

- [ ] **Step 9: Run unit + e2e**

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add trace step with per-stroke checking and star progress"
```

---

### Task 10: Copy and Test steps

**Files:**
- Create: `src/modules/kana/FreeWriteStep.tsx`, `src/modules/kana/ModelCard.tsx`
- Modify: `src/modules/kana/CharacterScreen.tsx`, `src/shell/styles.css` (append)
- Test: `e2e/character.spec.ts` (append)

**Interfaces:**
- Consumes: `checkCharacter`, `isTap`, `CharacterResult` (Task 2); `getKanaData`, `getCheckRef` (Task 3); `useSettings` (Task 4); `WritingBox` (Task 7); `useKanaProgress`, `withStars`, `resultMessages` (Task 9).
- Produces:
  - `FreeWriteStep({ char, showModel, stars, onDone? })` where `stars: 2 | 3`, `onDone?: (passed: boolean) => void`. Without `onDone` it shows "🔄 Try again" after checking; with it, "Next ▶". Check button has `aria-label="Check"`.
  - `ModelCard({ char })` — `data-testid="model"`

- [ ] **Step 1: Implement ModelCard and FreeWriteStep**

`src/modules/kana/ModelCard.tsx`:

```tsx
import { getKanaData } from './data'

export function ModelCard({ char }: { char: string }) {
  return (
    <div class="model" data-testid="model" aria-label={`Model: ${char}`}>
      <svg viewBox="0 0 109 109">
        {getKanaData(char).strokes.map((d, i) => <path key={i} d={d} class="ref-stroke" />)}
      </svg>
    </div>
  )
}
```

`src/modules/kana/FreeWriteStep.tsx`:

```tsx
import { useState } from 'preact/hooks'
import { WritingBox } from '../../core/ink/WritingBox'
import { useSettings } from '../../core/settings'
import { checkCharacter, isTap, type CharacterResult } from '../../core/stroke/check'
import type { Stroke } from '../../core/stroke/types'
import { getCheckRef, getKanaData } from './data'
import { resultMessages } from './messages'
import { ModelCard } from './ModelCard'
import { useKanaProgress, withStars } from './progress'

function strokeColor(r: CharacterResult, i: number): string | undefined {
  const s = r.strokes[i]
  if (!s) return undefined
  if (!s.ok) return 'var(--bad)'
  return s.issue ? 'var(--warn)' : 'var(--good)'
}

export interface FreeWriteStepProps {
  char: string
  showModel: boolean
  /** Stars awarded on a pass: 2 for Copy, 3 for Test. */
  stars: 2 | 3
  /** When set (quiz), shows "Next ▶" after checking instead of "Try again". */
  onDone?: (passed: boolean) => void
}

export function FreeWriteStep({ char, showModel, stars, onDone }: FreeWriteStepProps) {
  const paths = getKanaData(char).strokes
  const [settings] = useSettings()
  const [, updateProgress] = useKanaProgress()
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [result, setResult] = useState<CharacterResult | null>(null)

  function check() {
    const r = checkCharacter(strokes, getCheckRef(char), settings.level, 'free')
    setResult(r)
    if (r.passed) updateProgress(p => withStars(p, char, stars))
  }
  const reset = () => { setStrokes([]); setResult(null) }

  return (
    <div class="step free">
      <div class="free-layout">
        {showModel && <ModelCard char={char} />}
        <WritingBox
          strokes={strokes}
          strokeColors={result ? strokes.map((_, i) => strokeColor(result, i)) : []}
          disabled={!!result}
          onStroke={s => { if (!isTap(s)) setStrokes([...strokes, s]) }}
        >
          {result && !result.passed && !result.variant && result.strokes.map((r, i) =>
            !r.ok && i < paths.length ? <path key={i} d={paths[i]} class="ref-stroke dashed" /> : null)}
        </WritingBox>
      </div>
      <ul class="message" role="status" data-testid="message">
        {result && resultMessages(result).map(m => <li key={m}>{m}</li>)}
      </ul>
      <div class="controls">
        {!result && (
          <>
            <button aria-label="Undo stroke" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}>↩️</button>
            <button aria-label="Clear" disabled={!strokes.length} onClick={reset}>🗑️</button>
            <button class="primary" aria-label="Check" disabled={!strokes.length} onClick={check}>✓ Check</button>
          </>
        )}
        {result && (onDone
          ? <button class="primary" onClick={() => onDone(result.passed)}>Next ▶</button>
          : <button class="primary" onClick={reset}>🔄 Try again</button>)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Copy and Test to CharacterScreen**

In `src/modules/kana/CharacterScreen.tsx`: add `import { FreeWriteStep } from './FreeWriteStep'`, extend `STEPS` to:

```ts
const STEPS: { id: StepId; icon: string; label: string }[] = [
  { id: 'watch', icon: '👀', label: 'Watch' },
  { id: 'trace', icon: '✍️', label: 'Trace' },
  { id: 'copy', icon: '👁️', label: 'Copy' },
  { id: 'test', icon: '🎯', label: 'Test' },
]
```

and render after the trace line:

```tsx
      {step === 'copy' && <FreeWriteStep key="copy" char={char} showModel stars={2} />}
      {step === 'test' && <FreeWriteStep key="test" char={char} showModel={false} stars={3} />}
```

- [ ] **Step 3: Append CSS**

Append to `src/shell/styles.css`:

```css
.free-layout { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center; width: 100%; }
.model { width: min(28vw, 160px); aspect-ratio: 1; background: var(--surface); border-radius: var(--radius); padding: 8px; }
.model svg { width: 100%; height: 100%; }
.ref-stroke.dashed { stroke: var(--muted); stroke-dasharray: 3 3; opacity: 0.8; }
```

- [ ] **Step 4: Write e2e tests**

Append to `e2e/character.spec.ts`:

```ts
test('copy: a small, centered あ passes and shows the model', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Copy/ }).click()
  await expect(page.getByTestId('model')).toBeVisible()
  await drawStrokes(page, refStrokes('あ'), p => ({ x: 54.5 + (p.x - 54.5) * 0.6, y: 54.5 + (p.y - 54.5) * 0.6 }))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
  await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
})

test('test: swapped stroke order is reported on Normal', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Test/ }).click()
  await expect(page.getByTestId('model')).toHaveCount(0)
  const [s1, s2, s3] = refStrokes('あ')
  await drawStrokes(page, [s2, s1, s3])
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('do stroke 1 first')
})

test('test: Easy level lets order mistakes pass as hints', async ({ page }) => {
  await page.goto(appUrl('settings'))
  await page.getByLabel(/Easy/).check()
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Test/ }).click()
  const [s1, s2, s3] = refStrokes('あ')
  await drawStrokes(page, [s2, s1, s3])
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
})
```

- [ ] **Step 5: Run unit + e2e**

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add copy and test steps with whole-character checking"
```

---

### Task 11: Path, Grid, Lesson and Quiz

**Files:**
- Create: `src/modules/kana/path.ts`, `src/modules/kana/quiz.ts`, `src/modules/kana/Stars.tsx`, `src/modules/kana/GridView.tsx`, `src/modules/kana/PathView.tsx`, `src/modules/kana/ScriptScreen.tsx`, `src/modules/kana/LessonScreen.tsx`, `src/modules/kana/QuizScreen.tsx`
- Modify: `src/modules/kana/index.tsx` (routes), `src/shell/styles.css` (append)
- Test: `src/modules/kana/path.test.ts`, `src/modules/kana/quiz.test.ts`, `e2e/path.spec.ts`

**Interfaces:**
- Consumes: `ROWS`, `kanaByScript`, `findKana`, `Script` (Task 3); `href` (Task 5); `SpeakButton`, `CharacterScreen` (Task 8); `useKanaProgress`, `withPassed` (Task 9); `FreeWriteStep` (Task 10).
- Produces:
  - `interface PathNode { id: string; kind: 'row' | 'review'; label: string; chars: string[] }`, `buildPath(script): PathNode[]`, `nodeKey(script, id): string`, `isUnlocked(nodes, index, script, passed): boolean`, `findNode(script, id): PathNode | undefined`
  - `interface QuizState { queue: string[] }`, `createQuiz(chars, random?)`, `answer(state, passed)`, `currentChar(state)`, `isDone(state)`
  - Routes: `kana/:script` (path tab), `kana/:script/grid`, `kana/:script/lesson/:node/:i`, `kana/:script/quiz/:node`

- [ ] **Step 1: Write failing unit tests**

`src/modules/kana/path.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPath, findNode, isUnlocked, nodeKey } from './path'

describe('buildPath', () => {
  const nodes = buildPath('hiragana')
  it('has 11 rows plus a review after every 3 rows', () => {
    expect(nodes.map(n => n.id)).toEqual([
      'a', 'ka', 'sa', 'review-1', 'ta', 'na', 'ha', 'review-2', 'ma', 'ya', 'ra', 'review-3', 'wa', 'n',
    ])
  })
  it('fills rows and reviews with characters', () => {
    expect(nodes[0].chars).toEqual(['あ', 'い', 'う', 'え', 'お'])
    expect(nodes[3]).toMatchObject({ kind: 'review' })
    expect(nodes[3].chars).toHaveLength(15)
    expect(findNode('katakana', 'n')?.chars).toEqual(['ン'])
    expect(findNode('hiragana', 'nope')).toBeUndefined()
  })
})

describe('isUnlocked', () => {
  const nodes = buildPath('hiragana')
  it('unlocks the first node and nodes after a passed one', () => {
    expect(isUnlocked(nodes, 0, 'hiragana', [])).toBe(true)
    expect(isUnlocked(nodes, 1, 'hiragana', [])).toBe(false)
    expect(isUnlocked(nodes, 1, 'hiragana', [nodeKey('hiragana', 'a')])).toBe(true)
  })
  it('keeps a passed node unlocked and keeps scripts separate', () => {
    expect(isUnlocked(nodes, 13, 'hiragana', [nodeKey('hiragana', 'n')])).toBe(true)
    expect(isUnlocked(nodes, 1, 'hiragana', [nodeKey('katakana', 'a')])).toBe(false)
  })
})
```

`src/modules/kana/quiz.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { answer, createQuiz, currentChar, isDone } from './quiz'

describe('quiz', () => {
  it('shuffles with the given random source', () => {
    expect(createQuiz(['a', 'b', 'c'], () => 0).queue).toEqual(['b', 'c', 'a'])
  })
  it('removes passed characters and re-queues failed ones', () => {
    let s = { queue: ['a', 'b'] }
    s = answer(s, false)
    expect(s.queue).toEqual(['b', 'a'])
    s = answer(s, true)
    expect(currentChar(s)).toBe('a')
    s = answer(s, true)
    expect(isDone(s)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/modules/kana/path.test.ts src/modules/kana/quiz.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement path + quiz**

`src/modules/kana/path.ts`:

```ts
import { kanaByScript, ROWS, type Script } from './chars'

export interface PathNode { id: string; kind: 'row' | 'review'; label: string; chars: string[] }

const REVIEW_EVERY = 3

export function buildPath(script: Script): PathNode[] {
  const kana = kanaByScript(script)
  const nodes: PathNode[] = []
  let pending: string[] = []
  let reviews = 0
  ROWS.forEach((row, i) => {
    const chars = kana.filter(k => k.row === row).map(k => k.char)
    nodes.push({ id: row, kind: 'row', label: chars.join(' '), chars })
    pending.push(...chars)
    if ((i + 1) % REVIEW_EVERY === 0) {
      reviews++
      nodes.push({ id: `review-${reviews}`, kind: 'review', label: `🔁 Review ${reviews}`, chars: pending })
      pending = []
    }
  })
  return nodes
}

export const nodeKey = (script: Script, id: string): string => `${script}:${id}`

export const isUnlocked = (nodes: PathNode[], index: number, script: Script, passed: readonly string[]): boolean =>
  index === 0 || passed.includes(nodeKey(script, nodes[index].id)) || passed.includes(nodeKey(script, nodes[index - 1].id))

export const findNode = (script: Script, id: string): PathNode | undefined => buildPath(script).find(n => n.id === id)
```

`src/modules/kana/quiz.ts`:

```ts
export interface QuizState { queue: string[] }

export function createQuiz(chars: string[], random: () => number = Math.random): QuizState {
  const queue = [...chars]
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  return { queue }
}

/** Passed characters leave the queue; failed ones go to the back to retry. */
export function answer(s: QuizState, passed: boolean): QuizState {
  const [head, ...rest] = s.queue
  return { queue: passed ? rest : [...rest, head] }
}

export const currentChar = (s: QuizState): string => s.queue[0]
export const isDone = (s: QuizState): boolean => s.queue.length === 0
```

Note: with `random = () => 0`, the Fisher–Yates loop swaps index i with 0 each step: `[a,b,c]` → i=2: `[c,b,a]` → i=1: `[b,c,a]`. Matches the test.

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the screens**

`src/modules/kana/Stars.tsx`:

```tsx
export const Stars = ({ n }: { n: number }) => (
  <span class="stars" aria-label={`${n} of 3 stars`}>{'⭐'.repeat(n)}{'☆'.repeat(3 - n)}</span>
)
```

`src/modules/kana/GridView.tsx`:

```tsx
import { href } from '../../core/router'
import { kanaByScript, ROWS, type Script } from './chars'
import { useKanaProgress } from './progress'
import { Stars } from './Stars'

export function GridView({ script }: { script: Script }) {
  const [progress] = useKanaProgress()
  const kana = kanaByScript(script)
  return (
    <div class="kana-grid" data-testid="kana-grid">
      {ROWS.map(row => (
        <div class="grid-row" key={row}>
          {[0, 1, 2, 3, 4].map(col => {
            const k = kana.find(x => x.row === row && x.col === col)
            if (!k) return <span key={col} class="grid-cell empty" />
            return (
              <a key={col} class="grid-cell" href={href('kana', script, 'char', k.char)}>
                <span class="grid-char" lang="ja">{k.char}</span>
                <span class="romaji">{k.romaji}</span>
                <Stars n={progress.stars[k.char] ?? 0} />
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

`src/modules/kana/PathView.tsx`:

```tsx
import { href } from '../../core/router'
import type { Script } from './chars'
import { buildPath, isUnlocked, nodeKey } from './path'
import { useKanaProgress } from './progress'

export function PathView({ script }: { script: Script }) {
  const [progress] = useKanaProgress()
  const nodes = buildPath(script)
  return (
    <ol class="path" data-testid="path">
      {nodes.map((n, i) => {
        const passed = progress.passed.includes(nodeKey(script, n.id))
        const target = n.kind === 'row' ? href('kana', script, 'lesson', n.id, '0') : href('kana', script, 'quiz', n.id)
        return (
          <li key={n.id} class={`path-node ${n.kind}`}>
            {isUnlocked(nodes, i, script, progress.passed)
              ? <a class="button" href={target} data-node={n.id}>{passed ? '✅' : '▶️'} <span lang="ja">{n.label}</span></a>
              : <span class="button locked" data-node={n.id} aria-label={`${n.label} (locked)`}>🔒 <span lang="ja">{n.label}</span></span>}
          </li>
        )
      })}
    </ol>
  )
}
```

`src/modules/kana/ScriptScreen.tsx`:

```tsx
import { href } from '../../core/router'
import type { Script } from './chars'
import { GridView } from './GridView'
import { PathView } from './PathView'

export function ScriptScreen({ script, tab }: { script: Script; tab: 'path' | 'grid' }) {
  return (
    <section class="script-screen">
      <h1 lang="ja">{script === 'hiragana' ? 'ひらがな' : 'カタカナ'} <small lang="en">{script === 'hiragana' ? 'Hiragana' : 'Katakana'}</small></h1>
      <nav class="tabs">
        <a class="button" href={href('kana', script)} aria-current={tab === 'path' ? 'page' : undefined}>🗺️ Path</a>
        <a class="button" href={href('kana', script, 'grid')} aria-current={tab === 'grid' ? 'page' : undefined}>🔤 Grid</a>
      </nav>
      {tab === 'path' ? <PathView script={script} /> : <GridView script={script} />}
    </section>
  )
}
```

`src/modules/kana/LessonScreen.tsx`:

```tsx
import { NotFound } from '../../core/NotFound'
import { href } from '../../core/router'
import { CharacterScreen } from './CharacterScreen'
import type { Script } from './chars'
import { findNode } from './path'

export function LessonScreen({ script, nodeId, index }: { script: Script; nodeId: string; index: number }) {
  const node = findNode(script, nodeId)
  if (!node || node.kind !== 'row' || !Number.isInteger(index) || index < 0 || index >= node.chars.length) return <NotFound />
  const last = index === node.chars.length - 1
  const next = last ? href('kana', script, 'quiz', nodeId) : href('kana', script, 'lesson', nodeId, String(index + 1))
  return (
    <CharacterScreen
      key={node.chars[index]}
      char={node.chars[index]}
      footer={<>
        <span class="lesson-progress">{index + 1} / {node.chars.length}</span>
        <a class="button primary" href={next}>{last ? '🎯 Row quiz ▶' : 'Next character ▶'}</a>
      </>}
    />
  )
}
```

`src/modules/kana/QuizScreen.tsx`:

```tsx
import { useState } from 'preact/hooks'
import { NotFound } from '../../core/NotFound'
import { href } from '../../core/router'
import { SpeakButton } from '../../core/SpeakButton'
import { findKana, type Script } from './chars'
import { FreeWriteStep } from './FreeWriteStep'
import { findNode, nodeKey } from './path'
import { useKanaProgress, withPassed } from './progress'
import { answer, createQuiz, currentChar, isDone } from './quiz'

export function QuizScreen({ script, nodeId }: { script: Script; nodeId: string }) {
  const node = findNode(script, nodeId)
  const [, updateProgress] = useKanaProgress()
  const [state, setState] = useState(() => createQuiz(node?.chars ?? []))
  const [round, setRound] = useState(0)
  if (!node) return <NotFound />

  if (isDone(state)) {
    return (
      <section class="quiz-done" data-testid="quiz-done">
        <p class="celebrate">🎉 Row passed!</p>
        <a class="button primary" href={href('kana', script)}>🗺️ Back to path</a>
      </section>
    )
  }

  const char = currentChar(state)
  const done = node.chars.length - state.queue.length
  return (
    <section class="quiz">
      <p class="quiz-progress">✅ {done} / {node.chars.length}</p>
      <h2>Write: <span class="romaji-big" data-testid="quiz-prompt">{findKana(char)?.romaji}</span> <SpeakButton text={char} /></h2>
      <FreeWriteStep
        key={round}
        char={char}
        showModel={false}
        stars={3}
        onDone={passed => {
          const next = answer(state, passed)
          if (isDone(next)) updateProgress(p => withPassed(p, nodeKey(script, nodeId)))
          setState(next)
          setRound(round + 1)
        }}
      />
    </section>
  )
}
```

Note: within one row, romaji are unique, so the prompt identifies the character. Reviews mix rows of one script, where romaji are also unique.

- [ ] **Step 6: Register routes and update KanaHome links**

In `src/modules/kana/index.tsx`, add imports:

```tsx
import { LessonScreen } from './LessonScreen'
import { QuizScreen } from './QuizScreen'
import { ScriptScreen } from './ScriptScreen'
```

and set `routes` to:

```tsx
  routes: [
    { path: '', render: () => <KanaHome /> },
    { path: ':script', render: withScript(s => <ScriptScreen script={s} tab="path" />) },
    { path: ':script/grid', render: withScript(s => <ScriptScreen script={s} tab="grid" />) },
    { path: ':script/char/:char', render: withScript((_, p) => <CharacterScreen key={p.char} char={p.char} />) },
    { path: ':script/lesson/:node/:i', render: withScript((s, p) => <LessonScreen key={`${p.node}/${p.i}`} script={s} nodeId={p.node} index={Number(p.i)} />) },
    { path: ':script/quiz/:node', render: withScript((s, p) => <QuizScreen key={p.node} script={s} nodeId={p.node} />) },
  ],
```

(`KanaHome` already links to `#/kana/hiragana` and `#/kana/katakana`.)

- [ ] **Step 7: Append CSS**

Append to `src/shell/styles.css`:

```css
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tabs [aria-current="page"] { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.kana-grid { display: grid; gap: 8px; }
.grid-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.grid-cell { display: grid; justify-items: center; padding: 8px 4px; background: var(--surface); border-radius: 12px; text-decoration: none; }
.grid-cell.empty { background: transparent; }
.grid-char { font-size: 2rem; }
.grid-cell .romaji { font-size: 0.9rem; }
.stars { font-size: 0.75rem; letter-spacing: -1px; }
.path { list-style: none; padding: 0; display: grid; gap: 12px; max-width: 420px; margin: 0 auto; }
.path-node .button { width: 100%; justify-content: flex-start; font-size: 1.3rem; }
.path-node.review .button { border-style: dashed; }
.locked { opacity: 0.5; cursor: default; }
.quiz { display: grid; gap: 12px; justify-items: center; }
.romaji-big { font-size: 2rem; color: var(--accent); }
.quiz-done { text-align: center; padding: 32px 0; }
.celebrate { font-size: 2rem; }
.lesson-progress { color: var(--muted); }
```

- [ ] **Step 8: Write e2e tests**

`e2e/path.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { ALL_KANA } from '../src/modules/kana/chars'
import { appUrl, drawStrokes, refStrokes } from './helpers'

test('grid shows all 46 hiragana and opens a character', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/grid'))
  await expect(page.locator('a.grid-cell')).toHaveCount(46)
  await page.locator('a.grid-cell', { hasText: 'き' }).click()
  await expect(page.locator('.char-big')).toHaveText('き')
})

test('path unlocks only the first row at the start, and lessons step through the row', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana'))
  await expect(page.locator('a[data-node="a"]')).toBeVisible()
  await expect(page.locator('span.locked[data-node="ka"]')).toBeVisible()
  await page.locator('a[data-node="a"]').click()
  await expect(page.locator('.char-big')).toHaveText('あ')
  await page.getByRole('link', { name: /Next character/ }).click()
  await expect(page.locator('.char-big')).toHaveText('い')
})

test('passing the あ-row quiz unlocks the か row', async ({ page }) => {
  test.slow()
  await page.goto(appUrl('kana/hiragana/quiz/a'))
  for (let i = 0; i < 5; i++) {
    const romaji = await page.getByTestId('quiz-prompt').textContent()
    const char = ALL_KANA.find(k => k.script === 'hiragana' && k.romaji === romaji)!.char
    await drawStrokes(page, refStrokes(char))
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(page.getByTestId('message')).toContainText('✅')
    await page.getByRole('button', { name: /Next/ }).click()
  }
  await expect(page.getByTestId('quiz-done')).toBeVisible()
  await page.getByRole('link', { name: /Back to path/ }).click()
  await expect(page.locator('a[data-node="ka"]')).toBeVisible()
  await expect(page.locator('a[data-node="a"]')).toContainText('✅')
})
```

- [ ] **Step 9: Run unit + e2e**

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add guided path, kana grid, lessons and row quizzes"
```

---

### Task 12: Offline PWA, GitHub Pages workflow, iPad checklist

**Files:**
- Create: `src/core/sw-register.ts`, `public/sw.js`, `public/manifest.webmanifest`, `scripts/make-icons.ts`, `public/icon-180.png`, `public/icon-512.png` (generated), `.github/workflows/pages.yml`, `docs/ipad-checklist.md`
- Modify: `index.html`, `vite.config.ts`, `src/main.tsx`, `package.json` (script), `README.md`
- Test: `src/core/sw-register.test.ts`, `e2e/pwa.spec.ts`

**Interfaces:**
- Produces: `shouldRegisterServiceWorker(protocol: string, hasServiceWorker: boolean, isProd: boolean): boolean`, `registerServiceWorker(): void`.

- [ ] **Step 1: Write failing test**

`src/core/sw-register.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldRegisterServiceWorker } from './sw-register'

describe('shouldRegisterServiceWorker', () => {
  it('registers only for production builds served over http(s)', () => {
    expect(shouldRegisterServiceWorker('https:', true, true)).toBe(true)
    expect(shouldRegisterServiceWorker('http:', true, true)).toBe(true)
    expect(shouldRegisterServiceWorker('file:', true, true)).toBe(false)
    expect(shouldRegisterServiceWorker('https:', false, true)).toBe(false)
    expect(shouldRegisterServiceWorker('http:', true, false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/sw-register.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement registration**

`src/core/sw-register.ts`:

```ts
export const shouldRegisterServiceWorker = (protocol: string, hasServiceWorker: boolean, isProd: boolean): boolean =>
  isProd && hasServiceWorker && (protocol === 'http:' || protocol === 'https:')

/** Enables offline use when hosted (e.g. GitHub Pages). Does nothing for file:// or the dev server. */
export function registerServiceWorker(): void {
  if (!shouldRegisterServiceWorker(location.protocol, 'serviceWorker' in navigator, import.meta.env.PROD)) return
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker registration failed:', err))
}
```

In `src/main.tsx`, add `import { registerServiceWorker } from './core/sw-register'` and call `registerServiceWorker()` after `render(...)`.

Run: `npx vitest run src/core/sw-register.test.ts`
Expected: PASS.

- [ ] **Step 4: Add service worker, manifest, and version stamping**

`public/sw.js`:

```js
// Cache-first service worker. VERSION is replaced at build time with a hash of index.html.
const VERSION = '__BUILD_VERSION__'
const CACHE = `nb-${VERSION}`
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nb-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request)))
})
```

`public/manifest.webmanifest`:

```json
{
  "name": "Nihongo Benkyō",
  "short_name": "Benkyō",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#fffaf3",
  "theme_color": "#ff7043",
  "icons": [
    { "src": "icon-180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

In `index.html` `<head>`, after the viewport meta, add:

```html
    <meta name="theme-color" content="#ff7043" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Benkyō" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="apple-touch-icon" href="./icon-180.png" />
```

Replace `vite.config.ts` with:

```ts
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import preact from '@preact/preset-vite'
import type { Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'

/** Stamps dist/sw.js with a hash of dist/index.html so each deploy gets a fresh cache. */
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const sw = resolve('dist/sw.js')
      const html = resolve('dist/index.html')
      if (!existsSync(sw) || !existsSync(html)) return
      const version = createHash('sha256').update(readFileSync(html)).digest('hex').slice(0, 12)
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_VERSION__', version))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile(), stampServiceWorker()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 5: Generate icons**

`scripts/make-icons.ts`:

```ts
import { webkit } from '@playwright/test'

const html = (size: number) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#ff7043;display:flex;align-items:center;justify-content:center;
font:bold ${Math.round(size * 0.62)}px 'Hiragino Maru Gothic ProN','Hiragino Sans',sans-serif;color:#fff">あ</div></body></html>`

const browser = await webkit.launch()
const page = await browser.newPage()
for (const size of [180, 512]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(html(size))
  await page.screenshot({ path: `public/icon-${size}.png`, clip: { x: 0, y: 0, width: size, height: size } })
}
await browser.close()
console.log('Wrote public/icon-180.png and public/icon-512.png')
```

Add to `package.json` scripts: `"icons": "tsx scripts/make-icons.ts"`.

Run: `npm run icons && file public/icon-180.png public/icon-512.png`
Expected: both are `PNG image data, 180 x 180` / `512 x 512`.

- [ ] **Step 6: Write e2e checks**

`e2e/pwa.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { fileUrl } from './helpers'

test('build ships a stamped service worker and a valid manifest', () => {
  const sw = readFileSync('dist/sw.js', 'utf8')
  expect(sw).not.toContain('__BUILD_VERSION__')
  expect(sw).toMatch(/const VERSION = '[0-9a-f]{12}'/)
  const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
  expect(manifest).toMatchObject({ start_url: './', display: 'standalone' })
  expect(readFileSync('dist/index.html', 'utf8')).toContain('rel="manifest"')
})

test('file:// load has no errors (service worker is skipped)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(fileUrl('kana/hiragana/char/あ'))
  await expect(page.locator('.char-big')).toHaveText('あ')
  expect(errors).toEqual([])
})
```

Run: `npm test && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 7: Add the GitHub Pages workflow**

`.github/workflows/pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Do **not** create a GitHub repository or push. Publishing needs the user's explicit confirmation (org policy for repos outside Mercari orgs).

- [ ] **Step 8: Write the iPad checklist and update README**

`docs/ipad-checklist.md`:

```markdown
# iPad manual checklist

Run on a real iPad (Safari) against the hosted URL, or `npm run build && npm run serve` on the same Wi-Fi
(open `http://<mac-ip>:4173`; offline mode needs HTTPS, so skip step 7 on LAN).

1. Home → Kana Writing → Hiragana → Path: only the あ row is open.
2. Watch あ: ◀ ▶ step through 3 strokes with numbers and arrows; 🔊 plays (if a Japanese voice is installed).
3. Trace with a finger: page does not scroll or zoom while drawing; each stroke is accepted or flashes red.
4. Trace with Apple Pencil while resting your palm on the screen: the palm draws nothing.
5. Settings → "Allow finger drawing again": finger drawing works again.
6. Rotate the iPad mid-lesson: the writing box resizes and the next stroke lands where you draw.
7. Share → Add to Home Screen; open it; turn on Airplane Mode; relaunch: the app still loads.
8. Copy/Test: write あ small in a corner → passes; write strokes out of order on Normal → order message.
9. Close and reopen: stars and unlocked rows are kept.
10. Note any stroke that feels unfairly rejected or accepted → tune `TOLERANCE` in `src/core/stroke/check.ts`.
```

In `README.md`, add this section after `## Development`:

```markdown
## Deploying (GitHub Pages)

1. Push this repo to GitHub.
2. Repository **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/pages.yml` (tests → build → deploy).
4. On iPad: open the Pages URL in Safari → Share → **Add to Home Screen**.

To try it on an iPad before deploying: `npm run build && npm run serve`, then open `http://<your-mac-ip>:4173`
on the same Wi-Fi. See `docs/ipad-checklist.md`.
```

Also add `npm run icons` and `npm run test:e2e` lines to the README's Development code block, and change the status line to `> Status: Module 1 (Kana Writing) implemented.`

- [ ] **Step 9: Full verification**

Run: `npm test && npm run test:e2e && ls dist`
Expected: all PASS; `dist` lists `index.html icon-180.png icon-512.png manifest.webmanifest sw.js`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add offline support, Pages workflow and iPad checklist"
```

---

## Spec Coverage Map

| Spec section | Task(s) |
|---|---|
| §2 layout, module contract, build outputs | 1, 5, 6, 12 |
| §2 future grammar slot (`content/`, glob) | Contract only (5); grammar module is a separate spec |
| §3 path, grid, unlocking, quiz rules, reviews | 11 |
| §3 four steps + stars | 8, 9, 10, 11 |
| §3 writing box (guide, SVG/canvas, touch-action, stylus mode, pointercancel, controls) | 7, 9, 10 |
| §4 checker, levels, variants, feedback | 2, 9, 10 |
| §5 data pipeline | 3 |
| §6 error handling (storage, voice, pointercancel, versioning, data) | 4, 8, 7, 4, 3 |
| §7 testing (Vitest, Playwright WebKit, iPad checklist) | all; 12 |
| §8 deployment | 12 |
| §9 credits/licensing | 1, 3, 6 |
