# =============================================================================
# GymGurus — Multi-stage Docker Build
# =============================================================================
# Stage 1 (build): Install all deps, compile TypeScript, bundle client + server
# Stage 2 (production): Minimal image with only runtime deps + built artifacts
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install build dependencies for native modules (bcryptjs, pg, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build client (Vite) and server (esbuild)
RUN npm run build

# Ensure migrations dir exists (project uses drizzle push, may have no files)
RUN mkdir -p migrations

# ---------------------------------------------------------------------------
# Stage 2: Production
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for health check and runtime native deps
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S gymgurus && \
    adduser -S gymgurus -u 1001 -G gymgurus

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist

# Copy drizzle migrations if they exist
COPY --from=build /app/migrations ./migrations

# Copy drizzle config for db:push
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

# Copy shared schema (referenced by drizzle config)
COPY --from=build /app/shared ./shared

# Set ownership to non-root user
RUN chown -R gymgurus:gymgurus /app

# Switch to non-root user
USER gymgurus

# Expose the application port
EXPOSE 5000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Health check — polls /api/health every 30s, times out after 10s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
