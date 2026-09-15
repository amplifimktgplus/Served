#!/usr/bin/env node
/**
 * Identify the design typeface by fitting rendered string widths to widths
 * measured off the Figma render.
 *
 * Width scales linearly with font-size, so for each measured string
 *     solvedSize = probeSize * (targetWidth / renderedWidth)
 * A family that IS the design font will produce the SAME solved size for every
 * string sharing a role. Within-role variance is therefore the discriminator.
 * Each family is verified to have actually applied (vs silently falling back).
 */
import { chromium } from 'playwright'

const TARGETS = [
  ['h1', 'Choose Your Court', 527.0, 700],
  ['h1', 'Get Ready To Play.', 528.4, 700],
  ['h2', 'How Served. Works', 284.7, 700],
  ['h2', 'Featured Venues', 246.0, 700],
  ['cta', 'We Already', 292.9, 700],
  ['cta', 'Built The Traffic.', 415.8, 700],
  ['cta', 'You Bring The Court.', 514.1, 700],
  ['sub', 'Book a court, run your game, no calls, no waiting, no hassle.', 521.8, 400],
  ['sub', 'Advanced sports venues offer the latest facilities, dynamic and unique', 612.3, 400],
  ['sub', 'No calls, no waiting, no guesswork. Book instantly and get on the court in minutes.', 715.0, 400],
  ['cardtitle', 'Vantage Pickleball Marikina', 289.0, 700],
  ['cardtitle', 'Pico De Loro Badminton Court', 306.0, 700],
]

const FAMILIES = [
  'Poppins', 'Outfit', 'Urbanist', 'Kumbh Sans', 'Montserrat', 'Jost',
  'Plus Jakarta Sans', 'Figtree', 'DM Sans', 'Manrope', 'Sora', 'Lexend', 'Raleway',
]
const PROBE = 100

const href =
  'https://fonts.googleapis.com/css2?' +
  FAMILIES.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`).join('&') +
  '&display=block'

// Fetch the CSS server-side and inline it, so it is same-origin (cssRules on a
// cross-origin sheet throws SecurityError). A modern UA is required to be served woff2.
const cssText = await fetch(href, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  },
}).then((r) => r.text())
console.log(`google fonts css: ${cssText.length} bytes, ${(cssText.match(/@font-face/g) || []).length} faces`)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(
  `<!doctype html><html><head><style>${cssText}</style></head>
   <body><span id="m" style="position:absolute;white-space:pre;visibility:hidden;font-size:${PROBE}px"></span></body></html>`,
  { waitUntil: 'networkidle' }
)

const measure = (fam, text, weight) =>
  page.evaluate(({ fam, text, weight, PROBE }) => {
    const m = document.getElementById('m')
    m.style.fontFamily = fam
    m.style.fontWeight = weight
    m.style.fontSize = PROBE + 'px'
    m.style.letterSpacing = 'normal'
    m.textContent = text
    return m.getBoundingClientRect().width
  }, { fam, text, weight, PROBE })

// load + verify each family really applies
const ok = []
for (const f of FAMILIES) {
  await page.evaluate((f) => Promise.all([
    document.fonts.load(`400 100px "${f}"`), document.fonts.load(`700 100px "${f}"`),
  ]).catch(() => {}), f)
  const a = await measure(`"${f}", monospace`, 'Handgloves Wm 0123', 700)
  const b = await measure('monospace', 'Handgloves Wm 0123', 700)
  if (Math.abs(a - b) > 0.5) ok.push(f)
  else console.log(`  ! ${f} did not apply (fell back) — excluded`)
}
console.log(`\nfamilies applied: ${ok.join(', ')}\n`)

const results = []
for (const fam of ok) {
  const solved = {}
  for (const [role, text, target, weight] of TARGETS) {
    const w = await measure(`"${fam}"`, text, weight)
    ;(solved[role] ||= []).push({ text, target, size: (PROBE * target) / w })
  }
  // score = mean within-role coefficient of variation of the solved size
  let cvs = []
  const roleAvg = {}
  for (const [role, list] of Object.entries(solved)) {
    const sizes = list.map((s) => s.size)
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length
    const sd = Math.sqrt(sizes.reduce((a, b) => a + (b - mean) ** 2, 0) / sizes.length)
    roleAvg[role] = mean
    cvs.push(sd / mean)
  }
  results.push({ fam, score: cvs.reduce((a, b) => a + b, 0) / cvs.length, roleAvg, solved })
}

results.sort((a, b) => a.score - b.score)
console.log('family              within-role size consistency (lower = better)   solved sizes')
for (const r of results) {
  const sizes = Object.entries(r.roleAvg).map(([k, v]) => `${k}:${v.toFixed(1)}`).join('  ')
  console.log(`  ${r.fam.padEnd(19)} ${(r.score * 100).toFixed(2).padStart(6)}%    ${sizes}`)
}

const best = results[0]
console.log(`\n=== BEST FIT: ${best.fam} ===`)
for (const [role, list] of Object.entries(best.solved)) {
  console.log(` ${role}:`)
  for (const s of list) console.log(`    ${s.size.toFixed(2).padStart(7)}px  "${s.text.slice(0, 52)}"`)
}
await browser.close()
