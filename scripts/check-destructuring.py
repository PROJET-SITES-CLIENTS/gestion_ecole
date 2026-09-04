#!/usr/bin/env python3
"""Vérifie l'alignement du GRAND Promise.all (2e occurrence) dans page.tsx."""
import re

src = open("/home/z/my-project/src/app/page.tsx").read()

# Trouver TOUS les blocs "= await Promise.all(["
matches = list(re.finditer(r"\] = await Promise\.all\(\[", src))
print(f"Blocs Promise.all trouvés : {len(matches)}")

# Le grand bloc est le 2e
m = matches[1]
start = m.start()
decl_start = src.rfind("const [", 0, start)
destructuring = src[decl_start:start + 1]
end = src.find("]);", m.end())
queries_block = src[m.end():end]

destr_clean = re.sub(r"//.*", "", destructuring)
destr_clean = destr_clean.replace("const [", "").replace("]", "")
names = [n.strip() for n in destr_clean.split(",") if n.strip()]

queries = re.findall(r"db\.(\w+)\.(?:findMany|findFirst|count|aggregate|groupBy)\(", queries_block)

print(f"Noms destructuring : {len(names)}")
print(f"Requêtes           : {len(queries)}")
print()

# Position critique : notifications
print("--- Position de 'notifications' ---")
if "notifications" in names:
    idx = names.index("notifications")
    print(f"notifications est à la position {idx+1}")
    if idx < len(queries):
        print(f"La requête correspondante est : db.{queries[idx][0]}.")
else:
    print("❌ 'notifications' absent du destructuring !")

print("\n--- Vérification complète (nom vs modèle) ---")
mismatches = []
for i, (name, model) in enumerate(zip(names, queries)):
    expected = model[0].lower() + model[1:]
    # Pluriel plausible : notifications ← notification, eleves ← eleve...
    singular = name[:-1] if name.endswith("s") else name
    ok = expected == name or expected == singular or model.lower() == name.lower() or model.lower() == singular.lower()
    if not ok:
        # cas spéciaux connus
        special = {
            "totalElevesGeres": "eleve", "ecoles": "ecole", "plans": "planTarifaire",
            "facturesSaas": "factureSaas", "documentsEleve": "documentEleve",
        }
        if special.get(name) == model.lower() or name.lower().startswith(model.lower()):
            ok = True
    if not ok:
        mismatches.append((i + 1, name, model))

if not mismatches:
    print("✓ Toutes les positions correspondent (heuristique camelCase)")
else:
    print(f"{len(mismatches)} positions suspectes :")
    for pos, name, model in mismatches:
        print(f"  {pos:3d}. {name:<28} ← db.{model}")

# Sauvegarder la liste complète pour inspection
with open("/tmp/alignment.txt", "w") as f:
    for i, (name, model) in enumerate(zip(names, queries)):
        f.write(f"{i+1:3d}. {name:<30} ← db.{model}\n")
print("\nListe complète : /tmp/alignment.txt")
