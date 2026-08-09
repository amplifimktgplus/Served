#!/usr/bin/env node
/* Auth gate: validation, password toggles, role switch, cross-links and the
   inline success states on the four auth screens. */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const url = (f) => 'file://' + path.join(HERE, f)
const browser = await chromium.launch()
let fail = 0
const note = (ok, msg) => { if (!ok) fail++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`) }
const open = async (f, w = 1440) => {
  const p = await browser.newPage({ viewport: { width: w, height: 1000 } })
  p.on('pageerror', (e) => note(false, `${f} pageerror: ${e.message}`))
  await p.goto(url(f), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts && document.fonts.ready)
  await p.waitForTimeout(250)
  return p
}

console.log('=== sign up ===')
{
  const p = await open('signup.html')
  await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note((await p.locator('.auth-field.is-bad').count()) === 4, `empty submit flags 4 fields (got ${await p.locator('.auth-field.is-bad').count()})`)
  const termsErr = await p.locator('.check + .auth-err').textContent()
  note(/Terms of Use/.test(termsErr || ''), 'terms checkbox blocks submit with a message')

  await p.fill('#f-user', 'ju'); await p.click('button[type=submit]'); await p.waitForTimeout(150)
  note(/at least 3/.test(await p.locator('#f-user').evaluate(e => e.closest('div').parentElement.querySelector('.auth-err').textContent)), 'short username rejected')

  await p.fill('#f-user', 'juandc')
  await p.fill('#f-email', 'not-an-email'); await p.click('button[type=submit]'); await p.waitForTimeout(150)
  note(await p.locator('#f-email').evaluate(e => e.closest('.auth-field').classList.contains('is-bad')), 'bad email rejected')

  await p.fill('#f-email', 'juan@email.com')
  await p.fill('#f-pw', 'secret123'); await p.fill('#f-pw2', 'secret124')
  await p.click('button[type=submit]'); await p.waitForTimeout(150)
  note(await p.locator('#f-pw2').evaluate(e => e.closest('.auth-field').classList.contains('is-bad')), 'password mismatch rejected')

  // password visibility toggle
  note((await p.getAttribute('#f-pw', 'type')) === 'password', 'password starts masked')
  await p.click('[data-toggle-pw="f-pw"]'); await p.waitForTimeout(120)
  note((await p.getAttribute('#f-pw', 'type')) === 'text', 'eye toggle reveals password')
  await p.click('[data-toggle-pw="f-pw"]'); await p.waitForTimeout(120)
  note((await p.getAttribute('#f-pw', 'type')) === 'password', 'eye toggle re-masks')

  // role switch drives the destination
  await p.fill('#f-pw2', 'secret123')
  await p.click('.roles label:has(input[value=owner])')
  note(await p.locator('input[name=role][value=owner]').isChecked(), 'court-owner role selectable')
  // the radio group must also be keyboard-operable
  await p.locator('input[name=role][value=player]').focus()
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(120)
  note(await p.locator('input[name=role][value=owner]').isChecked(), 'arrow keys move the role selection')
  await p.click('.check input'); await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('admin.html'), `court owner lands on admin (${p.url().split('/').pop()})`)
  await p.close()
}

console.log('\n=== sign in ===')
{
  const p = await open('signin.html')
  await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note((await p.locator('.auth-field.is-bad').count()) === 2, 'empty submit flags both fields')
  await p.fill('#f-ident', 'juan@email.com'); await p.fill('#f-pwin', 'secret123')
  await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('account.html'), `player lands on account (${p.url().split('/').pop()})`)
  await p.close()

  const q = await open('signin.html')
  note(await q.locator('a[href="forgot-password.html"]').count() > 0, 'forgot-password link present')
  note(await q.locator('a[href="signup.html"]').count() > 0, 'sign-up cross-link present')
  await q.click('.remember'); await q.waitForTimeout(120)
  note(await q.locator('.remember input').isChecked(), 'remember-password toggle works')
  await q.close()
}

console.log('\n=== forgot password ===')
{
  const p = await open('forgot-password.html')
  await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note(await p.locator('#f-email').evaluate(e => e.closest('.auth-field').classList.contains('is-bad')), 'empty email rejected')
  await p.fill('#f-email', 'juan@email.com')
  await p.click('button[type=submit]'); await p.waitForTimeout(250)
  const h = await p.locator('.auth-card h1').textContent()
  note(/Check your inbox/.test(h || ''), `success state shown (${h})`)
  note(await p.locator('.auth-card').textContent().then(t => t.includes('juan@email.com')), 'success echoes the address')
  await p.close()
}

console.log('\n=== change password ===')
{
  const p = await open('change-password.html')
  await p.fill('#f-new', 'short'); await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note(await p.locator('#f-new').evaluate(e => e.closest('.auth-field').classList.contains('is-bad')), 'short password rejected')
  await p.fill('#f-new', 'newsecret123'); await p.fill('#f-new2', 'different')
  await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note(await p.locator('#f-new2').evaluate(e => e.closest('.auth-field').classList.contains('is-bad')), 'mismatch rejected')
  await p.fill('#f-new2', 'newsecret123')
  await p.click('button[type=submit]'); await p.waitForTimeout(250)
  note(/Password changed/.test(await p.locator('.auth-card h1').textContent() || ''), 'success state shown')
  await p.close()
}

console.log('\n=== entry points from the site ===')
{
  const p = await open('courts.html')
  note((await p.getAttribute('.nav__actions .btn--orange', 'href')) === 'signin.html', 'nav Login/Register -> signin')
  note((await p.locator('.foot__links a[href="signup.html"]').count()) > 0, 'footer Registration -> signup')
  await p.close()
  const h = await open('index.html')
  note((await h.getAttribute('.nav__actions .btn--orange', 'href')) === 'signin.html', 'homepage nav -> signin')
  await h.close()
  const a = await open('account.html')
  note((await a.locator('a[href="change-password.html"]').count()) > 0, 'account profile -> change password')
  await a.close()
}

console.log('\n=== responsive (auth screens have no source mobile design) ===')
for (const f of ['signin.html', 'signup.html', 'forgot-password.html', 'change-password.html']) {
  for (const w of [1920, 900, 430]) {
    const p = await open(f, w)
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    note(r.sw <= r.cw, `${f} @${w}px no h-overflow (${r.sw}/${r.cw})`)
    await p.close()
  }
}

await browser.close()
console.log(`\n${fail === 0 ? 'AUTH CHECKS PASSED' : fail + ' AUTH CHECK(S) FAILED'}`)
process.exit(fail ? 1 : 0)
