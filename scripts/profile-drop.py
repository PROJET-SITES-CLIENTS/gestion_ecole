#!/usr/bin/env python3
"""Analyse du profil de couleur à travers une pastille pour comprendre
si c'est un dégradé (centre clair → bord foncé) ou une couleur plate + bordure."""
from PIL import Image

img = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
W, H = img.size

# Analyse du ROUGE de la Palette Vive (autour de x=67-70, y=331-336)
print("=== Profil horizontal — ROUGE (Palette Vive), y=334 ===")
for x in range(55, 90):
    r, g, b = img.getpixel((x, 334))
    hexc = f"#{r:02X}{g:02X}{b:02X}"
    bar = "#" * (r // 12)
    print(f"  x={x:3d}  {hexc}  {bar}")

print("\n=== Profil vertical — ROUGE (Palette Vive), x=67 ===")
for y in range(318, 355):
    r, g, b = img.getpixel((67, y))
    hexc = f"#{r:02X}{g:02X}{b:02X}"
    print(f"  y={y:3d}  {hexc}")
