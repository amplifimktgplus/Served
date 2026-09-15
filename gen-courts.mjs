#!/usr/bin/env node
/* Emits one static court page per venue.
   Content is baked into the HTML (not JS-rendered) because the wireframes
   require each court to have its own indexable URL. Re-run after editing
   js/data.js:  node gen-courts.mjs */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// data.js does `window.SERVED = …` then refers to bare `SERVED`, so the
// sandbox global must BE window for both forms to resolve.
const sandbox = {}
sandbox.window = sandbox
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(HERE, 'js/data.js'), 'utf8'), sandbox)
const { venues } = sandbox.window.SERVED
const peso = (n) => '₱' + n.toLocaleString('en-US')

/* Icon tiles stand in for facility photography until real images land.
   Keyed by the `kind` on each facility in js/data.js. */
const FAC_ICO = {
  shop: '<path d="M4 9h24l-2 5.5a4 4 0 0 1-3.8 2.8H9.8A4 4 0 0 1 6 14.5z"/><path d="M11 9V6.5a5 5 0 0 1 10 0V9"/><path d="M8 17.3V25a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.7"/>',
  cafe: '<path d="M6 7h16v10a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M22 10h2.5a3.5 3.5 0 0 1 0 7H22"/><path d="M8 27h16"/>',
  lounge: '<path d="M6 16v-3a3 3 0 0 1 6 0v3h8v-3a3 3 0 0 1 6 0v3"/><path d="M4 16h24v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 24v3M24 24v3"/>',
  locker: '<rect x="7" y="4" width="18" height="24" rx="2.5"/><path d="M16 4v24"/><path d="M12 13h1.5M18.5 13H20"/>',
  rental: '<ellipse cx="13" cy="11" rx="7.5" ry="8.5"/><path d="M13 19.5 17 28"/><path d="M8 11h10M13 3.5v15"/>',
  gym: '<path d="M5 12v8M27 12v8M9 9v14M23 9v14"/><path d="M9 16h14"/>',
}
const facTile = (f, alt) =>
  f.img
    ? `<img src="${f.img}" alt="${alt}">`
    : `<span class="fac__ph" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FAC_ICO[f.kind] || FAC_ICO.lounge}</svg></span>`

const page = (v) => {
  const others = venues.filter((o) => o.slug !== v.slug).slice(0, 3)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${v.name} — Book from ${peso(v.price)}/hr | Served.</title>
<meta name="description" content="${v.name} in ${v.location}. ${v.surface} surface, ${v.courts} courts, ${peso(v.price)} per hour. Check live availability and book instantly on Served.">
<link rel="canonical" href="court-${v.slug}.html">
<meta property="og:title" content="${v.name} — Served.">
<meta property="og:description" content="${v.surface} surface · ${v.courts} courts · ${peso(v.price)}/hr in ${v.location}.">
<meta property="og:image" content="${v.img}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/pages.css">
<link rel="stylesheet" href="css/a11y.css">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SportsActivityLocation",
"name":"${v.name}","address":"${v.location}","image":"${v.img}",
"aggregateRating":{"@type":"AggregateRating","ratingValue":"${v.rating}","reviewCount":"${v.reviews}"},
"priceRange":"${peso(v.price)} per hour"}
</script>
</head>
<body data-page="court" data-nav="courts">

<!-- No #site-nav slot: the site header is deliberately absent on individual
     court pages. chrome.js only injects where it finds the slot, so omitting it
     is the whole mechanism. The breadcrumb below carries navigation instead. -->

<section class="phead">
  <div class="shell phead__inner">
    <nav class="crumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span>/</span><a href="courts.html">Courts</a><span>/</span><b>${v.name}</b>
    </nav>
    <h1>${v.name}</h1>
    <p>${v.location} · ${v.surface} surface · ${v.courts} courts available</p>
  </div>
</section>

