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
// Pages that intentionally render without the shared site header.
const NO_HEADER = /^court-.+\.html$/
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
    if (w === 1920) {
      links = r.links
      // Individual court pages deliberately ship without the site header; the
      // breadcrumb carries navigation. Assert that intent rather than weaken
      // the check, so an accidentally-missing header still fails elsewhere and
      // an accidentally-restored one fails here.
      if (NO_HEADER.test(f)) note(!r.hasNav && r.hasFoot, `${f} — header intentionally absent, footer rendered`)
      else note(r.hasNav && r.hasFoot, `${f} — chrome rendered`)
    }
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

  // multi-select: two slots on Court A is two hours, no duration control
  note((await p.locator('#dur').count()) === 0, 'duration dropdown is gone — slots carry the hours')
  note((await p.locator('#to-pay.is-off').count()) === 1, 'continue is disabled with nothing picked')

  await p.locator('#slots button:not([disabled])').nth(0).click()
  await p.waitForTimeout(80)
  note((await p.textContent('#sum-total')) === '₱700', '1 slot = ₱700')
  await p.locator('#slots button:not([disabled])').nth(1).click()
  await p.waitForTimeout(120)
  const total = await p.textContent('#sum-total')
  note(total === '₱1,400', `2 slots total ₱1,400 (got ${total})`)
  note((await p.locator('#picks li').count()) === 2, 'both picks listed in the summary')

  // toggling the same slot off, then back on, must not double-count
  await p.locator('#slots button.is-sel').first().click(); await p.waitForTimeout(100)
  note((await p.textContent('#sum-total')) === '₱700', 'tapping a picked slot removes it')
  await p.locator('#slots button:not([disabled])').nth(0).click(); await p.waitForTimeout(100)
  note((await p.textContent('#sum-total')) === '₱1,400', 're-picking restores the total')

  await p.click('#to-pay')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('checkout'), 'reached checkout')
  // rates are quoted exclusive of tax and fees, so checkout adds both on top
  note((await p.textContent('#s-sub')) === '₱1,400', 'checkout carries the subtotal')
  note((await p.textContent('#s-vat')) === '₱168', '12% VAT on ₱1,400 is ₱168')
  note((await p.textContent('#s-fee')) === '₱70', '5% processing fee on ₱1,400 is ₱70')
  note((await p.textContent('#s-total')) === '₱1,638', 'total is subtotal + VAT + fee')
  const shown = await p.evaluate(() => ['#s-sub', '#s-vat', '#s-fee', '#s-total']
    .map((s) => +document.querySelector(s).textContent.replace(/[^\d]/g, '')))
  note(shown[0] + shown[1] + shown[2] === shown[3], 'the displayed lines add up to the displayed total')

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
  note((await p.textContent('#r-total')) === '₱1,638', 'confirmation shows the same grand total as checkout')
  note((await p.textContent('#r-sub')) === '₱1,400', 'confirmation shows the subtotal')
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

/* ------------------------------------- multi-court booking across the funnel */
console.log('\n=== booking several courts at once ===')
{
  const errs = []
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))

  await p.goto(url('courts.html'), { waitUntil: 'networkidle' })
  await p.locator('.lrow__side a.btn').first().click()
  await p.waitForLoadState('networkidle')
  await p.click('a[href^="booking-calendar"]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(200)
  await p.locator('#cal button.is-free', { hasText: /^15$/ }).click()
  await p.click('#to-time')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)

  // two hours on Court A, one on Court C — picks must survive switching court
  await p.locator('#slots button:not([disabled])').nth(0).click()
  await p.locator('#slots button:not([disabled])').nth(1).click()
  await p.waitForTimeout(100)
  await p.locator('#courts button', { hasText: 'Court C' }).click()
  await p.waitForTimeout(120)
  note((await p.locator('#picks li').count()) === 2, 'picks survive switching court')
  note((await p.locator('#slots button.is-sel').count()) === 0, 'slot grid shows the new court, not the old picks')
  await p.locator('#slots button:not([disabled])').nth(0).click()
  await p.waitForTimeout(120)
  note((await p.locator('#picks li').count()) === 3, '3 picks across 2 courts')
  const t3 = await p.textContent('#sum-total')
  note(t3 === '₱2,100', `3 slots total ₱2,100 (got ${t3})`)

  // remove one straight from the summary list
  await p.locator('#picks button[data-rm]').first().click()
  await p.waitForTimeout(120)
  note((await p.locator('#picks li').count()) === 2, 'summary remove button drops a pick')
  note((await p.textContent('#sum-total')) === '₱1,400', 'total follows the removal')

  // put it back, then carry all three through to confirmation
  await p.locator('#courts button', { hasText: 'Court A' }).click()
  await p.waitForTimeout(100)
  await p.locator('#slots button:not([disabled])').nth(0).click()
  await p.waitForTimeout(120)
  note((await p.textContent('#sum-total')) === '₱2,100', 'restored to 3 slots')

  await p.click('#to-pay')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note((await p.textContent('#s-sub')) === '₱2,100', 'checkout carries the multi-court subtotal')
  note((await p.textContent('#s-total')) === '₱2,457', 'multi-court total adds ₱252 VAT + ₱105 fee')
  note((await p.locator('#s-picks li').count()) === 3, 'checkout lists all 3 bookings')
  note(/Court A/.test(await p.textContent('#s-court')) && /Court C/.test(await p.textContent('#s-court')),
    `checkout names both courts (${await p.textContent('#s-court')})`)
  note((await p.textContent('#s-dur')) === '3 hours', 'checkout duration is 3 hours')

  await p.fill('#c-name', 'Juan Dela Cruz')
  await p.fill('#c-num', '4242424242424242')
  await p.fill('#c-exp', '0428')
  await p.fill('#c-cvv', '123')
  await p.fill('#c-mail', 'juan@email.com')
  await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(400)
  note(p.url().includes('confirmation'), 'multi-court booking reaches confirmation')
  note((await p.textContent('#r-total')) === '₱2,457', 'confirmation shows the multi-court grand total')
  note((await p.locator('#r-picks li').count()) === 3, 'confirmation lists all 3 bookings')
  note(errs.length === 0, `multi-court console errors: ${errs.length}${errs.length ? ' → ' + errs[0] : ''}`)
  await p.close()
}

