#!/usr/bin/env node
/**
 * Type auto-tuner. For each text style, render the exact string with the
 * element's CURRENT computed font and compare to the width measured off the
 * design render. Width scales linearly with font-size, so the corrected size
 * is  currentSize * (targetWidth / renderedWidth).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))

// [label, selector to inherit font from, exact string, measured design ink width]
const CASES = [
  ['nav link',        '.nav__links a:last-child', 'Contact Us', 78],
  ['hero eyebrow',    '.hero__eyebrow', 'Every court. One tap away.', 239.4],
  ['hero h1',         '.hero__title', 'Choose Your Court', 527.0],
  ['hero sub',        '.hero__sub', 'No calls, no waiting, no guesswork. Book instantly and get on the court in minutes.', 715.0],
  ['search label',    '.search__field label', 'Enter Court Name', 158],
  ['sec title',       '.hiw .sec-title', 'How Served. Works', 284.7],
  ['sec title 2',     '.feat .sec-title', 'Featured Venues', 246.0],
  ['sec sub',         '.hiw .sec-sub', 'Book a court, run your game, no calls, no waiting, no hassle.', 521.8],
  ['sec sub 2',       '.feat .sec-sub', 'Advanced sports venues offer the latest facilities, dynamic and unique', 612.3],
  ['hiw card title',  '.hiw-card h3', 'The Sign Up', 128],
  ['hiw card title2', '.hiw-card:nth-child(2) h3', 'Find Your Court', 166],
  ['hiw card body',   '.hiw-card p', 'Create your account in seconds. Register as a', 318],
  ['hiw btn',         '.hiw-card .btn', 'Register Now', 114],
  ['venue title',     '.venue h3', 'Vantage Pickleball Marikina', 301],
  ['venue title3',    '.venue:nth-child(3) h3', 'Pico De Loro Badminton Court', 325],
  ['venue body',      '.venue__body > p', 'Sed ut perspiciatis unde omnis iste natus error sit', 341],
  ['venue meta',      '.venue__meta', 'Next availablity : 30 August 2026', 188],
  ['book now',        '.btn--book', 'Book Now', 66],
  ['view all',        '.btn--viewall', 'View All Featured', 126],
  ['cta pill',        '.cta__pill', 'REGISTER YOUR COURT', 184],
  ['cta title',       '.cta__title', 'We Already', 292.9],
  ['cta title3',      '.cta__title', 'You Bring The Court.', 514.1],
  ['cta body',        '.cta__body', 'Skip the cost of building your own booking site and running', 512],
  ['cta benefit',     '.cta__benefits li', 'Increase Booking Volume', 176.7],
  ['foot head',       '.foot__col h4', 'INFO', 41],
  ['foot link',       '.foot__links a', 'Home', 48],
  ['foot link2',      '.foot__links a', 'Court Gallery', 109],
  ['foot blurb',      '.foot__brand p', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut', 504],
  ['foot copyright',  '.foot__bar p', '© Copyright - 2026 Served. All Rights Reserved.', 324],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await page.goto('file://' + path.join(HERE, 'index.html'), { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)

const rows = await page.evaluate((CASES) => {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;left:-9999px;white-space:pre;visibility:hidden'
  document.body.appendChild(probe)
  return CASES.map(([label, sel, text, target]) => {
    const el = document.querySelector(sel)
    if (!el) return { label, missing: sel }
    const cs = getComputedStyle(el)
    probe.style.fontFamily = cs.fontFamily
    probe.style.fontWeight = cs.fontWeight
    probe.style.fontSize = cs.fontSize
    probe.style.fontStyle = cs.fontStyle
    probe.style.letterSpacing = cs.letterSpacing
    probe.style.textTransform = cs.textTransform
    probe.textContent = text
    const w = probe.getBoundingClientRect().width
    const size = parseFloat(cs.fontSize)
    return { label, size, weight: cs.fontWeight, ls: cs.letterSpacing, rendered: +w.toFixed(1), target, solved: +((size * target) / w).toFixed(2) }
  })
}, CASES)

console.log('style             cur  wt   rendered  target   SOLVED   delta')
console.log('-'.repeat(66))
for (const r of rows) {
  if (r.missing) { console.log(`${r.label.padEnd(17)} MISSING ${r.missing}`); continue }
  const d = r.solved - r.size
  const flag = Math.abs(d) >= 0.6 ? (d > 0 ? ' ^^' : ' vv') : ''
  console.log(
    `${r.label.padEnd(17)} ${String(r.size).padStart(4)} ${String(r.weight).padStart(3)} ` +
    `${String(r.rendered).padStart(9)} ${String(r.target).padStart(7)} ${String(r.solved).padStart(8)}  ${d >= 0 ? '+' : ''}${d.toFixed(2)}${flag}`
  )
}
await browser.close()
