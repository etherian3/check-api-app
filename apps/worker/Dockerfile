# STAGE 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev


# STAGE 2: Production
FROM node:22-alpine AS production
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
# ENV PORT=3002
ENV REDIS_URL=redis://redis:6379

# EXPOSE 3002

CMD ["node", "src/index.js"]
 