#!/usr/bin/env python3
"""Passe FINALE : couleur dominante (mode) dans une fenêtre autour de chaque pastille.
Quantification fine (pas de 8) : la couleur plate du cœur domine statistiquement
et les bords antialiasés sont éliminés car minoritaires."""
from PIL import Image
from collections import Counter

img = Image.open("/home/z/my-project/upload/clr 1.png").convert("RGB")
W, H = img.size

def dominant_color(cx, cy, win=14, qstep=8):
    """Couleur dominante quantifiée dans une fenêtre win x win autour de (cx, cy)."""
    counts = Counter()
    samples = {}
    for dx in range(-win, win + 1):
        for dy in range(-win, win + 1):
            x, y = cx + dx, cy + dy
            if not (0 <= x < W and 0 <= y < H):
                continue
            r, g, b = img.getpixel((x, y))
            q = (r // qstep, g // qstep, b // qstep)
            counts[q] += 1
            samples.setdefault(q, []).append((r, g, b))
    q, c = counts.most_common(1)[0]
    rs = [s[0] for s in samples[q]]; gs = [s[1] for s in samples[q]]; bs = [s[2] for s in samples[q]]
    return sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs), c

# Fenêtres centrées sur le cœur des pastilles (déduit des scans précédents)
palettes = {
    "Palette Neutre": [
        ("NOIR", 76, 92), ("TAUPE", 128, 96),
        ("GRIS FONCE", 76, 158), ("BEIGE", 128, 152),
        ("GRIS CLAIR", 76, 218), ("BLANC", 128, 218),
    ],
    "Palette Froide": [
        ("BLEU INDIGO", 226, 96), ("VERT FORET", 283, 94),
        ("BLEU OCEAN", 231, 155), ("VERT FEUILLE", 278, 160),
        ("TURQUOISE", 231, 214), ("VERT CLAIR", 278, 220),
    ],
    "Palette Vive": [
        ("ROUGE", 76, 340), ("VIOLET", 128, 342),
        ("ORANGE", 76, 396), ("BLEU", 128, 396),
        ("JAUNE", 76, 456), ("VERT", 128, 456),
    ],
    "Palette Chaude": [
        ("ROUGE", 226, 342), ("CHOCOLAT", 283, 336),
        ("CORAL", 231, 396), ("MARRON", 278, 400),
        ("ORANGE", 231, 456), ("CARAMEL", 278, 458),
    ],
}

all_results = {}
for pname, drops in palettes.items():
    print(f"\n=== {pname} ===")
    all_results[pname] = []
    for label, cx, cy in drops:
        if label == "BLANC":
            # Pastille blanche : vérifier la zone la plus blanche non-fond
            # (le fond de carte est #EFEFEF, la pastille est plus blanche/pure)
            found = False
            for dy in range(-25, 26, 2):
                for dx in range(-12, 13, 2):
                    r, g, b = img.getpixel((128 + dx, 218 + dy))
                    if r > 252 and g > 252 and b > 252:
                        print(f"  {label:<12} #FFFFFF  rgb(255,255,255)")
                        all_results[pname].append((label, 255, 255, 255))
                        found = True
                        break
                if found:
                    break
            if not found:
                # sinon prendre la couleur la plus claire de la zone
                best = (0, 0, 0, -1)
                for dy in range(-25, 26):
                    for dx in range(-12, 13):
                        r, g, b = img.getpixel((128 + dx, 218 + dy))
                        if r + g + b > best[3]:
                            best = (r, g, b, r + g + b)
                r, g, b, _ = best
                print(f"  {label:<12} #{r:02X}{g:02X}{b:02X}  rgb({r},{g},{b})")
                all_results[pname].append((label, r, g, b))
            continue
        r, g, b, c = dominant_color(cx, cy)
        hexc = f"#{r:02X}{g:02X}{b:02X}"
        all_results[pname].append((label, r, g, b))
        print(f"  {label:<12} {hexc}  rgb({r},{g},{b})   ({c} px dominants)")

# Résumé final — 3 formats : CSS vars, Tailwind, JSON
print("\n\n========== RÉSUMÉ FINAL ==========")
slugs = {"Palette Neutre": "neutre", "Palette Froide": "froide",
         "Palette Vive": "vive", "Palette Chaude": "chaude"}
print("\n--- Variables CSS ---")
for pname, drops in all_results.items():
    print(f"\n/* {pname} */")
    for label, r, g, b in drops:
        var = (label.lower().replace(" ", "-")
               .replace("é", "e").replace("ê", "e").replace("ô", "o"))
        print(f"  --{slugs[pname]}-{var}: #{r:02X}{g:02X}{b:02X};")

print("\n--- JSON ---")
import json
out = {}
for pname, drops in all_results.items():
    out[slugs[pname]] = {label.lower().replace(" ", "-"): f"#{r:02X}{g:02X}{b:02X}"
                         for label, r, g, b in drops}
print(json.dumps(out, indent=2, ensure_ascii=False))

with open("/home/z/my-project/scripts/palettes-extraites.json", "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print("\nSauvegardé : scripts/palettes-extraites.json")
