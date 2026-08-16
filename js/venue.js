/* Venue profile — the court owner's own space on Served.
   Drives three things on court-*.html pages that opt in with .vpage:
     1. the Owner View / Player View switch (body[data-view], CSS does the rest)
     2. the owner's customisation surfaces — cover photo, gallery photos,
        amenity chips, brand colour, inline text edits
     3. the gallery lightbox-less shot swap that both audiences share
   Everything is client-side only: uploads become object URLs and live for the
   session. No backend exists in this static build — flagged in README.md. */

;(function () {
  const body = document.body
  if (!body.classList.contains('vpage')) return

  /* ------------------------------------------------------------- icons */
  /* 24px stroke icons; styles.css already sets fill:none/stroke:currentColor. */
  const ICON = {
    lights:  '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6h5.4c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
    net:     '<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M9 7v10M15 7v10M3 12h18"/>',
    parking: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M10 17V7h3.2a3 3 0 0 1 0 6H10"/>',
    showers: '<path d="M6 4h6a5 5 0 0 1 5 5v1M4 10h16"/><path d="M8 14v.01M12 14v.01M16 14v.01M8 18v.01M12 18v.01M16 18v.01"/>',
    cafe:    '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9.5h1.6a2.4 2.4 0 0 1 0 4.8H17"/><path d="M8 3v2M12 3v2"/>',
    aircon:  '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5 4.2 16.5"/><path d="m9.5 4.6 2.5 2 2.5-2M9.5 19.4l2.5-2 2.5 2"/>',
    rest:    '<circle cx="8" cy="5" r="2"/><path d="M8 9h.01M6 21v-6H4.8L6.6 9.8A1.6 1.6 0 0 1 8.1 8.7h0a1.6 1.6 0 0 1 1.5 1.1L11.4 15H10v6z"/><circle cx="17" cy="5" r="2"/><path d="M14.6 15 16 9.3a1.5 1.5 0 0 1 2.9 0L20.3 15h-1.6l-.4 6h-1.9l-.4-6z"/>',
    water:   '<path d="M12 3.5s5.5 6 5.5 9.7a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5z"/>',
    lockers: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 14.5v2.5"/>',
    wifi:    '<path d="M3.5 9.2a13 13 0 0 1 17 0M6.6 12.6a8.4 8.4 0 0 1 10.8 0M9.7 16a4 4 0 0 1 4.6 0"/><path d="M12 19.5v.01"/>',
    shop:    '<path d="M5.5 8h13l-1.1 11.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    coach:   '<circle cx="9" cy="7.5" r="3"/><path d="M3.5 20v-1.2A4.3 4.3 0 0 1 7.8 14.5h2.4a4.3 4.3 0 0 1 4.3 4.3V20"/><path d="M17 10.5v5M14.5 13h5"/>',
    seating: '<path d="M4 10h16M5 10V7.5A1.5 1.5 0 0 1 6.5 6h11A1.5 1.5 0 0 1 19 7.5V10M6 14h12M6 10v8M18 10v8"/>',
    cctv:    '<path d="M3.5 8.6 17 5l1.6 5.4L5 14z"/><path d="M6.5 13.4 8 18M13 11.6l2.5 1.4a3 3 0 0 1 1.1 4.1"/>',
    access:  '<circle cx="12" cy="12" r="9"/><circle cx="13" cy="7.2" r="1.3"/><path d="M10.4 10.2h4M11.6 10.2v4h3l1.6 3.2"/>',
    pin:     '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    star:    '<path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.8 9.6 9z"/>',
    court:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 12h18"/>',
    tag:     '<path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7z"/><path d="M7.5 7.5v.01"/>',
    pen:     '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 5.5l4 4"/>',
    upload:  '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 4v11M7.5 8.5 12 4l4.5 4.5"/>',
    plus:    '<path d="M12 5v14M5 12h14"/>',
    check:   '<path d="m4.5 12.5 5 5 10-11"/>',
    share:   '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
    cal:     '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chart:   '<path d="M4 20h16M7.5 20v-6M12 20V7M16.5 20v-9"/>',
  }

  const svg = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.check}</svg>`

  /* ------------------------------------------------- 1. view switching */
  const KEY = 'served.venueView'
  const setView = (v) => {
    body.dataset.view = v
    document.querySelectorAll('.switch button[data-view]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.view === v))
    })
    const note = document.getElementById('view-note')
    if (note) {
      note.innerHTML = v === 'owner'
        ? '<b>Owner view</b> — you are editing your Served page. Only you see these controls.'
        : '<b>Player view</b> — this is exactly what players see when they land here.'
    }
    try { sessionStorage.setItem(KEY, v) } catch (e) { /* private mode */ }
  }
  document.querySelectorAll('.switch button[data-view]').forEach((b) => {
    b.addEventListener('click', () => setView(b.dataset.view))
  })
  /* ?view=player / ?view=owner wins — that is how the owner dashboard's
     "Edit Court Page" and "View public site" buttons land you in the right
     audience — otherwise fall back to the last view used this session. */
  let start = 'owner'
  try { start = sessionStorage.getItem(KEY) || 'owner' } catch (e) { /* private mode */ }
  const asked = new URLSearchParams(location.search).get('view')
  if (asked === 'player' || asked === 'owner') start = asked
  setView(start === 'player' ? 'player' : 'owner')

  /* ---------------------------------------------------- 2. the gallery */
  const shot = document.getElementById('shot')
  const thumbs = document.getElementById('thumbs')

  const selectThumb = (img) => {
    if (!shot) return
    shot.src = img.src
    shot.alt = img.alt
    thumbs.querySelectorAll('img').forEach((t) => t.classList.remove('is-on'))
    img.classList.add('is-on')
  }
  if (thumbs) {
    thumbs.addEventListener('click', (e) => {
      const img = e.target.closest('img')
      if (img) selectThumb(img)
    })
  }

  /* owner adds a photo — the dashed "+" tile */
  const photoInput = document.getElementById('photo-file')
  const addTile = document.getElementById('photo-add')
  if (addTile && photoInput) {
    addTile.addEventListener('click', () => photoInput.click())
    photoInput.addEventListener('change', () => {
      Array.from(photoInput.files || []).forEach((file) => {
        const img = document.createElement('img')
        img.src = URL.createObjectURL(file)
        img.alt = 'Rally X court photo'
        const wrap = document.createElement('div')
        wrap.appendChild(img)
        thumbs.insertBefore(wrap, addTile.parentElement)
        selectThumb(img)
      })
      photoInput.value = ''
    })
  }

  /* owner swaps a single image (cover banner, brand logo) */
  const wireSwap = (btnId, inputId, imgSel) => {
    const btn = document.getElementById(btnId)
    const input = document.getElementById(inputId)
    const img = document.querySelector(imgSel)
    if (!btn || !input || !img) return
    btn.addEventListener('click', () => input.click())
    input.addEventListener('change', () => {
      const file = (input.files || [])[0]
      if (file) img.src = URL.createObjectURL(file)
      input.value = ''
    })
  }
  wireSwap('banner-btn', 'banner-file', '#vbanner')
  wireSwap('logo-btn', 'logo-file', '.vlogo img')

  /* -------------------------------------------------- 3. amenity chips */
  const CATALOGUE = [
    { id: 'lights',  label: 'Lights' },
    { id: 'net',     label: 'Net' },
    { id: 'parking', label: 'Parking' },
    { id: 'showers', label: 'Showers' },
    { id: 'cafe',    label: 'Café' },
    { id: 'aircon',  label: 'Air-conditioned' },
    { id: 'rest',    label: 'Restrooms' },
    { id: 'water',   label: 'Water station' },
    { id: 'lockers', label: 'Lockers' },
    { id: 'wifi',    label: 'Wi-Fi' },
    { id: 'shop',    label: 'Pro shop' },
    { id: 'coach',   label: 'Coaching' },
    { id: 'seating', label: 'Player seating' },
    { id: 'cctv',    label: 'CCTV' },
    { id: 'access',  label: 'Step-free access' },
  ]

  const amenList = document.getElementById('amenities')
  const pick = document.getElementById('amen-pick')
  const pickGrid = document.getElementById('amen-pick-grid')
  let chosen = ['lights', 'net', 'parking']

  const byId = (id) => CATALOGUE.find((a) => a.id === id)

  const renderAmenities = () => {
    if (!amenList) return
    amenList.innerHTML = chosen.map((id) => {
      const a = byId(id)
      if (!a) return ''
      return `<li>${svg(a.id)}<span>${a.label}</span>` +
        `<button class="amen__x is-owner" type="button" data-drop="${a.id}" aria-label="Remove ${a.label}">&times;</button></li>`
    }).join('')
  }

  const renderPicker = () => {
    if (!pickGrid) return
    const left = CATALOGUE.filter((a) => chosen.indexOf(a.id) === -1)
    pickGrid.innerHTML = left.length
      ? left.map((a) => `<button type="button" data-add="${a.id}">${svg(a.id)}<span>${a.label}</span></button>`).join('')
      : '<p class="pick__empty">Every amenity is already on your listing.</p>'
  }

  if (amenList) {
    renderAmenities()
    renderPicker()
    amenList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-drop]')
      if (!btn) return
      chosen = chosen.filter((id) => id !== btn.dataset.drop)
      renderAmenities(); renderPicker()
    })
  }
  if (pick) {
    const trigger = pick.querySelector('.amen__add')
    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      pick.classList.toggle('is-open')
      trigger.setAttribute('aria-expanded', String(pick.classList.contains('is-open')))
    })
    pickGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]')
      if (!btn) return
      chosen.push(btn.dataset.add)
      renderAmenities(); renderPicker()
      if (!pickGrid.querySelector('[data-add]')) {
        pick.classList.remove('is-open')
        trigger.setAttribute('aria-expanded', 'false')
      }
    })
    document.addEventListener('click', (e) => {
      if (!pick.contains(e.target)) {
        pick.classList.remove('is-open')
        trigger.setAttribute('aria-expanded', 'false')
      }
    })
  }

  /* --------------------------------------------- 4. inline text edits */
  document.querySelectorAll('.editable__pen[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.edit)
      if (!target) return
      target.setAttribute('contenteditable', 'true')
      target.focus()
      const stop = () => {
        target.removeAttribute('contenteditable')
        target.removeEventListener('blur', stop)
      }
      target.addEventListener('blur', stop)
    })
  })

  /* ------------------------------------------------- 5. brand colour */
  const page = document.querySelector('.vpage')
  const shade = (hex, amount) => {
    const n = parseInt(hex.slice(1), 16)
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => Math.max(0, Math.min(255, Math.round(v * amount))))
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
  }
  const inkFor = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    return L > 0.42 ? '#0b0e05' : '#ffffff'
  }
  const custom = document.getElementById('brand-custom')   // <input type="color">
  const customChip = document.getElementById('brand-custom-chip')
  const hexField = document.getElementById('brand-hex')

  /* One entry point so presets, the colour picker and the hex box can't drift.
     `from` says which control initiated it, so we don't fight that control's
     own value while the user is dragging inside it. */
  const applyBrand = (hex, from) => {
    hex = hex.toLowerCase()
    page.style.setProperty('--brand', hex)
    page.style.setProperty('--brand-dark', shade(hex, 0.88))
    page.style.setProperty('--brand-ink', inkFor(hex))

    const preset = [...document.querySelectorAll('.swatch[data-brand]')]
      .find((o) => o.dataset.brand.toLowerCase() === hex)
    document.querySelectorAll('.swatch[data-brand]').forEach((o) => {
      o.setAttribute('aria-pressed', String(o === preset))
    })
    if (customChip) {
      customChip.setAttribute('aria-pressed', String(!preset))
      customChip.style.setProperty('--picked', hex)
      customChip.classList.toggle('has-colour', !preset)
    }
    if (custom && from !== 'picker') custom.value = hex
    if (hexField && from !== 'hex') hexField.value = hex.slice(1).toUpperCase()
  }

  document.querySelectorAll('.swatch[data-brand]').forEach((sw) => {
    sw.style.background = sw.dataset.brand
    sw.addEventListener('click', () => applyBrand(sw.dataset.brand, 'preset'))
  })

  /* full colour picker — the OS/browser wheel, live as the owner drags */
  if (custom) {
    custom.addEventListener('input', () => applyBrand(custom.value, 'picker'))
  }

  /* hex box — for matching an exact brand guideline value */
  if (hexField) {
    const readHex = () => {
      let v = hexField.value.trim().replace(/^#/, '')
      if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map((c) => c + c).join('')
      if (/^[0-9a-f]{6}$/i.test(v)) applyBrand('#' + v, 'hex')
    }
    hexField.addEventListener('input', readHex)
    hexField.addEventListener('blur', () => {
      // snap the box back to whatever is actually applied if the entry was junk
      const live = page.style.getPropertyValue('--brand').trim() || '#b7d60f'
      hexField.value = live.replace('#', '').toUpperCase()
    })
  }

  /* --------------------------------------------- 6. listing switches */
  document.querySelectorAll('.otog').forEach((sw) => {
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-pressed') === 'true'
      sw.setAttribute('aria-pressed', String(!on))
      const badge = sw.dataset.badge && document.querySelector(sw.dataset.badge)
      if (badge) badge.innerHTML = on ? '<i></i>Hidden' : '<i></i>Live'
      if (badge) badge.style.cssText = on
        ? 'background:#f3f4f6;color:#6b7385'
        : ''
    })
  })
})()
