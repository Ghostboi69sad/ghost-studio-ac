# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat python3 make g++ git

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies including devDependencies for build
RUN npm install -g npm@10.2.4 && \
    npm pkg delete scripts.prepare && \
    npm install --legacy-peer-deps

# Copy project files (excluding .env)
COPY . .

# Copy .env.production separately
COPY .env.production .env.production

# Build the application
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies for Mistral 7B
RUN apk add --no-cache curl python3 python3-pip
RUN pip3 install --no-cache-dir torch transformers

# Download Mistral 7B quantized model
RUN mkdir -p /app/models && \
    curl -L https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/mistral-7b-instruct-v0.1.Q4_K_M.gguf -o /app/models/mistral-7b-instruct-v0.1.Q4_K_M.gguf

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.env.production ./.env.production

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
