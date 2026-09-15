#!/usr/bin/env python3
"""Font size via per-line ink-row profiling (no guessed letter windows)."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)


def profile(x0, x1, y0, y1, bg, tol=45, label=""):
    """Ink-row profile for one text line; returns (top, baseline, bottom)."""
    win = A[y0:y1, x0:x1]
    d = np.abs(win - np.array(bg)).max(axis=2)
    cnt = (d > tol).sum(axis=1)
    rows = np.where(cnt > 0)[0]
    if not len(rows):
        print(f"   {label:34} NO INK")
        return None
    top, bot = rows.min(), rows.max()
    band = cnt[top : bot + 1]
    peak = band.max()
    # baseline: last row whose ink count is >= 25% of peak (descenders fall below this)
    strong = np.where(band >= peak * 0.25)[0]
    base = top + strong.max()
    cap = base - top + 1
    print(
        f"   {label:34} ink y {y0+top}..{y0+bot} base~{y0+base}  cap={cap:4d}  "
        f"-> font {cap/0.70:5.1f}/{cap/0.72:5.1f}  desc={bot-base}"
    )
    return y0 + top, y0 + base, y0 + bot


D = (10, 10, 10)
W = (255, 255, 255)
G = (241, 241, 239)
F = (7, 6, 5)
CREAM = (249, 249, 246)
ORANGE = (255, 115, 21)

print("=== PER-LINE INK PROFILES ===")
LINES = [
    ("nav links", 512, 1000, 14, 62, D),
    ("hero eyebrow", 318, 558, 248, 285, D),
    ("hero H1 line1", 318, 846, 286, 366, D),
    ("hero H1 line2", 318, 847, 366, 448, D),
    ("hero sub", 318, 1034, 480, 512, D),
    ("search label", 338, 500, 528, 558, CREAM),
    ("search value", 338, 460, 560, 598, CREAM),
    ("HIW h2", 817, 1103, 900, 962, W),
    ("HIW sub", 699, 1221, 975, 1005, W),
    ("HIW card title", 455, 620, 1165, 1205, W),
    ("HIW card body l1", 360, 700, 1214, 1238, W),
    ("HIW btn label", 461, 600, 1322, 1350, W),
    ("FEAT h2", 837, 1084, 1618, 1665, G),
    ("FEAT sub l1", 654, 1267, 1670, 1700, G),
    ("FEAT chip Featured", 346, 420, 1786, 1815, None),
    ("FEAT rating 4.2", 346, 380, 2050, 2075, None),
    ("FEAT card title", 336, 620, 2095, 2130, W),
    ("FEAT card body", 336, 660, 2138, 2162, W),
    ("FEAT location", 357, 560, 2192, 2215, W),
    ("FEAT nextavail", 357, 620, 2226, 2250, W),
    ("FEAT booknow", 494, 600, 2284, 2310, ORANGE),
    ("FEAT viewall", 884, 1010, 2394, 2420, None),
    ("CTA pill label", 489, 673, 2628, 2652, None),
    ("CTA h2 line1", 473, 766, 2655, 2720, None),
    ("CTA body l1", 473, 1000, 2872, 2896, None),
    ("CTA benefit1", 1165, 1342, 2694, 2716, None),
    ("FOOT colhead INFO", 897, 960, 3230, 3258, F),
    ("FOOT link Home", 897, 960, 3262, 3290, F),
    ("FOOT addr l1", 1226, 1376, 3262, 3290, F),
    ("FOOT blurb l1", 148, 800, 3330, 3355, F),
    ("FOOT copyright", 140, 470, 3478, 3500, F),
]
for label, x0, x1, y0, y1, bg in LINES:
    if bg is None:
        # unknown bg -> use the window's modal colour
        win = A[y0:y1, x0:x1].reshape(-1, 3)
        vals, counts = np.unique(win, axis=0, return_counts=True)
        bg = tuple(vals[counts.argmax()])
    profile(x0, x1, y0, y1, bg, label=label)

print("\n=== HIW ICON TILE (wide window) ===")
win = A[1060:1180, 440:600]
d = np.abs(win - np.array(W)).max(axis=2)
rows = np.where((d > 25).sum(axis=1) > 0)[0]
cols = np.where((d > 25).sum(axis=0) > 0)[0]
print(f"   tile rows {1060+rows.min()}..{1060+rows.max()} (h={rows.max()-rows.min()+1})")
print(f"   tile cols {440+cols.min()}..{440+cols.max()} (w={cols.max()-cols.min()+1})")

print("\n=== HIW CARD 1 top edge ===")
for y in range(1040, 1120):
    if np.abs(A[y, 313:727] - np.array(W)).max() > 3:
        print(f"   first non-white row across card span: y={y}")
        break

print("\n=== FEATURED CARD 1 exact box ===")
for y in range(1740, 1800):
    if np.abs(A[y, 400] - np.array(G)).max() > 6:
        print(f"   card top (col x=400) y={y} {A[y,400]}")
        break
for y in range(2380, 2320, -1):
    if np.abs(A[y, 400] - np.array(G)).max() > 6:
        print(f"   card bottom (col x=400) y={y}")
        break

print("\n=== CAROUSEL ARROWS (search wider, they may overlap cards) ===")
for y in (2150, 2160, 2170):
    xs = [x for x in range(100, 320) if np.abs(A[y, x] - np.array(W)).max() <= 20]
    xs2 = [x for x in range(1600, 1900) if np.abs(A[y, x] - np.array(W)).max() <= 20]
    print(f"   y={y} left-of-cards white x: {min(xs) if xs else None}..{max(xs) if xs else None} | right: {min(xs2) if xs2 else None}..{max(xs2) if xs2 else None}")

print("\n=== FOOTER DIVIDER (row scan) ===")
for y in range(3450, 3475):
    row = A[y, 200:1700]
    dd = np.abs(row - np.array(F)).max(axis=1)
    if (dd > 8).sum() > 1000:
        print(f"   y={y} wide light row, mean colour {row.mean(axis=0).round(1)}, n={int((dd>8).sum())}")

print("\n=== CTA GLASS PANEL bounds (variance scan) ===")
for y in (2620, 2700, 2800, 2900):
    row = A[y]
    edges = []
    for x in range(300, 1700):
        if np.abs(row[x].astype(int) - row[x - 1].astype(int)).max() > 22:
            edges.append(x)
    print(f"   y={y} strong x-edges: {edges[:6]} ... {edges[-6:] if len(edges)>6 else ''}")
