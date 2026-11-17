#!/bin/bash
# Exécuté automatiquement par l'image postgres au premier démarrage (volume vide),
# avec le compte administrateur. Crée le compte applicatif, limité à la base DB_NAME.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$DB_USER" -v app_password="$DB_PASSWORD" -v db_name="$POSTGRES_DB" <<'SQL'
-- Un compte qui peut se connecter, sans aucun pouvoir d'administration
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- Seuls les comptes autorisés peuvent se connecter à la base
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db_name" TO :"app_user";

-- L'application crée et fait évoluer ses tables (Hibernate ddl-auto: update)
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
SQL