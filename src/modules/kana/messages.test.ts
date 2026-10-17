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
