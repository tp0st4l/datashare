# DataShare

Application web de partage de fichiers : un utilisateur connecté dépose un fichier et obtient un lien de partage, qui permet à n'importe qui de télécharger le fichier jusqu'à sa date d'expiration.

---

## Prérequis

Testé sous Linux (Debian 13).

| Outil                       | Version                   | Vérification             |
| --------------------------- | ------------------------- | ------------------------ |
| Git                         | toute version récente     | `git --version`          |
| Docker et le plugin Compose | Docker Compose v2 ou plus | `docker compose version` |
| JDK                         | 25                        | `java -version`          |
| Node.js et npm              | testé avec Node 26        | `node -v`                |
| OpenSSL                     | toute version             | `openssl version`        |

Maven n'a pas besoin d'être installé : le dépôt contient le Maven Wrapper (`back-end/mvnw`).

---

## Installation

```bash
git clone <url-du-depot> datashare
cd datashare
./scripts/install.sh
```

Le script vérifie les prérequis, génère le fichier `.env` avec des secrets aléatoires, démarre PostgreSQL, puis compile le back-end et le front-end. Il peut être relancé sans risque.

---

## Configuration

La configuration sensible est dans le fichier `.env` à la racine, généré par le script d'installation. Il ne doit jamais être commité.

| Variable                              | Rôle                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` | Administrateur PostgreSQL, réservé à l'administration                                                                        |
| `DB_USER` / `DB_PASSWORD`             | Compte utilisé par l'application, sans droit d'administration (différent de l'administrateur)                                |
| `DB_NAME`                             | Nom de la base de données                                                                                                    |
| `JWT_SECRET`                          | Clé de signature des tokens de connexion                                                                                     |
| `API_DOCS_ENABLED`                    | `true` pour activer la documentation de l'API (Swagger UI sur http://localhost:8080/swagger-ui.html) ; désactivée si absente |

Les valeurs ne doivent contenir ni `$`, ni guillemets, ni antislash. Pour générer un secret : `openssl rand -hex 32`.

Les autres réglages (durée de connexion, taille maximale des fichiers, horaire de la purge…) sont dans `back-end/src/main/resources/application.yaml`.

---

## Lancement

### En développement

PostgreSQL doit tourner : le script d'installation le démarre, sinon `docker compose up -d` depuis la racine.

```bash
# Terminal 1 : API sur http://localhost:8080
cd back-end
./mvnw spring-boot:run

# Terminal 2 : interface sur http://localhost:4200
cd front-end
npx ng serve
```

Ouvrir **http://localhost:4200**.

### Version de production servie par nginx

Le back-end doit tourner (terminal 1 ci-dessus). Depuis `front-end/` :

```bash
npx ng build
docker run -d --rm --name datashare-front -p 8081:80 \
  --add-host=host.docker.internal:host-gateway \
  -v "$PWD/dist/front-end/browser:/usr/share/nginx/html:ro" \
  -v "$PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.29-alpine
```

Ouvrir **http://localhost:8081**. Pour arrêter : `docker stop datashare-front`.

### Arrêter

- Back-end et front-end : Ctrl+C dans leur terminal.
- PostgreSQL : `docker compose stop` depuis la racine (les données sont conservées).

---

## Utilisation

Une fois l'application lancée, ouvrir http://localhost:4200 :

- créer un compte, puis se connecter ;
- déposer un fichier depuis la page d'accueil (1 Go maximum, durée de conservation de 1 à 7 jours, mot de passe facultatif) ;
- partager le lien obtenu : il permet de télécharger le fichier sans compte jusqu'à son expiration ;
- retrouver et supprimer ses fichiers dans « Mon espace ».
