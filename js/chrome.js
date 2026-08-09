/* Shared nav + footer, injected so all 9 pages stay in sync from one place.
   index.html is the exception: it carries its own inline chrome because it is
   pixel-verified against the Figma render and must not be touched. */

;(function () {
  const ICO = {
    user: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    target: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    phone: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c0-1 .8-1.8 1.8-1.8h1.6c.8 0 1.5.5 1.7 1.3l.7 2.4c.2.7 0 1.4-.6 1.8l-1 .8a12 12 0 0 0 4.8 4.8l.8-1c.4-.6 1.1-.8 1.8-.6l2.4.7c.8.2 1.3.9 1.3 1.7v1.6c0 1-.8 1.8-1.8 1.8A15.8 15.8 0 0 1 4 5.5z"/></svg>',
    mail: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.6 7 8.4 6 8.4-6"/></svg>',
  }

  // Orphan destinations resolve to the nearest real page (locked decision).
  const NAV = [
    { label: 'Home', href: 'index.html', key: 'home' },
    { label: 'Courts', href: 'courts.html', key: 'courts', chev: true },
    { label: 'Pricing', href: 'courts.html', key: 'pricing', chev: true },
    { label: 'List Your Court', href: 'admin.html', key: 'list', chev: true },
    { label: 'Contact Us', href: 'account.html', key: 'contact' },
  ]

  const active = document.body.dataset.nav || ''

  const nav = `
<header class="nav">
  <div class="nav__inner">
    <a class="nav__logo" href="index.html" aria-label="Served. home">
      <img src="assets/img/logo-served.png" alt="Served.">
    </a>
    <nav class="nav__links" aria-label="Primary">
      ${NAV.map((n) => `<a href="${n.href}"${n.key === active ? ' class="is-active" aria-current="page"' : ''}>${n.label}${n.chev ? ICO.chev : ''}</a>`).join('\n      ')}
    </nav>
    <div class="nav__actions">
      <a href="signin.html" class="btn btn--orange btn--nav">${ICO.user}Login / Register</a>
      <a href="admin.html" class="btn btn--ghost btn--nav">${ICO.target}List Your Court</a>
    </div>
  </div>
</header>`

  const foot = `
<footer class="foot">
  <div class="foot__shell">
    <div class="foot__grid">
      <div class="foot__brand">
        <img class="foot__logo" src="assets/img/logo-served.png" alt="Served.">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      </div>
      <div class="foot__col foot__col--info">
        <h3>INFO</h3>
        <div class="foot__links">
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="courts.html">Court Gallery</a></li>
            <li><a href="courts.html">Events</a></li>
          </ul>
          <ul>
            <li><a href="courts.html">Tournaments</a></li>
            <li><a href="courts.html">Club Ranking</a></li>
            <li><a href="signup.html">Registration</a></li>
          </ul>
        </div>
      </div>
      <div class="foot__col">
        <h3>LOCATION</h3>
        <p class="foot__addr">Lorem Ipsum Dolor St.<br>Amet, City, Philippines</p>
        <h3 class="foot__h4--gap">CONTACT US</h3>
        <p class="foot__contact">${ICO.phone}123-456-7890</p>
        <p class="foot__contact">${ICO.mail}contact@gmail.com</p>
      </div>
      <div class="foot__col foot__col--social">
        <h3>FOLLOW US</h3>
        <ul class="foot__social">
          <li><a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 7.2a2.5 2.5 0 0 0-1.8-1.8C18.1 5 12 5 12 5s-6.1 0-7.7.4A2.5 2.5 0 0 0 2.5 7.2 26 26 0 0 0 2.1 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.9 19 12 19 12 19s6.1 0 7.7-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8z"/><path d="M10.2 14.7V9.3L14.8 12z" fill="currentColor" stroke="none"/></svg></a></li>
          <li><a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></svg></a></li>
          <li><a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 8.5h2.2V5.4c-.4-.1-1.6-.2-3-.2-3 0-4.6 1.8-4.6 4.6v2H6.3v3.4h2.8V24h3.5v-8.8h2.8l.4-3.4h-3.2V10c0-1 .3-1.5 1.9-1.5z"/></svg></a></li>
          <li><a href="#" aria-label="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20"/></svg></a></li>
          <li><a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.9 3.7 4.2 3.9v2.7c-1.5.1-2.9-.3-4.2-1.1v5.2a5.3 5.3 0 1 1-4.4-5.2v2.8a2.5 2.5 0 1 0 1.7 2.4V4z"/></svg></a></li>
        </ul>
      </div>
    </div>
    <div class="foot__bar"><p>© Copyright - 2026 Served. All Rights Reserved.</p></div>
  </div>
</footer>`

  const nSlot = document.getElementById('site-nav')
  const fSlot = document.getElementById('site-foot')
  if (nSlot) nSlot.outerHTML = nav
  if (fSlot) fSlot.outerHTML = foot
})()
