import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import preact from '@preact/preset-vite'
import type { Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'

/** Stamps dist/sw.js with a hash of dist/index.html so each deploy gets a fresh cache. */
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const sw = resolve('dist/sw.js')
      const html = resolve('dist/index.html')
      if (!existsSync(sw) || !existsSync(html)) throw new Error('stamp-service-worker: dist/sw.js or dist/index.html is missing')
      const version = createHash('sha256').update(readFileSync(html)).digest('hex').slice(0, 12)
      const stamped = readFileSync(sw, 'utf8').replace('__BUILD_VERSION__', version)
      if (stamped.includes('__BUILD_VERSION__')) throw new Error('stamp-service-worker: placeholder still present in dist/sw.js')
      writeFileSync(sw, stamped)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile(), stampServiceWorker()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
