# Stage 1 — build Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN NODE_OPTIONS="--max_old_space_size=4096" npm run build -- --configuration=production

# Stage 2 — serve with nginx on port 7860 (HF Spaces default)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Angular 17 outputs to dist/<name>/browser/
COPY --from=builder /app/dist/flagstone-intelligence/browser /usr/share/nginx/html
EXPOSE 7860
CMD ["nginx", "-g", "daemon off;"]
