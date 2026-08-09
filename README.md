# Served. — homepage rebuild

Static rebuild of the **Served.** homepage from `Home Page - Sample.pdf`
(a Figma export: 1 page, MediaBox **1920 × 3554**, 1pt = 1px).

```
index.html            the page
css/styles.css        all styles (desktop = measured; responsive = derived)
assets/img/           images extracted from the PDF
verify.mjs            renders headless at 1920 and pixel-diffs vs the design
probe.mjs             reports built geometry vs measured design targets
typetune.mjs          solves font-size per text style from measured string widths
_reference/           design render, crops, measurement scripts (not shipped)
_verify/              diff output (not shipped)
```

Run `node verify.mjs` to reproduce the match figures below.
(`node_modules` is symlinked to the clone-site skill's; it needs `playwright`, `pngjs`, `pixelmatch`.)

## Fidelity

Headless Chromium at 1920px wide, diffed against the 1:1 PDF render
(`pixelmatch`, threshold 0.12, anti-aliasing ignored). Page height is exact: **3554px**.

| Band | y-range | Match |
|---|---|---|
| Nav | 0–78 | **96.5%** |
| Hero | 78–842 | **88.2%** |
| How It Works | 843–1497 | **97.7%** |
| Featured Venues | 1498–2470 | **96.6%** |
| CTA banner | 2471–2995 | **69.2%** |
| Footer | 2996–3551 | **92.0%** |
| **Overall** | | **90.2%** |

Layout, type, and colour are effectively exact — every section origin lands within
3px of the design. The residual is concentrated in the two **photographic** bands
(hero, CTA); see *Known gaps*.

## How the values were derived

Nothing here was eyeballed. The PDF was rendered 1:1 (`pdftoppm -r 72`) and measured:

- **Colours** — sampled from the raster. `#ff7315` orange, `#ffaa00` amber, `#0caef4`
  chip blue, `#192335` navy, `#1e1e1e` ink, `#6b7385` muted, `#f1f1ef` band,
  `#f9f9f6` search bar, `#050505` hero, `#070605` footer.
- **Grid** — card columns detected by scanning for colour runs: both card rows sit at
  x = 312 / 752 / 1192, each **416px** wide with **24px** gaps → 3×416 + 2×24 = **1296**,
  the content container (1920 − 2×312).
- **Boxes** — every card, chip, button and panel edge found by run-length scanning
  (e.g. hero bottom corners resolve to a **32px** radius; the search bar is
  746×84 at (318, 525) and is `#f9f9f6`, not white).
- **Typeface** — the PDF has **no font metadata**: Figma outlined all text into Type 3
  glyphs (`pdffonts` reports `[none]` for all four). The family was identified by
  *fitting rendered string widths to measured ink widths* across 13 candidates.
  **Outfit** won decisively — it solves to 62.03/62.04px on two independent H1 strings,
  32.01/32.02 on two H2s and 55.03/55.04/55.03 on three CTA lines. Round numbers to two
  decimals across unrelated strings is not coincidence. (Second-best, Urbanist, solved to
  non-round 62.9/32.7/56.2.)
- **Font sizes** — solved the same way per style via `typetune.mjs`, not from cap
  heights: anti-aliasing inflates a measured ink band by ~2px, which overstates
  small sizes by 15–20%.

## Deliberately reproduced source inconsistencies

These look like bugs but are in the Figma file, so the clone keeps them:

- **"How It Works" button widths differ.** Card 1's button is **368px** (24px card
  padding); cards 2 and 3 are **336px** (40px padding). Same card width for all three.
- **Copy typos** are verbatim: *"Next availablity :"*, *"Build of Trust"*,
  *"Join  Us Today!"* (double space).
- HIW card body line breaks are pinned with `<br>` to match the design's exact wrapping.

## Derived work (NOT in the source)

The PDF contains **only the 1920px desktop frame**. Everything below 1920px is authored,
not cloned — there was no tablet or mobile design to match:

- Breakpoints at 1919 / 1440 / 1280 / 1120 / 820 / 640 / 430.
- Nav links collapse below 1120px; the outlined nav button is dropped below 640px.
  **There is no mobile menu** — the design supplied no pattern for one, so the links are
  hidden rather than invented. This is the main thing to specify before shipping.
