FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo root manifests
COPY package.json yarn.lock ./
COPY prisma/package.json ./prisma/
COPY apps/api/package.json ./apps/api/

# Install all deps (needed for prisma generate + nest build)
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy source
COPY prisma ./prisma
COPY apps/api ./apps/api

# Generate Prisma client (use local version, not npx download)
RUN node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# Build NestJS
RUN yarn workspace api build

# ── Production image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock ./
COPY prisma/package.json ./prisma/
COPY apps/api/package.json ./apps/api/

# Production deps only
RUN yarn install --frozen-lockfile --ignore-scripts --production

COPY prisma ./prisma

# Copy already-generated Prisma client from builder (same Node version, no need to regenerate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
