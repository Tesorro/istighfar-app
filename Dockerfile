# Сборка из корня монорепозитория. Контекст — корень репозитория.
FROM oven/bun:1.4.3 AS build
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api
WORKDIR /app/apps/api
ENV DATABASE_URL=postgresql://istighfar:istighfar@localhost:5432/istighfar
RUN bunx prisma generate && bun run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/main.js"]
