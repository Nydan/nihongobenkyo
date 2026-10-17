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
  it('prefers a local voice over a remote one', () => {
    const remote = { lang: 'ja-JP', localService: false }
    const local = { lang: 'ja-JP', localService: true }
    expect(findJapaneseVoice([remote, local])).toBe(local)
    expect(findJapaneseVoice([local, remote])).toBe(local)
  })
  it('falls back to a remote voice only when no local one exists', () => {
    const remote = { lang: 'ja-JP', localService: false }
    expect(findJapaneseVoice([{ lang: 'en-US', localService: true }, remote])).toBe(remote)
  })
})
