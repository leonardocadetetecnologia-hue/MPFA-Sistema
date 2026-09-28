# syntax=docker/dockerfile:1
# Single multi-stage build for every runtime image. Pick one with --target:
#   api | worker | web | migrate
# Images carry no configuration: everything comes from environment at runtime.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
# openssl is required by the Prisma query engine (debian-openssl-3.0.x).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/logger/package.json packages/logger/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build

FROM build AS prod-deps
RUN npm prune --omit=dev --no-audit --no-fund

# One-off job: applies pending migrations (`prisma migrate deploy`) and exits.
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "migrate:deploy", "-w", "@mpfa/database"]

FROM base AS api
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 3001
# Liveness only: a database outage must surface via /health/ready, not restart loops.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "apps/api/dist/main.js"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "apps/worker/dist/healthcheck.js"]
CMD ["node", "--enable-source-maps", "apps/worker/dist/main.js"]

FROM base AS web
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Standalone bundle already includes .next/static (copied by the web build script).
COPY --from=build /app/apps/web/.next/standalone ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
