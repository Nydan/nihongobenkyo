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