- Card grids go 3 → 2 → 1 column; the CTA panel un-pins to normal flow below 1280px;
  the hero wordmark is hidden below 820px.
- Hover, focus and `prefers-reduced-motion` states — the static frame showed none.

Verified: no horizontal overflow and zero console errors at 1920/1440/1280/1024/820/640/430/375/320.

## Known gaps

- **CTA band (69%) and hero (86%)** are limited by photo cropping. `pdfimages` returns
  the raw embedded JPEG without Figma's placement transform, so the exact crop window
  isn't recoverable from the file. Both were fitted by sweeping `object-position` against
  the reference. The CTA photo is **mirrored** (`scaleX(-1)`) — flipping it improved that
  band from 53.7% → 64.9% at the same crop, which is strong evidence the design applies a
  horizontal flip that raw extraction doesn't capture. The hero crop is the best fit found
  under a plain full-bleed `cover`; the design's exact window still differs slightly.
- The CTA glass panel uses `backdrop-filter: blur(14px)` over a gradient. Figma's blur is
  not reproducible exactly in CSS, so its interior is an approximation.
- **Small UI icons are stand-ins.** Pin, calendar, heart, chevrons, search, arrows, ticks
  and the five social glyphs are hand-written inline SVG in a Lucide-like style, since
  they're vector paths in the PDF rather than extractable images. The three "How It Works"
  illustrations *are* the real artwork, cut from the 2× render with alpha.
- Fonts load from the Google Fonts CDN. Self-host `Outfit` if the page must be offline.
- The page is static: the carousel arrows, search field and all links are inert.

---

# Full site build (9 screens)

Built from the **Lo-Fi Wireframes — Developer Handoff** and the **Website Architecture
& User Flow** diagram, styled with the design system extracted from the homepage.

`node check-pages.mjs` re-runs the whole-site gate. Last run: **ALL CHECKS PASSED**.

## Pages

| File | Screen | Notes |
|---|---|---|
| `index.html` | Homepage | pixel-verified against the Figma render — **do not restyle** |
| `courts.html` | Court Listing | live filters (location / surface / max price) + sort |
| `court-<slug>.html` × 6 | Individual Court Page | one static, indexable URL per venue |
| `booking-calendar.html` | Availability Calendar | real August 2026 grid, green = open |
| `booking-time.html` | Date & Time Selection | slots, Court A–D, duration, live total |
| `checkout.html` | Payment Checkout | masked inputs + full client-side validation |
| `confirmation.html` | Booking Confirmation | check-in code + booking reference |
| `account.html` | User Account | 4 tabs: Bookings / Profile / Payments / History |
| `admin.html` | Admin Dashboard | 4 views: Courts / Bookings / Revenue / Users |

## Architecture decisions

- **`styles.css` is never edited.** It holds the verified homepage. New screens load it
  for tokens, nav, footer and buttons, then `pages.css` on top. The homepage still
  measures **89.708% / 0px height delta** after the whole build.
- **Venue → courts.** The wireframes pick between *Court A–D* while the homepage sells
  *venues*, so a venue owns N bookable courts. URLs are per venue (`court-<slug>.html`),
  courts are a selection inside the booking step.
- **Nav and footer are injected** from `js/chrome.js` so nine pages can't drift apart.
  `index.html` is the exception — it keeps its own inline chrome so it stays untouched.
  Court-page *content* is still baked into the HTML for indexing.
- **Booking state** rides in `sessionStorage` (`js/data.js` → `SERVED.draft`) between
  funnel pages. Landing on checkout or confirmation without a draft redirects to the listing.
- **Court pages are generated**: `node gen-courts.mjs` re-emits all six from `js/data.js`.
  Edit the data, not the HTML.
- Orphan nav/footer links resolve to the nearest real page (Pricing → listing,
  Registration → account, List Your Court → admin) rather than dead `#` anchors.

## What actually works

Driven end-to-end by `check-pages.mjs` in a real browser: listing filters narrow and
reset; a court page opens; Check Availability reaches the calendar with 18 open days;
selecting Aug 15 carries through; Court A shows its 3 taken slots struck out; a 2-hour
booking computes **₱1,400** and carries into checkout; an empty submit flags all 5 fields;
a valid card reaches confirmation with a generated reference and a rendered check-in code.
All 10 pages: 0 console errors, 0 broken images, no horizontal overflow at
1920/1280/768/430, and no dead internal links.

