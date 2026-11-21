/* Client-side behaviour for the Served. static build.
   No backend: the booking draft is carried in sessionStorage between funnel
   pages, and all data comes from js/data.js fixtures. */

;(function () {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const page = document.body.dataset.page
  const V = window.SERVED

  const ICO = {
    pin: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    grid: '<svg class="ico" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 12h17M12 3.5v17"/></svg>',
    cal: '<svg class="ico" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  }

  /* ------------------------------------------------------------- LISTING */
  if (page === 'courts') {
    const list = $('#listing')
    const count = $('#count')
    const fLoc = $('#f-loc'), fSurf = $('#f-surf'), fPrice = $('#f-price'), fSort = $('#f-sort')

    // populate filter options from the data so they can never drift
    const uniq = (k) => [...new Set(V.venues.map((v) => v[k]))].sort()
    uniq('city').forEach((c) => fLoc.insertAdjacentHTML('beforeend', `<option>${c}</option>`))
    uniq('surface').forEach((c) => fSurf.insertAdjacentHTML('beforeend', `<option>${c}</option>`))

    function card(v) {
      return `<article class="lrow">
        <a class="lrow__media" href="court-${v.slug}.html" aria-label="View ${v.name}">
          <img src="${v.img}" alt="${v.name}">
          ${v.badge ? `<span class="chip chip--blue">${v.badge}</span>` : ''}
        </a>
        <div>
          <h2><a href="court-${v.slug}.html">${v.name}</a></h2>
          <div class="lrow__meta">
            <span>${ICO.pin}${v.location}</span>
            <span>${ICO.grid}${v.surface} · ${v.courts} courts</span>
            <span>${ICO.cal}Next: ${v.next}</span>
          </div>
          <p class="lrow__body">${v.blurb}</p>
        </div>
        <div class="lrow__side">
          <span class="rate"><b>${v.rating.toFixed(1)}</b>${v.reviews} Reviews</span>
          <span class="price">${V.peso(v.price)}<small> / hr</small></span>
          <a class="btn btn--orange" style="height:44px;padding-inline:22px;border-radius:10px;font-weight:600"
             href="court-${v.slug}.html">View Court</a>
        </div>
      </article>`
    }

    function render() {
      let rows = V.venues.filter((v) =>
        (!fLoc.value || v.city === fLoc.value) &&
        (!fSurf.value || v.surface === fSurf.value) &&
        (!fPrice.value || v.price <= +fPrice.value))
      const s = fSort.value
      if (s === 'price-asc') rows.sort((a, b) => a.price - b.price)
      if (s === 'price-desc') rows.sort((a, b) => b.price - a.price)
      if (s === 'rating') rows.sort((a, b) => b.rating - a.rating)
      count.textContent = rows.length
      list.innerHTML = rows.length
        ? rows.map(card).join('')
        : '<p class="empty">No courts match those filters. Try widening your search.</p>'
    }
    ;[fLoc, fSurf, fPrice, fSort].forEach((el) => el.addEventListener('change', render))
    $('#f-reset').addEventListener('click', (e) => {
      e.preventDefault()
      ;[fLoc, fSurf, fPrice].forEach((el) => (el.value = ''))
      fSort.value = 'rating'
      render()
    })
    render()
  }

  /* ------------------------------------------------------------ CALENDAR */
  if (page === 'calendar') {
    const params = new URLSearchParams(location.search)
    const venue = V.bySlug(params.get('venue')) || V.venues[0]
    V.draft.set({ venue: venue.slug, venueName: venue.name, price: venue.price })
    $$('[data-venue-name]').forEach((el) => (el.textContent = venue.name))
    const back = $('#back-court')
    if (back) back.href = `court-${venue.slug}.html`

    const grid = $('#cal')
    const chosen = $('#chosen')
    const go = $('#to-time')
    // 1 Aug 2026 is a Saturday -> 6 blanks before day 1 (week starts Sunday)
    const firstDow = new Date(2026, 7, 1).getDay()
    const days = new Date(2026, 8, 0).getDate()
    let sel = null

    let html = ''
    for (let i = 0; i < firstDow; i++) html += '<span class="is-blank" aria-hidden="true"></span>'
    for (let d = 1; d <= days; d++) {
      const free = V.availableDays.includes(d)
      html += `<button data-d="${d}" class="${free ? 'is-free' : ''}" ${free ? '' : 'disabled'}
        aria-label="August ${d}, 2026${free ? '' : ' — fully booked'}">${d}</button>`
    }
    grid.innerHTML = html

    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button.is-free')
      if (!b) return
      $$('button', grid).forEach((x) => x.classList.remove('is-sel'))
      b.classList.add('is-sel')
      sel = +b.dataset.d
      chosen.textContent = `${sel} August 2026`
      go.removeAttribute('aria-disabled')
      go.classList.remove('is-off')
    })
    go.addEventListener('click', (e) => {
      if (!sel) { e.preventDefault(); return }
      V.draft.set({ day: sel, dateLabel: `${sel} August 2026` })
    })
  }

  /* --------------------------------------------------------- DATE + TIME */
  if (page === 'time') {
    const d = V.draft.get()
    if (!d.venue) { location.replace('courts.html'); return }
    const day = d.day || 15
    $$('[data-date-label]').forEach((el) => (el.textContent = d.dateLabel || '15 August 2026'))
    $$('[data-venue-name]').forEach((el) => (el.textContent = d.venueName || ''))

    const courtWrap = $('#courts'), slotWrap = $('#slots'), dur = $('#dur'), go = $('#to-pay')
    let court = 'Court A', slot = null

    courtWrap.innerHTML = ['Court A', 'Court B', 'Court C', 'Court D']
      .map((c, i) => `<button data-c="${c}" class="${i === 0 ? 'is-sel' : ''}">${c}</button>`).join('')

    function paintSlots() {
      const taken = (V.taken[`${day}|${court}`] || [])
      slotWrap.innerHTML = V.slots.map((s) => {
        const off = taken.includes(s)
        return `<button data-s="${s}" ${off ? 'disabled' : ''} class="${s === slot ? 'is-sel' : ''}">${s}</button>`
      }).join('')
    }
    paintSlots()

    courtWrap.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return
      $$('button', courtWrap).forEach((x) => x.classList.remove('is-sel'))
      b.classList.add('is-sel'); court = b.dataset.c; slot = null; paintSlots(); sync()
    })
    slotWrap.addEventListener('click', (e) => {
      const b = e.target.closest('button:not([disabled])'); if (!b) return
      $$('button', slotWrap).forEach((x) => x.classList.remove('is-sel'))
      b.classList.add('is-sel'); slot = b.dataset.s; sync()
    })
    dur.addEventListener('change', sync)

    function sync() {
      const hrs = +dur.value
      const total = (d.price || 700) * hrs
      $('#sum-court').textContent = court
      $('#sum-slot').textContent = slot || '—'
      $('#sum-dur').textContent = hrs + (hrs > 1 ? ' hours' : ' hour')
      $('#sum-total').textContent = V.peso(total)
      go.classList.toggle('is-off', !slot)
    }
    sync()
    go.addEventListener('click', (e) => {
      if (!slot) { e.preventDefault(); return }
      V.draft.set({ court, slot, hours: +dur.value, total: (d.price || 700) * +dur.value })
    })
  }

  /* ------------------------------------------------------------ CHECKOUT */
  if (page === 'checkout') {
    const d = V.draft.get()
    if (!d.slot) { location.replace('courts.html'); return }
    $('#s-venue').textContent = d.venueName
    $('#s-court').textContent = d.court
    $('#s-when').textContent = `${d.dateLabel} · ${d.slot}`
    $('#s-dur').textContent = d.hours + (d.hours > 1 ? ' hours' : ' hour')
    $('#s-rate').textContent = V.peso(d.price) + ' / hr'
    $('#s-total').textContent = V.peso(d.total)

    const form = $('#pay-form')

    /* Rules are keyed by input id across ALL methods. Only the rules whose input
       is inside the ACTIVE panel (plus the shared email) ever run — a flat pass
       would validate hidden card fields while GCash is selected and the form
       could never submit. */
    const RULES = {
      // card
      'c-name': (v) => v.trim().length > 2 || 'Enter the name on the card',
      'c-num': (v) => v.replace(/\s/g, '').length >= 13 || 'Enter the full card number',
      'c-exp': (v) => /^\d{2}\/\d{2}$/.test(v) || 'Use MM/YY',
      'c-cvv': (v) => /^\d{3,4}$/.test(v) || 'CVV is 3–4 digits',
      // shared
      'c-mail': (v) => /^\S+@\S+\.\S+$/.test(v) || 'Enter a valid email',
      // e-wallets — PH mobile, 11 digits starting 09 once normalised
      'gcash-mobile': (v) => /^09\d{9}$/.test(v.replace(/\D/g, '')) || 'Enter the 11-digit GCash number, e.g. 0917 123 4567',
      'maya-mobile': (v) => /^09\d{9}$/.test(v.replace(/\D/g, '')) || 'Enter the 11-digit Maya number, e.g. 0917 123 4567',
      // bank redirect
      'bank-bank': (v) => v.trim().length > 0 || 'Choose your bank',
      'bank-name': (v) => v.trim().length > 2 || 'Enter the account name',
      // QR Ph has nothing to validate client-side — payment happens in the payer's app
      'qrph-ack': () => true,
    }

    const phMask = (e) => {
      let n = e.target.value.replace(/\D/g, '')
      if (n.startsWith('63')) n = '0' + n.slice(2)
      else if (n.startsWith('9')) n = '0' + n
      n = n.slice(0, 11)
      e.target.value = n.replace(/^(\d{4})(\d{0,3})(\d{0,4}).*$/, (m, a2, b, c) =>
        a2 + (b ? ' ' + b : '') + (c ? ' ' + c : ''))
    }
    const on = (id, ev, fn) => { const el = $('#' + id); if (el) el.addEventListener(ev, fn) }
    on('c-num', 'input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
    })
    on('c-exp', 'input', (e) => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 4)
      e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v
    })
    on('c-cvv', 'input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4) })
    on('gcash-mobile', 'input', phMask)
    on('maya-mobile', 'input', phMask)

    /* ---- method chooser -------------------------------------------------- */
    const tabs = $$('.pay-methods [data-pm]')
    const submitBtn = form.querySelector('button[type=submit]')
    const LABEL = { gcash: 'Continue with GCash', maya: 'Continue with Maya', qrph: 'I have paid',
                    bank: 'Continue to your bank', card: 'Pay Now' }
    const SUMMARY = { gcash: 'GCash', maya: 'Maya', qrph: 'QR Ph', bank: 'Online banking', card: 'Card' }
    let method = 'card'

    function select(key) {
      method = key
      tabs.forEach((t) => {
        const on = t.dataset.pm === key
        t.setAttribute('aria-selected', on ? 'true' : 'false')
        t.tabIndex = on ? 0 : -1
        const panel = $('#pm-' + t.dataset.pm)
        if (panel) panel.hidden = !on
      })
      if (submitBtn) submitBtn.childNodes[0].nodeValue = LABEL[key] + ' '
      const m = $('#s-method'); if (m) m.textContent = SUMMARY[key]
      // clear stale errors from the panel we just left
      $$('.field.is-bad', form).forEach((f) => {
        f.classList.remove('is-bad')
        const e2 = f.querySelector('.err'); if (e2) e2.textContent = ''
      })
    }
    tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.pm)))
    // roving focus, per the tablist pattern
    tabs.forEach((t, i) => t.addEventListener('keydown', (e) => {
      const k = e.key
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return
      e.preventDefault()
      const n = k === 'Home' ? 0 : k === 'End' ? tabs.length - 1
        : (i + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
      tabs[n].focus(); select(tabs[n].dataset.pm)
    }))
    select('card')

    /* ---- QR Ph placeholder code + countdown ------------------------------
       Same honest approach as the check-in code on confirmation.html: a
       deterministic pattern with real finder squares. It encodes nothing. */
    const qc = $('#qrph-code')
    if (qc) {
      const ref = 'QRPH' + String(d.day).padStart(2, '0') + String(d.total)
      const amt = $('#qrph-amount'); if (amt) amt.textContent = V.peso(d.total)
      const rf = $('#qrph-ref'); if (rf) rf.textContent = ref
      let timer = null

      function paint(salt) {
        const n = 29, px = 7
        qc.width = qc.height = n * px
        const g = qc.getContext('2d')
        let seed = [...(ref + salt)].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 11)
        const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
        g.fillStyle = '#fff'; g.fillRect(0, 0, qc.width, qc.height)
        g.fillStyle = '#141a26'
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
          if (!inF && rnd() > 0.5) g.fillRect(x * px, y * px, px, px)
        }
        const finder = (ox, oy) => {
          for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
            const edge = x === 0 || y === 0 || x === 6 || y === 6
            const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
            if (edge || core) g.fillRect((ox + x) * px, (oy + y) * px, px, px)
          }
        }
        finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
      }

      function countdown(secs) {
        const out = $('#qrph-expiry'), stage = $('#pm-qrph .pm-qr') || $('#pm-qrph')
        const again = $('#qrph-refresh'), wait = $('#qrph-wait')
        if (stage) stage.classList.remove('pm-is-expired')
        if (again) again.hidden = true
        if (wait) wait.hidden = false
        clearInterval(timer)
        let left = secs
        const tick = () => {
          if (out) out.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')
          if (left-- <= 0) {
            clearInterval(timer)
            if (stage) stage.classList.add('pm-is-expired')
            if (again) again.hidden = false
            if (wait) wait.hidden = true
          }
        }
        tick(); timer = setInterval(tick, 1000)
      }

      paint(''); countdown(300)
      const again = $('#qrph-refresh')
      if (again) again.addEventListener('click', () => { paint(String(Date.now())); countdown(300) })
    }

    /* ---- submit ---------------------------------------------------------- */
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const active = $('#pm-' + method)
      let ok = true
      for (const [id, fn] of Object.entries(RULES)) {
        const el = $('#' + id)
        if (!el) continue
        // only the active panel's controls, plus anything outside every panel (shared email)
        const owner = el.closest('.pay-panel')
        if (owner && owner !== active) continue
        const res = fn(el.value)
        const bad = res !== true
        const field = el.closest('.field')
        if (field) {
          field.classList.toggle('is-bad', bad)
          const err = field.querySelector('.err'); if (err) err.textContent = bad ? res : ''
        }
        if (bad) ok = false
      }
      if (!ok) { form.querySelector('.is-bad :is(input,select)')?.focus(); return }
      const ref = 'PB-202608' + String(d.day).padStart(2, '0')
      V.draft.set({ ref, email: $('#c-mail').value, method: SUMMARY[method] })
      location.href = 'confirmation.html'
    })
  }

  /* -------------------------------------------------------- CONFIRMATION */
  if (page === 'confirm') {
    const d = V.draft.get()
    if (!d.ref) { location.replace('courts.html'); return }
    $('#r-venue').textContent = d.venueName
    $('#r-court').textContent = d.court
    $('#r-when').textContent = `${d.dateLabel} · ${d.slot}`
    $('#r-dur').textContent = d.hours + (d.hours > 1 ? ' hours' : ' hour')
    $('#r-total').textContent = V.peso(d.total)
    $('#r-method').textContent = d.method || 'Card'
    $('#r-ref').textContent = d.ref
    $('#r-mail').textContent = d.email || 'user@email.com'

    // Visual QR stand-in: deterministic pattern seeded from the booking ref,
    // drawn with real finder squares. NOT a scannable code — see README.
    const c = $('#qr'), n = 25, px = 8
    c.width = c.height = n * px
    const g = c.getContext('2d')
    let seed = [...d.ref].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = '#141a26'
    const finder = (ox, oy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        if (edge || core) g.fillRect((ox + x) * px, (oy + y) * px, px, px)
      }
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
      if (!inFinder && rnd() > 0.52) g.fillRect(x * px, y * px, px, px)
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
  }

  /* --------------------------------------------------- ACCOUNT / ADMIN tabs */
  if (page === 'account' || page === 'admin') {
    const btns = $$('[data-view]')
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('is-on'))
      b.classList.add('is-on')
      $$('.view').forEach((v) => v.classList.toggle('is-on', v.id === 'v-' + b.dataset.view))
      const t = $('#view-title'); if (t) t.textContent = b.dataset.title || b.textContent.trim()
    }))
  }

  /* sortable admin table */
  if (page === 'admin') {
    $$('table.tbl th[data-k]').forEach((th) => th.addEventListener('click', () => {
      const tb = th.closest('table').tBodies[0]
      const i = [...th.parentNode.children].indexOf(th)
      const dir = th.dataset.dir === 'asc' ? -1 : 1
      th.dataset.dir = dir === 1 ? 'asc' : 'desc'
      const rows = [...tb.rows].sort((a, b) => {
        const x = a.cells[i].dataset.v ?? a.cells[i].textContent
        const y = b.cells[i].dataset.v ?? b.cells[i].textContent
        const nx = parseFloat(x), ny = parseFloat(y)
        return (isNaN(nx) || isNaN(ny) ? String(x).localeCompare(String(y)) : nx - ny) * dir
      })
      rows.forEach((r) => tb.appendChild(r))
    }))
  }
})()
