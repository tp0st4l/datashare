FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium \
 && rm -rf /var/lib/apt/lists/*

# Lighthouse (ligne de commande + bibliothèque) et Puppeteer, installés dans /opt/lh
WORKDIR /opt/lh
RUN npm init -y > /dev/null \
 && npm install lighthouse@13.5.0 puppeteer-core
ENV PATH=/opt/lh/node_modules/.bin:$PATH
COPY my-files.mjs /opt/lh/

ENV CHROME_PATH=/usr/bin/chromium
WORKDIR /audits
ENTRYPOINT ["lighthouse"]