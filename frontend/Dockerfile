# =============================================================================
# Frontend  Multi-stage build
# Stage 1: Build the React application
# Stage 2: Serve with nginx on port 8080 (rootless Podman compatible)
# =============================================================================

#  Stage 1: Build 
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build

#  Stage 2: Serve 
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration (listens on 8080, not 80)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Rootless Podman: nginx needs to bind to non-privileged port 8080
# and write to /var/cache/nginx and /var/run
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
