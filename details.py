#!/usr/bin/env python3
"""Final component-level probes: nav links, chips, buttons, icons, columns."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)
L = A.mean(axis=2)


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def xgroups(y0, y1, x0, x1, test, gapmin=10):
    cols = [x for x in range(x0, x1) if test(A[y0:y1, x], L[y0:y1, x])]
    if not cols:
        return []
    g, s = [], cols[0]
    for i in range(1, len(cols)):
        if cols[i] - cols[i - 1] > gapmin:
            g.append((s, cols[i - 1]))
            s = cols[i]
    g.append((s, cols[-1]))
    return g


print("=== NAV LINK GROUPS (bright text on dark, y31..47) ===")
g = xgroups(31, 47, 460, 1500, lambda c, l: (l > 110).any(), gapmin=12)
for a, b in g:
    seg = A[31:47, a : b + 1].reshape(-1, 3)
    bright = seg[seg.mean(axis=1) > 110]
    print(f"   x {a:5d}..{b:5d} w={b-a+1:4d}  meanColour={hx(bright.mean(axis=0)) if len(bright) else '-'}")

print("\n=== NAV BUTTONS ===")
O = np.array([255, 115, 21])
ys = [y for y in range(0, 78) if np.abs(A[y, 1550] - O).max() < 40]
xs = [x for x in range(1450, 1760) if np.abs(A[30, x] - O).max() < 40]
print(f"   orange btn: x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)}  fill={hx(A[20,1550])}")
xs2 = [x for x in range(1690, 1920) if L[36, x] > 40]
print(f"   outline btn ink x {min(xs2)}..{max(xs2)}")
for y in (16, 17, 18, 36, 56, 57, 58):
    print(f"     y={y} x1712={hx(A[y,1712])} x1800={hx(A[y,1800])} x1888={hx(A[y,1888])}")

print("\n=== HIW ICON TILES (3 cards) ===")
for i, cx in enumerate((519, 959, 1399)):
    m = L[1060:1165, cx - 60 : cx + 60] < 250
    rows = np.where(m.sum(axis=1) > 0)[0]
    cols = np.where(m.sum(axis=0) > 0)[0]
    if len(rows):
        print(
            f"   card{i+1} tile y {1060+rows.min()}..{1060+rows.max()} x {cx-60+cols.min()}..{cx-60+cols.max()} fill={hx(A[1070+15, cx])}"
        )

print("\n=== HIW BUTTONS (3 cards) ===")
for i, (x0, x1) in enumerate(((336, 704), (776, 1144), (1216, 1584))):
    mid = (x0 + x1) // 2
    print(f"   card{i+1} btn fill at centre-left ({x0+12},1339) = {hx(A[1339, x0+12])}  centre={hx(A[1315, mid])}")
    ys = [y for y in range(1295, 1385) if np.abs(A[y, x0 + 4] - np.array([255, 255, 255])).max() > 6]
    print(f"      vertical ink at x={x0+4}: y {min(ys) if ys else None}..{max(ys) if ys else None}")

print("\n=== HIW CARD border / shadow colour ===")
for x in (310, 311, 312, 313, 314):
    print(f"   x={x} y=1200 -> {hx(A[1200,x])}")

print("\n=== FEATURED CHIPS (over photo, y1786..1815) ===")
for i, (x0, x1) in enumerate(((312, 728), (752, 1168), (1192, 1608))):
    g = xgroups(1780, 1820, x0, x1, lambda c, l: (l > 90).any(), gapmin=16)
    print(f"   card{i+1}: {[(a,b,b-a+1) for a,b in g]}")
    print(f"      colours: left={hx(A[1800, x0+40])}  right={hx(A[1800, x1-60])}")

print("\n=== FEATURED chip vertical extent (card1 left chip) ===")
ys = [y for y in range(1760, 1840) if L[y, 360] > 60]
print(f"   left chip y {min(ys) if ys else None}..{max(ys) if ys else None} fill={hx(A[1800,360])}")
ys = [y for y in range(1760, 1840) if L[y, 660] > 60]
print(f"   price chip y {min(ys) if ys else None}..{max(ys) if ys else None} fill={hx(A[1800,660])}")

print("\n=== FEATURED rating badge (card1) ===")
ys = [y for y in range(2035, 2090) if np.abs(A[y, 350] - np.array([255, 255, 255])).max() > 12]
xs = [x for x in range(320, 420) if np.abs(A[2060, x] - np.array([255, 255, 255])).max() > 12]
print(f"   badge y {min(ys) if ys else None}..{max(ys) if ys else None} x {min(xs) if xs else None}..{max(xs) if xs else None} fill={hx(A[2060,350])}")

print("\n=== FEATURED card divider ===")
for y in range(2245, 2280):
    seg = A[y, 340:700]
    if np.abs(seg - np.array([255, 255, 255])).max(axis=1).mean() > 3:
        print(f"   divider y={y} colour={hx(seg.mean(axis=0))}")
        break

print("\n=== CAROUSEL ARROWS ===")
for x0, x1 in ((120, 312), (1608, 1800)):
    ys = [y for y in range(2050, 2260) if np.abs(A[y, (x0 + x1) // 2] - np.array([241, 241, 239])).max() > 8]
    xs = [x for x in range(x0, x1) if np.abs(A[2155, x] - np.array([241, 241, 239])).max() > 8]
    print(f"   window {x0}-{x1}: y {min(ys) if ys else None}..{max(ys) if ys else None}  x {min(xs) if xs else None}..{max(xs) if xs else None}")

print("\n=== VIEW ALL pill colour ===")
print(f"   fill={hx(A[2404, 880])}  y2381..2427 x859..1061")

print("\n=== FOOTER COLUMN x-positions (headings row y3248..3262) ===")
g = xgroups(3246, 3266, 860, 1700, lambda c, l: (l > 60).any(), gapmin=25)
print(f"   {[(a,b) for a,b in g]}")
print("\n=== FOOTER link sub-columns (y3283..3296) ===")
g = xgroups(3280, 3300, 860, 1250, lambda c, l: (l > 60).any(), gapmin=25)
print(f"   {[(a,b) for a,b in g]}")

print("\n=== CTA panel bottom (col x=1450 & x=520, look for blur boundary) ===")
for x in (520, 900, 1450):
    for y in range(2930, 3000):
        blk = A[y : y + 3, x - 30 : x + 30]
        if blk.std() < 3 and L[y, x] < 30:
            print(f"   x={x}: flat/dark from y={y} ({hx(A[y,x])})")
            break