/* ------------------------------------------- admin bookings ledger + chart */
console.log('\n=== admin bookings ledger ===')
{
  const errs = []
  const p = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(url('admin.html'), { waitUntil: 'networkidle' })
  await p.locator('button[data-view="bookings"]').click()
  await p.waitForTimeout(300)
  const rowsOf = () => p.locator('#bk-body tr[data-ref]').count()

  const total = await rowsOf()
  note(total > 10, `ledger renders ${total} bookings`)

  // status is binary — no "Pending" anywhere in this section, in data or markup
  const pend = await p.locator('#v-bookings').evaluate((el) => /Pending/i.test(el.textContent))
  note(!pend, 'no "Pending" status in the bookings section')
  const opts = await p.$$eval('#bk-status option', (o) => o.map((x) => x.value).filter(Boolean))
  note(opts.length === 2 && opts.includes('paid') && opts.includes('cancelled'),
    `status filter offers only paid/cancelled (${opts.join(',')})`)
  const tags = await p.$$eval('#bk-body .tag', (t) => [...new Set(t.map((x) => x.textContent.trim()))].sort())
  note(tags.every((t) => t === 'Paid' || t === 'Cancelled'), `row statuses are only Paid/Cancelled (${tags.join(',')})`)

  // search by customer name, then by reference
  await p.fill('#bk-q', 'maria'); await p.waitForTimeout(150)
  const byName = await rowsOf()
  note(byName > 0 && byName < total, `search by name narrows (${byName} of ${total})`)
  const oneRef = await p.$eval('#bk-body tr[data-ref]', (tr) => tr.dataset.ref)
  await p.fill('#bk-q', oneRef); await p.waitForTimeout(150)
  note((await rowsOf()) === 1, 'search by reference returns exactly one row')
  await p.fill('#bk-q', 'nothingmatchesthis'); await p.waitForTimeout(150)
  note((await rowsOf()) === 0 && (await p.locator('.bk-empty').count()) === 1, 'empty state shown when nothing matches')
  await p.click('#bk-clear'); await p.waitForTimeout(150)
  note((await rowsOf()) === total, 'clear restores every row')

  // date range for reporting
  await p.fill('#bk-from', '2026-08-05')
  await p.fill('#bk-to', '2026-08-12'); await p.waitForTimeout(200)
  const ranged = await rowsOf()
  note(ranged > 0 && ranged < total, `date range narrows to ${ranged} rows`)
  const inRange = await p.$$eval('#bk-body tr[data-ref] td:nth-child(5)', (td) => td.map((x) => x.dataset.v))
  note(inRange.every((v) => v >= '20260805' && v <= '20260812'), 'every row falls inside the range')
  note(/collected/.test(await p.textContent('#bk-count')), 'range reports a revenue subtotal for reporting')
  await p.click('#bk-clear'); await p.waitForTimeout(150)

  // cancel
  const target = await p.$eval('#bk-body tr[data-ref] [data-cancel]', (b) => b.dataset.cancel)
  p.once('dialog', (d) => d.accept())
  await p.locator(`[data-cancel="${target}"]`).click(); await p.waitForTimeout(250)
  const after = await p.$eval(`tr[data-ref="${target}"]`, (tr) => ({
    status: tr.querySelector('.tag').textContent.trim(),
    amount: tr.cells[7].textContent.trim(),
    actions: tr.cells[9].textContent.trim(),
  }))
  note(after.status === 'Cancelled', `cancel sets the status (${after.status})`)
  note(after.amount === '—', 'cancelled booking carries no amount')
  note(after.actions === '—', 'cancelled booking offers no further actions')

  // revise — a clash must be refused, a free slot accepted
  const live = await p.$eval('#bk-body tr[data-ref] [data-revise]', (b) => b.dataset.revise)
  await p.locator(`[data-revise="${live}"]`).click(); await p.waitForTimeout(200)
  note(await p.$eval('#bk-dialog', (d) => d.open), 'revise dialog opens')
  const clashWith = await p.$$eval('#bk-body tr[data-ref]', (trs, skip) => {
    const row = trs.find((t) => t.dataset.ref !== skip && t.querySelector('.tag').textContent.trim() === 'Paid')
    return { court: row.cells[3].textContent.trim(), slot: row.cells[5].textContent.trim(), date: row.cells[4].dataset.v }
  }, live)
  const iso = `${clashWith.date.slice(0, 4)}-${clashWith.date.slice(4, 6)}-${clashWith.date.slice(6, 8)}`
  await p.fill('#bk-date', iso)
  await p.selectOption('#bk-slot', clashWith.slot)
  await p.selectOption('#bk-court', clashWith.court)
  await p.click('#bk-save'); await p.waitForTimeout(250)
  note(await p.$eval('#bk-dialog', (d) => d.open), 'double-booking is refused, dialog stays open')
  note((await p.textContent('#bk-dlg-err')).length > 0, 'clash explains itself')

  await p.fill('#bk-date', '2026-08-30')
  await p.selectOption('#bk-slot', '13:00 - 14:00')
  await p.selectOption('#bk-court', 'Court D')
  await p.click('#bk-save'); await p.waitForTimeout(300)
  note(!(await p.$eval('#bk-dialog', (d) => d.open)), 'a free slot saves and closes the dialog')
  const moved = await p.$eval(`tr[data-ref="${live}"]`, (tr) => tr.cells[4].dataset.v + '|' + tr.cells[5].textContent.trim())
  note(moved === '20260830|13:00 - 14:00', `booking moved to the new date and slot (${moved})`)

  note(errs.length === 0, `bookings console errors: ${errs.length}${errs.length ? ' → ' + errs[0] : ''}`)
  await p.close()
}

