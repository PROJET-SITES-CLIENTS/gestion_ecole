#!/usr/bin/env bash
# ====================================================================
# Test des 5 portails : super_admin, direction, enseignant, parent, eleve
# Le sélecteur de portail est dans le header (dropdown à droite).
# ====================================================================
BASE="http://localhost:81"
PASS=0; FAIL=0
RESULTS=""

open_portal() {
  # Ouvre le dropdown du sélecteur de portail et clique l'option
  local portal_name="$1"
  # Le bouton du header contient le label du portail courant
  agent-browser snapshot -i > /tmp/snap.txt 2>/dev/null
  # Cliquer sur le bouton portail (2e dropdown du header, contient "ChevronDown")
  # Utiliser find avec le nom du portail courant serait fragile ; on clique le bouton
  # identifié par son texte visible dans le snapshot banner
  local btn_ref
  btn_ref=$(grep -oE 'button "[^"]*(Direction|Super-Admin|Enseignant|Parent|Élève)[^"]*" \[ref=e[0-9]+\]' /tmp/snap.txt | grep -oE 'e[0-9]+' | head -1)
  if [ -z "$btn_ref" ]; then
    # fallback : 2e bouton du banner (notifications = 1er)
    btn_ref=$(grep -A5 "banner" /tmp/snap.txt | grep -oE 'e[0-9]+' | sed -n '2p')
  fi
  agent-browser click "@${btn_ref}" > /dev/null 2>&1
  sleep 0.8
  # Cliquer l'option du portail dans le menu ouvert
  agent-browser find text "$portal_name" click > /dev/null 2>&1
  sleep 1.5
}

check_portal() {
  local portal_label="$1"
  local expect_label="$2"
  agent-browser errors --clear > /dev/null 2>&1
  sleep 0.5
  local errors
  errors=$(agent-browser errors 2>/dev/null | grep -c . || true)
  local heading
  heading=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
  local breadcrumb
  breadcrumb=$(agent-browser snapshot -c 2>/dev/null | grep -B2 "$expect_label" | head -3 | tr '\n' ' ' | head -c 120)
  local nav_count
  nav_count=$(agent-browser snapshot -c 2>/dev/null | grep -cE "button \"" || true)
  if [ "$errors" -eq 0 ] && [ -n "$heading" ]; then
    PASS=$((PASS+1))
    RESULTS="$RESULTS\n  ✓ Portail $portal_label — $heading | $nav_count boutons nav | 0 erreur"
  else
    FAIL=$((FAIL+1))
    RESULTS="$RESULTS\n  ✗ Portail $portal_label — $heading | $errors erreurs JS"
  fi
}

echo "=============================================="
echo " TEST PORTAILS — ScolaGestion V4"
echo "=============================================="

agent-browser open "$BASE/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
sleep 2.5

# --- 1. Direction (portail par défaut) ---
check_portal "Direction (défaut)" "Direction"

# --- 2. Super-Admin Éditeur ---
open_portal "Super-Admin Éditeur"
check_portal "Super-Admin" "Super-Admin"
# Module spécifique : Couche SaaS
agent-browser errors --clear > /dev/null 2>&1
agent-browser find role button click --name "Couche SaaS" > /dev/null 2>&1
sleep 1.5
SAAS_H=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
SAAS_E=$(agent-browser errors 2>/dev/null | grep -c . || true)
if [ "$SAAS_E" -eq 0 ] && echo "$SAAS_H" | grep -qiE "SaaS|Multi"; then
  PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ Module Couche SaaS (super-admin) — $SAAS_H | 0 erreur"
else
  FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ Module Couche SaaS — $SAAS_H | $SAAS_E erreurs"
fi

# --- 3. Enseignant ---
open_portal "Enseignant"
check_portal "Enseignant" "Enseignant"
# Test module Présences en tant qu'enseignant
agent-browser errors --clear > /dev/null 2>&1
agent-browser find role button click --name "Présences" > /dev/null 2>&1
sleep 1.5
PRES_H=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
PRES_E=$(agent-browser errors 2>/dev/null | grep -c . || true)
if [ "$PRES_E" -eq 0 ] && [ -n "$PRES_H" ]; then
  PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ Module Présences (enseignant) — $PRES_H | 0 erreur"
else
  FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ Module Présences (enseignant) — $PRES_H | $PRES_E erreurs"
fi

# --- 4. Parent ---
open_portal "Parent"
check_portal "Parent" "Parent|Portail"
PARENT_H=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
PARENT_E=$(agent-browser errors 2>/dev/null | grep -c . || true)

# --- 5. Élève ---
open_portal "Élève"
sleep 1
check_portal "Élève" "Élève"

echo -e "$RESULTS"
echo ""
echo "BILAN PORTAILS: $PASS OK / $FAIL échecs"
