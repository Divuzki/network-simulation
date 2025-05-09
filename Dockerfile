FROM node:18-alpine AS frontend-builder

# Set the working directory in the container
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Setup the production environment for the backend
FROM node:18-alpine AS production-image

WORKDIR /app

COPY ./server/package.json ./server/package-lock.json ./server/

RUN cd server && npm ci --only=production

COPY ./server ./server

COPY --from=frontend-builder /app/dist ./server/public

ENV NODE_ENV=production

CMD ["node", "server/index.cjs"]