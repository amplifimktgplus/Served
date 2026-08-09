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

<div id="site-nav"></div>

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
    </div>

    <aside class="booking-card">
      <span class="price">${peso(v.price)}<small> / hr</small></span>
      <div class="kv"><span>Rating</span><b>${v.rating.toFixed(1)} · ${v.reviews} reviews</b></div>
      <div class="kv"><span>Next availability</span><b>${v.next}</b></div>
      <div class="kv"><span>Location</span><b>${v.location}</b></div>
      <hr>
      <div class="kv"><span>Courts bookable</span><b>${v.courts}</b></div>
      <a class="btn btn--orange" href="booking-calendar.html?venue=${v.slug}">Check Availability</a>
      <p style="margin-top:14px;font-size:14px;color:var(--muted);text-align:center">Free cancellation up to 24 hours before your slot.</p>
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
