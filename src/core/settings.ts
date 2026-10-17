import { useState } from 'preact/hooks'
import { getAppStore, type Store } from './storage'
import type { Level } from './stroke/types'

export interface Settings { level: Level }
export const DEFAULT_SETTINGS: Settings = { level: 'normal' }
const NS = 'settings'
const VERSION = 1
const LEVELS: readonly unknown[] = ['easy', 'normal', 'strict']

const isSettings = (v: unknown): v is Settings =>
  typeof v === 'object' && v !== null && LEVELS.includes((v as { level?: unknown }).level)

export const loadSettings = (store: Store = getAppStore()): Settings => {
  const stored = store.read<unknown>(NS, VERSION, undefined)
  return isSettings(stored) ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
}

export const saveSettings = (s: Settings, store: Store = getAppStore()): void => store.write(NS, VERSION, s)

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(() => loadSettings())
  const update = (patch: Partial<Settings>) => {
    const next = { ...loadSettings(), ...patch }
    saveSettings(next)
    setSettings(next)
  }
  return [settings, update]
}