## Deliberate deviations from the wireframes

- **Currency.** Wireframes show `$25/hr` and `$3,800`; the approved homepage uses ₱ with
  PH venues, so peso wins. Admin revenue is scaled to the ₱700 base rate
  (152 bookings → **₱106,400**) rather than carrying the wireframe's inconsistent $3,800.
- **Three venues are invented.** BGC Turf, Alabang Tennis Club and Ortigas Smash are
  placeholder inventory so the filters have something to act on. The first three are the
  real ones from the homepage design.

## Still missing a backend

Payment, auth, admin figures, confirmation email and the check-in code are all UI only.
"Pay Now" charges nothing — a live build needs Stripe (or equivalent) and card details
must never reach your own server. The confirmation code is a generated placeholder
pattern, **not a scannable QR**. Admin and account data are fixtures.

**Open product decision:** there is still no mobile menu. Nav links hide below 1120px on
every page because neither document specifies a pattern for one.

---

# Accessibility pass + mobile navigation

`node check-a11y.mjs` re-runs this gate. Last run: **A11Y CHECKS PASSED**.
Homepage still **89.708% / 0px delta**; `node check-pages.mjs` still **ALL CHECKS PASSED**.

Everything lives in `css/a11y.css` + `js/nav.js`, loaded by all 14 pages. `styles.css`
remains untouched. Nothing in this layer paints in a default screenshot — focus rings
only appear on `:focus-visible`, and hit areas grow via pseudo-elements so no layout
box changes size.

## Fixed

- **Focus rings.** `styles.css` had zero `:focus` rules. Now every interactive element
  gets a 3px ring — navy on light surfaces, white on the dark nav/hero/footer/CTA/admin,
  since orange itself fails as an indicator (2.72:1 on white).
- **Mobile drawer.** Nav links previously just vanished below 1120px. There is now a
  hamburger + slide-in drawer carrying all 5 links and both CTAs, with `aria-expanded`,
  Escape to close, a working focus trap, focus restored to the button on close, and body
  scroll lock. Built by `js/nav.js` from whatever nav markup is on the page, so it works
  on the inline-chrome homepage and the injected-chrome pages alike.
- **Skip-to-content link** on every page, first in the tab order.
- **Hit areas.** Nav/footer/breadcrumb/social links rendered ~20px tall (under the 24px
  minimum). Expanded to ≥24px via `::after` overlays — spacing and the homepage diff
  are unaffected.
- **Accessible names.** Venue photo links announced as "Featured" or nothing; they now
  carry `aria-label="View <venue>"`. Admin sidebar logo link named.
- **Heading order.** Fixed 8 level jumps: footer column headings h4→h3, listing card
  titles h3→h2, admin table captions h3→h2, account booking titles h4→h3.
- **Calendar semantics.** The 6 empty leading cells were `<button disabled aria-hidden>`;
  they are now `<span>`, since a blank grid cell is not a control.

## NOT fixed — needs your decision

The palette fails WCAG AA, and it comes from the Figma design, not the build:

| Surface | Now | AA |
|---|---|---|
| white on orange `#ff7315` (every CTA) | 2.72 | 4.5 |
| white on amber `#ffaa00` (rating badge) | 1.91 | 4.5 |
| white on blue `#0caef4` (chips) | 2.51 | 4.5 |
| orange text on white ("Served." / "Venues") | 2.72 | 3.0 |

Three ways out, measured:

**A — keep the palette, darken the text.** The fills are fine; only white-on-them fails.
Navy `#192335` on the *unchanged* brand colours scores **5.79** on orange, **8.25** on
amber, **6.28** on blue. Brand colours survive exactly; CTAs become dark-on-orange.

**B — darken the fills, keep white text.** orange → `#c95100`, amber → `#a16c00`,
blue → `#087eb2`. All ≥4.5, but the palette reads noticeably muddier.

**C — 3:1 only.** orange → `#fb6500` (3.02) is nearly indistinguishable from the current
colour, but 3:1 only covers large text and UI components — the 15–17px button and chip
labels would still fail.

