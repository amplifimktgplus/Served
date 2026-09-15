#!/usr/bin/env python3
"""Deterministic box detection: find card / button / panel edges by scanning the 1x raster."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def runs_x(y, ref_rgb, tol=6, minlen=20, invert=False):
    """Horizontal runs at row y that (in|ex)clude ref colour."""
    d = np.abs(A[y] - np.array(ref_rgb)).max(axis=1)
    m = (d <= tol) if not invert else (d > tol)
    out, s = [], None
    for x in range(len(m)):
        if m[x] and s is None:
            s = x
        elif not m[x] and s is not None:
            if x - s >= minlen:
                out.append((s, x - 1, x - s))
            s = None
    if s is not None and len(m) - s >= minlen:
        out.append((s, len(m) - 1, len(m) - s))
    return out


def runs_y(x, ref_rgb, y0, y1, tol=6, minlen=20):
    d = np.abs(A[y0:y1, x] - np.array(ref_rgb)).max(axis=1)
    m = d <= tol
    out, s = [], None
    for i in range(len(m)):
        if m[i] and s is None:
            s = i
        elif not m[i] and s is not None:
            if i - s >= minlen:
                out.append((y0 + s, y0 + i - 1, i - s))
            s = None
    if s is not None and len(m) - s >= minlen:
        out.append((y0 + s, y1 - 1, len(m) - s))
    return out


W = (255, 255, 255)
print("=== FEATURED VENUE CARDS (white on #f1f1ef) ===")
for y in (2150, 2250):
    print(f"  row y={y}: ", [(a, b, w) for a, b, w in runs_x(y, W, minlen=100)])
for x in (400, 700, 900):
    print(f"  col x={x}: ", [(a, b, h) for a, b, h in runs_y(x, W, 1500, 2495, minlen=100)])

print("\n=== CAROUSEL ARROWS (white circles outside cards) ===")
for y in (2155, 2160):
    print(f"  row y={y}: ", [(a, b, w) for a, b, w in runs_x(y, W, minlen=20)][:8])

print("\n=== HOW-IT-WORKS CARDS (white on white -> find non-white border) ===")
for y in (1200, 1300):
    nb = runs_x(y, W, tol=4, minlen=1, invert=True)
    print(f"  row y={y} non-white runs: {[(a,b,w) for a,b,w in nb if w<12][:14]}")
for x in (330, 500):
    d = np.abs(A[822:1500, x] - np.array(W)).max(axis=1)
    idx = np.where(d > 4)[0] + 822
    print(f"  col x={x} first/last non-white: {idx.min() if len(idx) else None} .. {idx.max() if len(idx) else None}")

print("\n=== HERO SEARCH BAR (white pill) ===")
for y in (545, 560, 575):
    print(f"  row y={y}: ", [(a, b, w) for a, b, w in runs_x(y, W, minlen=40)])
for x in (400, 600):
    print(f"  col x={x}: ", [(a, b, h) for a, b, h in runs_y(x, W, 500, 640, minlen=20)])

print("\n=== ORANGE ELEMENTS (#ff7315 boxes) ===")
O = (255, 115, 21)
for y in (28, 45, 560, 575, 1345, 2300, 2930):
    r = [(a, b, w) for a, b, w in runs_x(y, O, tol=18, minlen=12)]
    if r:
        print(f"  row y={y}: {r}")

print("\n=== HERO / SECTION EXACT EDGES (col x=960 sampled) ===")
prev = None
for y in range(760, 860):
    c = hx(A[y, 960])
    if c != prev:
        print(f"    y={y} {c}")
        prev = c

print("\n=== CTA GLASS PANEL edges (scan for the frosted rect) ===")
for y in (2650, 2750, 2850):
    row = A[y]
    # panel is markedly flatter/brighter than the photo; find long low-variance runs
    print(f"  row y={y} sample x=440..480 -> {[hx(row[x]) for x in range(440, 500, 12)]}")
    print(f"                  x=1500..1560 -> {[hx(row[x]) for x in range(1500, 1560, 12)]}")
