#!/usr/bin/env bash
# Audits Lighthouse du front servi par nginx (build de production).
# Prérequis : back-end lancé, conteneur nginx "datashare-audit" lancé,
#             image construite avec : docker build -t datashare-lighthouse perf/lighthouse
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
RUNS="${RUNS:-3}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/audits/cli"
mkdir -p "$OUT"
rm -f "$OUT"/*.report.*

# 1. Un compte et un fichier, pour pouvoir auditer la page /download/<token>
EMAIL="lighthouse-$(date +%s)@datashare.test"
PASSWORD="Motdepasse123"
curl -sf -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null
ACCESS_TOKEN=$(curl -sf -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
FILE_TOKEN=$(echo "Fichier de test Lighthouse" | curl -sf -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@-;filename=lighthouse.txt;type=text/plain" -F expirationDays=1 \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 2. Les pages à auditer : nom|chemin
PAGES=(
  "upload|/"
  "login|/login"
  "register|/register"
  "download|/download/$FILE_TOKEN"
)

for page in "${PAGES[@]}"; do
  name="${page%%|*}"
  path="${page#*|}"
  for device in mobile desktop; do
    preset=()
    if [ "$device" = desktop ]; then preset=(--preset=desktop); fi
    for run in $(seq 1 "$RUNS"); do
      echo "→ $name $device ($run/$RUNS)"
      docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
        -v "$OUT:/audits" datashare-lighthouse "$BASE_URL$path" "${preset[@]}" \
        --only-categories=performance,accessibility,best-practices \
        --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
        --output=html --output=json --output-path="/audits/$name-$device-$run" --quiet
    done
  done
done

# 3. /my-files : page protégée, auditée par un script Puppeteer qui place le token avant l'audit
for device in mobile desktop; do
  for run in $(seq 1 "$RUNS"); do
    echo "→ my-files $device ($run/$RUNS)"
    docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
      -v "$OUT:/audits" --entrypoint node datashare-lighthouse \
      /opt/lh/my-files.mjs "$BASE_URL" "$ACCESS_TOKEN" "$device" "/audits/my-files-$device-$run"
  done
done

# 4. Résumé : passage médian de chaque page
docker run --rm -v "$OUT:/audits" -v "$ROOT/perf/lighthouse:/scripts:ro" \
  --entrypoint node datashare-lighthouse /scripts/summary.js | tee "$OUT/resume.txt"