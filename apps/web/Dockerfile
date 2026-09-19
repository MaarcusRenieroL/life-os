# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml .
COPY turbo.json .
COPY pnpm-lock.yaml .

# Copy package files
COPY package.json .
COPY apps/web/package.json apps/web/

# Copy packages (dependencies)
COPY packages packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web/src apps/web/src
COPY apps/web/index.html apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/tailwind.config.ts apps/web/
COPY apps/web/vite.config.ts apps/web/

# Build the app
WORKDIR /app/apps/web
RUN pnpm build

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Install a simple static server
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/apps/web/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["serve", "-s", "dist", "-l", "3000"]
