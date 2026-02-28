# ── Stage 1: build the React frontend ───────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Relative API URL — Express serves both frontend and API on same origin
ARG VITE_LOCAL_API_URL=""
ENV VITE_LOCAL_API_URL=$VITE_LOCAL_API_URL

RUN npm run build

# ── Stage 2: production image ────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server/ ./server/

# Images are served from Google Cloud Storage — no local copy needed

# Cloud Run injects PORT at runtime; default 8080
EXPOSE 8080

CMD ["node", "server/index.js"]