Recommendation: **A**. It is the only option that keeps the client's colours byte-exact.
Any of them will move the homepage off its 89.708% match, since the Figma render itself
uses the failing combination.

---

# Authentication screens

Built from four PNG exports (Sign Up / Sign In / Forgot Password / Change Password,
1920x1158 each). `node check-auth.mjs` re-runs this gate — last run: **AUTH CHECKS PASSED**.
All other gates still green: homepage **89.708% / 0px**, `check-pages` and `check-a11y` pass.

| File | Screen |
|---|---|
| `signup.html` | Get Served. — split photo panel + registration form |
| `signin.html` | You're Up! — split photo panel + sign-in form |
| `forgot-password.html` | centred card, email reset request |
| `change-password.html` | centred card, new + confirm password |

## Measured from the exports

Split at **x=948**; card **604px** wide on the split screens and **616px** centred
(matches the build exactly: forgot/change render at x652 w616). Card bg `#f1f1ef`,
fields `#fafafa` at **60px** tall with **24px** gaps (browser-verified 24/24/24), card
radius **10px**, glass-panel button **88px**, logo **225px**, left glass panel
**x146..805 (660 wide)**. Same Outfit/orange/navy system as the rest of the site.

## What works

Client-side only — nothing authenticates, persists or emails. But the behaviour is real:
per-field validation with messages, password show/hide toggles, Player vs Court Owner
role switch (a court owner lands on the admin dashboard, a player on their account),
remember-password toggle, and inline success states on the reset flows. Verified across
1920/900/430 with no horizontal overflow.

Entry points wired: nav "Login / Register" → sign in, footer "Registration" → sign up,
"Forgot Password" → reset, account Profile Settings → change password.

## Deviations from the designs

- **The left glass panels were baked into the source PNGs** along with their text. I blended
  those rectangles out of the extracted photos (interpolating between the rows above and
  below) so the panel and button could be rebuilt as live, responsive HTML rather than
  flattened pixels.
- **Added a "Back to site" button** on sign up / sign in. The designs have no way out of
  the auth screens; this is my addition, not in the source.
- **The logo asset is white-on-transparent** (it was cut from the dark homepage), so on the
  white auth pages it rendered invisible. It is recoloured with `filter:brightness(0)` to
  match the black wordmark in the designs. A proper dark logo export would be better.
- Copy is verbatim, including the design's double space in *"Ready for  your next match?"*.
- Google / Facebook buttons are inert — OAuth needs a backend.
- Responsive behaviour below 1920 is derived; the exports are desktop-only.

## Post-build adversarial review

A 49-agent workflow reviewed these screens across six lenses (spec conformance, copy,
logic, links, accessibility, consistency), with every finding independently attacked by a
refuter before it counted. **21 confirmed, 22 dismissed.** All confirmed items are fixed:

- **Field gap was 42px, not 24px.** The always-reserved `.auth-err` slot (17px min-height
  + 5px margin) was silently paying for the gap. The error slot now collapses when empty
  and `.auth-field` owns the 24px. Browser-verified 24/24/24 on sign up.
- **The left-panel CTA pointed at the page it was already on** — clicking "Register Now"
  on sign up reloaded and wiped the form. The designs deliberately label it with the
  page's own action, so it now focuses the first field instead of navigating.
- **The photo inpaint left a flat grey band.** The first pass filled the erased panel rect
  with a vertical gradient, which read as a visible rectangle under the sign-in button.
  Refilled with vertically-mirrored photo texture, brightness-matched to its surroundings
  (patch texture std now 22.2 / 86.4 vs 27.4 / 93.1 in the surrounding photo).
- Corrected against re-measured pixels: card radius 18 → **10px**, glass button 78 → **88px**,
  logo 216 → **225px**, added the solo-card drop shadow, roles→first-field gap → **42px**.
- Placeholder contrast was 2.52:1 (placeholders are the only visible labels) → `#6f7681`;
  field icons restored to `--muted`; radio ring and toggle track darkened to clear 3:1.
- Errors are now programmatically associated (`aria-describedby`, `aria-invalid`,
  `role="alert"`); the terms error clears when the box is ticked; the echoed email is set
  with `textContent` instead of being character-stripped into `innerHTML`.
