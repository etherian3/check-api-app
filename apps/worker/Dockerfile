# STAGE 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev


# STAGE 2: Production
FROM node:22-alpine AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001
ENV REDIS_URL=redis://redis:6379

EXPOSE 3001

CMD ["node", "src/index.js"]
 