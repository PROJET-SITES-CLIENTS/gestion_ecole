#!/usr/bin/env python3
"""Échantillonnage précis au centre de chaque pastille de couleur (moyenne 5x5)."""
from PIL import Image

img = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
W, H = img.size

def avg_color(x, y, r=2):
    """Moyenne RGB sur une zone (2r+1)^2 en évitant les bords antialiasés."""
    rs, gs, bs = [], [], []
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            px, py = x + dx, y + dy
            if 0 <= px < W and 0 <= py < H:
                cr, cg, cb = img.getpixel((px, py))
                rs.append(cr); gs.append(cg); bs.append(cb)
    return sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs)

# Positions des centres de pastilles déduites du scan précédent
# Colonnes : gauche ≈ 70/220, droite ≈ 122/272 ; Lignes : ≈ 95/155/215 (haut) et 334/394/454 (bas)
palettes = {
    "Palette Neutre": [
        ("NOIR",       70, 95),  ("TAUPE",     122, 95),
        ("GRIS FONCE", 70, 155), ("BEIGE",     122, 155),
        ("GRIS CLAIR", 70, 215), ("BLANC",     122, 215),
    ],
    "Palette Froide": [
        ("BLEU INDIGO", 220, 95), ("VERT FORET", 277, 95),
        ("BLEU OCEAN",  220, 155), ("VERT FEUILLE", 272, 155),
        ("TURQUOISE",   220, 215), ("VERT CLAIR",  272, 215),
    ],
    "Palette Vive": [
        ("ROUGE",  70, 334), ("VIOLET", 122, 334),
        ("ORANGE", 70, 394), ("BLEU",    122, 394),
        ("JAUNE",  70, 454), ("VERT",    122, 454),
    ],
    "Palette Chaude": [
        ("ROUGE",    220, 334), ("CHOCOLAT", 277, 334),
        ("CORAL",    220, 394), ("MARRON",   272, 394),
        ("ORANGE",   220, 454), ("CARAMEL",  272, 454),
    ],
}

for pname, drops in palettes.items():
    print(f"\n=== {pname} ===")
    for label, x, y in drops:
        # Chercher le centre réel : balayer la colonne pour trouver la zone la plus saturée/homogène
        r, g, b = avg_color(x, y)
        # Si le point est trop clair (fond blanc), chercher le centre de la pastille à proximité
        if r > 240 and g > 240 and b > 240:
            # balayer y de -40 à +40
            best = (x, y, (r, g, b))
            for dy in range(-45, 46, 3):
                rr, gg, bb = avg_color(x, y + dy, 1)
                if not (rr > 240 and gg > 240 and bb > 240):
                    best = (x, y + dy, (rr, gg, bb))
                    break
            x, y, (r, g, b) = best
        hexc = f"#{r:02X}{g:02X}{b:02X}"
        print(f"  {label:<12} {hexc}  rgb({r},{g},{b})")
