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
