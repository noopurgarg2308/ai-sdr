FROM node:20-slim

# Prisma needs OpenSSL for PostgreSQL connections
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "npx prisma db push && npm start"]
