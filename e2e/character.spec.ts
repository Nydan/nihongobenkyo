import { expect, test } from '@playwright/test'
import { appUrl, drawStrokes, refStrokes } from './helpers'

test('watch steps through あ stroke by stroke', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Watch/ }).click()
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

test('watch offers the trace step once every stroke is shown', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Watch/ }).click()
  const toTrace = page.getByRole('button', { name: /Next: ✍️ Trace/ })
  await expect(toTrace).toHaveCount(0)
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next stroke' }).click()
  await toTrace.click()
  await expect(page.getByRole('tab', { name: /Trace/ })).toHaveAttribute('aria-selected', 'true')
})

test('replay at stroke 1 restarts the stroke animation', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Watch/ }).click()
  await expect(page.getByTestId('watch-progress')).toHaveText('1 / 3')
  const animated = await page.locator('.ref-stroke.animate').elementHandle()
  await page.getByRole('button', { name: 'Replay' }).click()
  // A new path element replays the CSS animation from the start.
  await expect.poll(() => animated!.evaluate(el => el.isConnected)).toBe(false)
  await expect(page.locator('.ref-stroke.animate')).toHaveCount(1)
})

test('a character opens on the trace step', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await expect(page.getByRole('tab', { name: /Trace/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('writing-box')).toBeVisible()
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
  await expect(page.getByRole('tab', { name: /Copy/ })).toHaveAttribute('aria-selected', 'true')
})

test('tracing a stroke backwards is rejected with a direction hint', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, [[...refStrokes('あ')[0]].reverse()])
  await expect(page.getByTestId('message')).toHaveText('↔️ Stroke 1 goes the other way')
  await expect(page.getByRole('button', { name: 'Undo stroke' })).toBeDisabled()
})

test('copy: a small, centered あ passes and shows the model', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Copy/ }).click()
  await expect(page.getByTestId('model')).toBeVisible()
  await drawStrokes(page, refStrokes('あ'), p => ({ x: 54.5 + (p.x - 54.5) * 0.6, y: 54.5 + (p.y - 54.5) * 0.6 }))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
  await expect(page.getByRole('button', { name: /Try again/ })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: /Test/ })).toHaveAttribute('aria-selected', 'true')
})

test('a passed test stays on the test step, and its tab starts it over', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Test/ }).click()
  await drawStrokes(page, refStrokes('あ'))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
  await expect(page.getByRole('button', { name: /Try again/ })).toHaveCount(0)
  await page.getByRole('tab', { name: /Test/ }).click()
  await expect(page.getByTestId('message')).toHaveText('')
  await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled()
})

test('a correct answer plays the pronunciation', async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = []
    Object.assign(window, { spoken })
    const fake = {
      getVoices: () => [{ lang: 'ja-JP', localService: true }],
      addEventListener() {}, removeEventListener() {}, cancel() {},
      speak: (u: { text: string }) => { spoken.push(u.text) },
    }
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { voice: unknown; lang = ''; rate = 1; constructor(public text: string) {} }, configurable: true })
  })
  const spoken = () => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken)
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await drawStrokes(page, refStrokes('あ'))
  await expect.poll(spoken).toEqual(['あ'])
  await expect(page.getByRole('tab', { name: /Copy/ })).toHaveAttribute('aria-selected', 'true')
  const [s1, s2, s3] = refStrokes('あ')
  await drawStrokes(page, [s2, s1, s3])
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
  expect(await spoken()).toEqual(['あ'])
})

test('test: swapped stroke order is reported on Normal', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Test/ }).click()
  await expect(page.getByTestId('model')).toHaveCount(0)
  const [s1, s2, s3] = refStrokes('あ')
  await drawStrokes(page, [s2, s1, s3])
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('do stroke 1 first')
  await page.getByRole('button', { name: /Try again/ }).click()
  await expect(page.getByTestId('message')).toHaveText('')
})

test('test: Easy level lets order mistakes pass as hints', async ({ page }) => {
  await page.goto(appUrl('settings'))
  await page.getByLabel(/Easy/).check()
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Test/ }).click()
  const [s1, s2, s3] = refStrokes('あ')
  await drawStrokes(page, [s2, s1, s3])
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
})

/** A single click inside the writing box: pointer down and up at the same spot, i.e. an accidental tap. */
async function tapBox(page: import('@playwright/test').Page) {
  const box = await page.getByTestId('writing-box').boundingBox()
  if (!box) throw new Error('writing box not visible')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('trace: an accidental tap is ignored, then tracing あ still earns the star', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Trace/ }).click()
  await tapBox(page)
  await expect(page.getByTestId('message')).toHaveText('')
  await expect(page.getByRole('button', { name: 'Undo stroke' })).toBeDisabled()
  await drawStrokes(page, refStrokes('あ'))
  await expect(page.getByTestId('message')).toHaveText('⭐ Traced!')
})

test('copy: taps before and between strokes are not counted as extra strokes', async ({ page }) => {
  await page.goto(appUrl('kana/hiragana/char/あ'))
  await page.getByRole('tab', { name: /Copy/ }).click()
  const [s1, s2, s3] = refStrokes('あ')
  await tapBox(page)
  await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled()
  await drawStrokes(page, [s1])
  await tapBox(page)
  await drawStrokes(page, [s2, s3])
  await tapBox(page)
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('message')).toContainText('✅ Correct!')
  await expect(page.getByTestId('message')).not.toContainText('extra')
})
