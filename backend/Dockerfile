# Build-Stufe
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Laufzeit-Stufe
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# tsc kopiert keine .sql-Dateien – Migrationen liegen im Build daneben unter dist/db/migrations.
COPY src/db/migrations ./dist/db/migrations

EXPOSE 3000
CMD ["node", "dist/main.js"]
