#!/usr/bin/env python3
"""Composite each PDF image with its soft mask and emit named web assets."""
import os

from PIL import Image

R = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference/raw-img"
OUT = "/Users/carlcelino/OSOFT/Code/served-homepage/assets/img"
os.makedirs(OUT, exist_ok=True)

# (base jpg, smask ppm or None, out name, mode)
JOBS = [
    ("im-001-042.jpg", None, "hero-court.jpg", "jpg"),
    ("im-001-000.jpg", None, "venue-pickleball.jpg", "jpg"),
    ("im-001-008.jpg", None, "venue-tennis.jpg", "jpg"),
    ("im-001-016.jpg", None, "venue-badminton.jpg", "jpg"),
    ("im-001-028.jpg", None, "cta-court.jpg", "jpg"),
    ("im-001-046.jpg", "im-001-047.ppm", "logo-served.png", "png"),
    ("im-001-030.jpg", "im-001-031.ppm", "wordmark-watermark.png", "png"),
    ("im-001-048.jpg", "im-001-049.ppm", "wordmark-vertical.png", "png"),
]

for base, mask, name, mode in JOBS:
    bp = os.path.join(R, base)
    if not os.path.exists(bp):
        print(f"  MISS {base}")
        continue
    im = Image.open(bp).convert("RGB")
    if mask and os.path.exists(os.path.join(R, mask)):
        m = Image.open(os.path.join(R, mask)).convert("L").resize(im.size, Image.LANCZOS)
        im = im.convert("RGBA")
        im.putalpha(m)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
    dst = os.path.join(OUT, name)
    if mode == "jpg":
        im.convert("RGB").save(dst, "JPEG", quality=88, optimize=True, progressive=True)
    else:
        im.save(dst, "PNG", optimize=True)
    print(f"  {name:26} {im.size[0]}x{im.size[1]}  {os.path.getsize(dst)//1024}KB")

# --- icons + logo crops straight off the 2x render (they are vector in the PDF) ---
page2 = Image.open("/Users/carlcelino/OSOFT/Code/served-homepage/_reference/page-2x.png").convert("RGBA")
print(f"\n2x render {page2.size}")
