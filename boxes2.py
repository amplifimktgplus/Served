#!/usr/bin/env python3
"""Targeted probes: hero bottom radius, search bar, nav buttons, card y-extents, CTA panel."""
import numpy as np
from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
A = np.asarray(Image.open(f"{REF}/page-1x.png").convert("RGB")).astype(int)
H, W = A.shape[:2]


def hx(c):
    return "#%02x%02x%02x" % tuple(int(v) for v in c)


def near(px, rgb, tol=8):
    return abs(px[0] - rgb[0]) <= tol and abs(px[1] - rgb[1]) <= tol and abs(px[2] - rgb[2]) <= tol


WHITE = (255, 255, 255)

print("=== HERO BOTTOM EDGE per x (first white row scanning down from y=780) ===")
for x in [0, 2, 4, 8, 12, 16, 20, 24, 30, 40, 60, 100, 300, 960, 1620, 1860, 1900, 1910, 1916, 1919]:
    fy = None
    for y in range(780, 900):
        if near(A[y, x], WHITE, 10):
            fy = y
            break
    print(f"   x={x:5d} -> first white y={fy}")

print("\n=== HERO TOP-LEFT: is the hero inset from page edges? (row y=400) ===")
print("   ", [f"x={x}:{hx(A[400,x])}" for x in (0, 1, 2, 3, 4, 6, 10)])
print("   ", [f"x={x}:{hx(A[400,x])}" for x in (1913, 1916, 1918, 1919)])

print("\n=== SEARCH BAR: colour probe grid ===")
for y in (525, 535, 545, 560, 580, 595, 605):
    print(f"   y={y}: ", [f"{x}:{hx(A[y,x])}" for x in (310, 316, 320, 330, 700, 990, 1000, 1050, 1060, 1070)])

print("\n=== SEARCH BAR bounds (find the near-white block) ===")
for y in (560,):
    xs = [x for x in range(280, 1120) if near(A[y, x], WHITE, 14)]
    print(f"   row y={y}: white x from {min(xs) if xs else None} to {max(xs) if xs else None}")
for x in (400,):
    ys = [y for y in range(490, 640) if near(A[y, x], WHITE, 14)]
    print(f"   col x={x}: white y from {min(ys) if ys else None} to {max(ys) if ys else None}")

print("\n=== ORANGE SEARCH BUTTON + NAV BUTTONS (y extents) ===")
O = (255, 115, 21)
for x in (1520, 1600, 1690):
    ys = [y for y in range(0, 78) if near(A[y, x], O, 30)]
    print(f"   nav orange col x={x}: y {min(ys) if ys else None}..{max(ys) if ys else None}")
for x in (1020,):
    ys = [y for y in range(500, 640) if near(A[y, x], O, 30)]
    print(f"   search-btn col x={x}: y {min(ys) if ys else None}..{max(ys) if ys else None}")
for y in (560,):
    xs = [x for x in range(950, 1120) if near(A[y, x], O, 30)]
    print(f"   search-btn row y={y}: x {min(xs) if xs else None}..{max(xs) if xs else None}")

print("\n=== NAV OUTLINE BUTTON (List Your Court) - find its border ===")
for y in (30, 39):
    row = [x for x in range(1700, 1920) if not near(A[y, x], (5, 5, 5), 12)]
    print(f"   y={y} non-bg x: {min(row) if row else None}..{max(row) if row else None}")

print("\n=== HOW-IT-WORKS CARD y-extent (col x=320, inside card 1) ===")
d = np.abs(A[822:1500, 320] - np.array(WHITE)).max(axis=1)
idx = np.where(d > 3)[0] + 822
print(f"   non-white rows at x=320: {idx[:6]} ... {idx[-6:]}")
print("   probe col x=314 (card border):")
for y in range(1090, 1130):
    if not near(A[y, 314], WHITE, 3):
        print(f"      first non-white at y={y} -> {hx(A[y,314])}")
        break
for y in range(1420, 1380, -1):
    if not near(A[y, 314], WHITE, 3):
        print(f"      last non-white at y={y} -> {hx(A[y,314])}")
        break

print("\n=== FEATURED CARD y-extent (col x=500, white on #f1f1ef) ===")
ys = [y for y in range(1500, 2495) if near(A[y, 500], WHITE, 6)]
print(f"   white y {min(ys) if ys else None}..{max(ys) if ys else None}")
print("   photo top area colours col x=500:", [f"{y}:{hx(A[y,500])}" for y in (1770, 1780, 1790, 1800)])

print("\n=== BOOK NOW button (card 1) bounds ===")
for y in (2290, 2300, 2310):
    xs = [x for x in range(320, 740) if near(A[y, x], O, 40)]
    print(f"   y={y}: x {min(xs) if xs else None}..{max(xs) if xs else None}")
xs2 = [y for y in range(2260, 2340) if near(A[y, 460], O, 40)]
print(f"   col x=460: y {min(xs2) if xs2 else None}..{max(xs2) if xs2 else None}")

print("\n=== CTA BAND top/bottom (col x=960) ===")
prev = None
for y in range(2470, 2500):
    c = hx(A[y, 960])
    if c != prev:
        print(f"   y={y} {c}")
        prev = c
prev = None
for y in range(2900, 2930):
    c = hx(A[y, 960])
    if c != prev:
        print(f"   y={y} {c}")
        prev = c