- `change-password.html` no longer carries forgot-password's "Remember Password?" footer —
  it exits to **Back to My Account**, matching how the page is actually reached.

---

# Philippine payment methods

`checkout.html` now offers five methods, built by a 10-agent workflow (one builder plus one
adversarial reviewer per method) and assembled here. Covered by `check-pages.mjs`.

| Method | Panel | What it collects |
|---|---|---|
| GCash | `pm-gcash` | GCash-registered mobile, normalised to `09XX XXX XXXX` |
| Maya | `pm-maya` | Maya mobile + funding source (wallet balance vs linked card) |
| QR Ph | `pm-qrph` | nothing — shows a code to scan, with a 5-minute countdown and expiry state |
| Online banking | `pm-bank` | bank picker (9 banks) + account name, then a redirect |
| Card | `pm-card` | the original card form, unchanged ids so existing tests still pass |

The email field is **hoisted above the panels** — it is method-independent, and this avoids
five duplicate email inputs.

## The blocker worth knowing about

Validation is **scoped to the active panel**. The original flat rules map iterated every
rule on submit; once the card fields were wrapped in a hidden panel they were still in the
DOM, so choosing GCash would run all five card rules against empty inputs and the form
could never submit. Error focus also had to become `:is(input,select)` — the bank picker is
a `<select>` and the old selector could not reach it. Both are covered by a regression test.

Also fixed during assembly: **my own regex ate one `</div>` from the Maya panel**, which
nested the submit button inside a hidden panel and made it unclickable. Div balance is now
checked per panel.

Two honesty problems on the page were removed: *"Cards are processed over an encrypted
connection"* (nothing is processed; there is no connection) and a stale disclaimer naming
Stripe, a provider that has not been chosen. Each panel now carries its own accurate note.

## Not decided yet

No acquirer is chosen. Xendit, PayMongo, Dragonpay and Maya Business were all raised by the
reviewers; the choice determines the real bank list, channel codes, redirect contract and
webhook signature scheme, so the 9-bank list is a placeholder.

**No fee, transaction cap or settlement time appears anywhere in the UI**, deliberately —
InstaPay caps and PESONet cut-offs must be confirmed against the acquirer and the governing
BSP circular before any figure is shown to a customer.

Two things a live build must not repeat from this demo: confirmation is **webhook-driven,
not redirect-driven** (a return URL is a hint, not proof of payment — this demo confirms
unconditionally, which would be a fraud hole), and card details must never reach the
merchant server (hosted fields or a tokenising SDK, or you are in PCI scope).

Pre-existing card-validation quirk the review surfaced and I left alone: the mask accepted
13–19 digits now, but a 15-digit Amex was previously rejected and a 19-digit number silently
truncated. Length is relaxed; Luhn is still not checked — a real provider's hosted field
owns this anyway.

---

# Correction: hero wordmark rotation

Owner spotted the vertical "Served." in the hero was cropped wrong. It was.

**What was wrong:** the wordmark was rotated `+90deg` at 800px→860px wide and offset 60px
down, so only 3–4 letters fitted and they bled off both ends. The design fits the whole
word within the hero height.

**Correct values, solved against the design render:** `rotate(-90deg)` — the word reads
**bottom-to-top**, not top-to-bottom — at **800px**, anchored so its ink starts at the hero
top. Hero band **85.79% → 88.21%**; overall **89.708% → 90.229%**.

**Why I got it wrong:** my earlier optimiser swept width and vertical offset but only ever
at `+90deg`. I fixed the rotation direction from a visual read and never tested the
opposite, so the sweep was searching the wrong half of the space — and its results looked
flat (85.3–85.9% across 700–1200px), which I read as "not the dominant error" instead of
"you are in the wrong basin". A flat sweep is a signal the parameter is wrong, not that it
does not matter.

`css/styles.css` was edited for this — the one file otherwise left alone. That is correct
here: the wordmark is a homepage element and the change improves the verified match. All
four gates re-run green afterwards.

The responsive overrides were rewritten too; they still assumed the old
`rotate(90deg)`/`transform-origin:center` contract and would have flipped the word back
below 1920px. The mark now anchors with `left: calc(100% - 176px)` so it tracks the right
edge at every width.
