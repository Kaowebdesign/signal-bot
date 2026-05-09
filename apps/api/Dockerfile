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

# Generate Prisma client
RUN yarn workspace api exec npx prisma generate --schema=../../prisma/schema.prisma

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
# Re-generate Prisma client for production node_modules
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
