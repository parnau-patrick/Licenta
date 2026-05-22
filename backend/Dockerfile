# ─── Stage 1: Builder ───────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copiază fișierele de dependențe
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

# Instalează toate dependențele (inclusiv devDependencies pentru build)
RUN npm ci

# Generează Prisma Client (DATABASE_URL dummy doar pentru build, nu pentru runtime)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate

# Copiază codul sursă și buildează TypeScript
COPY src ./src
RUN npm run build

# ─── Stage 2: Runner ────────────────────────────────────────────────
FROM node:20-slim AS runner

# Instalează dependențe sistem pentru Puppeteer + Sharp
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Spune Puppeteer să folosească Chromium instalat în sistem (nu să descarce altul)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiază package.json pentru producție
COPY package*.json ./
COPY prisma ./prisma/

# Instalează DOAR dependențele de producție
RUN npm ci --omit=dev

# Generează Prisma Client în containerul de runtime
RUN npx prisma generate

# Copiază build-ul compilat din stage-ul builder
COPY --from=builder /app/dist ./dist

# Expune portul
EXPOSE 4000

# Rulează migrările și pornește serverul
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
