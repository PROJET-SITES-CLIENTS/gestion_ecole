#!/usr/bin/env bash
# ====================================================================
# TEST FINAL COMPLET — ScolaGestion V4
# 15 modules + 5 portails + notifications + erreurs console
# ====================================================================
BASE="${1:-http://localhost:81}"
PASS=0; FAIL=0; RESULTS=""

echo "======================================================"
echo "  TEST FINAL — $BASE"
echo "======================================================"

agent-browser close > /dev/null 2>&1; sleep 1
agent-browser open "$BASE/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1; sleep 3

# Chargement initial
TITLE=$(agent-browser get title 2>/dev/null)
INIT_ERR=$(agent-browser errors 2>/dev/null | grep -c . || true)
BELL=$(agent-browser snapshot -i 2>/dev/null | grep -oE 'button "[0-9]+" \[expanded' | grep -oE '"[0-9]+"' | head -1)
echo "Titre: $TITLE | Erreurs init: $INIT_ERR | Badge cloche: $BELL"
if [ "$INIT_ERR" = "0" ]; then PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ Chargement initial (hydration OK, 0 erreur)"; else FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ Erreurs au chargement: $INIT_ERR"; fi

# --- Les 15 modules ---
for MOD in "Tableau de bord:Tableau de bord" "Élèves:Élèves" "Personnel:Personnel" "Pédagogique:Pédagogique" "Présences:Présences" "Vie scolaire:Vie scolaire" "Finances:Finances" "Services:Services" "Salles & Calendrier:Salles" "Examens officiels:Examens" "RDV parents-profs:Rendez" "Sécurité site:Sécurité" "Communication:Communication" "Journal d'audit:audit" "Modules V4:V4"; do
  LABEL="${MOD%%:*}"; EXPECT="${MOD##*:}"
  agent-browser errors --clear > /dev/null 2>&1
  agent-browser find role button click --name "$LABEL" > /dev/null 2>&1
  sleep 1.3
  H=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
  E=$(agent-browser errors 2>/dev/null | grep -c . || true)
  if echo "$H" | grep -qiE "$EXPECT" && [ "$E" = "0" ]; then
    PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ Module: $LABEL"
  else
    FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ Module: $LABEL — $H ($E err)"
  fi
done

# --- Portails (via dropdown) ---
for P in "Super-Admin Éditeur" "Enseignant" "Parent" "Élève" "Direction"; do
  # ouvrir le dropdown portail : bouton après la cloche dans le banner
  REF=$(agent-browser snapshot -i 2>/dev/null | grep -oE 'button "[A-ZÉ]{1,2} [^"]+" \[expanded=false, ref=(e[0-9]+)\]' | grep -oE 'e[0-9]+' | head -1)
  agent-browser click "@$REF" > /dev/null 2>&1; sleep 0.8
  agent-browser find role menuitem click --name "$P" > /dev/null 2>&1; sleep 2
  E=$(agent-browser errors 2>/dev/null | grep -c . || true)
  H=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
  NAV=$(agent-browser snapshot -i 2>/dev/null | grep -cE '^- button' || true)
  if [ "$E" = "0" ] && [ -n "$H" ]; then
    PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ Portail: $P — $H"
  else
    FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ Portail: $P — $H ($E err)"
  fi
done

echo -e "$RESULTS"
echo ""
echo "======================================================"
echo "  BILAN FINAL: $PASS OK / $FAIL ÉCHECS"
echo "======================================================"
