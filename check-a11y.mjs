#!/usr/bin/env node
/* Accessibility gate: names, heading order, hit areas, focus visibility and the
   mobile drawer (open / Esc / focus trap / scroll lock) across every page. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const url = (f) => 'file://' + path.join(HERE, f)
const PAGES = fs.readdirSync(HERE).filter((f) => f.endsWith('.html')).sort()

const browser = await chromium.launch()
let fail = 0
const note = (ok, msg) => { if (!ok) fail++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`) }

console.log('=== static a11y across all pages ===')
let unnamed = 0, jumps = [], small = 0, noSkip = []
for (const f of PAGES) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(url(f), { waitUntil: 'networkidle' })
  await p.waitForTimeout(220)
  const r = await p.evaluate(() => {
    const out = { unnamed: [], heads: [], small: [], skip: !!document.querySelector('a.skip') }
    document.querySelectorAll('button,a').forEach((el) => {
      const t = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title')
      if (!t) out.unnamed.push(el.tagName + '.' + (typeof el.className === 'string' ? el.className.slice(0, 22) : ''))
    })
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => out.heads.push(+h.tagName[1]))
    document.querySelectorAll('.nav__links a, .foot__links a, .foot__social a, .crumb a').forEach((el) => {
      // effective pointer target includes the ::after overlay
      const r = el.getBoundingClientRect()
      const after = getComputedStyle(el, '::after')
      const grow = (v) => Math.abs(parseFloat(v) || 0)
      const h = r.height + grow(after.top) + grow(after.bottom)
      const w = r.width + grow(after.left) + grow(after.right)
      if (h < 24 || w < 24) out.small.push(`${el.textContent.trim().slice(0, 14)} ${Math.round(w)}x${Math.round(h)}`)
    })
    return out
  })
  unnamed += r.unnamed.length
  small += r.small.length
  if (!r.skip) noSkip.push(f)
  let prev = 0
  for (const h of r.heads) { if (prev && h > prev + 1) jumps.push(`${f} h${prev}->h${h}`); prev = h }
  await p.close()
}
note(unnamed === 0, `links/buttons without an accessible name: ${unnamed}`)
note(jumps.length === 0, `heading-level jumps: ${jumps.length}${jumps.length ? ' → ' + jumps.slice(0, 3).join(', ') : ''}`)
note(small === 0, `nav/footer hit areas under 24px: ${small}`)
note(noSkip.length === 0, `pages without a skip link: ${noSkip.join(', ') || 'none'}`)

console.log('\n=== focus visibility ===')
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(url('courts.html'), { waitUntil: 'networkidle' }); await p.waitForTimeout(250)
  const r = await p.evaluate(() => {
    const out = []
    for (const sel of ['.nav__links a', '.btn--orange', '.field select', '.foot__links a']) {
      const el = document.querySelector(sel)
      if (!el) { out.push([sel, 'missing']); continue }
      el.focus()
      const cs = getComputedStyle(el)
      const w = parseFloat(cs.outlineWidth) || 0
      out.push([sel, cs.outlineStyle !== 'none' && w >= 2 ? 'ring ' + cs.outlineWidth : 'NONE'])
    }
    return out
  })
  r.forEach(([s, v]) => note(v.startsWith('ring'), `focus ring on ${s}: ${v}`))
  await p.close()
}

console.log('\n=== mobile drawer (390px) ===')
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } })
  await p.goto(url('courts.html'), { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  note(await p.locator('.nav__burger').isVisible(), 'burger visible below 1120px')
  note(!(await p.locator('.drawer').isVisible()), 'drawer closed on load')
  await p.click('.nav__burger'); await p.waitForTimeout(280)
  note(await p.locator('.drawer').isVisible(), 'drawer opens')
  note((await p.getAttribute('.nav__burger', 'aria-expanded')) === 'true', 'aria-expanded flips to true')
  const nLinks = await p.locator('.drawer__panel a.d-link').count()
  note(nLinks === 5, `drawer carries all 5 nav links (got ${nLinks})`)
  const nCta = await p.locator('.drawer__cta .btn').count()
  note(nCta === 2, `drawer carries both CTAs (got ${nCta})`)
  note(await p.evaluate(() => document.body.classList.contains('has-drawer')), 'body scroll locked')
  note(await p.evaluate(() => document.activeElement.classList.contains('drawer__close')), 'focus moved into the drawer')

  // focus trap: shift-tab from the first control must wrap to the last
  await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift')
  const wrapped = await p.evaluate(() => {
    const f = [...document.querySelectorAll('.drawer__panel a[href], .drawer__panel button')]
    return document.activeElement === f[f.length - 1]
  })
  note(wrapped, 'shift+tab wraps to the last control (focus trapped)')

  await p.keyboard.press('Escape'); await p.waitForTimeout(280)
  note(!(await p.locator('.drawer').isVisible()), 'Escape closes the drawer')
  note(await p.evaluate(() => document.activeElement.classList.contains('nav__burger')), 'focus returns to the burger')
  note(!(await p.evaluate(() => document.body.classList.contains('has-drawer'))), 'scroll lock released')
  await p.close()
}

console.log('\n=== drawer present on every page with a nav ===')
for (const f of PAGES) {
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } })
  await p.goto(url(f), { waitUntil: 'networkidle' }); await p.waitForTimeout(220)
  const hasNav = await p.locator('.nav__inner').count()
  if (hasNav) {
    const ok = await p.locator('.nav__burger').isVisible()
    note(ok, `${f} — burger present`)
  }
  await p.close()
}

await browser.close()
console.log(`\n${fail === 0 ? 'A11Y CHECKS PASSED' : fail + ' A11Y CHECK(S) FAILED'}`)
process.exit(fail ? 1 : 0)
