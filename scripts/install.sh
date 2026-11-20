#!/usr/bin/env bash
# Installation de DataShare.
#   ./scripts/install.sh          mode développement : base dans Docker, back et front compilés en local
#   ./scripts/install.sh --prod   mode production : toute l'application dans Docker Compose
# Vérifie les prérequis, prépare le .env, démarre PostgreSQL, puis installe l'application.
# Peut être relancé sans risque : il ne refait que ce qui manque.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { echo; echo "==> $*"; }
die()  { echo "ERREUR : $*" >&2; exit 1; }

case "${1:-}" in
  ""|--dev) MODE=dev ;;
  --prod)   MODE=prod ;;
  *)        die "option inconnue « $1 » (usage : $0 [--dev | --prod])" ;;
esac

# 1. Prérequis : Docker dans les deux modes, Java et Node seulement en développement
step "Vérification des prérequis (mode $MODE)"
tools=(docker openssl)
[ "$MODE" = dev ] && tools+=(java node npm)
for cmd in "${tools[@]}"; do
  command -v "$cmd" > /dev/null || die "$cmd n'est pas installé"
done
docker compose version > /dev/null 2>&1 || die "le plugin Docker Compose (docker compose) n'est pas installé"

if [ "$MODE" = dev ]; then
  java_major=$(java -version 2>&1 | sed -nE 's/.*version "([0-9]+).*/\1/p' | head -1)
  [ "${java_major:-0}" -ge 25 ] || die "Java 25 minimum requis (trouvé : ${java_major:-inconnu})"
  node_major=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
  [ "$node_major" -ge 22 ] || die "Node.js 22 minimum requis (trouvé : $(node -v))"
  echo "Java $java_major, Node $(node -v)"
fi
echo "$(docker compose version --short | sed 's/^/Docker Compose /')"

# 2. Fichier .env
step "Fichier .env"
if [ ! -f .env ]; then
  cp .env.example .env
  for key in DB_ADMIN_PASSWORD DB_PASSWORD JWT_SECRET; do
    sed -i "s|^$key=<secret>\$|$key=$(openssl rand -hex 32)|" .env
  done
  chmod 600 .env
  echo ".env créé à partir de .env.example, avec des secrets aléatoires"
else
  echo ".env existant conservé"
fi

set -a; source .env; set +a
for key in DB_ADMIN_USER DB_ADMIN_PASSWORD DB_USER DB_PASSWORD DB_NAME JWT_SECRET; do
  value="${!key:-}"
  [ -n "$value" ] || die "$key est absent ou vide dans .env"
  [ "$value" != "<secret>" ] || die "$key n'a pas été renseigné dans .env"
  [[ "$value" != *[\$\"\'\\]* ]] || die "$key contient un caractère interdit (\$, guillemet ou antislash)"
done
[ "$DB_USER" != "$DB_ADMIN_USER" ] || die "DB_USER et DB_ADMIN_USER doivent être différents"

# 3. Base de données
step "Démarrage de PostgreSQL"
docker compose up -d --wait db

role_exists=$(docker compose exec -T db \
  psql -U "$DB_ADMIN_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'") \
  || die "connexion impossible avec DB_ADMIN_USER : le volume a sans doute été créé avec une autre configuration (pour repartir de zéro : docker compose down -v)"
[ "$role_exists" = "1" ] \
  || die "le compte $DB_USER n'existe pas : le volume a été créé avant le script d'initialisation (pour repartir de zéro : docker compose down -v)"
echo "Base $DB_NAME prête, compte applicatif $DB_USER présent"

# 4. Application
if [ "$MODE" = prod ]; then
  step "Construction des images et démarrage de l'application"
  docker compose --profile prod up -d --build --wait

  step "Installation terminée"
  echo "Application disponible sur http://localhost:${FRONT_PORT:-8081}"
  echo "État des services : docker compose --profile prod ps"
  exit 0
fi

# Dossier de stockage des fichiers déposés, accessible au seul propriétaire
mkdir -p back-end/uploads
chmod 700 back-end/uploads

step "Compilation du back-end"
(cd back-end && ./mvnw -q -DskipTests package)

step "Installation et compilation du front-end"
(cd front-end && npm ci && npx cypress install && npx ng build)

step "Installation terminée"
cat <<'EOT'
Pour lancer l'application en développement (voir README.md) :
  1. cd back-end  && ./mvnw spring-boot:run
  2. cd front-end && npx ng serve
  3. ouvrir http://localhost:4200
EOT
