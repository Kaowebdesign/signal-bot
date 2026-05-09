FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo root manifests
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/

RUN yarn install --frozen-lockfile --ignore-scripts

COPY apps/web ./apps/web

# Build args passed at docker compose build time
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

RUN yarn workspace web build

# ── Serve with nginx ──────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx config is injected by the main nginx container — this image
# only serves the static files on port 80 internally.
# Override default config to support SPA routing (fallback to index.html)
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
