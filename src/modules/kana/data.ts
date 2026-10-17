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
