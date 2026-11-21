/* Rally X owner dashboard.
   Scoped to ONE venue: a court owner sees their own courts, bookings and
   revenue and nothing else. Players never see this screen — the gate below
   checks the session role written by auth.js.

   HONEST LIMIT: this is a static build with no backend, so the gate is a
   client-side courtesy, not security. Anyone can read the fixture data in
   view-source. Real enforcement has to happen server-side.

   All figures come from ROWS — the KPI tiles, the day series and the current
   week/month are DERIVED from it, so the table and the chart can never drift
   apart. Earlier weeks/months and the year series are flat fixtures. */

;(function () {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const body = document.body
  if (!document.getElementById('dash')) return   // app.js owns data-page="admin" (table sorting)

  const RATE = 700
  const peso = (n) => '₱' + n.toLocaleString('en-PH')
  const short = (n) => (n >= 1000 ? '₱' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : '₱' + n)

  /* ------------------------------------------------------- 1. access gate */
  const readSession = () => {
    try { return JSON.parse(sessionStorage.getItem('served.session') || 'null') } catch (e) { return null }
  }
  const isOwner = () => (readSession() || {}).role === 'owner'

  if (!isOwner()) {
    $('#gate').hidden = false
    $('#dash').hidden = true
    $('#demo-owner').addEventListener('click', (e) => {
      e.preventDefault()
      sessionStorage.setItem('served.session', JSON.stringify({ role: 'owner', venue: 'rally-x', demo: true }))
      location.reload()
    })
    return
  }
  $('#gate').hidden = true
  $('#dash').hidden = false

  $('#sign-out').addEventListener('click', (e) => {
    e.preventDefault()
    sessionStorage.removeItem('served.session')
    location.href = 'index.html'
  })

  /* ------------------------------------------------ 2. August 2026 ledger */
  /* day, customer, court, hours, status. Cancelled slots bill nothing. */
  const ROWS = [
    [1,  'Juan Dela Cruz',  'Court A', 1, 'Paid'],
    [2,  'Maria Santos',    'Court C', 2, 'Paid'],
    [3,  'Andrea Lim',      'Court B', 1, 'Paid'],
    [4,  'Paolo Reyes',     'Court A', 1, 'Paid'],
    [5,  'Bea Villanueva',  'Court C', 2, 'Paid'],
    [6,  'Carlo Mendoza',   'Court B', 1, 'Cancelled'],
    [7,  'Juan Dela Cruz',  'Court A', 1, 'Paid'],
    [8,  'Rafael Cruz',     'Court C', 1, 'Paid'],
    [9,  'Maria Santos',    'Court B', 2, 'Paid'],
    [10, 'Nadine Ocampo',   'Court A', 1, 'Paid'],
    [11, 'Andrea Lim',      'Court C', 1, 'Paid'],
    [12, 'Miguel Torres',   'Court B', 1, 'Paid'],
    [13, 'Bea Villanueva',  'Court A', 2, 'Paid'],
    [14, 'Paolo Reyes',     'Court C', 1, 'Paid'],
    [15, 'Maria Santos',    'Court C', 2, 'Paid'],
    [16, 'Juan Dela Cruz',  'Court B', 1, 'Paid'],
    [17, 'Rafael Cruz',     'Court A', 1, 'Paid'],
    [18, 'Nadine Ocampo',   'Court C', 1, 'Cancelled'],
    [19, 'Andrea Lim',      'Court B', 1, 'Paid'],
    [20, 'Carlo Mendoza',   'Court A', 2, 'Paid'],
    [21, 'Miguel Torres',   'Court C', 1, 'Paid'],
    [22, 'Bea Villanueva',  'Court B', 1, 'Pending'],
    [23, 'Juan Dela Cruz',  'Court A', 1, 'Paid'],
    [24, 'Maria Santos',    'Court C', 1, 'Pending'],
  ].map(([day, customer, court, hours, status]) => ({
    ref: 'RX-202608' + String(day).padStart(2, '0') + (100 + day * 7),
    day, customer, court, hours, status,
    amount: status === 'Cancelled' ? 0 : hours * RATE,
    date: String(day).padStart(2, '0') + ' Aug 2026',
    sortDate: 20260800 + day,
  }))

  const billable = ROWS.filter((r) => r.status !== 'Cancelled')
  const MONTH_REVENUE = billable.reduce((s, r) => s + r.amount, 0)
  const MONTH_BOOKINGS = billable.length
  const CANCELLED = ROWS.filter((r) => r.status === 'Cancelled').length

  /* -------------------------------------------------------- 3. KPI tiles */
  /* Every tile is derived from ROWS. Deliberately NOT showing an occupancy
     rate: this fixture ledger is 24 bookings, so against a real bookable
     window (3 courts × 12 hrs × 24 days = 864 court-hours) it computes to 3%
     — arithmetically right, but it would only mislead in a demo. Average
     booking value says something true about the same data. */
  const HOURS_SOLD = billable.reduce((s, r) => s + r.hours, 0)
  const AVG_VALUE = Math.round(MONTH_REVENUE / MONTH_BOOKINGS)
  const PREV_MONTH = { bookings: 19, revenue: 15400, cancelled: 3 }

  const pct = (now, was) => (was === 0 ? 0 : Math.round(((now - was) / was) * 100))
  const delta = (n, invert) => {
    const dir = n === 0 ? '' : n > 0 ? '▲' : '▼'
    const good = invert ? n < 0 : n > 0
    return `<i class="${n === 0 ? '' : good ? '' : 'dn'}">${dir} ${Math.abs(n)}% vs last month</i>`
  }

  $('#kpi').innerHTML = `
    <div class="tile"><span>Bookings</span><b>${MONTH_BOOKINGS}</b>${delta(pct(MONTH_BOOKINGS, PREV_MONTH.bookings))}</div>
    <div class="tile"><span>Revenue</span><b>${peso(MONTH_REVENUE)}</b>${delta(pct(MONTH_REVENUE, PREV_MONTH.revenue))}</div>
    <div class="tile"><span>Avg. booking value</span><b>${peso(AVG_VALUE)}</b><i>${HOURS_SOLD} court-hours sold</i></div>
    <div class="tile"><span>Cancellations</span><b>${CANCELLED}</b>${delta(pct(CANCELLED, PREV_MONTH.cancelled), true)}</div>`

  /* ------------------------------------------- 4. period-over-period data */
  const DOW = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] // 1 Aug 2026 is a Saturday

  const byDay = (day) => ROWS.filter((r) => r.day === day && r.status !== 'Cancelled')
  const days = []
  for (let d = 11; d <= 24; d++) {
    const hit = byDay(d)
    days.push({
      label: `${DOW[(d - 1) % 7]} ${d}`,
      bookings: hit.length,
      revenue: hit.reduce((s, r) => s + r.amount, 0),
    })
  }

  const weekOf = (from, to) => {
    const hit = billable.filter((r) => r.day >= from && r.day <= to)
    return { bookings: hit.length, revenue: hit.reduce((s, r) => s + r.amount, 0) }
  }
  const weeks = [
    { label: 'Wk 27', bookings: 4, revenue: 3500 },
    { label: 'Wk 28', bookings: 5, revenue: 4200 },
    { label: 'Wk 29', bookings: 4, revenue: 3500 },
    { label: 'Wk 30', bookings: 6, revenue: 4900 },
    { label: 'Wk 31', bookings: 5, revenue: 4200 },
    Object.assign({ label: 'Aug 1–7' }, weekOf(1, 7)),
    Object.assign({ label: 'Aug 8–14' }, weekOf(8, 14)),
    Object.assign({ label: 'Aug 15–21' }, weekOf(15, 21)),
    Object.assign({ label: 'Aug 22–24' }, weekOf(22, 24)),
  ]

  const months = [
    { label: 'Sep 25', bookings: 12, revenue: 9800 },
    { label: 'Oct 25', bookings: 14, revenue: 11200 },
    { label: 'Nov 25', bookings: 13, revenue: 10500 },
    { label: 'Dec 25', bookings: 17, revenue: 14000 },
    { label: 'Jan 26', bookings: 15, revenue: 12600 },
    { label: 'Feb 26', bookings: 16, revenue: 13300 },
    { label: 'Mar 26', bookings: 18, revenue: 14700 },
    { label: 'Apr 26', bookings: 17, revenue: 14000 },
    { label: 'May 26', bookings: 20, revenue: 16100 },
    { label: 'Jun 26', bookings: 18, revenue: 15400 },
    { label: 'Jul 26', bookings: PREV_MONTH.bookings, revenue: PREV_MONTH.revenue },
    { label: 'Aug 26', bookings: MONTH_BOOKINGS, revenue: MONTH_REVENUE },
  ]

  const years = [
    { label: '2022', bookings: 84,  revenue: 58800 },
    { label: '2023', bookings: 121, revenue: 84700 },
    { label: '2024', bookings: 148, revenue: 107800 },
    { label: '2025', bookings: 166, revenue: 128100 },
    { label: '2026', bookings: 197, revenue: 158200 },
  ]

  const SERIES = { day: days, week: weeks, month: months, year: years }
  const NOUN = { day: 'day', week: 'week', month: 'month', year: 'year' }

  /* ------------------------------------------------------- 5. the chart */
  let range = 'month'
  let metric = 'bookings'

  const render = () => {
    const data = SERIES[range]
    const max = Math.max(...data.map((d) => d[metric]), 1)
    const last = data[data.length - 1]
    const prev = data[data.length - 2] || { bookings: 0, revenue: 0 }
    const change = pct(last[metric], prev[metric])

    $('#chart').innerHTML = data.map((d, i) => {
      const before = i === 0 ? null : data[i - 1][metric]
      const dv = before === null ? null : pct(d[metric], before)
      const value = metric === 'revenue' ? short(d[metric]) : d[metric]
      const full = metric === 'revenue' ? peso(d[metric]) : d[metric] + ' bookings'
      return `<div class="chart__col" title="${d.label}: ${full}${dv === null ? '' : ` (${dv >= 0 ? '+' : ''}${dv}% vs previous ${NOUN[range]})`}">
        <span class="chart__delta ${dv === null ? 'flat' : dv > 0 ? 'up' : dv < 0 ? 'dn' : 'flat'}">${dv === null ? '–' : (dv > 0 ? '+' : '') + dv + '%'}</span>
        <span class="chart__val">${value}</span>
        <div class="chart__bar${dv !== null && dv < 0 ? ' is-down' : ''}" style="height:${Math.max(3, Math.round((d[metric] / max) * 100))}%"></div>
        <i class="chart__x">${d.label}</i>
      </div>`
    }).join('')

    $('#chart-head').innerHTML =
      `<b>${metric === 'revenue' ? peso(last.revenue) : last.bookings}</b>
       <span>${metric === 'revenue' ? 'revenue' : 'bookings'} · ${last.label}</span>
       <em class="${change >= 0 ? 'up' : 'dn'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% ${NOUN[range]} on ${NOUN[range]}</em>`

    $('#chart').setAttribute('aria-label',
      `${metric} by ${NOUN[range]}: ` + data.map((d) => `${d.label} ${d[metric]}`).join(', '))
  }

  $$('#range button').forEach((b) => b.addEventListener('click', () => {
    range = b.dataset.range
    $$('#range button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
    render()
  }))
  $$('#metric button').forEach((b) => b.addEventListener('click', () => {
    metric = b.dataset.metric
    $$('#metric button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
    render()
  }))
  render()

  /* --------------------------------------- 6. bookings + revenue ledger */
  const TAG = { Paid: 'tag--ok', Pending: 'tag--warn', Cancelled: 'tag--past' }
  $('#ledger').innerHTML = ROWS.map((r) => `<tr>
      <td>${r.ref}</td>
      <td>${r.customer}</td>
      <td>${r.court}</td>
      <td data-v="${r.sortDate}">${r.date}</td>
      <td data-v="${r.hours}">${r.hours} hr${r.hours > 1 ? 's' : ''}</td>
      <td data-v="${r.amount}">${r.amount ? peso(r.amount) : '—'}</td>
      <td><span class="tag ${TAG[r.status]}">${r.status}</span></td>
    </tr>`).join('')

  $('#ledger-foot').innerHTML = `<tr>
      <td colspan="4">${ROWS.length} bookings · ${CANCELLED} cancelled</td>
      <td>${HOURS_SOLD} hrs</td>
      <td>${peso(MONTH_REVENUE)}</td>
      <td></td>
    </tr>`

  /* CSV is built from the rendered table, so it exports whatever order the
     owner has sorted the columns into. */
  $('#csv').addEventListener('click', () => {
    const esc = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)
    const table = $('#ledger').closest('table')
    const lines = [...table.querySelectorAll('thead tr, tbody tr')].map((tr) =>
      [...tr.cells].map((c) => esc(c.textContent.trim().replace(/₱/g, 'PHP '))).join(','))
    lines.push('')
    lines.push(['Totals', '', '', '', HOURS_SOLD + ' hrs', 'PHP ' + MONTH_REVENUE, ''].map(esc).join(','))

    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'rally-x-bookings-revenue-2026-08.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)

    const btn = $('#csv')
    const was = btn.innerHTML
    btn.innerHTML = 'Downloaded ✓'
    setTimeout(() => { btn.innerHTML = was }, 1800)
  })
})()
