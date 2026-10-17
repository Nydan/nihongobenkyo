import { expect, test } from '@playwright/test'
import { appUrl, drawStrokes, refStrokes } from './helpers'

test('watch steps through あ stroke by stroke', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await expect(page.locator('.char-big')).toHaveText('あ')
  await expect(page.locator('.romaji').first()).toHaveText('a')
  const progress = page.getByTestId('watch-progress')
  await expect(progress).toHaveText('1 / 3')
  const next = page.getByRole('button', { name: 'Next stroke' })
  await next.click()
  await expect(progress).toHaveText('2 / 3')
  await next.click()
  await next.click()
  await expect(progress).toHaveText('✅ Done')
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(progress).toHaveText('1 / 3')
})

test('percent-encoded character URLs work', async ({ page }) => {
  await page.goto(appUrl('kana/katakana/char/%E3%82%A2'))
  await expect(page.locator('.char-big')).toHaveText('ア')
})

test('unknown character, script or script mismatch shows not found', async ({ page }) => {
  const notFound = page.getByText('Page not found')
  // Each case starts from a fresh home page so a stale "not found" from the previous case cannot satisfy the assertion.
  for (const hash of [
    'kana/hiragana/char/漢',
    'kana/klingon/char/あ',
    'kana/hiragana/char/ア',
    'kana/katakana/char/あ',
  ]) {
    await page.goto(appUrl())
    await expect(notFound).toHaveCount(0)
    await page.goto(appUrl(hash))
    await expect(notFound).toBeVisible()
    await expect(page.locator('.char-big')).toHaveCount(0)
  }
})

test('tracing あ correctly earns a star message', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, refStrokes('あ'))
  await expect(page.getByTestId('message')).toHaveText('⭐ Traced!')
  await expect(page.getByRole('button', { name: /Next: 👁️ Copy/ })).toBeVisible()
})

test('tracing a stroke backwards is rejected with a direction hint', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, [[...refStrokes('あ')[0]].reverse()])
  await expect(page.getByTestId('message')).toHaveText('↔️ Stroke 1 goes the other way')
  await expect(page.getByRole('button', { name: 'Undo stroke' })).toBeDisabled()
})
