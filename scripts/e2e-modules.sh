#!/usr/bin/env bash
# ====================================================================
# Test E2E exhaustif ScolaGestion V4 via le gateway (:81)
# - Charge la page, vérifie hydration
# - Navigue dans les 16 modules de la sidebar (portail Direction)
# - Vérifie le titre H1 + erreurs console après CHAQUE module
# ====================================================================
BASE="http://localhost:81"
PASS=0; FAIL=0; WARN=0
RESULTS=""

check_console() {
  # Retourne le nombre d'erreurs console (hors messages info/log/HMR)
  local errs
  errs=$(agent-browser console 2>/dev/null | grep -cE "^\[(error|warning)\]|hydration" || true)
  echo "$errs"
}

goto_module() {
  local label="$1"
  agent-browser find role button click --name "$label" > /dev/null 2>&1
  sleep 1.2
}

test_module() {
  local label="$1"
  local expected="$2"
  agent-browser errors --clear > /dev/null 2>&1
  goto_module "$label"
  local heading
  heading=$(agent-browser snapshot -c 2>/dev/null | grep -oE 'heading "[^"]+"' | head -1)
  local errors
  errors=$(agent-browser errors 2>/dev/null | grep -c . || true)
  local match="✗"
  if echo "$heading" | grep -qiE "$expected"; then match="✓"; fi
  if [ "$match" = "✓" ] && [ "$errors" -eq 0 ]; then
    PASS=$((PASS+1)); RESULTS="$RESULTS\n  ✓ $label — $heading (0 erreur)"
  elif [ "$match" = "✓" ]; then
    WARN=$((WARN+1)); RESULTS="$RESULTS\n  ⚠ $label — $heading ($errors erreurs JS)"
  else
    FAIL=$((FAIL+1)); RESULTS="$RESULTS\n  ✗ $label — attendu: '$expected', obtenu: $heading"
  fi
}

echo "=============================================="
echo " TEST E2E — ScolaGestion V4 via $BASE"
echo "=============================================="

# --- Chargement initial ---
agent-browser close > /dev/null 2>&1; sleep 1
agent-browser open "$BASE/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
sleep 3

TITLE=$(agent-browser get title 2>/dev/null)
INIT_ERRS=$(agent-browser errors 2>/dev/null | grep -c . || true)
HYDRAT=$(agent-browser console 2>/dev/null | grep -ci "hydrat" || true)
echo "Titre: $TITLE"
echo "Erreurs JS au chargement: $INIT_ERRS | Mentions hydration: $HYDRAT"
echo ""

# --- Les 16 modules (portail Direction par défaut) ---
test_module "Tableau de bord" "Tableau de bord"
test_module "Élèves" "Élèves"
test_module "Personnel" "Personnel"
test_module "Pédagogique" "Pédagogique"
test_module "Présences" "Présences"
test_module "Vie scolaire" "Vie scolaire"
test_module "Finances" "Finances|Comptabilité"
test_module "Services" "Services"
test_module "Salles & Calendrier" "Salles|Calendrier"
test_module "Examens officiels" "Examens"
test_module "RDV parents-profs" "RDV|Rendez"
test_module "Sécurité site" "Sécurité"
test_module "Communication" "Communication"
test_module "Journal d'audit" "audit|Journal"
test_module "Modules V4" "V4|failles"

echo "--- MODULES (portail Direction) ---"
echo -e "$RESULTS"
echo ""
echo "BILAN: $PASS OK / $WARN avertis. / $FAIL échecs"
