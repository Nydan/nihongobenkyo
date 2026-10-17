import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { appUrl, fileUrl } from './helpers'

test('dist/index.html is self-contained and carries both license notices', () => {
  const html = readFileSync('dist/index.html', 'utf8')
  expect(html).not.toMatch(/<script[^>]+src=/)
  expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/)
  expect(html).toContain('CC BY-SA 3.0')
  expect(html).toContain('MIT')
})

test('home shows the Kana Writing tile', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(appUrl())
  await expect(page.getByRole('link', { name: /Kana Writing/ })).toBeVisible()
  await expect(page.locator('.banner')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('opens from file:// as a single file', async ({ page }) => {
  await page.goto(fileUrl())
  await expect(page.getByRole('link', { name: /Kana Writing/ })).toBeVisible()
})

test('settings level persists across reloads', async ({ page }) => {
  await page.goto(appUrl('settings'))
  await expect(page.getByLabel(/Normal/)).toBeChecked()
  await page.getByLabel(/Strict/).check()
  await page.reload()
  await expect(page.getByLabel(/Strict/)).toBeChecked()
})

test('unknown routes show not found', async ({ page }) => {
  await page.goto(appUrl('nope'))
  await expect(page.getByText('Page not found')).toBeVisible()
})
