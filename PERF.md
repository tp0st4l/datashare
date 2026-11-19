# Performance

Ce document présente le budget de performance du front-end, les résultats des mesures (navigateur et serveur) et les optimisations possibles.

Dernières mesures : **17/11/2026** (Lighthouse) et **19/11/2026** (k6 et logs du back-end).

---

## 1. Budget de performance

### Front-end

| Indicateur                               | Budget                                              | Mesuré                       | Contrôle                                                   |
| ---------------------------------------- | --------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Bundle initial (JS + CSS, non compressé) | avertissement à 350 Ko, **échec du build à 500 Ko** | **296 Ko** (79 Ko compressé) | `budgets` dans `angular.json`, vérifié à chaque `ng build` |
| CSS d'un composant                       | avertissement à 4 Ko, échec à 8 Ko                  | sous 4 Ko                    | idem                                                       |
| Score Lighthouse Performance             | ≥ 90 en mobile                                      | 94 à 96                      | `perf/lighthouse/audit.sh`                                 |
| Score Lighthouse Accessibilité           | 100                                                 | 100                          | idem                                                       |
| Largest Contentful Paint (mobile simulé) | ≤ 3 s                                               | 2,3 à 2,7 s                  | idem                                                       |
| Total Blocking Time (mobile simulé)      | ≤ 200 ms                                            | ≤ 50 ms                      | idem                                                       |
| Cumulative Layout Shift                  | ≤ 0,1                                               | ≤ 0,03                       | idem                                                       |

Chaque page est un fichier séparé, chargé à la demande (lazy loading) : de 1,3 à 3 Ko compressés par page, en plus du bundle initial.

### Back-end

| Indicateur                                              | Budget     | Mesuré (p95) | Contrôle                                       |
| ------------------------------------------------------- | ---------- | ------------ | ---------------------------------------------- |
| Informations d'un fichier (`GET /api/download/{token}`) | < 300 ms   | 2,8 ms       | seuils k6 : le test échoue s'ils sont dépassés |
| Ticket (`POST /api/download/{token}/ticket`)            | < 300 ms   | 2,7 ms       | idem                                           |
| Téléchargement d'un fichier de 1 Mo                     | < 1 000 ms | 3,9 ms       | idem                                           |
| Taux d'erreur sous charge                               | < 1 %      | 0 %          | idem                                           |

---

## 2. Performance dans le navigateur (Lighthouse)

### Méthode

- Build de **production** servi par **nginx** (compression gzip), comme en production. Le serveur de développement (`ng serve`) n'est pas représentatif : il sert un JavaScript non minifié de 1,95 Mo au lieu de 281 Ko.
- Lighthouse 13.5 et Chromium dans un conteneur Docker, **sur la machine qui héberge l'application** : aucun réseau entre le navigateur et le serveur ne fausse les mesures.
- 5 pages × mobile et desktop × **3 passages**, en gardant le passage au score médian. La page « Mon espace », qui exige d'être connecté, est auditée avec un script Puppeteer qui place le token avant l'audit.
- Le mode mobile simule un téléphone moyen sur une 4G lente (processeur 4 fois plus lent).

### Résultats

| Page                | Mobile | Desktop | Accessibilité | Bonnes pratiques |
| ------------------- | ------ | ------- | ------------- | ---------------- |
| Téléversement (`/`) | 94     | 100     | 100           | 100              |
| Connexion           | 96     | 100     | 100           | 100              |
| Inscription         | 96     | 100     | 100           | 100              |
| Téléchargement      | 95     | 100     | 100           | 100              |
| Mon espace          | 94     | 100     | 100           | 100              |

Détail par page (FCP, LCP, TBT, CLS) : [`docs/audits/cli/resume.txt`](docs/audits/cli/resume.txt).

### Interprétation

