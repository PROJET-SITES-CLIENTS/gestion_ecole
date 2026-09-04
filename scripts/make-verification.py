#!/usr/bin/env python3
"""Génère une image de vérification : palette extraite vs originale (côte à côte)."""
import json
from PIL import Image, ImageDraw, ImageFont

with open("/home/z/my-project/scripts/palettes-extraites.json") as f:
    palettes = json.load(f)

# Ouvrir l'originale pour comparaison visuelle
origine = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
scale = 2
origine_big = origine.resize((origine.width * scale, origine.height * scale), Image.NEAREST)

# Image de vérification : titre + originale à gauche, pastilles extraites à droite
pad = 30
left_w = origine_big.width
right_w = 640
header = 80
W = pad + left_w + 40 + right_w + pad
H = header + max(origine_big.height, 4 * 170) + pad
canvas = Image.new("RGB", (W, H), "#FFFFFF")
draw = ImageDraw.Draw(canvas)

# Fond noir comme l'originale pour la partie gauche
draw.rectangle([0, 0, W, H], fill="#1A1A1A")

try:
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    font_hex = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
except Exception:
    font_title = font_label = font_hex = ImageFont.load_default()

draw.text((pad, 20), "Vérification — Original (gauche) vs Couleurs extraites (droite)",
          fill="#FFFFFF", font=font_title)

# Original à gauche
canvas.paste(origine_big, (pad, header))
draw.text((pad, header - 32), "Image originale (zoom x2)", fill="#9AB311", font=font_label)

# Palettes extraites à droite
titles = {"neutre": "Palette Neutre", "froide": "Palette Froide",
          "vive": "Palette Vive", "chaude": "Palette Chaude"}
x0 = pad + left_w + 40
y = header - 32
for key in ["neutre", "froide", "vive", "chaude"]:
    draw.text((x0, y), titles[key], fill="#FFFFFF", font=font_label)
    y += 26
    x = x0
    for name, hexv in palettes[key].items():
        sw, sh = 92, 62
        draw.rounded_rectangle([x, y, x + sw, y + sh], radius=8, fill=hexv,
                               outline="#666666", width=1)
        draw.text((x + 6, y + sh + 6), name.upper()[:9], fill="#DDDDDD", font=font_label)
        draw.text((x + 6, y + sh + 24), hexv, fill="#9AB311", font=font_hex)
        x += sw + 8
    y += sh + 52

canvas.save("/home/z/my-project/download/verification-palettes.png")
print("Sauvegardé : download/verification-palettes.png")
