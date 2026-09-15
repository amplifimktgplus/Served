#!/usr/bin/env python3
"""Cap-height -> font-size measurement, plus remaining box extents."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def ink_rows(x0, x1, y0, y1, bg, tol=40):
    """Rows in the window whose pixels differ from bg -> the ink band."""
    win = A[y0:y1, x0:x1]
    d = np.abs(win - np.array(bg)).max(axis=2)
    rows = np.where((d > tol).sum(axis=1) > 0)[0]
    return (y0 + rows.min(), y0 + rows.max()) if len(rows) else None


def ink_cols(x0, x1, y0, y1, bg, tol=40):
    win = A[y0:y1, x0:x1]
    d = np.abs(win - np.array(bg)).max(axis=2)
    cols = np.where((d > tol).sum(axis=0) > 0)[0]
    return (x0 + cols.min(), x0 + cols.max()) if len(cols) else None


DARK = (10, 10, 10)
WHITE = (255, 255, 255)
GREY = (241, 241, 239)

print("=== CAP HEIGHTS (ink band of a known cap letter) ===")
CAPS = [
    ("hero eyebrow 'E' (Every)", 318, 331, 250, 275, DARK),
    ("hero H1 L1 'C' (Choose)", 318, 362, 285, 350, DARK),
    ("hero H1 L2 'G' (Get)", 318, 358, 363, 430, DARK),
    ("hero sub 'N' (No calls)", 318, 331, 484, 505, DARK),
    ("searchbar label 'E' (Enter)", 338, 348, 530, 552, (249, 249, 246)),
    ("searchbar value 'C' (Courts)", 338, 350, 562, 585, (249, 249, 246)),
    ("HIW h2 'H' (How)", 817, 833, 905, 950, WHITE),
    ("HIW sub 'B' (Book)", 699, 710, 982, 1000, WHITE),
    ("HIW card title 'T' (The)", 455, 468, 1170, 1195, WHITE),
    ("HIW card body 'C' (Create)", 360, 371, 1216, 1235, WHITE),
    ("HIW btn 'R' (Register)", 461, 472, 1320, 1340, WHITE),
    ("FEAT h2 'F' (Featured)", 837, 848, 1625, 1660, GREY),
    ("FEAT sub 'A' (Advanced)", 653, 666, 1676, 1695, GREY),
    ("FEAT card title 'V' (Vantage)", 336, 350, 2100, 2125, WHITE),
    ("FEAT card body 'S' (Sed)", 336, 345, 2142, 2160, WHITE),
    ("FEAT loc '1' (1 FVR)", 357, 364, 2196, 2212, WHITE),
    ("FEAT booknow 'B'", 494, 504, 2288, 2305, (255, 115, 21)),
    ("CTA label 'R' (REGISTER)", 489, 499, 2630, 2648, None),
    ("FOOT head 'I' (INFO)", 897, 903, 3232, 3252, (7, 6, 5)),
    ("FOOT link 'H' (Home)", 897, 908, 3266, 3286, (7, 6, 5)),
    ("FOOT copy 'C' (Copyright)", 152, 163, 3480, 3498, (7, 6, 5)),
]
for name, x0, x1, y0, y1, bg in CAPS:
    if bg is None:
        continue
    r = ink_rows(x0, x1, y0, y1, bg, tol=45)
    if r:
        cap = r[1] - r[0] + 1
        print(f"   {name:32} ink y {r[0]}..{r[1]}  cap={cap:5.1f}px  -> font~{cap/0.70:5.1f} (cap/.70) | {cap/0.72:5.1f} (cap/.72)")
    else:
        print(f"   {name:32} NO INK FOUND")

print("\n=== HIW CARD 1 extents ===")
print("   top edge scan col x=500 (border/shadow above card):")
for y in range(1100, 1160):
    if not (abs(A[y, 314] - np.array(WHITE)).max() <= 3):
        print(f"      x=314 first non-white y={y} {hx(A[y,314])}")
        break
r = ink_rows(313, 727, 1100, 1420, WHITE, tol=3)
print(f"   card1 ink rows (x313..727): {r}")
c = ink_cols(300, 740, 1150, 1400, WHITE, tol=3)
print(f"   card1 ink cols (y1150..1400): {c}")

print("\n=== HIW ICON TILE (card 1) ===")
r = ink_rows(480, 560, 1080, 1180, WHITE, tol=25)
c = ink_cols(440, 600, 1090, 1170, WHITE, tol=25)
print(f"   icon tile rows {r}  cols {c}")

print("\n=== HIW BUTTON (card 1) ===")
r = ink_rows(340, 700, 1300, 1380, WHITE, tol=3)
c = ink_cols(330, 720, 1310, 1360, WHITE, tol=3)
print(f"   btn rows {r}  cols {c}")

print("\n=== FEATURED CARD 1 full extents ===")
r = ink_rows(312, 728, 1740, 2400, GREY, tol=6)
print(f"   card1 rows (vs #f1f1ef): {r}")
print("   photo bottom / white start col x=500:")
for y in range(1990, 2040):
    if abs(A[y, 500] - np.array(WHITE)).max() <= 6:
        print(f"      white starts y={y}")
        break

print("\n=== CAROUSEL ARROW circles ===")
r = ink_rows(120, 200, 2080, 2240, GREY, tol=6)
c = ink_cols(110, 230, 2100, 2220, GREY, tol=6)
print(f"   left arrow rows {r} cols {c}")
c2 = ink_cols(1700, 1830, 2100, 2220, GREY, tol=6)
print(f"   right arrow cols {c2}")

print("\n=== VIEW ALL FEATURED pill ===")
r = ink_rows(820, 1100, 2370, 2450, GREY, tol=6)
c = ink_cols(820, 1120, 2385, 2430, GREY, tol=6)
print(f"   rows {r} cols {c}")

print("\n=== CTA band bottom + panel bounds ===")
for y in range(2900, 2930):
    if hx(A[y, 960]) in ("#070605", "#050505"):
        print(f"   CTA bottom -> footer starts y={y} {hx(A[y,960])}")
        break
print("   panel probe row y=2700, scanning for the flat frosted block:")
row = A[2700]
diffs = [(x, hx(row[x])) for x in range(400, 520, 8)]
print("   ", diffs)
diffs = [(x, hx(row[x])) for x in range(1480, 1580, 8)]
print("   ", diffs)

print("\n=== FOOTER divider line ===")
for y in range(3440, 3480):
    c = A[y, 960]
    if abs(c - np.array((7, 6, 5))).max() > 8:
        print(f"   divider at y={y} {hx(c)}")
