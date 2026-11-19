# Tests

Ce document présente la stratégie de tests de DataShare, les critères d'acceptation des fonctionnalités et la façon de lancer les tests.

Derniers résultats : **19/11/2026**, tous les tests au vert.

---

## 1. Stratégie

| Niveau                       | Outil                                                                     | Ce qui est testé                                                                                 | Nombre |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| Unitaire (back)              | JUnit 5, Mockito                                                          | Services isolés de la base : comptes, JWT, purge, gestion des erreurs                            | 15     |
| Intégration (back)           | MockMvc, Testcontainers (PostgreSQL 18 Alpine réel), Spring Security réel | Chaque route de l'API par HTTP : codes de retour, format des erreurs, contrôle d'accès, JWT réel | 42     |
| Unitaire (front)             | Vitest                                                                    | Services, guard, intercepteur, pages, layouts, fonctions utilitaires ; le back est simulé        | 83     |
| End-to-end                   | Cypress                                                                   | Parcours utilisateur dans un navigateur, avec le back-end et la base réels                       | 7      |
| Performance et accessibilité | k6, Lighthouse                                                            | Voir [PERF.md](PERF.md)                                                                          | —      |

Choix principaux :

- **Les tests d'intégration utilisent une vraie base PostgreSQL**, démarrée par Testcontainers avec la même image que l'application, plutôt qu'une base en mémoire : les requêtes, les contraintes (email unique) et les transactions sont celles de la production.
- **La sécurité est testée de bout en bout** : les tests MockMvc passent par la vraie chaîne Spring Security (filtre JWT compris), avec de vrais tokens obtenus par `POST /api/auth/login`.
- **Le parcours complet e2e vérifie le contenu du fichier téléchargé**, pas seulement l'affichage : c'est la preuve que la chaîne upload → ticket → téléchargement fonctionne réellement.

---

## 2. Lancer les tests

Prérequis : l'installation du [README](README.md). Docker doit tourner (Testcontainers).

| Tests                                           | Dossier      | Commande                                                                                   |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| Back-end (unitaires + intégration + couverture) | `back-end/`  | `./mvnw verify`                                                                            |
| Front-end (unitaires + couverture)              | `front-end/` | `npx ng test --watch=false --coverage`                                                     |
| End-to-end                                      | `front-end/` | `npm run e2e`, avec le back (`./mvnw spring-boot:run`) et le front (`npx ng serve`) lancés |

Rapports de couverture :

- back : `back-end/target/site/jacoco/index.html` ;
- front : `front-end/coverage/index.html`.
  En cas d'échec, Cypress enregistre une capture d'écran dans `front-end/cypress/screenshots/`.

---

## 3. Couverture

Le seuil de **70 %** est **imposé par l'outillage** : en dessous, la commande de test échoue.

|           | Outil                         | Seuil                                            | Lignes | Branches |
| --------- | ----------------------------- | ------------------------------------------------ | ------ | -------- |
| Back-end  | JaCoCo (`jacoco:check`)       | 70 % des lignes                                  | 93,2 % | 77,3 %   |
| Front-end | Vitest (`coverageThresholds`) | 70 % (instructions, branches, fonctions, lignes) | 95,1 % | 90,3 %   |

Sont exclus de la mesure : le code généré par Lombok (`lombok.config`), les modèles TypeScript sans logique et les fichiers de test eux-mêmes.

---

## 4. Critères d'acceptation

Chaque critère des user stories est vérifié par au moins un test automatisé.

| US                              | Critère d'acceptation                                                   | Tests                                                                                                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US03** Création de compte     | Email au bon format, avec extension de domaine                          | Back : 400 si format invalide ou sans extension · Front : validation du formulaire                                                                                                                                |
|                                 | Email unique                                                            | Back : 409 si déjà utilisé · Front : message dédié                                                                                                                                                                |
|                                 | Mot de passe de 8 caractères minimum, 72 octets maximum, hashé          | Back : 400 en dessous de 8 caractères et au-delà de 72 octets (accents compris), hash BCrypt vérifié en base · Front : validation et vérification du mot de passe                                                 |
|                                 | Message par champ invalide                                              | Back : `fieldErrors` dans la réponse 400                                                                                                                                                                          |
| **US04** Connexion              | JWT renvoyé avec les bons identifiants                                  | Back : 200 + `accessToken` · e2e : connexion réussie                                                                                                                                                              |
|                                 | Refus des mauvais identifiants, sans révéler si le compte existe        | Back : 401 identique pour un email inconnu ou un mauvais mot de passe · e2e : message d'erreur                                                                                                                    |
|                                 | Routes protégées inaccessibles sans token valide                        | Back : 401 sans token, avec un token invalide, falsifié, expiré ou signé avec une autre clé · Front : intercepteur (déconnexion sur 401) et guard · e2e : « Mon espace » sans connexion renvoie vers la connexion |
| **US01** Téléversement          | Réservé aux utilisateurs connectés                                      | Back : 401 sans token · Front : redirection d'un visiteur vers la connexion                                                                                                                                       |
|                                 | 1 Go maximum, extensions exécutables refusées                           | Back : 400 pour une extension interdite · Front : refus avant envoi (taille et extension)                                                                                                                         |
|                                 | Expiration de 1 à 7 jours                                               | Back : 400 hors limites ou non numérique                                                                                                                                                                          |
|                                 | Mot de passe facultatif (6 caractères minimum), lien de partage renvoyé | Back : 201 + token, 400 si mot de passe trop court ou trop long · Front : affichage et copie du lien · e2e : upload protégé                                                                                       |
| **US02** Téléchargement         | Informations visibles avant téléchargement                              | Back : `GET /api/download/{token}` · Front : affichage nom, taille, type, expiration                                                                                                                              |
|                                 | Mot de passe vérifié côté serveur                                       | Back : 403 sans mot de passe ou avec un mauvais · e2e : mauvais mot de passe refusé, puis bon accepté                                                                                                             |
|                                 | Erreur explicite si le lien est invalide ou expiré                      | Back : 404 et 410 · Front : messages dédiés                                                                                                                                                                       |
|                                 | Fichier réellement téléchargé                                           | Back : contenu et en-têtes vérifiés, ticket invalide ou d'un autre fichier refusé (403) · e2e : **contenu du fichier téléchargé comparé à l'original**                                                            |
| **US05** Historique             | Seul le propriétaire voit ses fichiers                                  | Back : la liste ne contient que les fichiers de l'utilisateur connecté · e2e : fichiers déposés affichés dans « Mon espace »                                                                                      |
|                                 | Fichiers expirés masqués par défaut                                     | Back : filtre `includeExpired` · Front : filtres Actifs / Tous / Expirés                                                                                                                                          |
| **US06** Suppression            | Suppression de ses propres fichiers uniquement                          | Back : 204 pour le propriétaire, 404 pour un autre utilisateur                                                                                                                                                    |
|                                 | Confirmation avant suppression                                          | Front : annulation et confirmation testées · e2e : annulation (le fichier reste), confirmation (le fichier disparaît, y compris après rechargement de la page)                                                    |
| **US10** Expiration automatique | Fichiers expirés supprimés (disque et base)                             | Back : purge des fichiers expirés, poursuite même si une suppression disque échoue                                                                                                                                |
| Transverse                      | Format d'erreur unique, sans fuite d'information                        | Back : JSON illisible, paramètre manquant et erreur inattendue (500 au message générique) au format `ErrorDetails`                                                                                                |
