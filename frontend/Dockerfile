# Build-Stufe
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts vitest.config.ts index.html tailwind.config.js postcss.config.js ./
# proxy.mjs wird bereits hier kopiert, damit die Laufzeit-Stufe sie per
# COPY --from=build übernehmen kann (sonst scheitert der Image-Build).
COPY proxy.mjs ./
COPY src ./src
COPY test ./test
RUN npm run build

# Laufzeit-Stufe: statische Auslieferung des Builds inkl. /api-Reverse-Proxy
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/proxy.mjs ./proxy.mjs

EXPOSE 80
CMD ["node", "proxy.mjs"]
