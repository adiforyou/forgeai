# Multi-stage Docker build for PR Reviewer Pro
# Optimized for production deployment

# Base stage - shared dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Dependencies stage - install all dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/database/package*.json ./packages/database/

RUN npm ci --only=production && \
    npm cache clean --force

# Builder stage for API
FROM base AS api-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

# Build API
RUN cd apps/api && npm run build

# Builder stage for Web
FROM base AS web-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN cd apps/web && npm run build

# Production API stage
FROM node:20-alpine AS api
RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

ENV NODE_ENV production
ENV PORT 3001

# Copy built API
COPY --from=api-builder /app/apps/api/dist ./dist
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=api-builder /app/packages/database ./packages/database

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["node", "dist/index.js"]

# Production Web stage
FROM node:20-alpine AS web
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# Copy built Next.js app
COPY --from=web-builder /app/apps/web/.next/standalone ./
COPY --from=web-builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-builder /app/apps/web/public ./apps/web/public

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
