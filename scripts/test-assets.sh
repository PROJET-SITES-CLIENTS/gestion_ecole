#!/usr/bin/env bash
# Simule un chargement complet : récupère le HTML, teste chaque ressource (JS/CSS)
set -u
BASE="${1:-http://localhost:3000}"
echo "=== Test complet sur $BASE ==="
HTML=$(curl -s --max-time 15 "$BASE/")
if [ -z "$HTML" ]; then echo "ERREUR: HTML vide !"; exit 1; fi
echo "HTML: $(echo "$HTML" | wc -c) octets"

# Extraire les URLs des scripts et styles
URLS=$(echo "$HTML" | grep -oE '(src|href)="[^"]+\.(js|css)[^"]*"' | sed -E 's/(src|href)="([^"]+)"/\2/' | sort -u)
COUNT=$(echo "$URLS" | wc -l)
echo "Ressources référencées: $COUNT"

FAIL=0
for u in $URLS; do
  # URL absolue ou relative ?
  case "$u" in
    http*) FULL="$u" ;;
    /*) FULL="$BASE$u" ;;
    *) FULL="$BASE/$u" ;;
  esac
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$FULL")
  if [ "$CODE" != "200" ]; then
    echo "  ❌ $CODE — $u"
    FAIL=$((FAIL+1))
  fi
done
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Toutes les ressources chargent (HTTP 200)"
else
  echo "⚠️  $FAIL ressource(s) en échec"
fi

# Vérifier aussi que le body contient bien du contenu rendu (pas juste le shell)
if echo "$HTML" | grep -q 'ScolaGestion'; then
  echo "✅ Le HTML contient le contenu SSR ('ScolaGestion')"
else
  echo "❌ Le HTML ne contient PAS le contenu de l'app !"
fi
