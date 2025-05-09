# Stage 1: Build the frontend (React/Vite)
# Use a specific Node.js version, e.g., 18-alpine for a smaller image
FROM node:18-alpine AS frontend-builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and lock file
# Assumes these are in the root of your project for the frontend
# If using npm, change yarn.lock to package-lock.json
# COPY package.json yarn.lock ./
COPY package.json package-lock.json ./

# Install frontend dependencies
# Using --frozen-lockfile to ensure reproducible builds
# If using npm, change to: RUN npm ci
RUN npm ci
# RUN yarn install --frozen-lockfile

# Copy the rest of the frontend application code and configuration files
# This includes src/, public/, index.html, vite.config.ts, tsconfig.json, etc.
# Ensure all necessary files for the frontend build are present in the root or adjust paths.
COPY . .

# Build the frontend application
# Vite build command, output typically goes to /app/dist
# Railway can inject build-time environment variables like VITE_SOCKET_URL if needed.
# Your src/services/socketService.ts uses VITE_SOCKET_URL.
# Ensure this is set in Railway's build environment or modify socketService.ts
# to connect to the same origin in production (e.g., io('/')).
RUN npm run build

# Stage 2: Setup the production environment for the backend
FROM node:18-alpine AS production-image

WORKDIR /app

# Copy backend's package.json and lock file from the 'server' directory
# If using npm, change yarn.lock to package-lock.json
COPY ./server/package.json ./server/yarn.lock ./server/
# COPY ./server/package.json ./server/package-lock.json ./server/

# Install backend production dependencies
# Change to the server directory to run yarn install
# If using npm, change to: RUN cd server && npm ci --only=production
# RUN cd server && yarn install --production --frozen-lockfile
RUN cd server && npm ci --only=production

# Copy the backend application code from the 'server' directory
COPY ./server ./server

# Copy the built frontend assets from the frontend-builder stage
# The backend (e.g., Express in server/index.js) should be configured to serve static files
# from './public' (which will be '/app/server/public' in the container).
COPY --from=frontend-builder /app/dist ./server/public

# Environment variable for the port
# Railway provides the PORT environment variable. Your backend must listen on this port.
ENV NODE_ENV=production
# The EXPOSE instruction is documentary; Railway handles port mapping via the PORT env var.
# EXPOSE 3000 # Example, your app should use process.env.PORT

# Command to start the backend server
# This assumes your backend's entry point is 'server/index.cjs'.
# Ensure your backend (e.g., Express app) listens on process.env.PORT.
# If your server/package.json has a 'start' script (e.g., "node index.js"),
# you could use: CMD ["yarn", "--cwd", "server", "start"]
CMD ["node", "server/index.cjs"]