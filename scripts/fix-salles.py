#!/usr/bin/env python3
"""Corrige les artefacts d'échappement dans salles.tsx (messageAnnee)."""
import io

p = '/home/z/my-project/src/components/modules/salles.tsx'
src = io.open(p, encoding='utf-8').read()

# 1) Ligne 24 : const [messageAnnee — le "[m" a été perdu lors du heredoc
bad1 = 'const essageAnnee, setMessageAnnee] = useState'
good1 = 'const [messageAnnee, setMessageAnnee] = useState'
if bad1 in src:
    src = src.replace(bad1, good1)
    print('fix 1 OK')

# 2) Ligne 164 : className mangled avec concat littérale
bad2_start = '<div className="mb-3 rounded-md border px-3 py-2 text-sm ${'
idx = src.find(bad2_start)
if idx >= 0:
    end = src.find('</div>', idx)
    replacement = ('<div className="mb-3 rounded-md border border-emerald-200 '
                   'bg-emerald-50 px-3 py-2 text-sm text-emerald-700" '
                   'role="status">{messageAnnee}')
    src = src[:idx] + replacement + src[end:]
    print('fix 2 OK')

# 3) Vérifie le bouton Clôturer : échappement de l'apostrophe
bad3 = "l\\\\'année"
if bad3 in src:
    src = src.replace(bad3, "l\\'année")
    print('fix 3 OK')

io.open(p, 'w', encoding='utf-8').write(src)
print('DONE')