- **Desktop : 100 partout.**
- **Mobile : 94 à 96.** Les points perdus viennent du premier affichage (FCP ≈ 2,2 s) sur la 4G lente simulée : le navigateur attend le CSS global (3 Ko compressés) et télécharge deux polices depuis Google Fonts.
- Le CSS est volontairement chargé de façon bloquante. Chargé en différé, il provoquait un décalage de toute la page à son arrivée (CLS jusqu'à 0,32). Le délai d'affichage a été préféré à une page qui saute.
- Le lazy loading a réduit le bundle initial de 350 à 281 Ko (de 91 à 76 Ko compressés), ce qui ramène le temps de blocage mobile sous 50 ms.

---

## 3. Performance du serveur

### Test de charge (k6)

**Scénario** (`perf/download.k6.js`) : le parcours de téléchargement d'un fichier de 1 Mo (informations → ticket → fichier), répété par des utilisateurs virtuels qui marquent une pause d'1 seconde entre deux parcours. Montée à **20 utilisateurs simultanés** en 30 s, palier d'1 minute, puis descente.

**Résultats** ([`perf/resultat-download.txt`](perf/resultat-download.txt)) :

| Étape          | Moyenne | p95    | Max   |
| -------------- | ------- | ------ | ----- |
| Informations   | 1,7 ms  | 2,8 ms | 12 ms |
| Ticket         | 1,4 ms  | 2,7 ms | 9 ms  |
| Fichier (1 Mo) | 2,6 ms  | 3,9 ms | 14 ms |

4 974 requêtes (47 par seconde), **0 erreur**, 1,7 Go transférés (16 Mo/s). Tous les seuils sont tenus.

### Métriques journalisées par le back-end

Le back-end journalise, pour chaque appel à l'API, la méthode, la route, le code HTTP et le temps de réponse ; et, pour chaque dépôt et téléchargement, la taille du fichier. Le token des liens de partage est masqué dans les logs et le ticket n'y apparaît jamais.

Extrait pendant le test de charge ([`perf/extrait-logs-back.txt`](perf/extrait-logs-back.txt)) :

```
RequestMetricsFilter : POST /api/files 201 71 ms
FileService          : Dépôt du fichier 5 : 1048576 octets, expiration dans 1 jour(s)
RequestMetricsFilter : GET /api/download/{token} 200 3 ms
RequestMetricsFilter : POST /api/download/{token}/ticket 200 3 ms
DownloadController   : Téléchargement du fichier 5 : 1048576 octets
RequestMetricsFilter : GET /api/download/{token}/file 200 7 ms
```

Synthèse calculée à partir de ces logs ([`perf/metriques-logs.txt`](perf/metriques-logs.txt)) :

| Route                                   | Requêtes | Moyenne | Max    |
| --------------------------------------- | -------- | ------- | ------ |
| `GET /api/download/{token}`             | 1 657    | 1,0 ms  | 11 ms  |
| `POST /api/download/{token}/ticket`     | 1 657    | 0,5 ms  | 7 ms   |
| `GET /api/download/{token}/file` (1 Mo) | 1 657    | 2,2 ms  | 14 ms  |
| `POST /api/files` (1 Mo)                | 1        | 71 ms   | 71 ms  |
| `POST /api/auth/login`                  | 1        | 136 ms  | 136 ms |
| `POST /api/auth/register`               | 1        | 372 ms  | 372 ms |

### Interprétation

- **Le téléchargement est rapide et stable** : le fichier est envoyé en flux depuis le disque, sans être chargé en mémoire, et son temps varie peu sous charge.
- **L'inscription et la connexion sont plus lentes, et c'est voulu** : BCrypt est conçu pour être coûteux, afin de ralentir les attaques par force brute. Ce coût (environ 100 ms par vérification) ne concerne qu'une opération par session. Les premières requêtes sont aussi ralenties par le démarrage à chaud de Java : c'est la cause du maximum de 403 ms mesuré par k6, sur les toutes premières requêtes.
- Les temps mesurés par le serveur sont inférieurs à ceux de k6 : la différence correspond au trajet réseau local et au traitement côté client.

### Limites des mesures

- k6 et le back-end tournent sur **la même machine** : les temps mesurés sont ceux du serveur seul, sans réseau réel.
- Le fichier téléchargé est servi depuis le cache disque du système, ce qui est un cas favorable.
- C'est un test de **charge nominale** : le débit est fixé par la pause d'1 seconde des utilisateurs virtuels, et le serveur n'a pas été saturé. La limite de capacité n'a pas été recherchée.

---

## 4. Environnement de mesure

| Élément   | Valeur                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------ |
| Machine   | VM Debian 13, 4 Go de RAM                                                                        |
| Back-end  | Spring Boot 4.1, Java 25, PostgreSQL 18 (Docker)                                                 |
| Front-end | build de production servi par nginx 1.30 (Docker), compression gzip                              |
| Outils    | k6 (image Docker `grafana/k6`), Lighthouse 13.5 + Chromium (image Docker `datashare-lighthouse`) |

Relancer les mesures, depuis la racine du dépôt, avec le back-end lancé :

```bash
# Test de charge
docker run --rm --network host -v "$PWD/perf:/perf" grafana/k6:latest run -q /perf/download.k6.js \
  | tee perf/resultat-download.txt

# Audits Lighthouse (le build de production doit être servi par nginx sur le port 8081, voir README)
docker build -t datashare-lighthouse perf/lighthouse
./perf/lighthouse/audit.sh
```

---

## 5. Optimisations possibles

| Optimisation                                                                                        | Gain attendu                                                                                                                   | Effort |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Héberger les polices avec l'application au lieu de Google Fonts                                     | Une connexion à un autre domaine en moins : premier affichage mobile plus rapide. Plus aucune requête vers Google (vie privée) | Faible |
| En-têtes de cache dans nginx pour les fichiers JS et CSS (leurs noms changent à chaque build)       | Visites suivantes presque instantanées : plus rien à retélécharger                                                             | Faible |
| Compression Brotli en plus de gzip                                                                  | Fichiers JS et CSS environ 15 à 20 % plus légers                                                                               | Faible |
| Test de stress k6 (sans pause, fichiers de 100 Mo)                                                  | Connaître la capacité maximale et vérifier que la mémoire reste stable pendant les téléchargements                             | Moyen  |
| Servir les fichiers directement par nginx (`X-Accel-Redirect`) après le contrôle d'accès par Spring | Libère les threads Java pendant les gros téléchargements                                                                       | Moyen  |
| Stockage objet (S3 ou équivalent) avec liens signés                                                 | Téléchargements servis sans passer par le serveur ; stockage illimité                                                          | Élevé  |
