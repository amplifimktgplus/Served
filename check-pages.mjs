#!/usr/bin/env node
/* Whole-site gate: console errors, broken images, horizontal overflow at four
   breakpoints, dead internal links, and an end-to-end drive of the booking funnel. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const url = (f) => 'file://' + path.join(HERE, f)
const PAGES = fs.readdirSync(HERE).filter((f) => f.endsWith('.html')).sort()
const WIDTHS = [1920, 1280, 768, 430]

const browser = await chromium.launch()
let fail = 0
const note = (ok, msg) => { if (!ok) fail++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`) }

console.log(`=== ${PAGES.length} pages × ${WIDTHS.length} widths ===\n`)

for (const f of PAGES) {
  const errs = [], broken = [], overflow = []
  let links = []
  for (const w of WIDTHS) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })
    p.on('console', (m) => m.type() === 'error' && errs.push(`${w}px ${m.text()}`))
    p.on('pageerror', (e) => errs.push(`${w}px ${e.message}`))
    await p.goto(url(f), { waitUntil: 'networkidle' })
    await p.evaluate(() => document.fonts && document.fonts.ready)
    await p.waitForTimeout(250)
    const r = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      imgs: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      hasNav: !!document.querySelector('.nav__logo, .admin__side, .auth'),
      hasFoot: !!document.querySelector('.foot, .admin__side, .auth'),
    }))
    if (r.sw > r.cw) overflow.push(`${w}px (${r.sw}>${r.cw})`)
    r.imgs.forEach((s) => broken.includes(s) || broken.push(s))
    if (w === 1920) { links = r.links; note(r.hasNav && r.hasFoot, `${f} — chrome rendered`) }
    await p.close()
  }
  console.log(`${f}`)
  note(errs.length === 0, `${f} — console/page errors: ${errs.length}${errs.length ? ' → ' + errs.slice(0, 2).join(' | ') : ''}`)
  note(broken.length === 0, `${f} — broken images: ${broken.length}${broken.length ? ' → ' + broken.join(', ') : ''}`)
  note(overflow.length === 0, `${f} — h-overflow: ${overflow.join(', ') || 'none'}`)

  const dead = links
    .filter((h) => h && !h.startsWith('#') && !h.startsWith('http') && !h.startsWith('mailto'))
    .map((h) => h.split('?')[0].split('#')[0])
    .filter((h, i, a) => a.indexOf(h) === i)
    .filter((h) => !fs.existsSync(path.join(HERE, h)))
  note(dead.length === 0, `${f} — dead internal links: ${dead.join(', ') || 'none'}`)
  console.log('')
}

/* ---------------------------------------------- end-to-end funnel drive */
console.log('=== booking funnel end-to-end ===')
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))

  await p.goto(url('courts.html'), { waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  const rows = await p.locator('.lrow').count()
  note(rows === 6, `listing renders all venues (got ${rows})`)

  await p.selectOption('#f-surf', 'Wood')
  await p.waitForTimeout(150)
  const filtered = await p.locator('.lrow').count()
  note(filtered === 2, `surface filter narrows to 2 wood venues (got ${filtered})`)
  await p.click('#f-reset'); await p.waitForTimeout(150)
  note((await p.locator('.lrow').count()) === 6, 'reset restores all rows')

  await p.click('.lrow:first-child :is(h2,h3) a')
  await p.waitForLoadState('networkidle')
  note(/court-.*\.html/.test(p.url()), `court page opened (${p.url().split('/').pop()})`)

  await p.click('text=Check Availability')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('booking-calendar'), 'reached availability calendar')
  const free = await p.locator('#cal button.is-free').count()
  note(free === 18, `calendar shows 18 available days (got ${free})`)

  await p.locator('#cal button.is-free', { hasText: /^15$/ }).click()
  await p.waitForTimeout(150)
  note((await p.textContent('#chosen')) === '15 August 2026', 'date selection registers')

  await p.click('#to-time')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('booking-time'), 'reached time selection')
  const disabled = await p.locator('#slots button[disabled]').count()
  note(disabled === 3, `Court A shows 3 taken slots (got ${disabled})`)

  await p.locator('#slots button:not([disabled])').first().click()
  await p.selectOption('#dur', '2')
  await p.waitForTimeout(150)
  const total = await p.textContent('#sum-total')
  note(total === '₱1,400', `2h total computes to ₱1,400 (got ${total})`)

  await p.click('#to-pay')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('checkout'), 'reached checkout')
  note((await p.textContent('#s-total')) === '₱1,400', 'checkout carries the total')

  await p.click('button[type=submit]'); await p.waitForTimeout(250)
  const badCount = await p.locator('.field.is-bad').count()
  note(badCount === 5, `empty submit flags all 5 fields (got ${badCount})`)

  // ---- PH payment methods: the chooser must swap panels AND scope validation
  const METHODS = [['gcash', 'GCash'], ['maya', 'Maya'], ['qrph', 'QR Ph'],
                   ['bank', 'Online banking'], ['card', 'Card']]
  note((await p.locator('.pay-methods [data-pm]').count()) === 5, 'five payment methods offered')
  let swapOk = true, sumOk = true
  for (const [key, label] of METHODS) {
    await p.click('#tab-' + key); await p.waitForTimeout(140)
    const vis = await p.evaluate(() => [...document.querySelectorAll('.pay-panel')].filter((x) => !x.hidden).map((x) => x.id))
    if (vis.length !== 1 || vis[0] !== 'pm-' + key) swapOk = false
    if ((await p.textContent('#s-method')) !== label) sumOk = false
  }
  note(swapOk, 'each method shows exactly its own panel')
  note(sumOk, 'order summary tracks the selected method')
  // hidden panels must not block submit — this was the assembly blocker
  await p.click('#tab-gcash'); await p.waitForTimeout(140)
  await p.click('button[type=submit]'); await p.waitForTimeout(250)
  const gflags = await p.evaluate(() => [...document.querySelectorAll('.field.is-bad')].map((f) => (f.querySelector('input,select') || {}).id))
  note(gflags.length === 2 && gflags.includes('gcash-mobile') && gflags.includes('c-mail'),
    `GCash submit validates only its own panel + shared email (got ${gflags.join(',')})`)
  await p.fill('#gcash-mobile', '9171234567')
  note((await p.inputValue('#gcash-mobile')) === '0917 123 4567', 'PH mobile mask normalises to 09XX XXX XXXX')
  await p.click('#tab-card'); await p.waitForTimeout(140)

  await p.fill('#c-name', 'Juan Dela Cruz')
  await p.fill('#c-num', '4242424242424242')
  await p.fill('#c-exp', '0428')
  await p.fill('#c-cvv', '123')
  await p.fill('#c-mail', 'juan@email.com')
  await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(400)
  note(p.url().includes('confirmation'), 'reached confirmation')
  const ref = await p.textContent('#r-ref')
  note(/^PB-202608\d{2}$/.test(ref || ''), `booking reference generated (${ref})`)
  note((await p.textContent('#r-total')) === '₱1,400', 'confirmation shows the paid total')
  note((await p.textContent('#r-method') || '').length > 0, `confirmation reports the payment method (${await p.textContent('#r-method')})`)
  const qrPainted = await p.evaluate(() => {
    const c = document.getElementById('qr')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let dark = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++
    return dark
  })
  note(qrPainted > 1000, `check-in code rendered (${qrPainted} dark px)`)
  note(errs.length === 0, `funnel console errors: ${errs.length}${errs.length ? ' → ' + errs[0] : ''}`)
  await p.close()
}

/* -------------------------------------------------- account + admin tabs */
console.log('\n=== tabbed app surfaces ===')
for (const [f, n] of [['account.html', 4], ['admin.html', 4]]) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await p.goto(url(f), { waitUntil: 'networkidle' }); await p.waitForTimeout(250)
  const btns = await p.locator('[data-view]').count()
  note(btns === n, `${f} — ${n} tabs present (got ${btns})`)
  let allSwitch = true
  for (let i = 0; i < btns; i++) {
    await p.locator('[data-view]').nth(i).click()
    await p.waitForTimeout(120)
    const vis = await p.locator('.view.is-on').count()
    if (vis !== 1) allSwitch = false
  }
  note(allSwitch, `${f} — every tab shows exactly one view`)
  await p.close()
}

await browser.close()
console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}`)
process.exit(fail ? 1 : 0)
