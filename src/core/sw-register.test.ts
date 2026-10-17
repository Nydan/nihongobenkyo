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
