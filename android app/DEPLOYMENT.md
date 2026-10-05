# Production Deployment Guide — WatchTogether

## Hosting the Signaling Backend

The signaling server requires persistent WebSocket connections. Deployment options include VPS (DigitalOcean, AWS EC2), Render, Railway, or Fly.io.

### Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

Build & run Docker container:

```bash
docker build -t watchtogether-server .
docker run -d -p 8080:8080 --env-file .env watchtogether-server
```

---

## Domain & SSL/TLS Configuration

WebRTC and WebSockets require secure HTTPS and WSS connections in production:

- **HTTPS Domain**: `https://api.watchtogether.app`
- **WSS Endpoint**: `wss://api.watchtogether.app/ws`
- **Nginx Reverse Proxy**: Route `/ws` to target port with `Upgrade` and `Connection` headers set.
