# ==============================================================================
# STAGE 1: Build & Invariant Verification Stage
# ==============================================================================
FROM node:22-slim AS builder

WORKDIR /app

# Install system dependencies required for native cryptographic bindings & build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation & test suites)
RUN npm ci

# Copy full monorepo source files
COPY . .

# Run the cryptographic invariant verification suites before container image sealing
RUN npx tsx scripts/verify-hdc-zkml-invariants.ts && \
    npx tsx scripts/verify-v29-singularity.ts

# ==============================================================================
# STAGE 2: Bare-Metal Production Runtime Stage
# ==============================================================================
FROM node:22-slim AS runner

WORKDIR /app

# Set production environment flags for maximum V8 performance and memory tuning
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=16384 --enable-source-maps"

# Create non-privileged system user for secure bare-metal execution
RUN groupadd --system --gid 1001 sovereign && \
    useradd --system --uid 1001 --gid sovereign sovereign

# Copy package manifests and production dependencies from builder
COPY --chown=sovereign:sovereign package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled source files and orchestrator modules from builder
COPY --chown=sovereign:sovereign --from=builder /app/include ./include
COPY --chown=sovereign:sovereign --from=builder /app/packages ./packages
COPY --chown=sovereign:sovereign --from=builder /app/scripts ./scripts
COPY --chown=sovereign:sovereign --from=builder /app/src ./src
COPY --chown=sovereign:sovereign --from=builder /app/formal ./formal
COPY --chown=sovereign:sovereign --from=builder /app/README.md ./README.md

USER sovereign

EXPOSE 3000

# Execute the Sovereign Command Center and 8-Stage Closed-Loop Orchestrator
CMD ["npm", "run", "dev"]
