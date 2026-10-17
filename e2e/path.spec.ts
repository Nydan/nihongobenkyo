import { expect, test } from '@playwright/test'
import { ALL_KANA } from '../src/modules/kana/chars'
import { appUrl, drawStrokes, refStrokes } from './helpers'

test('grid shows all 46 hiragana and opens a character', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/grid'))
  await expect(page.locator('a.grid-cell')).toHaveCount(46)
  await page.locator('a.grid-cell', { hasText: 'き' }).click()
  await expect(page.locator('.char-big')).toHaveText('き')
})

test('path unlocks only the first row at the start, and lessons step through the row', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana'))
  await expect(page.locator('a[data-node="a"]')).toBeVisible()
  await expect(page.locator('span.locked[data-node="ka"]')).toBeVisible()
  await page.locator('a[data-node="a"]').click()
  await expect(page.locator('.char-big')).toHaveText('あ')
  await page.getByRole('link', { name: /Next character/ }).click()
  await expect(page.locator('.char-big')).toHaveText('い')
})

test('unknown quiz nodes and out-of-range lesson indexes are not pages', async ({ page }) => {
  for (const route of ['kana/hiragana/quiz/nope', 'kana/hiragana/lesson/a/99', 'kana/hiragana/lesson/a/x', 'kana/hiragana/lesson/review-1/0']) {
    await page.goto(appUrl(route))
    await expect(page.getByText('Page not found')).toBeVisible()
    await expect(page.locator('.char-big')).toHaveCount(0)
  }
})

test('passing the あ-row quiz unlocks the か row', async ({ page }) => {
  test.slow()
  await page.goto(appUrl('kana/hiragana/quiz/a'))
  await expect(page.getByTestId('quiz-script')).toHaveText('ひらがな')
  for (let i = 0; i < 5; i++) {
    const romaji = await page.getByTestId('quiz-prompt').textContent()
    const char = ALL_KANA.find(k => k.script === 'hiragana' && k.romaji === romaji)!.char
    await drawStrokes(page, refStrokes(char))
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(page.getByTestId('message')).toContainText('✅')
    await page.getByRole('button', { name: /Next/ }).click()
  }
  await expect(page.getByTestId('quiz-done')).toContainText('Row passed')
  await page.getByRole('link', { name: /Back to path/ }).click()
  await expect(page.locator('a[data-node="ka"]')).toBeVisible()
  await expect(page.locator('a[data-node="a"]')).toContainText('✅')
})

test('switching the quiz URL to the other script starts a quiz of that script', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/quiz/a'))
  await expect(page.getByTestId('quiz-script')).toHaveText('ひらがな')
  await page.evaluate(() => { location.hash = '#/kana/katakana/quiz/a' })
  await expect(page.getByTestId('quiz-script')).toHaveText('カタカナ')
  const romaji = await page.getByTestId('quiz-prompt').textContent()
  const char = ALL_KANA.find(k => k.script === 'katakana' && k.romaji === romaji)!.char
  await drawStrokes(page, refStrokes(char))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅')
})
