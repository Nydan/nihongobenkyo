export const shouldRegisterServiceWorker = (protocol: string, hasServiceWorker: boolean, isProd: boolean): boolean =>
  isProd && hasServiceWorker && (protocol === 'http:' || protocol === 'https:')

/** Enables offline use when hosted (e.g. GitHub Pages). Does nothing for file:// or the dev server. */
export function registerServiceWorker(): void {
  if (!shouldRegisterServiceWorker(location.protocol, 'serviceWorker' in navigator, import.meta.env.PROD)) return
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker registration failed:', err))
}
