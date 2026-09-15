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

/* Authored sections (`.own`) are NOT in the Figma reference. They are inserted
   at this y in reference coordinates, so every band at or below it is compared
   against the build shifted down by the inserted height. Bands above it compare
   directly. That keeps all six cloned bands honestly diffed against the design
   while the authored content is reported separately, never scored against it. */
const INSERT_AT = 843

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: WIDTH, height: 1080 },
  deviceScaleFactor: 1,
})
// registered before navigation — attaching it after the screenshot (as this
// previously did) meant load-time errors were never seen
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

await page.goto(PAGE, { waitUntil: 'networkidle' })
// settle webfonts + any lazy paint
await page.evaluate(() => document.fonts && document.fonts.ready)
await page.waitForTimeout(600)

const shotPath = path.join(OUT, 'build-1x.png')
await page.screenshot({ path: shotPath, fullPage: true })

const metrics = await page.evaluate(() => {
  const de = document.documentElement
  const own = [...document.querySelectorAll('.own')]
  return {
    scrollWidth: de.scrollWidth,
    scrollHeight: de.scrollHeight,
    hOverflow: de.scrollWidth > de.clientWidth,
    authoredCount: own.length,
    authoredH: Math.round(own.reduce((n, el) => n + el.getBoundingClientRect().height, 0)),
  }
})
await browser.close()

const ref = PNG.sync.read(fs.readFileSync(REF))
const build = PNG.sync.read(fs.readFileSync(shotPath))
console.log(`reference ${ref.width}x${ref.height}`)
console.log(`build     ${build.width}x${build.height}`)
console.log(`page metrics: scrollHeight=${metrics.scrollHeight} hOverflow=${metrics.hOverflow}`)

const W = Math.min(ref.width, build.width)
const OFFSET = build.height - ref.height

// The cloned content must still be exactly the reference height: anything the
// build gained has to be accounted for by the authored sections, to the pixel.
const accounted = OFFSET === metrics.authoredH
console.log(
  `authored insert: +${OFFSET}px across ${metrics.authoredCount} .own section(s)` +
  ` — measured ${metrics.authoredH}px ${accounted ? '(accounted for)' : '*** UNACCOUNTED ***'}`
)
if (!accounted) {
  console.log(`  cloned content drifted by ${OFFSET - metrics.authoredH}px — this is a real regression`)
}

// Lift one band out of a page at an arbitrary y, into a W-wide buffer.
const bandOf = (src, y0, y1) => {
  const h = y1 - y0
  const out = new PNG({ width: W, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) {
      const s = (src.width * (y0 + y) + x) << 2
      const d = (W * y + x) << 2
      out.data[d] = src.data[s]
      out.data[d + 1] = src.data[s + 1]
      out.data[d + 2] = src.data[s + 2]
      out.data[d + 3] = 255
    }
  }
  return out
}

console.log('\nper-band (vs the Figma render; bands below the insert are offset):')
const rows = []
const diff = new PNG({ width: W, height: ref.height })
let totalBad = 0
let totalPx = 0
for (const [name, y0, y1] of BANDS) {
  const shift = y0 >= INSERT_AT ? OFFSET : 0
  if (y1 > ref.height || y1 + shift > build.height) {
    console.log(`  ${name.padEnd(14)} SKIPPED — band falls outside one of the images`)
    continue
  }
  const h = y1 - y0
  const sa = bandOf(ref, y0, y1)
  const sb = bandOf(build, y0 + shift, y1 + shift)
  const d2 = new PNG({ width: W, height: h })
  const n = pixelmatch(sa.data, sb.data, d2.data, W, h, { threshold: 0.12, includeAA: false })
  d2.data.copy(diff.data, y0 * W * 4)
  const m = 1 - n / (W * h)
  totalBad += n
  totalPx += W * h
  rows.push({ name, y0, y1, shift, match: m })
  const bar = '█'.repeat(Math.round(m * 40)).padEnd(40, '·')
  console.log(
    `  ${name.padEnd(14)} y${String(y0).padStart(5)}-${String(y1).padStart(5)}` +
    `${shift ? ` +${String(shift).padStart(4)}` : '      '}  ${bar} ${(m * 100).toFixed(2)}%`
  )
}
fs.writeFileSync(path.join(OUT, 'diff.png'), PNG.sync.write(diff))

// Overall is the aggregate of the cloned bands only — the authored section has
// nothing in the reference to be scored against, so including it would be noise.
const overall = totalPx ? 1 - totalBad / totalPx : 0
console.log(`\nOVERALL MATCH ${(overall * 100).toFixed(3)}%  (${totalBad} px differ of ${totalPx} cloned)`)
console.log(`  authored section excluded from the score (${W * OFFSET} px, nothing to compare against)`)

fs.writeFileSync(
  path.join(OUT, 'report.json'),
  JSON.stringify(
    {
      overall, bands: rows, metrics, consoleErrors,
      refH: ref.height, buildH: build.height,
      authoredH: metrics.authoredH, heightAccounted: accounted,
    },
    null, 2
  )
)
console.log(`\nartifacts -> ${OUT}`)
if (consoleErrors.length) console.log('console errors:', consoleErrors)
