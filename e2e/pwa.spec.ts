import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { fileUrl } from './helpers'

test('build ships a stamped service worker and a valid manifest', () => {
  const sw = readFileSync('dist/sw.js', 'utf8')
  expect(sw).not.toContain('__BUILD_VERSION__')
  expect(sw).toMatch(/const VERSION = '[0-9a-f]{12}'/)
  const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
  expect(manifest).toMatchObject({ start_url: './', display: 'standalone' })
  expect(readFileSync('dist/index.html', 'utf8')).toContain('rel="manifest"')
})

test('file:// load has no errors (service worker is skipped)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(fileUrl('kana/hiragana/char/あ'))
  await expect(page.locator('.char-big')).toHaveText('あ')
  expect(errors).toEqual([])
})
