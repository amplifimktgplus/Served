#!/usr/bin/env python3
"""Brightness-thresholded segmentation for text over photos + remaining details."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)
L = A.mean(axis=2)


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def bright_bands(x0, x1, y0, y1, thr=140, gap=4, title="", minpk=3):
    m = L[y0:y1, x0:x1] > thr
    cnt = m.sum(axis=1)
    print(f"\n--- {title} (bright>{thr}) ---")
    runs, s, blank = [], None, 0
    for i, v in enumerate(cnt > minpk):
        if v:
            if s is None:
                s = i
            blank = 0
        else:
            if s is not None:
                blank += 1
                if blank >= gap:
                    runs.append((s, i - blank))
                    s = None
    if s is not None:
        runs.append((s, len(cnt) - 1))
    for a, b in runs:
        print(f"    y {y0+a:5d}..{y0+b:5d}  h={b-a+1:3d}  peak={int(cnt[a:b+1].max()):4d}")
    return runs


bright_bands(318, 1040, 240, 520, title="HERO copy (white/orange on photo)")
bright_bands(470, 1000, 2620, 2960, title="CTA left column")
bright_bands(1130, 1470, 2650, 2960, title="CTA right column")

print("\n=== HERO H1 ORANGE WORDS (which words are #ff7315) ===")
O = np.array([255, 115, 21])
for y0, y1, lab in ((286, 366, "H1 line1"), (366, 448, "H1 line2")):
    d = np.abs(A[y0:y1, :, :] - O).max(axis=2)
    cols = np.where((d < 60).sum(axis=0) > 0)[0]
    if len(cols):
        # group into words
        grp, s = [], cols[0]
        for i in range(1, len(cols)):
            if cols[i] - cols[i - 1] > 14:
                grp.append((s, cols[i - 1]))
                s = cols[i]
        grp.append((s, cols[-1]))
        print(f"   {lab}: orange x-ranges {grp}")

print("\n=== FOOTER DIVIDER exact ===")
for y in range(3455, 3472):
    print(f"   y={y}: x300={hx(A[y,300])} x960={hx(A[y,960])} x1600={hx(A[y,1600])}")

print("\n=== FOOTER SOCIAL ICONS (wide scan) ===")
bright_bands(1400, 1700, 3270, 3330, thr=60, title="social row", minpk=1)
for y in (3300, 3305):
    xs = [x for x in range(1400, 1750) if L[y, x] > 60]
    if xs:
        grp, s = [], xs[0]
        for i in range(1, len(xs)):
            if xs[i] - xs[i - 1] > 6:
                grp.append((s, xs[i - 1]))
                s = xs[i]
        grp.append((s, xs[-1]))
        print(f"   y={y} icon x-groups: {grp}")

print("\n=== FOOTER LOGO box ===")
m = L[3220:3350, 100:700] > 60
rows = np.where(m.sum(axis=1) > 0)[0]
cols = np.where(m.sum(axis=0) > 0)[0]
print(f"   logo rows {3220+rows.min()}..{3220+rows.max()} cols {100+cols.min()}..{100+cols.max()}")

print("\n=== NAV LOGO box ===")
m = L[0:78, 0:400] > 60
rows = np.where(m.sum(axis=1) > 0)[0]
cols = np.where(m.sum(axis=0) > 0)[0]
print(f"   logo rows {rows.min()}..{rows.max()} cols {cols.min()}..{cols.max()}")

print("\n=== CTA GLASS PANEL: find flat frosted rectangle ===")
# The panel is a large near-uniform-ish overlay; detect by comparing each row's
# left edge transition into a lighter, lower-contrast region.
for y in (2600, 2620, 2640, 2900, 2940, 2960):
    row = A[y]
    tr = [x for x in range(300, 700) if np.abs(row[x] - row[x - 3]).max() > 25]
    tr2 = [x for x in range(1400, 1700) if np.abs(row[x] - row[x - 3]).max() > 25]
    print(f"   y={y} L-edges {tr[:4]}  R-edges {tr2[-4:]}")

print("\n=== CTA panel vertical extent (col x=520 & x=1450) ===")
for x in (520, 1450):
    prev = None
    marks = []
    for y in range(2540, 2999):
        c = tuple(A[y, x])
        if prev is not None and abs(int(c[0]) - int(prev[0])) > 26:
            marks.append(y)
        prev = c
    print(f"   x={x}: strong y-transitions {marks[:8]}")

print("\n=== FEATURED CARD 1 precise box (scan cols inside/outside) ===")
G = np.array([241, 241, 239])
for x in (350, 400):
    ys = [y for y in range(1700, 2400) if np.abs(A[y, x] - G).max() > 10]
    print(f"   col x={x}: card y {min(ys)}..{max(ys)}")
print("   photo bottom (white starts) per col:")
for x in (350, 520, 700):
    for y in range(1990, 2050):
        if np.abs(A[y, x] - np.array([255, 255, 255])).max() <= 5:
            print(f"      x={x} white starts y={y}")
            break
