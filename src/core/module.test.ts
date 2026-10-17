import { describe, expect, it } from 'vitest'
import { resolveModuleRoute, type LearningModule } from './module'

const mod: LearningModule = {
  id: 'kana', title: 'Kana', icon: 'あ', progressKey: 'kana',
  routes: [
    { path: '', render: () => 'home' },
    { path: ':script', render: p => `script:${p.script}` },
  ],
}

describe('resolveModuleRoute', () => {
  it('finds the module and route', () => {
    const r = resolveModuleRoute([mod], ['kana', 'hiragana'])
    expect(r?.module.id).toBe('kana')
    expect(r?.params).toEqual({ script: 'hiragana' })
    expect(resolveModuleRoute([mod], ['kana'])?.route.path).toBe('')
  })
  it('returns null for unknown modules or paths', () => {
    expect(resolveModuleRoute([mod], ['grammar'])).toBeNull()
    expect(resolveModuleRoute([mod], ['kana', 'a', 'b', 'c'])).toBeNull()
  })
})
