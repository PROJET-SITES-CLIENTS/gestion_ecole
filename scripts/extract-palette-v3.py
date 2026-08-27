#!/usr/bin/env python3
"""Passe finale : pour chaque pastille, cherche le pixel le plus 'coloré'
(saturation maximale ou distance au blanc) dans un voisinage, puis moyenne
une petite zone autour de ce point pour obtenir la couleur exacte."""
from PIL import Image

img = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
W, H = img.size

def dist_from_white(r, g, b):
    return (255 - r) + (255 - g) + (255 - b)

def saturation(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return mx - mn

def find_drop_center(cx, cy, radius=18):
    """Trouve le pixel le plus éloigné du blanc dans un voisinage (cx,cy)."""
    best = (cx, cy, -1)
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            x, y = cx + dx, cy + dy
            if not (0 <= x < W and 0 <= y < H):
                continue
            r, g, b = img.getpixel((x, y))
            score = dist_from_white(r, g, b)
            if score > best[2]:
                best = (x, y, score)
    return best[0], best[1]

def avg_around(x, y, r=3):
    rs, gs, bs = [], [], []
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            px, py = x + dx, y + dy
            if 0 <= px < W and 0 <= py < H:
                cr, cg, cb = img.getpixel((px, py))
                rs.append(cr); gs.append(cg); bs.append(cb)
    return sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs)

palettes = {
    "Palette Neutre": [
        ("NOIR", 70, 95), ("TAUPE", 122, 95),
        ("GRIS FONCE", 70, 155), ("BEIGE", 122, 155),
        ("GRIS CLAIR", 70, 215), ("BLANC", 122, 215),
    ],
    "Palette Froide": [
        ("BLEU INDIGO", 220, 95), ("VERT FORET", 277, 95),
        ("BLEU OCEAN", 220, 155), ("VERT FEUILLE", 272, 155),
        ("TURQUOISE", 220, 215), ("VERT CLAIR", 272, 215),
    ],
    "Palette Vive": [
        ("ROUGE", 70, 334), ("VIOLET", 122, 334),
        ("ORANGE", 70, 394), ("BLEU", 122, 394),
        ("JAUNE", 70, 454), ("VERT", 122, 454),
    ],
    "Palette Chaude": [
        ("ROUGE", 220, 334), ("CHOCOLAT", 277, 334),
        ("CORAL", 220, 394), ("MARRON", 272, 394),
        ("ORANGE", 220, 454), ("CARAMEL", 272, 454),
    ],
}

results = {}
for pname, drops in palettes.items():
    print(f"\n=== {pname} ===")
    results[pname] = []
    for label, cx, cy in drops:
        # Cas spécial BLANC : chercher la zone la plus blanche DANS la carte (pas le fond)
        if label == "BLANC":
            # Le blanc est dans la pastille : chercher une zone blanche entourée de bordure
            r, g, b = 255, 255, 255
            results[pname].append((label, r, g, b))
            print(f"  {label:<12} #FFFFFF  rgb(255,255,255)  (pastille blanche sur carte)")
            continue
        x, y = find_drop_center(cx, cy)
        r, g, b = avg_around(x, y)
        hexc = f"#{r:02X}{g:02X}{b:02X}"
        results[pname].append((label, r, g, b))
        print(f"  {label:<12} {hexc}  rgb({r},{g},{b})   centre({x},{y})")

# Résumé compact pour intégration facile
print("\n\n========== RÉSUMÉ (variables CSS) ==========")
css_names = {
    "Palette Neutre": "neutre", "Palette Froide": "froide",
    "Palette Vive": "vive", "Palette Chaude": "chaude",
}
for pname, drops in results.items():
    slug = css_names[pname]
    print(f"\n/* {pname} */")
    for label, r, g, b in drops:
        var = label.lower().replace(" ", "-").replace("é", "e").replace("ô", "o")
        print(f"  --{slug}-{var}: #{r:02X}{g:02X}{b:02X};")
