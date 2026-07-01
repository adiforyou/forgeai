FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN pnpm run build:api

EXPOSE 8080

CMD ["pnpm", "run", "start:api"]