<section class="sect">
  <div class="shell court">
    <div>
      <div class="court__gallery"><img id="shot" src="${v.img}" alt="${v.name}"></div>
      <div class="court__thumbs">
        ${[v.img, 'assets/img/venue-pickleball.jpg', 'assets/img/venue-tennis.jpg', 'assets/img/venue-badminton.jpg']
          .map((src, i) => `<img src="${src}" alt="${v.name} view ${i + 1}"${i === 0 ? ' class="is-on"' : ''} onclick="document.getElementById('shot').src=this.src;document.querySelectorAll('.court__thumbs img').forEach(t=>t.classList.remove('is-on'));this.classList.add('is-on')">`)
          .join('\n        ')}
      </div>

      <h2 style="margin-top:38px;font-size:28px;font-weight:700;color:var(--navy)">About this venue</h2>
      <p style="margin-top:12px;font-size:17px;line-height:25px;font-weight:300;color:var(--muted);max-width:70ch">${v.blurb}</p>

      <dl class="spec">
        <div><dt>Surface</dt><dd>${v.surface}</dd></div>
        <div><dt>Court size</dt><dd>${v.size}</dd></div>
        <div><dt>Courts on site</dt><dd>${v.courts}</dd></div>
        <div><dt>Sport</dt><dd>${v.sport}</dd></div>
      </dl>

      <h3 style="margin-top:30px;font-size:20px;font-weight:700;color:var(--navy)">Amenities</h3>
      <ul class="amen">${v.amenities.map((a) => `<li>${a}</li>`).join('')}</ul>

      <h2 class="fac__title">More about ${v.name}</h2>
      <p class="fac__sub">Shops, food and places to sit between games.</p>
      <ul class="fac">
        ${(v.facilities || []).map((f) => `<li class="fac__card">
          <span class="fac__media">${facTile(f, `${f.title} at ${v.name}`)}</span>
          <h3>${f.title}</h3>
          <p>${f.desc}</p>
        </li>`).join('\n        ')}
      </ul>
    </div>

    <aside class="booking-card">
      <span class="price">${peso(v.price)}<small> / hr</small></span>
      <small class="price-note">*exclusive of tax and fees</small>
      <div class="kv"><span>Rating</span><b>${v.rating.toFixed(1)} · ${v.reviews} reviews</b></div>
      <div class="kv"><span>Next availability</span><b>${v.next}</b></div>
      <div class="kv"><span>Location</span><b>${v.location}</b></div>
      <hr>
      <div class="kv"><span>Courts bookable</span><b>${v.courts}</b></div>
      <a class="btn btn--orange" href="booking-calendar.html?venue=${v.slug}">Check Availability</a>
      <!-- Manual / walk-in entry is an owner job and there is no dedicated screen
           for it, so this resolves to the admin dashboard — the nearest real page,
           following the same orphan-link rule as the nav. -->
      <a class="btn btn--outline" href="admin.html"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v5M9.5 16h5"/></svg>Add a reservation</a>
      <p style="margin-top:14px;font-size:14px;color:var(--muted);text-align:center">Free cancellation up to 24 hours before your slot.<br>Court owners can add manual or walk-in bookings.</p>
    </aside>
  </div>
</section>

<section class="sect sect--band">
  <div class="shell">
    <h2 style="font-size:32px;font-weight:700;color:var(--navy)">Other <span class="accent">venues</span></h2>
    <div class="listing" style="margin-top:26px">
      ${others.map((o) => `<article class="lrow">
        <a class="lrow__media" href="court-${o.slug}.html" aria-label="View ${o.name}"><img src="${o.img}" alt="${o.name}"></a>
        <div>
          <h3><a href="court-${o.slug}.html">${o.name}</a></h3>
          <div class="lrow__meta"><span>${o.location}</span><span>${o.surface} · ${o.courts} courts</span></div>
          <p class="lrow__body">${o.blurb}</p>
        </div>
        <div class="lrow__side">
          <span class="rate"><b>${o.rating.toFixed(1)}</b>${o.reviews} Reviews</span>
          <span class="price">${peso(o.price)}<small> / hr</small></span>
          <small class="price-note">*exclusive of tax and fees</small>
          <a class="btn btn--orange" style="height:44px;padding-inline:22px;border-radius:10px;font-weight:600" href="court-${o.slug}.html">View Court</a>
        </div>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>

<div id="site-foot"></div>

<script src="js/data.js"></script>
<script src="js/chrome.js"></script>
<script src="js/app.js"></script>
<script src="js/nav.js"></script>
</body>
</html>
`
}

let n = 0
for (const v of venues) {
  fs.writeFileSync(path.join(HERE, `court-${v.slug}.html`), page(v))
  console.log(`  court-${v.slug}.html`)
  n++
}
console.log(`${n} court pages written`)
