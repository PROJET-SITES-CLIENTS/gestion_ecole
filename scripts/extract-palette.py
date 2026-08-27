#!/usr/bin/env python3
"""Extraction précise des couleurs par échantillonnage de pixels de l'image de palettes."""
from PIL import Image

img = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
W, H = img.size
print(f"Dimensions: {W}x{H}")

# L'image est une grille 2x2 de palettes, chaque palette contient 6 pastilles (3 lignes x 2 colonnes)
# On va scanner par grille grossière pour trouver les zones de couleur saturées.
# Stratégie : échantillonner une grille dense et regrouper les couleurs dominantes par quadrant.

# Quadrants (2x2)
quadrants = {
    "Palette Neutre (haut-gauche)": (0, 0, W // 2, H // 2),
    "Palette Froide (haut-droite)": (W // 2, 0, W, H // 2),
    "Palette Vive (bas-gauche)": (0, H // 2, W // 2, H),
    "Palette Chaude (bas-droite)": (W // 2, H // 2, W, H),
}

def sample_quadrant(box, n=40):
    """Échantillonne n x n points dans le quadrant, regroupe par couleur quantifiée."""
    x0, y0, x1, y1 = box
    from collections import Counter
    counts = Counter()
    samples = {}
    for i in range(1, n):
        for j in range(1, n):
            x = x0 + (x1 - x0) * i // n
            y = y0 + (y1 - y0) * j // n
            r, g, b = img.getpixel((x, y))
            # Quantifier pour regrouper (pas de 16)
            q = (r // 16 * 16, g // 16 * 16, b // 16 * 16)
            counts[q] += 1
            if q not in samples:
                samples[q] = (r, g, b, x, y)
    return counts, samples

for name, box in quadrants.items():
    counts, samples = sample_quadrant(box)
    # Filtrer : garder les groupes suffisamment gros (> 0.5% des samples) et non blanc/noir pur de fond
    total = sum(counts.values())
    print(f"\n=== {name} ===")
    clusters = []
    for q, c in counts.most_common(40):
        if c / total < 0.004:
            continue
        r, g, b, x, y = samples[q]
        # Ignorer le blanc de fond et les gris très clairs du cadre
        if r > 245 and g > 245 and b > 245:
            continue
        clusters.append((c, (r, g, b), (x, y)))
    for c, (r, g, b), (x, y) in clusters[:12]:
        hexc = f"#{r:02X}{g:02X}{b:02X}"
        print(f"  {hexc}  rgb({r},{g},{b})  x={x} y={y}  pixels~{c}")
