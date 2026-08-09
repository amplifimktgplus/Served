#!/usr/bin/env node
/**
 * Render the built page headless at the design width and pixel-diff it against
 * the Figma reference render. Also emits per-band match so regressions localise.
 *
 * usage: node verify.mjs [--width 1920] [--out _verify]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REF = path.join(HERE, '_reference', 'page-1x.png')
const PAGE = 'file://' + path.join(HERE, 'index.html')

const argv = process.argv.slice(2)
const getArg = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}
const WIDTH = Number(getArg('--width', 1920))
const OUT = path.join(HERE, getArg('--out', '_verify'))
fs.mkdirSync(OUT, { recursive: true })

const BANDS = [
  ['nav', 0, 78],
  ['hero', 78, 842],
  ['how-it-works', 843, 1497],
  ['featured', 1498, 2470],
  ['cta', 2471, 2995],
  ['footer', 2996, 3554],
]

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: WIDTH, height: 1080 },
  deviceScaleFactor: 1,
})
await page.goto(PAGE, { waitUntil: 'networkidle' })
// settle webfonts + any lazy paint
await page.evaluate(() => document.fonts && document.fonts.ready)
await page.waitForTimeout(600)

const shotPath = path.join(OUT, 'build-1x.png')
await page.screenshot({ path: shotPath, fullPage: true })

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))

const metrics = await page.evaluate(() => {
  const de = document.documentElement
  return {
    scrollWidth: de.scrollWidth,
    scrollHeight: de.scrollHeight,
    hOverflow: de.scrollWidth > de.clientWidth,
  }
})
await browser.close()

const ref = PNG.sync.read(fs.readFileSync(REF))
const build = PNG.sync.read(fs.readFileSync(shotPath))
console.log(`reference ${ref.width}x${ref.height}`)
console.log(`build     ${build.width}x${build.height}`)
console.log(`page metrics: scrollHeight=${metrics.scrollHeight} hOverflow=${metrics.hOverflow}`)
console.log(`height delta: ${build.height - ref.height}px`)

// Compare over the overlapping region so a height mismatch still yields a signal.
const W = Math.min(ref.width, build.width)
const H = Math.min(ref.height, build.height)
const crop = (src, w, h) => {
  const out = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (src.width * y + x) << 2
      const d = (w * y + x) << 2
      out.data[d] = src.data[s]
      out.data[d + 1] = src.data[s + 1]
      out.data[d + 2] = src.data[s + 2]
      out.data[d + 3] = 255
    }
  }
  return out
}
const a = crop(ref, W, H)
const b = crop(build, W, H)
const diff = new PNG({ width: W, height: H })
const bad = pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.12, includeAA: false })
fs.writeFileSync(path.join(OUT, 'diff.png'), PNG.sync.write(diff))
const overall = 1 - bad / (W * H)
console.log(`\nOVERALL MATCH ${(overall * 100).toFixed(3)}%  (${bad} px differ of ${W * H})`)

console.log('\nper-band:')
const rows = []
for (const [name, y0, y1] of BANDS) {
  const yy1 = Math.min(y1, H)
  if (y0 >= yy1) continue
  const h = yy1 - y0
  const sa = new PNG({ width: W, height: h })
  const sb = new PNG({ width: W, height: h })
  a.data.copy(sa.data, 0, y0 * W * 4, yy1 * W * 4)
  b.data.copy(sb.data, 0, y0 * W * 4, yy1 * W * 4)
  const d2 = new PNG({ width: W, height: h })
  const n = pixelmatch(sa.data, sb.data, d2.data, W, h, { threshold: 0.12, includeAA: false })
  const m = 1 - n / (W * h)
  rows.push({ name, y0, y1: yy1, match: m })
  const bar = '█'.repeat(Math.round(m * 40)).padEnd(40, '·')
  console.log(`  ${name.padEnd(14)} y${String(y0).padStart(5)}-${String(yy1).padStart(5)}  ${bar} ${(m * 100).toFixed(2)}%`)
}
fs.writeFileSync(
  path.join(OUT, 'report.json'),
  JSON.stringify({ overall, bands: rows, metrics, consoleErrors, refH: ref.height, buildH: build.height }, null, 2)
)
console.log(`\nartifacts -> ${OUT}`)
if (consoleErrors.length) console.log('console errors:', consoleErrors)
