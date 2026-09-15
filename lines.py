#!/usr/bin/env python3
"""Auto-segment text lines by ink-row gaps; report exact ink band per line."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)


def bands(x0, x1, y0, y1, bg, tol=45, gap=3, minh=3, title=""):
    win = A[y0:y1, x0:x1]
    d = np.abs(win - np.array(bg)).max(axis=2)
    cnt = (d > tol).sum(axis=1)
    on = cnt > 0
    print(f"\n--- {title}  (x{x0}..{x1}, y{y0}..{y1}, bg={bg}) ---")
    runs, s, blank = [], None, 0
    for i, v in enumerate(on):
        if v:
            if s is None:
                s = i
            blank = 0
        else:
            if s is not None:
                blank += 1
                if blank >= gap:
                    if i - blank - s + 1 >= minh:
                        runs.append((s, i - blank))
                    s = None
    if s is not None:
        runs.append((s, len(on) - 1))
    for a, b in runs:
        h = b - a + 1
        peak = cnt[a : b + 1].max()
        print(f"    y {y0+a:5d}..{y0+b:5d}  h={h:3d}  peakInk={peak:4d}  -> if cap: font~{h/0.71:5.1f}")
    return runs


D = (10, 10, 10)
W = (255, 255, 255)
G = (241, 241, 239)
F = (7, 6, 5)
CREAM = (249, 249, 246)

bands(500, 1500, 0, 78, D, title="NAV links strip")
bands(1500, 1900, 0, 78, D, tol=60, title="NAV buttons strip")
bands(318, 1040, 230, 620, D, title="HERO copy column")
bands(330, 1080, 520, 615, CREAM, title="SEARCH BAR interior")
bands(600, 1330, 890, 1010, W, title="HIW heading block")
bands(330, 710, 1040, 1400, W, tol=6, title="HIW card 1 (full)")
bands(600, 1330, 1600, 1730, G, title="FEAT heading block")
bands(318, 725, 2030, 2350, W, tol=6, title="FEAT card 1 body (white part)")
bands(460, 1010, 2620, 2960, (60, 50, 40), tol=60, title="CTA left column")
bands(1130, 1460, 2660, 2960, (60, 50, 40), tol=60, title="CTA right column")
bands(140, 700, 3180, 3520, F, title="FOOTER left (logo+blurb)")
bands(890, 1120, 3180, 3400, F, title="FOOTER INFO column")
bands(1220, 1500, 3180, 3440, F, title="FOOTER LOCATION/CONTACT column")
bands(1490, 1620, 3180, 3300, F, title="FOOTER FOLLOW US column")
bands(140, 700, 3470, 3520, F, title="FOOTER copyright")
