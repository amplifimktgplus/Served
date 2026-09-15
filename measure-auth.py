#!/usr/bin/env python3
"""Measure the four auth screens off their PNG exports (1920x1158 each)."""
import numpy as np
from PIL import Image

SRC = '/Users/carlcelino/Downloads/playground/'
FILES = ['Sign Up.png', 'Sign in.png', 'Forgot Password.png', 'Change Password.png']


def hx(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c[:3])


def runs_x(A, y, ref, tol=6, minlen=30):
    d = np.abs(A[y, :, :3].astype(int) - np.array(ref)).max(axis=1)
    m = d <= tol
    out, s = [], None
    for x in range(len(m)):
        if m[x] and s is None: s = x
        elif not m[x] and s is not None:
            if x - s >= minlen: out.append((s, x - 1, x - s))
            s = None
    if s is not None and len(m) - s >= minlen: out.append((s, len(m) - 1, len(m) - s))
    return out


def runs_y(A, x, ref, tol=6, minlen=20, y0=0, y1=None):
    y1 = y1 or A.shape[0]
    d = np.abs(A[y0:y1, x, :3].astype(int) - np.array(ref)).max(axis=1)
    m = d <= tol
    out, s = [], None
    for i in range(len(m)):
        if m[i] and s is None: s = i
        elif not m[i] and s is not None:
            if i - s >= minlen: out.append((y0 + s, y0 + i - 1, i - s))
            s = None
    if s is not None and len(m) - s >= minlen: out.append((y0 + s, y1 - 1, len(m) - s))
    return out


for f in FILES:
    A = np.asarray(Image.open(SRC + f).convert('RGB')).astype(int)
    H, W = A.shape[:2]
    print(f'\n{"="*70}\n{f}   {W}x{H}\n{"="*70}')

    # dominant colours
    flat = A.reshape(-1, 3)[::37]
    from collections import Counter
    top = Counter(map(tuple, flat)).most_common(6)
    print('  top colours:', '  '.join(f'{hx(c)} {n*100/len(flat):.1f}%' for c, n in top))

    # split point: first x where the column becomes uniformly light
    mid = H // 2
    row = A[mid]
    split = None
    for x in range(W):
        if np.abs(row[x] - np.array([255, 255, 255])).max() < 8 and \
           np.abs(A[80, x] - np.array([255, 255, 255])).max() < 8:
            split = x; break
    print(f'  photo/white split at x={split}')

    # the card panel (#f1f1ef-ish)
    for ref, label in [((241, 241, 239), 'card #f1f1ef'), ((240, 240, 238), 'card alt')]:
        r = runs_x(A, mid, ref, tol=5, minlen=180)
        if r:
            x0, x1, w = r[-1]
            cols = runs_y(A, (x0 + x1) // 2, ref, tol=5, minlen=100)
            if cols:
                y0, y1, h = cols[-1]
                print(f'  {label}: x {x0}..{x1} (w={w})   y {y0}..{y1} (h={h})')
            break

    # white input fields inside the card
    ws = runs_x(A, mid, (255, 255, 255), tol=4, minlen=200)
    print(f'  white runs at y={mid}: {ws[:4]}')

    # orange elements
    O = (255, 115, 21)
    orows = []
    for y in range(0, H, 4):
        r = runs_x(A, y, O, tol=26, minlen=60)
        if r: orows.append((y, r[0]))
    if orows:
        ys = [y for y, _ in orows]
        print(f'  orange bands y {min(ys)}..{max(ys)}; first={orows[0]}  last={orows[-1]}')
        groups, prev, start = [], None, None
        for y, r in orows:
            if prev is None or y - prev > 12:
                if start is not None: groups.append((start, prev))
                start = y
            prev = y
        groups.append((start, prev))
        for a, b in groups:
            rr = runs_x(A, (a + b) // 2, O, tol=26, minlen=60)
            print(f'     orange block y {a}..{b} (h={b-a+4})  x {rr[0][0]}..{rr[0][1]} (w={rr[0][2]})')
