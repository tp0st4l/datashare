# ---------- Étape 1 : build Angular ----------
FROM node:24-alpine AS build
WORKDIR /build

# Les dépendances d'abord : cette couche reste en cache tant que package-lock.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx ng build

# ---------- Étape 2 : service par nginx, sans privilèges root ----------
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/front-end/browser /usr/share/nginx/html
EXPOSE 8080
