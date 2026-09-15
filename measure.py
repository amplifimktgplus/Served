#!/usr/bin/env python3
"""Deterministic measurement of the Served. homepage PDF render.

Ground truth = the 1:1 raster (1920x3554) + the PDF text bbox coordinates.
Prints a compact layout map; writes full detail to layout-map.json.
"""
import json
import re
from collections import Counter

import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
img = Image.open(f"{REF}/page-1x.png").convert("RGB")
A = np.asarray(img)
H, W = A.shape[:2]
out = {"page": {"w": W, "h": H}}
print(f"RASTER {W}x{H}")


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


# ---------------------------------------------------------------- 1. bands
# Scan the far-left column; section backgrounds run full-bleed there.
def runs(col, tol=6):
    res, start, cur = [], 0, col[0]
    for y in range(1, len(col)):
        if np.abs(col[y].astype(int) - cur.astype(int)).max() > tol:
            if y - start >= 8:
                res.append((start, y - 1, hx(cur)))
            start, cur = y, col[y]
    res.append((start, len(col) - 1, hx(cur)))
    return res


bands = runs(A[:, 4, :])
print("\n=== FULL-BLEED BANDS (x=4) ===")
for a, b, c in bands:
    print(f"  y {a:5d}-{b:5d}  h={b-a+1:5d}  {c}")
out["bands"] = [{"y0": a, "y1": b, "hex": c} for a, b, c in bands]


# ---------------------------------------------------------------- 2. palette
print("\n=== TOP COLORS (whole page) ===")
flat = A.reshape(-1, 3)
samp = flat[:: max(1, len(flat) // 400000)]
for c, n in Counter(map(tuple, samp)).most_common(12):
    print(f"  {hx(c)}  {n*100/len(samp):5.2f}%")

# Locate the brand orange precisely: saturated warm pixels.
r, g, b = flat[:, 0].astype(int), flat[:, 1].astype(int), flat[:, 2].astype(int)
mask = (r > 180) & (g > 60) & (g < 190) & (b < 110) & ((r - b) > 90)
if mask.sum():
    oc = Counter(map(tuple, flat[mask][:: max(1, int(mask.sum()) // 60000)]))
    print("\n=== BRAND ORANGE CANDIDATES ===")
    for c, n in oc.most_common(6):
        print(f"  {hx(c)}  n={n}")
    out["orange"] = hx(oc.most_common(1)[0][0])


# ------------------------------------------------- 3. content container edges
def row_ink(y, bgc):
    row = A[y].astype(int)
    d = np.abs(row - np.array(bgc)).max(axis=1)
    xs = np.where(d > 24)[0]
    return (int(xs.min()), int(xs.max())) if len(xs) else None


print("\n=== CONTENT EDGES (per band, sampled rows) ===")
for a, bnd, c in bands:
    if bnd - a < 40:
        continue
    bg = tuple(int(c[i : i + 2], 16) for i in (1, 3, 5))
    edges = [e for y in range(a + 12, bnd - 12, max(6, (bnd - a) // 90)) if (e := row_ink(y, bg))]
    if not edges:
        continue
    lefts = Counter(e[0] for e in edges)
    rights = Counter(e[1] for e in edges)
    print(f"  band {a:5d}-{bnd:5d} {c}  left={lefts.most_common(3)}  right={rights.most_common(3)}")


# ---------------------------------------------------------------- 4. text geometry
words = re.findall(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>',
    open(f"{REF}/text-bbox.html", encoding="utf8", errors="replace").read(),
)
boxes = [(float(a), float(b2), float(c2), float(d), t) for a, b2, c2, d, t in words]
print(f"\n=== TEXT GLYPH RUNS: {len(boxes)} ===")

# Cluster into lines by vertical overlap of the glyph band.
boxes.sort(key=lambda z: (z[1], z[0]))
lines, cur = [], []
for bx in boxes:
    if not cur:
        cur = [bx]
        continue
    ymid, cmid = (bx[1] + bx[3]) / 2, (cur[-1][1] + cur[-1][3]) / 2
    if abs(ymid - cmid) < 9:
        cur.append(bx)
    else:
        lines.append(cur)
        cur = [bx]
lines.append(cur)

recs = []
for ln in lines:
    x0 = min(z[0] for z in ln)
    x1 = max(z[2] for z in ln)
    y0 = min(z[1] for z in ln)
    y1 = max(z[3] for z in ln)
    txt = "".join(z[4] for z in sorted(ln, key=lambda z: z[0]))
    recs.append(
        {"x": round(x0, 1), "y": round(y0, 1), "x2": round(x1, 1), "y2": round(y1, 1),
         "w": round(x1 - x0, 1), "h": round(y1 - y0, 1), "t": txt}
    )
recs.sort(key=lambda r: r["y"])
print("  (y, height, x-range, fragmentary text)")
for r in recs:
    print(f"  y={r['y']:7.1f} h={r['h']:5.1f} x={r['x']:6.1f}->{r['x2']:6.1f} | {r['t'][:52]}")
out["text_lines"] = recs

json.dump(out, open(f"{REF}/layout-map.json", "w"), indent=1)
print(f"\nWROTE {REF}/layout-map.json")
