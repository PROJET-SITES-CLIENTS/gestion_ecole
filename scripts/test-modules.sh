#!/bin/bash
# Test systématique de tous les modules : clic → attente → erreurs console → titre principal
MODULES=('Tableau de bord' 'Élèves' 'Personnel' 'Pédagogique' 'Présences' 'Vie scolaire' 'Finances' 'Services' 'Salles & Calendrier' 'Examens officiels' 'RDV parents-profs' 'Sécurité site' 'Communication' "Journal d'audit" 'Modules V4 (37 failles)')

TOTAL_ERR=0
for M in "${MODULES[@]}"; do
  # Snapshot dans une variable puis grep en single-quotes concaténées (évite le bug \" + UTF-8)
  SNAP=$(agent-browser snapshot -i -c 2>/dev/null)
  LINE=$(echo "$SNAP" | grep -F 'button "'"$M"'"' | head -1)
  REF=$(echo "$LINE" | grep -oE 'ref=e[0-9]+' | sed 's/ref=e//')
  if [ -z "$REF" ]; then
    echo "⚠️  $M : bouton introuvable"
    continue
  fi
  agent-browser click '@e'"$REF" >/dev/null 2>&1
  sleep 1.8
  H1=$(agent-browser eval "document.querySelector('h1')?.textContent?.trim() || '(aucun h1)'" 2>/dev/null | tail -1)
  ERR=$(agent-browser errors 2>/dev/null | grep -c . || true)
  CONSOLE_ERR=$(agent-browser console 2>/dev/null | grep -ciE 'error|failed|unhandled' || true)
  S=$(( ${ERR:-0} + ${CONSOLE_ERR:-0} ))
  TOTAL_ERR=$((TOTAL_ERR + S))
  printf '%-26s | h1: %-52s | erreurs: %s\n' "$M" "${H1:0:52}" "$S"
  agent-browser errors --clear >/dev/null 2>&1
done
echo "=============================================="
echo "TOTAL ERREURS NAVIGATION (15 modules) : $TOTAL_ERR"
