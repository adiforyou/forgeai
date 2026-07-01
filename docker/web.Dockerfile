FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages ./packages

# Build
RUN pnpm run build:web

EXPOSE 3000

CMD ["pnpm", "run", "start:web"]
