# ---- Stage 1: Build ----
FROM node:22.12-alpine AS builder

RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.10.0

WORKDIR /app

# Copy workspace config & lockfile first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/server/package.json packages/server/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared packages/shared
COPY packages/web packages/web
COPY packages/server packages/server

# Build shared → web → server (order matters)
RUN pnpm -F @ocean-blue/shared build
RUN pnpm -F @ocean-blue/web build
RUN pnpm -F @ocean-blue/server build

# Deploy: extract server with only its production deps
RUN pnpm -F @ocean-blue/server deploy --legacy /app/deploy

# Copy build artifacts into deploy (pnpm deploy only copies source)
RUN cp -r packages/server/dist /app/deploy/dist
RUN cp -r packages/web/dist /app/deploy/web-dist

# ---- Stage 2: Production ----
FROM node:22.12-alpine AS runner

RUN apk add --no-cache openssl

# H-13: Create non-root user
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

WORKDIR /app

COPY --from=builder /app/deploy/node_modules node_modules
COPY --from=builder /app/deploy/dist dist
COPY --from=builder /app/deploy/prisma prisma
COPY --from=builder /app/deploy/web-dist web-dist
COPY --from=builder /app/deploy/package.json package.json
COPY packages/server/public public

# Generate Prisma client in production image
RUN npx prisma generate

# Create data directory and set ownership
RUN mkdir -p /data && chown -R nodeuser:nodegroup /app /data

USER nodeuser

ENV NODE_ENV=production
ENV PORT=25830
ENV DATABASE_URL=file:/data/db.sqlite3
ENV WEB_DIST_PATH=/app/web-dist

EXPOSE 25830

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
