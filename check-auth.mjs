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

  /* This page is the PLAYER sign-up, so the player path completes here. Selecting
     Court Owner no longer stays on the page — it opens signup-owner.html, which is
     what the "role switch" section below asserts, and the owner → admin destination
     is covered in the court-owner section. */
  await p.fill('#f-pw2', 'secret123')
  note(await p.locator('input[name=role][value=player]').isChecked(), 'player is the default role here')
  await p.click('.check input'); await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('account.html'), `player signup lands on account (${p.url().split('/').pop()})`)
  await p.close()
}

console.log('\n=== sign up (court owner) ===')
{
  const p = await open('signup-owner.html')

  // the whole point of the separate page: it opens already set to Court Owner
  note(await p.locator('input[name=role][value=owner]').isChecked(), 'court owner preselected on load')
  note(!(await p.locator('input[name=role][value=player]').isChecked()), 'player not preselected')

  // copy that distinguishes this page from signup.html
  note(/List your court\./.test(await p.locator('.auth-card > p.sub').textContent() || ''),
    'subhead reads "List your court"')
  note((await p.locator('.auth__glass .btn').textContent() || '').trim() === 'List your court now',
    'glass CTA is "List your court now"')
  const glass = await p.locator('.auth__glass').textContent() || ''
  note(/Ready to fill more open slots effortlessly\?/.test(glass), 'owner panel opens with the slots line')
  note(/100% free/.test(glass), 'owner panel states listing is free')
  note(/5% processing fee/.test(glass), 'owner panel states the 5% processing fee')

  // shares the auth photo rather than pulling a second asset
  note((await p.getAttribute('.auth__aside img.shot', 'src')) === 'assets/img/auth-signup.jpg',
    'reuses the sign-up photo')

  // the shared auth.js behaviour must still apply on this page
  await p.click('button[type=submit]'); await p.waitForTimeout(200)
  note((await p.locator('.auth-field.is-bad').count()) === 4,
    `empty submit flags 4 fields (got ${await p.locator('.auth-field.is-bad').count()})`)

  await p.fill('#f-user', 'courtowner')
  await p.fill('#f-email', 'owner@email.com')
  await p.fill('#f-pw', 'secret123'); await p.fill('#f-pw2', 'secret123')
  await p.click('.check input'); await p.click('button[type=submit]')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('admin.html'), `owner signup lands on admin (${p.url().split('/').pop()})`)
  await p.close()

  const q = await open('signup-owner.html')
  note(await q.locator('a[href="signin.html"]').count() > 0, 'sign-in cross-link present')
  note(await q.locator('a[href="index.html"].auth-back').count() > 0, 'back-to-site escape present')
  await q.close()
}

console.log('\n=== role switch moves between the two sign-up pages ===')
{
  // clicking the other role navigates...
  const p = await open('signup-owner.html')
  await p.click('.roles label:has(input[value=player])')
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(300)
  note(p.url().includes('signup.html') && !p.url().includes('signup-owner'),
    `owner page → Player opens the player sign-up (${p.url().split('/').pop()})`)
  note(await p.locator('input[name=role][value=player]').isChecked(), 'player arrives preselected')
  note(/Book your court\./.test(await p.locator('.auth-card > p.sub').textContent() || ''),
    'player page shows the player subhead')
  note((await p.locator('.auth__glass .btn').textContent() || '').trim() === 'Register Now',
    'player page shows the Register Now panel')
  await p.close()

  // ...and back the other way
  const r = await open('signup.html')
  await r.click('.roles label:has(input[value=owner])')
  await r.waitForLoadState('networkidle'); await r.waitForTimeout(300)
  note(r.url().includes('signup-owner.html'), `player page → Court Owner opens the owner sign-up (${r.url().split('/').pop()})`)
  await r.close()

  /* Keyboard parity: arrow-keying to the other role must reach the other page too.
     Space on an already-checked radio fires no click, so gating navigation on
     "explicit activation" would strand keyboard users on the wrong page with the
     wrong role selected. The change of context is advised up front instead. */
  const k = await open('signup-owner.html')
  await k.locator('input[name=role][value=owner]').focus()
  await k.keyboard.press('ArrowLeft')
  await k.waitForLoadState('networkidle'); await k.waitForTimeout(350)
  note(k.url().includes('signup.html') && !k.url().includes('signup-owner'),
    `arrow key reaches the player page too (${k.url().split('/').pop()})`)
  note(await k.locator('input[name=role][value=player]').isChecked(), 'and arrives with Player selected')
  await k.close()

  // the advisory note screen readers get before activating
  const d = await open('signup.html')
  const desc = await d.getAttribute('.roles', 'aria-describedby')
  note(!!desc && (await d.locator('#' + desc).count()) === 1, 'role group carries an advance description')
  await d.close()
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
  note((await p.getAttribute('.nav__actions .btn--ghost', 'href')) === 'signup-owner.html',
    'nav List Your Court -> owner signup')
  await p.close()
  const h = await open('index.html')
  note((await h.getAttribute('.nav__actions .btn--orange', 'href')) === 'signin.html', 'homepage nav -> signin')
  note((await h.getAttribute('.nav__actions .btn--ghost', 'href')) === 'signup-owner.html',
    'homepage List Your Court -> owner signup')
  await h.close()
  const a = await open('account.html')
  note((await a.locator('a[href="change-password.html"]').count()) > 0, 'account profile -> change password')
  await a.close()
}

console.log('\n=== responsive (auth screens have no source mobile design) ===')
for (const f of ['signin.html', 'signup.html', 'signup-owner.html', 'forgot-password.html', 'change-password.html']) {
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
