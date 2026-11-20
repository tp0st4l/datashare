# Maintenance

Ce document décrit comment maintenir DataShare à jour : quelles dépendances surveiller, à quelle fréquence, avec quelle procédure, et quels risques prendre en compte.

---

## 1. Dépendances à maintenir

| Composant                                    | Version actuelle                                             | Déclarée dans                                              | Fin de support                    |
| -------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------- |
| Java (JDK)                                   | 25 (LTS)                                                     | `back-end/pom.xml` (`java.version`)                        | Version LTS : plusieurs années    |
| Spring Boot (et Spring Security, Hibernate…) | 4.1.2                                                        | `back-end/pom.xml` (parent)                                | Environ un an par version mineure |
| Bibliothèques Java hors Spring Boot          | jjwt 0.13.0, MapStruct 1.6.3, springdoc 3.2.0, JaCoCo 0.8.15 | `back-end/pom.xml`                                         | —                                 |
| Angular                                      | 22                                                           | `front-end/package.json`                                   | 18 mois par version majeure       |
| Outils de test front                         | Vitest 5, Cypress 16                                         | `front-end/package.json`                                   | —                                 |
| PostgreSQL                                   | 18 (`postgres:18-alpine`)                                    | `docker-compose.yml` et `TestcontainersConfiguration.java` | Novembre 2030                     |
| nginx                                        | 1.30, branche stable (`nginx-unprivileged:1.30-alpine`)      | `front-end/Dockerfile`                                     | Environ un an par branche         |
| Images de construction et d'exécution        | `eclipse-temurin:25` (JDK, JRE), `node:24-alpine`            | `back-end/Dockerfile`, `front-end/Dockerfile`              | Celles de Java 25 et de Node 24   |
| Outils de mesure                             | Trivy 0.76.2, k6 2.4.0, Lighthouse 13.5.0, Node 24           | `MAINTENANCE.md`, `PERF.md`, `perf/lighthouse/Dockerfile`  | —                                 |

Les versions npm sont figées par `package-lock.json`, et `npm ci` installe exactement ces versions : deux installations du projet sont identiques.

Les dates de fin de support se vérifient sur [endoflife.date](https://endoflife.date).

---

## 2. Fréquence

| Quand                                                  | Quoi                                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Immédiatement**                                      | Faille critique ou élevée sur un composant exposé (API, front, nginx) : appliquer le correctif dès qu'il existe                                                                |
| **Chaque semaine**, et avant chaque mise en production | Scan de sécurité (section 4)                                                                                                                                                   |
| **Chaque mois**                                        | Versions correctives et mineures : Spring Boot (4.1.x), Angular (22.x), bibliothèques, `docker pull` des images                                                                |
| **Deux fois par an**                                   | Versions majeures, planifiées et testées : Angular (une majeure tous les 6 mois), Spring Boot (une mineure tous les 6 mois). Vérifier que chaque composant est encore maintenu |

---

## 3. Procédures de mise à jour

### Back-end

Depuis `back-end/` :

```bash
./mvnw versions:display-parent-updates        # nouvelle version de Spring Boot ?
./mvnw versions:display-dependency-updates    # nouvelles versions des autres bibliothèques ?
```

1. Pour mettre à jour Spring Boot, changer la version du parent dans `pom.xml` : elle fixe aussi celles de Spring Security, Hibernate, Jackson, Tomcat… Pour une version mineure ou majeure, lire d'abord les notes de version (changements incompatibles, propriétés renommées).
2. Les autres bibliothèques se mettent à jour par leur propriété (`jjwt.version`, `mapstruct.version`…).

### Front-end

Depuis `front-end/` :

```bash
npm outdated                                  # dépendances en retard
npx ng update                                 # mises à jour Angular disponibles
npx ng update @angular/core @angular/cli      # mise à jour Angular avec migrations automatiques du code
npm update                                    # versions mineures et correctives des autres paquets
```

`ng update` applique les migrations prévues par l'équipe Angular. Pour une version majeure, monter d'**une seule version à la fois**, en suivant le guide officiel (update.angular.dev).

### Images Docker

```bash
docker compose pull db                                  # nouvelle version de l'image PostgreSQL
docker compose --profile prod build --pull              # reconstruit back et front sur des images de base à jour
docker compose --profile prod up -d                     # recrée les conteneurs modifiés (les données sont conservées)
```

- Le tag désigne une **branche** (`18`, `1.30`) : un `docker pull` apporte ses correctifs, sans changement de version majeure.
- Changer de version majeure de PostgreSQL demande une migration des données (`pg_dump` puis restauration), jamais un simple changement de tag.
- L'image de `docker-compose.yml` et celle des tests (`TestcontainersConfiguration.java`) doivent **toujours être identiques**.

### Après chaque mise à jour

| Vérification                   | Commande                                                  |
| ------------------------------ | --------------------------------------------------------- |
| Tests back et couverture       | `./mvnw verify`                                           |
| Tests front et couverture      | `npx ng test --watch=false --coverage`                    |
| Build et budget de performance | `npx ng build` (doit passer sans avertissement de budget) |
| Parcours end-to-end            | `npm run e2e` (back et `ng serve` lancés)                 |
| Scan de sécurité               | section 4                                                 |

Une mise à jour = **un commit** (`build(deps): Spring Boot 4.1.3`, par exemple) : en cas de régression, il suffit d'annuler ce commit.

---

## 4. Scan de sécurité

Depuis la racine du dépôt, Docker lancé :

```bash
mkdir -p docs/security ~/.cache/trivy
(cd back-end && ./mvnw -q -DskipTests package)

TRIVY="docker run --rm --user $(id -u):$(id -g) -e TRIVY_CACHE_DIR=/cache \
  -v $HOME/.cache/trivy:/cache -v $PWD:/src:ro -v $PWD/docs/security:/out \
  aquasec/trivy:0.76.2"

$TRIVY fs --scanners vuln,secret,misconfig \
  --skip-dirs /src/front-end/node_modules --skip-dirs /src/back-end/target \
  --skip-files /src/back-end/pom.xml \
  --output /out/trivy-sources.txt /src
$TRIVY rootfs --scanners vuln --output /out/trivy-back-end-jar.txt /src/back-end/target
$TRIVY image --output /out/trivy-postgres-alpine.txt postgres:18-alpine

# Images construites par le Compose (docker compose --profile prod build) : Trivy les lit via le démon Docker
TRIVY_IMG="docker run --rm --user $(id -u):$(id -g) --group-add $(stat -c %g /var/run/docker.sock) \
  -e TRIVY_CACHE_DIR=/cache -v $HOME/.cache/trivy:/cache \
  -v /var/run/docker.sock:/var/run/docker.sock -v $PWD/docs/security:/out aquasec/trivy:0.76.2"
$TRIVY_IMG image --output /out/trivy-back-image.txt datashare-back
$TRIVY_IMG image --output /out/trivy-front-image.txt datashare-front

(cd front-end && npm audit --omit=dev && npm audit)
```

- Le `pom.xml` est exclu : Trivy interrogerait Maven Central pour chaque dépendance et se ferait bloquer (erreur 429). L'analyse du `.jar` couvre les mêmes bibliothèques, avec les versions réellement embarquées.
- `npm audit --omit=dev` ne regarde que ce qui est livré au navigateur ; `npm audit` ajoute les outils de développement.

### Règles de décision

1. Vulnérabilité **corrigée en amont** (statut `fixed`) : mettre à jour la dépendance ou l'image.
2. Composant **en fin de vie** : le remplacer, même sans faille critique connue.
3. Vulnérabilité **sans correctif** : évaluer l'exposition réelle (le code concerné est-il utilisé ? accessible depuis l'extérieur ?), puis l'accepter en le documentant dans [SECURITY.md](SECURITY.md), ou changer de composant.
4. Ne jamais appliquer une correction automatique (`npm audit fix --force`) sans vérifier ce qu'elle installe : elle peut rétrograder une dépendance de plusieurs versions majeures.

