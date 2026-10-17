import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

/** URL for the app served by `vite preview` at the given hash route. */
export const appUrl = (hash = ''): string => `/#/${hash}`
/** file:// URL of the built single-file app. */
export const fileUrl = (hash = ''): string => `${pathToFileURL(resolve('dist/index.html')).href}#/${hash}`
