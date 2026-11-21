/* Mobile navigation drawer.
   Builds itself from whatever nav markup is already on the page, so it works
   on index.html (inline chrome) and on the chrome.js-injected pages alike.
   Injected rather than hand-written into 10 files, and hidden above 1120px, so
   desktop rendering — including the pixel-verified homepage — is unchanged. */

;(function () {
  // skip link — first thing in the tab order, on every page
  const main = document.querySelector('main, .sect, .hero') || document.body
  if (!main.id) main.id = 'main'
  const skip = document.createElement('a')
  skip.className = 'skip'
  skip.href = '#' + main.id
  skip.textContent = 'Skip to content'
  document.body.insertBefore(skip, document.body.firstChild)

  const nav = document.querySelector('.nav__inner')
  if (!nav) return
  const links = [...document.querySelectorAll('.nav__links a')]
  const ctas = [...document.querySelectorAll('.nav__actions .btn')]
  if (!links.length) return

  const burger = document.createElement('button')
  burger.className = 'nav__burger'
  burger.type = 'button'
  burger.setAttribute('aria-label', 'Open menu')
  burger.setAttribute('aria-expanded', 'false')
  burger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  nav.appendChild(burger)

  const logo = document.querySelector('.nav__logo img')
  const drawer = document.createElement('div')
  drawer.className = 'drawer'
  drawer.id = 'nav-drawer'
  drawer.innerHTML = `
    <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="drawer__top">
        <img src="${logo ? logo.getAttribute('src') : 'assets/img/logo-served.png'}" alt="Served.">
        <button class="drawer__close" type="button" aria-label="Close menu">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      ${links.map((a) => `<a class="d-link${a.classList.contains('is-active') ? ' is-active' : ''}" href="${a.getAttribute('href')}">${a.textContent.trim()}</a>`).join('')}
      <div class="drawer__cta">
        ${ctas.map((a) => `<a class="btn ${a.classList.contains('btn--orange') ? 'btn--orange' : 'btn--ghost'}" href="${a.getAttribute('href')}">${a.textContent.trim()}</a>`).join('')}
      </div>
    </div>`
  document.body.appendChild(drawer)

  const panel = drawer.querySelector('.drawer__panel')
  const closeBtn = drawer.querySelector('.drawer__close')
  let lastFocus = null

  const focusables = () =>
    [...panel.querySelectorAll('a[href], button')].filter((el) => el.offsetParent !== null)

  function open() {
    lastFocus = document.activeElement
    drawer.classList.add('is-open')
    document.body.classList.add('has-drawer')
    burger.setAttribute('aria-expanded', 'true')
    closeBtn.focus()
    document.addEventListener('keydown', onKey)
  }
  function close() {
    drawer.classList.remove('is-open')
    document.body.classList.remove('has-drawer')
    burger.setAttribute('aria-expanded', 'false')
    document.removeEventListener('keydown', onKey)
    if (lastFocus) lastFocus.focus()
  }
  function onKey(e) {
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return
    const f = focusables()
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  burger.addEventListener('click', open)
  closeBtn.addEventListener('click', close)
  drawer.addEventListener('click', (e) => { if (e.target === drawer) close() })
  // if the viewport grows past the breakpoint while open, drop the drawer
  window.addEventListener('resize', () => {
    if (drawer.classList.contains('is-open') && window.innerWidth > 1120) close()
  })
})()
