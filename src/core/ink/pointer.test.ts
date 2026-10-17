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