console.log('\n=== admin performance chart ===')
{
  const errs = []
  const p = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(url('admin.html'), { waitUntil: 'networkidle' })
  await p.locator('button[data-view="revenue"]').click()
  await p.waitForTimeout(350)

  note((await p.locator('#perf-plot svg').count()) === 1, 'chart renders')
  note((await p.locator('#perf-plot path').count()) === 12, 'month view draws 12 bars')
  // the hero must agree with the tile above it on the same page
  note((await p.textContent('#perf-value')) === '152', 'hero matches the 152-bookings tile')
  note(/12%/.test(await p.textContent('#perf-delta')), 'hero delta matches the tile\'s ▲12%')

  await p.locator('button[data-shape="line"]').click(); await p.waitForTimeout(250)
  note((await p.locator('#perf-plot polyline').count()) === 1, 'line mode draws a line')
  note((await p.locator('#perf-plot circle').count()) === 12, 'line mode marks every point')
  note((await p.locator('#perf-plot path').count()) === 0, 'line mode drops the bars')
  note((await p.locator('.perf__vallab').count()) < 12, 'line mode labels selectively, not every point')

  await p.locator('button[data-shape="bar"]').click()
  await p.locator('button[data-metric="revenue"]').click(); await p.waitForTimeout(250)
  const revLabels = await p.$$eval('.perf__vallab', (t) => t.map((x) => x.textContent))
  note(revLabels.slice(-6).join(' ') === '₱58k ₱71k ₱66k ₱87k ₱98k ₱106k',
    `revenue reproduces the retired 6-month chart (${revLabels.slice(-6).join(' ')})`)

  await p.locator('button[data-period="year"]').click(); await p.waitForTimeout(250)
  note((await p.locator('#perf-plot path').count()) === 5, 'year view renders its 5 periods')
  await p.locator('button[data-period="day"]').click(); await p.waitForTimeout(250)
  note((await p.locator('#perf-plot path').count()) === 12, 'day view renders 12 periods')

  note((await p.locator('#perf-table tbody tr').count()) === 12, 'a table view backs the chart')
  note(errs.length === 0, `chart console errors: ${errs.length}${errs.length ? ' → ' + errs[0] : ''}`)
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
