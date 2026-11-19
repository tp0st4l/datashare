# Sécurité

Ce document décrit les mesures de sécurité de DataShare, les résultats du dernier scan des dépendances et les décisions prises, ainsi que les limites connues.

Dernier scan : **19/11/2026**.

---

## 1. Mesures en place

### Authentification

| Mesure                           | Détail                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mots de passe des comptes        | Hashés et salés avec **BCrypt** ; jamais stockés ni renvoyés en clair                                                   |
| Session                          | **JWT** signé en HS512, valable **1 heure**, sans état côté serveur (`SessionCreationPolicy.STATELESS`)                 |
| Clé de signature                 | `JWT_SECRET`, générée aléatoirement par `scripts/install.sh` (`openssl rand -hex 32`), stockée dans `.env`              |
| Token invalide, expiré ou absent | **401** sans corps ; le front supprime le token et renvoie vers la page de connexion                                    |
| Identifiants incorrects          | Même message que l'email existe ou non (« Email ou mot de passe incorrect »), pour ne pas révéler les comptes existants |

### Contrôle d'accès

| Ressource                                    | Règle                                                                                                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/files/**` (liste, upload, suppression) | Utilisateur connecté uniquement                                                                                                                                             |
| Fichier d'un autre utilisateur               | **404**, comme un fichier inexistant : on ne confirme pas son existence                                                                                                     |
| `/api/download/**`                           | Public, mais seulement avec le token du lien de partage                                                                                                                     |
| Fichier protégé par mot de passe             | Le mot de passe (hashé avec BCrypt) est vérifié **côté serveur** avant de délivrer un ticket de téléchargement                                                              |
| Ticket de téléchargement                     | JWT valable **60 secondes**, lié à **un seul fichier** et marqué `type=download` : il ne peut servir ni pour un autre fichier, ni comme token de connexion (et inversement) |
| Swagger UI et `/v3/api-docs`                 | **Désactivés par défaut** (`API_DOCS_ENABLED`), à n'activer qu'en développement                                                                                             |
| Actuator                                     | Seul `/actuator/health` est exposé                                                                                                                                          |

### Liens de partage et fichiers

| Mesure              | Détail                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Token du lien       | 24 octets aléatoires (`SecureRandom`), soit 192 bits : impossible à deviner ou à énumérer                                                  |
| Taille              | 1 Go maximum (front et back) ; au-delà, **413**                                                                                            |
| Extensions refusées | `exe`, `bat`, `cmd`, `com`, `msi`, `scr`, `sh`, `ps1`, `vbs`, `jar` (front et back)                                                        |
| Nom sur le disque   | UUID aléatoire : le nom d'origine n'est jamais utilisé comme chemin, ce qui empêche toute sortie du dossier de stockage                    |
| Téléchargement      | `Content-Disposition: attachment` et `application/octet-stream` : le navigateur enregistre le fichier sans jamais l'exécuter ni l'afficher |
| Dossier de stockage | `back-end/uploads/`, en `chmod 700` (accessible au seul propriétaire)                                                                      |
| Expiration          | De 1 à 7 jours ; un fichier expiré renvoie **410** et est supprimé (disque + base) par la purge quotidienne de 3 h                         |

### Validation des données

- Toutes les entrées sont validées **côté client et côté serveur** : format de l'email (avec extension de domaine), longueur des mots de passe, durée d'expiration, fichier.
- Les mots de passe sont limités à **72 octets UTF-8**, la limite de BCrypt : au-delà, Spring Security refuse de les hasher (correctif de la CVE-2025-22228). Un mot de passe plus long est refusé avec un 400 à l'inscription et à l'upload, et avant toute vérification BCrypt à la connexion (401) et au ticket (403).

### Erreurs

- Toutes les erreurs suivent le même format (`ErrorDetails` : date, message, route, et détail par champ pour les 400).
- Une erreur inattendue renvoie un **500 avec un message générique** ; le détail (exception, trace) n'est écrit que dans les logs du serveur.
- Les réponses portent les en-têtes de sécurité de Spring Security : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`.

### Base de données et configuration

| Mesure                  | Détail                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deux comptes PostgreSQL | `DB_ADMIN_USER` (superutilisateur, administration) et `DB_USER` (application, **sans droit d'administration** : ne peut créer ni base ni rôle). Vérifié : `CREATE DATABASE` → « permission denied » |
| Réseau                  | Port 5432 publié uniquement sur `127.0.0.1` : la base n'est pas joignable depuis le réseau                                                                                                          |
| Requêtes                | Spring Data JPA, requêtes paramétrées : pas de SQL construit par concaténation                                                                                                                      |
| Secrets                 | Dans `.env`, généré avec des valeurs aléatoires, en `chmod 600`, **jamais commité** (`.gitignore`). Aucun secret détecté dans le dépôt par le scan                                                  |

---

## 2. Scan de sécurité

Outils : **Trivy 0.76.2** (dépendances Java du `.jar`, dépendances npm, secrets, configuration Docker, images utilisées) et **`npm audit`**. La version de Trivy est épinglée : Trivy a lui-même été compromis en mars 2026 (CVE-2026-33634), et épingler une version connue évite de recevoir une version piégée sans le savoir.

Rapports complets : [`docs/security/`](docs/security/). Procédure et fréquence du scan : [MAINTENANCE.md](MAINTENANCE.md).

### Résultats et décisions

| Cible                                                       | Résultat                          | Analyse et décision                                                                                                                                                                         |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Back-end (`.jar` : Spring Boot et toutes ses bibliothèques) | **0**                             | —                                                                                                                                                                                           |
| Front-end (dépendances npm de production)                   | **0**                             | —                                                                                                                                                                                           |
| Secrets dans le dépôt                                       | **0**                             | —                                                                                                                                                                                           |
| Image `nginx:1.30-alpine`                                   | **11** moyennes                   | Acceptées : aucune critique ni élevée ; corrigées au fil des mises à jour de l'image (`docker pull`)                                                                                        |
| Image `postgres:18-alpine` : paquets système                | **10** moyennes                   | Acceptées : même raison ; la base n'écoute que sur `127.0.0.1`                                                                                                                              |
| Image `postgres:18-alpine` : `gosu`                         | **61** (bibliothèque standard Go) | Acceptées : `gosu` ne sert qu'au démarrage du conteneur, et ses mainteneurs ne le reconstruisent pas pour des failles qui ne s'appliquent pas à son usage (vérification avec `govulncheck`) |
| `perf/lighthouse/Dockerfile`                                | 1 faible : pas de `HEALTHCHECK`   | Acceptée : outil d'audit lancé ponctuellement, qui s'arrête de lui-même                                                                                                                     |

### Corrections apportées à la suite du scan

- **nginx** : la branche 1.29 était en fin de vie (plus de correctifs depuis le 13/05/2026), avec 241 vulnérabilités dont 1 critique. Passage à la branche stable maintenue 1.30.
- **PostgreSQL** : l'image Debian comptait 473 vulnérabilités système (1 critique, 123 élevées), presque toutes sans correctif disponible. Passage à la variante Alpine, même version de PostgreSQL. Les tests d'intégration utilisent la même image.
- **Image d'audit Lighthouse** : elle s'exécutait en root ; elle utilise désormais l'utilisateur `node`.
- **`npm audit`** : 13 alertes sur `picomatch`, outil de développement uniquement, avec des motifs de fichiers écrits par le développeur. La correction automatique (`npm audit fix --force`) aurait installé Angular CLI 16 (2023) et cassé le projet : aucune action, l'alerte a disparu à la mise à jour de la base de vulnérabilités.

---

## 3. Limites connues

| Limite                                                 | Risque                                                                   | Piste                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Fichiers stockés **en clair** sur le disque            | Lisibles par quiconque accède au serveur ou à ses sauvegardes            | Chiffrement du disque en production. Le chiffrement applicatif (AES-GCM) n'a pas été retenu : complexité et gestion des clés |
| **HTTP** en développement                              | Token et fichiers interceptables sur le réseau                           | En production : HTTPS obligatoire derrière un reverse proxy (nginx avec certificat)                                          |
| JWT stocké dans le `localStorage`                      | Lisible par un script en cas de faille XSS                               | Angular échappe tout contenu affiché par défaut. Alternative : cookie `HttpOnly` + protection CSRF                           |
| Pas de limitation du nombre de tentatives de connexion | Attaque par force brute sur un compte                                    | Limitation par IP sur `/api/auth/login` (reverse proxy ou filtre applicatif)                                                 |
| JWT non révocable avant expiration                     | Un token volé reste valable jusqu'à 1 heure                              | Durée courte + liste de révocation ou refresh tokens                                                                         |
| Ticket de téléchargement réutilisable pendant 60 s     | Un ticket intercepté permet de retélécharger le fichier pendant ce délai | Ticket à usage unique enregistré en base                                                                                     |
| Pas d'analyse antivirus des fichiers déposés           | Partage de fichiers malveillants (hors extensions refusées)              | Analyse à l'upload (ClamAV)                                                                                                  |
