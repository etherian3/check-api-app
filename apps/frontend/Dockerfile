# STAGE 1: Deps 
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

# STAGE 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# STAGE 3: Production image & Copy 
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]