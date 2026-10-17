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