---

## 5. Risques à surveiller

| Risque                                        | Exemple ou conséquence                                                                                                                                            | Prévention                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Changement incompatible d'une version majeure | Configuration Spring Security, API Angular, propriétés Spring Boot renommées                                                                                      | Lire les notes de version ; une version majeure à la fois ; tests complets                                                                      |
| Composant en fin de vie                       | nginx 1.29 n'a plus reçu de correctifs à partir de mai 2026 (241 vulnérabilités à l'analyse)                                                                      | Vérification semestrielle sur endoflife.date ; tags de branche maintenue                                                                        |
| Attaque de la chaîne d'approvisionnement      | Trivy lui-même compromis en mars 2026                                                                                                                             | Versions épinglées (outils, images), `package-lock.json`, `npm ci` ; npm ne lance plus les scripts d'installation des paquets sans autorisation |
| Évolution du schéma de la base                | Hibernate (`ddl-auto: update`) ajoute des colonnes, mais ne renomme ni ne supprime rien                                                                           | Avant une mise en production : migrations versionnées (Flyway)                                                                                  |
| Rotation des secrets                          | Changer `JWT_SECRET` déconnecte tous les utilisateurs ; changer `DB_PASSWORD` demande aussi de modifier le compte dans PostgreSQL                                 | Planifier la rotation ; changer le mot de passe en base avant le `.env`                                                                         |
| Espace disque                                 | Les fichiers déposés s'accumulent si la purge ne tourne pas : elle n'a lieu que si le back-end tourne à 3 h                                                       | Surveiller l'espace disque et les logs de purge (`Purge des fichiers expirés : N fichier(s) supprimé(s)`)                                       |
| Outils dépréciés                              | Cypress annonce la fin du navigateur Electron ; Mockito prévient que son mode d'attachement automatique ne fonctionnera plus avec les prochaines versions de Java | Voir les pistes ci-dessous                                                                                                                      |

---

## 6. Pistes d'amélioration

Les pistes liées à la sécurité sont dans [SECURITY.md](SECURITY.md) (section « Limites connues »).

| Piste                                                                      | Intérêt                                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Intégration continue (GitHub Actions) : tests, build et scan à chaque push | Les tests et le scan ne dépendent plus d'un lancement manuel ; une régression bloque la fusion                 |
| Mises à jour automatiques proposées (Dependabot ou Renovate)               | Une proposition de mise à jour testée par la CI pour chaque nouvelle version                                   |
| Migrations de base versionnées (Flyway)                                    | Évolutions du schéma maîtrisées, reproductibles et réversibles                                                 |
| Purge des fichiers expirés aussi au démarrage                              | Les fichiers expirés sont supprimés même si le serveur était arrêté à 3 h                                      |
| Liste des extensions interdites définie à un seul endroit                  | Aujourd'hui en double (front et back) : un oubli de synchronisation laisserait passer une extension côté front |
| Lancer Cypress avec Chromium                                               | Anticiper la fin du navigateur Electron                                                                        |
| Déclarer Mockito comme agent Java dans le `pom.xml`                        | Anticiper le blocage du chargement dynamique d'agents par les futures versions de Java                         |
