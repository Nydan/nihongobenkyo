import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../test-utils/memory-storage'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'
import { createStore } from './storage'

describe('settings', () => {
  it('defaults to normal', () => {
    expect(loadSettings(createStore(new MemoryStorage()))).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.level).toBe('normal')
  })
  it('persists the level', () => {
    const store = createStore(new MemoryStorage())
    saveSettings({ level: 'strict' }, store)
    expect(loadSettings(store).level).toBe('strict')
  })
  it('resets to defaults when the stored level is not a known level', () => {
    const store = createStore(new MemoryStorage())
    store.write('settings', 1, { level: 'bogus' })
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })
  it('resets to defaults when the stored object has no level', () => {
    const store = createStore(new MemoryStorage())
    store.write('settings', 1, {})
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })
})
