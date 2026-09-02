#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Graphique : répartition des 162 modèles Prisma selon leur usage applicatif.
Style conforme charts.md : spines top/right supprimées, pas de grille (valeurs affichées),
barres horizontales (libellés longs), couleurs de la palette cascade (seed 42)."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
import matplotlib.pyplot as plt

plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# Palette cascade (seed 42) — même famille que le corps du rapport
HEADER_FILL = '#4e4732'   # M tier — lecture seule (la masse)
ACCENT      = '#92761f'   # XS tier — écriture (mis en évidence)
BORDER      = '#c5bfac'   # S tier — jamais référencés
TEXT_PRIMARY = '#151513'
TEXT_MUTED  = '#7e7c74'

categories = ['Jamais référencés\n(données invisibles)', 'Lecture seule\n(affichage sans écriture)', 'En écriture\n(flux fonctionnels)']
valeurs = [14, 119, 29]
couleurs = [BORDER, HEADER_FILL, ACCENT]
annotations = ['14  (8,6 %)', '119  (73,5 %)', '29  (17,9 %)']

fig, ax = plt.subplots(figsize=(8.6, 3.1), constrained_layout=True)
bars = ax.barh(categories, valeurs, color=couleurs, height=0.58, edgecolor='none')

# Valeurs affichées en bout de barre -> grille supprimée (règle charts.md)
for bar, note in zip(bars, annotations):
    ax.text(bar.get_width() + 2.5, bar.get_y() + bar.get_height() / 2,
            note, va='center', ha='left', fontsize=11, color=TEXT_PRIMARY, fontweight='bold')

ax.set_xlim(0, 140)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_visible(False)
ax.spines['bottom'].set_color(TEXT_MUTED)
ax.spines['bottom'].set_linewidth(0.6)
ax.tick_params(axis='y', length=0, labelsize=10.5, colors=TEXT_PRIMARY)
ax.tick_params(axis='x', length=3, labelsize=9.5, colors=TEXT_MUTED)
ax.set_xlabel('Nombre de modèles Prisma (total : 162)', fontsize=10, color=TEXT_MUTED)
ax.grid(False)

fig.savefig('/home/z/my-project/scripts/rapport-audit/chart-usage.png', dpi=200, facecolor='white')
print('Chart OK -> chart-usage.png')
