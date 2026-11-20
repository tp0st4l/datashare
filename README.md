# DataShare

Application web de partage de fichiers : un utilisateur connecté dépose un fichier et obtient un lien de partage, qui permet à n'importe qui de télécharger le fichier jusqu'à sa date d'expiration.

---

## Prérequis

Testé sous Linux (Debian 13).

| Outil                       | Version                   | Production | Développement | Vérification             |
| --------------------------- | ------------------------- | ---------- | ------------- | ------------------------ |
| Git                         | toute version récente     | oui        | oui           | `git --version`          |
| Docker et le plugin Compose | Docker Compose v2 ou plus | oui        | oui           | `docker compose version` |
| OpenSSL                     | toute version             | oui        | oui           | `openssl version`        |
| JDK                         | 25                        | non        | oui           | `java -version`          |
| Node.js et npm              | testé avec Node 26        | non        | oui           | `node -v`                |

En production, le back-end et le front-end sont compilés dans des conteneurs : ni Java ni Node ne sont nécessaires sur le serveur. En développement, Maven n'a pas besoin d'être installé : le dépôt contient le Maven Wrapper (`back-end/mvnw`).

---

## Installation et lancement en production

```bash
git clone <url-du-depot> datashare
cd datashare
./scripts/install.sh --prod
```

Le script vérifie les prérequis, génère le fichier `.env` avec des secrets aléatoires, démarre PostgreSQL, puis construit et démarre toute l'application avec Docker Compose. Il peut être relancé sans risque.

Ouvrir **http://localhost:8081** (port réglable avec `FRONT_PORT`).

| Service | Rôle                                                                                       | Accès depuis l'extérieur                     |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `front` | nginx : sert l'application Angular et transmet les appels `/api` au back-end               | port `FRONT_PORT` (8081 par défaut)          |
| `back`  | API Spring Boot ; fichiers déposés conservés dans le volume Docker `uploads`               | aucun : joignable uniquement par nginx       |
| `db`    | PostgreSQL ; données conservées dans le volume Docker `db-data`                            | aucun : port publié sur `127.0.0.1` seulement |

Commandes utiles, depuis la racine :

```bash
docker compose --profile prod ps                  # état des services
docker compose --profile prod logs -f back        # journaux du back-end
docker compose --profile prod up -d --build       # mise à jour après un git pull
docker compose --profile prod stop                # arrêt (les données sont conservées)
```

Les services redémarrent automatiquement après un redémarrage du serveur.

### HTTPS

Le Compose publie l'application en HTTP. En production, l'application doit être servie en **HTTPS**, sans quoi les tokens de connexion, les mots de passe et les fichiers circulent en clair. Deux possibilités :

1. **Reverse proxy en frontal** (nginx, Caddy ou Traefik installé sur le serveur), qui détient le certificat et transmet les requêtes à `http://127.0.0.1:8081`. Dans ce cas, publier le service `front` uniquement en local : dans `docker-compose.yml`, `"127.0.0.1:${FRONT_PORT:-8081}:8080"`.
2. **Certificat directement dans le nginx du service `front`** : monter le certificat et la clé privée dans le conteneur (volume en lecture seule), ajouter dans `front-end/nginx.conf` un bloc `server` en `listen 8443 ssl` avec `ssl_certificate` et `ssl_certificate_key`, rediriger le port HTTP vers HTTPS, puis publier le port 8443.

Dans les deux cas, le certificat peut être obtenu gratuitement auprès de Let's Encrypt (avec certbot, ou automatiquement avec Caddy), et il est conseillé d'ajouter l'en-tête `Strict-Transport-Security` pour que les navigateurs n'utilisent plus que le HTTPS.

---

## Installation et lancement en développement

```bash
./scripts/install.sh
```

Sans option, le script vérifie aussi Java et Node, démarre PostgreSQL seul dans Docker, puis compile le back-end et le front-end en local.

```bash
# Terminal 1 : API sur http://localhost:8080
cd back-end
./mvnw spring-boot:run

# Terminal 2 : interface sur http://localhost:4200, avec rechargement automatique
cd front-end
npx ng serve
```

Ouvrir **http://localhost:4200**.

Pour arrêter : Ctrl+C dans les deux terminaux, puis `docker compose stop` depuis la racine (les données sont conservées).

---

## Configuration

La configuration sensible est dans le fichier `.env` à la racine, généré par le script d'installation. Il ne doit jamais être commité.

| Variable                              | Rôle                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` | Administrateur PostgreSQL, réservé à l'administration                                                                        |
| `DB_USER` / `DB_PASSWORD`             | Compte utilisé par l'application, sans droit d'administration (différent de l'administrateur)                                |
| `DB_NAME`                             | Nom de la base de données                                                                                                    |
| `JWT_SECRET`                          | Clé de signature des tokens de connexion                                                                                     |
| `FRONT_PORT`                          | Port de publication de l'application en production (8081 par défaut)                                                         |
| `API_DOCS_ENABLED`                    | `true` pour activer la documentation de l'API en développement (http://localhost:8080/swagger-ui.html) ; toujours désactivée en production |

Les valeurs ne doivent contenir ni `$`, ni guillemets, ni antislash. Pour générer un secret : `openssl rand -hex 32`.

Les autres réglages (durée de connexion, taille maximale des fichiers, horaire de la purge…) sont dans `back-end/src/main/resources/application.yaml`.

---

## Utilisation

Une fois l'application lancée, ouvrir son adresse (http://localhost:8081 en production, http://localhost:4200 en développement) :

- créer un compte, puis se connecter ;
- déposer un fichier depuis la page d'accueil (1 Go maximum, durée de conservation de 1 à 7 jours, mot de passe facultatif) ;
- partager le lien obtenu : il permet de télécharger le fichier sans compte jusqu'à son expiration ;
- retrouver et supprimer ses fichiers dans « Mon espace ».
