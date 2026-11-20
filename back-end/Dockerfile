# ---------- Étape 1 : compilation ----------
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /build

# Les dépendances d'abord : cette couche reste en cache tant que le pom.xml ne change pas
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline

COPY src/ src/
RUN ./mvnw -q -B -DskipTests package && cp target/datashare-backend-*.jar app.jar

# ---------- Étape 2 : exécution ----------
# Image JRE seule : ni compilateur ni code source dans l'image finale
FROM eclipse-temurin:25-jre-alpine

# Utilisateur sans privilèges, et dossier des fichiers déposés accessible à lui seul
RUN addgroup -S datashare && adduser -S -G datashare datashare \
 && mkdir -p /app/uploads && chown datashare:datashare /app/uploads && chmod 700 /app/uploads
WORKDIR /app
COPY --from=build /build/app.jar app.jar

USER datashare
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health > /dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
