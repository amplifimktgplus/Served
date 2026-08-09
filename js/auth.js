/* Auth screen behaviour — client-side only.
   No backend: nothing is authenticated, stored or emailed. Validation and the
   success states are real; the credentials go nowhere. */

;(function () {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]

  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>'

  /* password show/hide */
  $$('[data-toggle-pw]').forEach((btn) => {
    btn.innerHTML = EYE_OFF
    btn.setAttribute('aria-label', 'Show password')
    btn.addEventListener('click', () => {
      const input = $('#' + btn.dataset.togglePw)
      const show = input.type === 'password'
      input.type = show ? 'text' : 'password'
      btn.innerHTML = show ? EYE : EYE_OFF
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password')
    })
  })

  /* validation ------------------------------------------------------------ */
  const RULES = {
    'f-user': (v) => v.trim().length >= 3 || 'Username must be at least 3 characters',
    'f-email': (v) => /^\S+@\S+\.\S+$/.test(v.trim()) || 'Enter a valid email address',
    'f-ident': (v) => v.trim().length > 0 || 'Enter your email or username',
    'f-pw': (v) => v.length >= 8 || 'Password must be at least 8 characters',
    'f-pw-any': (v) => v.length > 0 || 'Enter your password',
    'f-new': (v) => v.length >= 8 || 'Password must be at least 8 characters',
  }

  // wire each error slot to its input once, so screen readers announce the message
  $$('.auth-field input').forEach((input) => {
    const wrap = input.closest('.auth-field')
    const err = wrap.parentElement.querySelector('.auth-err')
    if (!err) return
    if (!err.id) err.id = (input.id || 'f') + '-err'
    err.setAttribute('role', 'alert')
    input.setAttribute('aria-describedby', err.id)
    input.setAttribute('aria-invalid', 'false')
  })

  function markField(input, msg) {
    const wrap = input.closest('.auth-field')
    const err = wrap.parentElement.querySelector('.auth-err') || wrap.nextElementSibling
    wrap.classList.toggle('is-bad', !!msg)
    input.setAttribute('aria-invalid', msg ? 'true' : 'false')
    if (err && err.classList.contains('auth-err')) err.textContent = msg || ''
  }

  function validate(form) {
    let ok = true, firstBad = null
    $$('input[data-rule]', form).forEach((input) => {
      const fn = RULES[input.dataset.rule]
      if (!fn) return
      const res = fn(input.value)
      const msg = res === true ? '' : res
      markField(input, msg)
      if (msg && !firstBad) firstBad = input
      if (msg) ok = false
    })
    // confirm-password match
    const conf = $('input[data-match]', form)
    if (conf) {
      const target = $('#' + conf.dataset.match, form)
      const msg = conf.value.length === 0 ? 'Re-enter your password'
        : conf.value !== target.value ? 'Passwords do not match' : ''
      markField(conf, msg)
      if (msg && !firstBad) firstBad = conf
      if (msg) ok = false
    }
    // terms
    const terms = $('input[data-terms]', form)
    if (terms) {
      const box = terms.closest('.check')
      const err = box.nextElementSibling
      const msg = terms.checked ? '' : 'Please accept the Terms of Use to continue'
      if (err && err.classList.contains('auth-err')) err.textContent = msg
      if (msg && !firstBad) firstBad = terms
      if (msg) ok = false
    }
    if (firstBad) firstBad.focus()
    return ok
  }

  $$('form[data-auth]').forEach((form) => {
    // clear the error as soon as the user starts fixing it
    $$('input', form).forEach((i) =>
      i.addEventListener('input', () => {
        const w = i.closest('.auth-field')
        if (w && w.classList.contains('is-bad')) markField(i, '')
      }))

    const t0 = $('input[data-terms]', form)
    if (t0) t0.addEventListener('change', () => {
      const err = t0.closest('.check').nextElementSibling
      if (t0.checked && err && err.classList.contains('auth-err')) err.textContent = ''
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!validate(form)) return
      const done = form.dataset.auth
      const role = ($('input[name=role]:checked', form) || {}).value || 'player'

      if (done === 'signup' || done === 'signin') {
        // no backend — hand off to the account (or admin, for a court owner)
        location.href = role === 'owner' ? 'admin.html' : 'account.html'
        return
      }
      // forgot / change: show an inline success state instead of navigating
      const card = form.closest('.auth-card')
      const mail = ($('#f-email', form) || {}).value || ''
      card.innerHTML = done === 'forgot'
        ? `<h1>Check your inbox</h1>
           <p class="sub">If an account exists for <b data-mail></b>, we've sent a reset link.</p>
           <a class="btn btn--orange auth-submit" href="signin.html">Back to sign in</a>
           <p class="auth-err" style="margin-top:14px;color:var(--muted)">Demo build — no email is actually sent.</p>`
        : `<h1>Password changed</h1>
           <p class="sub">You can now sign in with your new password.</p>
           <a class="btn btn--orange auth-submit" href="signin.html">Go to sign in</a>
           <p class="auth-err" style="margin-top:14px;color:var(--muted)">Demo build — nothing was saved.</p>`
      const slot = card.querySelector('[data-mail]')
      if (slot) slot.textContent = mail
      card.querySelector('h1').setAttribute('tabindex', '-1')
      card.querySelector('h1').focus()
    })
  })

  /* The designs label this button with the page's own action ("Register Now" on sign up).
     Navigating to the current page would reload and wipe the form, so it sends focus to
     the first field instead. */
  $$('[data-focus]').forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById(b.dataset.focus)
    if (!t) return
    t.scrollIntoView({ block: 'center', behavior: 'smooth' })
    t.focus({ preventScroll: true })
  }))
})()
