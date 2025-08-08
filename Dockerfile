# Multi-stage build for production optimization

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client

# Copy package files
COPY client/package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY client/ ./
RUN npm run build

# Stage 2: Build Node.js backend
FROM node:18-alpine AS backend-build
WORKDIR /app/server

# Copy package files
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY server/ ./

# Stage 3: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy backend files
COPY --from=backend-build --chown=nodejs:nodejs /app/server ./server
COPY --from=frontend-build --chown=nodejs:nodejs /app/client/build ./client/build

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5015

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node server/healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/server.js"]
