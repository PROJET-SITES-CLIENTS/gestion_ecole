#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fusion couverture + corps -> PDF final unique (normalisation A4)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

BASE = '/home/z/my-project/scripts/rapport-audit'
OUT = '/home/z/my-project/download/rapport-analyse-approfondie-scolagestion-v4.pdf'

writer = PdfWriter()
cover_page = PdfReader(f'{BASE}/cover.pdf').pages[0]
writer.add_page(normalize_page_to_a4(cover_page))
for page in PdfReader(f'{BASE}/body.pdf').pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({
    '/Title': 'Rapport d\'analyse approfondie — ScolaGestion V4',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Audit logique, couverture fonctionnelle et failles résiduelles de la plateforme SaaS de gestion scolaire',
})
import os
os.makedirs('/home/z/my-project/download', exist_ok=True)
with open(OUT, 'wb') as f:
    writer.write(f)
print('PDF final:', OUT, '- pages:', len(writer.pages))
