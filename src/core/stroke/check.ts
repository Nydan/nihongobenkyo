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
  const backward = meanDistance([...u].reverse(), r)
  // Compare against the reversed stroke first: on short strokes a reversed drawing is still within tolerance forward.
  // The 0.8 ratio catches a reversed, slightly offset short tick (e.g. forward 7.4 / backward 4.1 on シ stroke 1),
  // while correctly drawn real kana strokes, even sloppy ones, measure backward >= 1.69 × forward.
  if (backward <= tol && backward < forward * 0.8) {
    return { ok: HINT_ONLY[level].includes('direction'), issue: 'direction', distance: backward }
  }
  if (forward <= tol) return { ok: true, distance: forward }
  return { ok: false, issue: 'shape', distance: forward }
}

/**
 * A variant with fewer strokes joins reference strokes, which only adds connecting ink. If there is less ink than the
 * reference, a stroke was left out. Measured on real kana (き, さ, ふ, り), exact and sloppy: joined forms have
 * 1.14–1.38 × the reference ink, and forms with one stroke dropped have 0.46–0.91 ×. The exception is free mode when
 * the dropped stroke sets the bbox (up to 1.19 ×), but the shape distance already rejects those (d ≥ 26).
 * Split variants (more strokes, e.g. そ) are not checked.
 */
function hasJoinInk(user: Stroke[], ref: CheckRef): boolean {
  if (user.length > ref.strokes.length) return true
  const ink = (strokes: Stroke[]) => strokes.reduce((t, s) => t + pathLength(s), 0)
  return ink(user) >= ink(ref.strokes)
}

function checkVariant(user: Stroke[], ref: CheckRef, level: Level): CharacterResult {
  const d = meanDistance(resample(user.flat(), MERGED_SAMPLES), resample(ref.strokes.flat(), MERGED_SAMPLES))
  const ok = d <= TOLERANCE[level] && hasJoinInk(user, ref)
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
