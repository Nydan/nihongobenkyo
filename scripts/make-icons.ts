import { webkit } from '@playwright/test'

const html = (size: number) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#ff7043;display:flex;align-items:center;justify-content:center;
font:bold ${Math.round(size * 0.62)}px 'Hiragino Maru Gothic ProN','Hiragino Sans',sans-serif;color:#fff">あ</div></body></html>`

const browser = await webkit.launch()
const page = await browser.newPage()
for (const size of [180, 512]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(html(size))
  await page.screenshot({ path: `public/icon-${size}.png`, clip: { x: 0, y: 0, width: size, height: size } })
}
await browser.close()
console.log('Wrote public/icon-180.png and public/icon-512.png')
