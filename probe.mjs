#!/usr/bin/env node
/** Report built-page geometry vs the measured design targets. */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await page.goto('file://' + path.join(HERE, 'index.html'), { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

// selector -> [expected x, y, w, h] measured off page-1x.png (null = don't care)
const T = {
  '.nav':                 [0, 0, 1920, 75],
  '.nav__logo img':       [31, 18, 123, null],
  '.nav__links a.is-active': [513, null, null, null],
  '.nav__actions .btn--orange': [1511, 15, 188, 44],
  '.nav__actions .btn--ghost':  [1709, 15, 182, 44],
  '.hero':                [0, 75, 1920, 768],
  '.hero__eyebrow':       [318, null, null, null],
  '.hero__title':         [318, null, null, null],
  '.hero__sub':           [318, null, null, null],
  '.search':              [318, 525, 746, 84],
  '.search__btn':         [994, 535, 60, 64],
  '.hiw':                 [0, 843, 1920, 655],
  '.hiw .sec-title':      [null, null, null, null],
  '.hiw-card':            [312, 1048, 416, 348],
  '.hiw-card__tile':      [475, 1066, 90, 90],
  '.hiw-card .btn--wide1':[336, 1312, 368, 54],
  '.feat':                [0, 1498, 1920, 973],
  '.venue':               [312, 1761, 416, 579],
  '.venue__media':        [312, 1761, 416, 260],
  '.chip--blue':          [336, 1783, null, 34],
  '.venue__rate .score':  [336, 2045, 40, 32],
  '.btn--book':           [449, 2274, 142, 43],
  '.btn--viewall':        [859, 2381, 203, 47],
  '.cta':                 [0, 2471, 1920, 525],
  '.cta__panel':          [437, 2568, 1100, 392],
  '.cta__pill':           [473, 2613, 221, 48],
  '.btn--join':           [1133, 2872, 312, 44],
  '.foot':                [0, 2996, 1920, 558],
  '.foot__logo':          [153, 3250, 282, 87],
  '.foot__col--info h4':  [898, 3248, null, null],
  '.foot__bar':           [null, 3462, null, null],
}

const rows = await page.evaluate((T) => {
  const out = []
  for (const [sel, exp] of Object.entries(T)) {
    const el = document.querySelector(sel)
    if (!el) { out.push({ sel, missing: true }); continue }
    const r = el.getBoundingClientRect()
    out.push({
      sel, exp,
      got: [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)],
    })
  }
  return out
}, T)

const L = ['x', 'y', 'w', 'h']
console.log('selector                          |  field  expect     got    delta')
console.log('-'.repeat(72))
for (const r of rows) {
  if (r.missing) { console.log(`${r.sel.padEnd(33)} | MISSING`); continue }
  const bad = []
  r.exp.forEach((e, i) => {
    if (e == null) return
    const d = r.got[i] - e
    if (Math.abs(d) > 1) bad.push(`${L[i]}: ${String(e).padStart(6)} ${String(r.got[i]).padStart(7)} ${(d > 0 ? '+' : '') + d}`)
  })
  if (!bad.length) console.log(`${r.sel.padEnd(33)} | OK`)
  else bad.forEach((b, i) => console.log(`${(i ? '' : r.sel).padEnd(33)} |  ${b}`))
}
await browser.close()
