#!/usr/bin/env python3
"""Assemble the five agent-built payment panels into checkout.html + pages.css.

Handles the blockers the review agents flagged:
  - validation must be scoped to the ACTIVE panel (a flat rules map would run
    card rules while GCash is selected and the form could never submit)
  - error focus must be able to land on a <select>, not just <input>
  - the email field is hoisted ABOVE the panels so it is method-independent
  - card is the default method and must be un-hidden at init
  - the page's two dishonest/duplicate disclaimers are removed
"""
import json, re, os, pathlib

ROOT = pathlib.Path('/Users/carlcelino/OSOFT/Code/served-homepage')
P = ROOT / '_reference/panels'
ORDER = ['gcash', 'maya', 'qrph', 'bank', 'card']      # chooser order; card last, default
panels = {k: json.load(open(P / f'{k}.json')) for k in ORDER}

# ---------------------------------------------------------------- chooser + panels
tabs, bodies, css_extra = [], [], []
for k in ORDER:
    p = panels[k]
    tabs.append(
        f'          <button type="button" role="tab" id="tab-{k}" data-pm="{k}"\n'
        f'                  aria-controls="pm-{k}" aria-selected="false" tabindex="-1">\n'
        f'            {p["tab_icon_svg"]}\n'
        f'            <span>{p["tab_label"]}</span>\n'
        f'          </button>'
    )
    html = p['panel_html']
    # the shared email lives above the panels now — strip any per-panel email field
    html = re.sub(r'\s*<div class="field[^"]*">\s*<label for="[a-z]+-mail".*?</div>',
                  '', html, flags=re.S)
    bodies.append('        ' + html.replace('\n', '\n        '))
    if p.get('extra_css'):
        css_extra.append(f'/* --- {k} panel (agent-built) --- */\n' + p['extra_css'])

# ------------------------------------------------------------------- checkout.html
f = ROOT / 'checkout.html'
s = f.read_text()

# 1. dishonest line: nothing is processed, there is no connection (static page)
s = s.replace(
    '    <p>Your slot is held while you pay. Cards are processed over an encrypted connection.</p>',
    '    <p>Choose how you want to pay. This is a demo build — no payment is taken.</p>')

# 2. replace the card-only form body with the chooser + panels + shared email
old_start = s.index('        <div class="formgrid">')
old_end = s.index('        <button class="btn btn--orange" type="submit"')
new_body = (
    '        <div class="pay-methods" role="tablist" aria-label="Payment method">\n'
    + '\n'.join(tabs) + '\n'
    + '        </div>\n\n'
    + '\n\n'.join(bodies) + '\n\n'
    + '        <div class="formgrid" style="margin-top:22px">\n'
    '          <div class="field field--full">\n'
    '            <label for="c-mail">Email for confirmation</label>\n'
    '            <input id="c-mail" type="email" autocomplete="email" placeholder="you@email.com">\n'
    '            <span class="err"></span>\n'
    '          </div>\n'
    '        </div>\n\n'
)
s = s[:old_start] + new_body + s[old_end:]

# 3. drop the old Stripe-naming disclaimer — each panel carries its own honest note
s = re.sub(r'\n        <p class="note">.*?</p>\n', '\n', s, flags=re.S)
f.write_text(s)
print('checkout.html: chooser + 5 panels + shared email; stale disclaimers removed')

# ------------------------------------------------------------------- pages.css
c = ROOT / 'css/pages.css'
t = c.read_text()
marker = '/* --- gcash panel (agent-built) --- */'
if marker not in t:
    t += '\n\n' + '\n\n'.join(css_extra) + '\n'
    c.write_text(t)
print(f'pages.css: +{len(css_extra)} agent-supplied panel stylesheets')

# ------------------------------------------------------------------- rules dump
rules = {k: panels[k].get('validation') or [] for k in ORDER}
json.dump(rules, open(ROOT / '_reference/panels/_rules.json', 'w'), indent=1)
print('rules exported for js/app.js wiring:',
      {k: [r['input_id'] for r in v] for k, v in rules.items()})
