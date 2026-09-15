#!/usr/bin/env python3
"""Cut per-section reference crops (1x context + 2x detail) for measurement."""
import os

from PIL import Image

REF = "/Users/carlcelino/OSOFT/Code/served-homepage/_reference"
OUT = f"{REF}/crops"
os.makedirs(OUT, exist_ok=True)
p1 = Image.open(f"{REF}/page-1x.png").convert("RGB")
p2 = Image.open(f"{REF}/page-2x.png").convert("RGB")

SECTIONS = [
    ("01-nav", 0, 0, 1920, 78),
    ("02-hero", 0, 60, 1920, 830),
    ("03-howitworks", 0, 820, 1920, 1500),
    ("04-featured", 0, 1495, 1920, 2495),
    ("05-cta", 0, 2485, 1920, 2920),
    ("06-footer", 0, 2905, 1920, 3554),
]
for name, x0, y0, x1, y1 in SECTIONS:
    p1.crop((x0, y0, x1, y1)).save(f"{OUT}/{name}.png")
    print(f"  {name:16} 1x {x1-x0}x{y1-y0}")

# 2x detail crops — component-level, native pixels
DETAIL = [
    ("d-nav-left", 0, 0, 560, 78),
    ("d-nav-right", 1300, 0, 1920, 78),
    ("d-hero-copy", 290, 230, 1100, 620),
    ("d-searchbar", 300, 520, 1080, 610),
    ("d-hiw-card1", 300, 1130, 760, 1420),
    ("d-hiw-icons", 300, 1120, 1620, 1240),
    ("d-venue-card1", 300, 1750, 760, 2340),
    ("d-venue-card-top", 300, 1750, 760, 2080),
    ("d-viewall", 830, 2380, 1090, 2440),
    ("d-cta-panel", 420, 2560, 1560, 2980),
    ("d-footer-cols", 100, 3200, 1700, 3450),
    ("d-footer-bottom", 100, 3440, 1700, 3554),
]
for name, x0, y0, x1, y1 in DETAIL:
    p2.crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2)).save(f"{OUT}/{name}.png")
    print(f"  {name:16} 2x {(x1-x0)*2}x{(y1-y0)*2}")
