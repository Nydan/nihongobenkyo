export interface Store {
  readonly persistent: boolean
  read<T>(ns: string, version: number, fallback: T, migrate?: (old: unknown, oldVersion: unknown) => T | undefined): T
  write<T>(ns: string, version: number, data: T): void
}

const PREFIX = 'nb:'

function probe(s: Storage): boolean {
  try { s.setItem(`${PREFIX}__probe`, '1'); s.removeItem(`${PREFIX}__probe`); return true } catch { return false }
}

/** Versioned, namespaced key-value store. Falls back to memory when `backend` is missing or throws. */
export function createStore(backend?: Storage): Store {
  const memory = new Map<string, string>()
  let persistent = !!backend && probe(backend)

  const getRaw = (k: string): string | null => {
    if (memory.has(k)) return memory.get(k)!
    if (persistent) { try { return backend!.getItem(k) } catch { persistent = false } }
    return null
  }
  const setRaw = (k: string, v: string): void => {
    memory.set(k, v)
    if (persistent) { try { backend!.setItem(k, v) } catch { persistent = false } }
  }

  return {
    get persistent() { return persistent },
    read(ns, version, fallback, migrate) {
      const raw = getRaw(PREFIX + ns)
      if (raw == null) return fallback
      try {
        const parsed = JSON.parse(raw) as { v?: unknown; data?: unknown } | null
        if (parsed && parsed.v === version) return parsed.data as typeof fallback
        return migrate?.(parsed?.data, parsed?.v) ?? fallback
      } catch {
        return fallback
      }
    },
    write(ns, version, data) {
      setRaw(PREFIX + ns, JSON.stringify({ v: version, data }))
    },
  }
}

let appStore: Store | undefined

/** The app-wide store over `localStorage`, created on first use. */
export function getAppStore(): Store {
  if (!appStore) {
    let ls: Storage | undefined
    try { ls = globalThis.localStorage } catch { ls = undefined }
    appStore = createStore(ls)
  }
  return appStore
}
