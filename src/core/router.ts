import { useEffect, useState } from 'preact/hooks'

const decode = (s: string): string => {
  try { return decodeURIComponent(s) } catch { return s }
}

// Browsers may hand back the hash percent-encoded or raw; decoding makes both forms match.
export const parseHash = (hash: string): string[] =>
  hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode)

export const href = (...segments: string[]): string =>
  '#/' + segments.map(encodeURIComponent).join('/')

export function navigate(...segments: string[]): void {
  location.hash = href(...segments)
}

export function matchRoute(pattern: string, segments: string[]): Record<string, string> | null {
  const parts = pattern.split('/').filter(Boolean)
  if (parts.length !== segments.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(':')) params[parts[i].slice(1)] = segments[i]
    else if (parts[i] !== segments[i]) return null
  }
  return params
}

export function useHashSegments(): string[] {
  const [segments, setSegments] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => {
      setSegments(parseHash(location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return segments
}
