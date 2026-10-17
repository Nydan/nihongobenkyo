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
