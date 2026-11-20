# ---------- Étape 1 : build Angular ----------
FROM node:24-alpine AS build
WORKDIR /build

# Les dépendances d'abord : cette couche reste en cache tant que package-lock.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx ng build

# ---------- Étape 2 : service par nginx, sans privilèges root ----------
FROM nginx:1.30-alpine
# Exécution sans root : pas de directive user, fichier PID dans /tmp, cache appartenant à nginx
RUN sed -i '/^user /d' /etc/nginx/nginx.conf \
 && sed -i 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /var/cache/nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/front-end/browser /usr/share/nginx/html
USER nginx
EXPOSE 8080
