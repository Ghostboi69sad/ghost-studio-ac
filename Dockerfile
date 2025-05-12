# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat python3 make g++ git

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install -g npm@10.2.4 && \
    npm pkg delete scripts.prepare && \
    npm install --legacy-peer-deps --save-dev postcss autoprefixer tailwindcss @tailwindcss/forms

# Copy project files (excluding .env)
COPY . .

# Copy .env.production separately
COPY .env.production .env.production

# Build the application
RUN NODE_ENV=production SKIP_BUILD_ERRORS=true npm run build || true
RUN cd src/app/components/course-creator && \
    npm install --legacy-peer-deps && \
    SKIP_BUILD_ERRORS=true npm run build || true && \
    cd ../course-listing && \
    npm install --legacy-peer-deps && \
    SKIP_BUILD_ERRORS=true npm run build || true

# Stage 2: Production environment
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy only the necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/.env.production ./.env.production

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
# Start command
CMD ["node", "server.js"]