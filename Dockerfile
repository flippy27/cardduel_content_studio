FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json ./
RUN pnpm install --frozen-lockfile=false

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_BASE_URL=http://localhost:5000
ARG VITE_PROXY_API=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PROXY_API=$VITE_PROXY_API
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
# Template (not a static conf): the entrypoint runs envsubst at container start
# and writes /etc/nginx/conf.d/default.conf, injecting ${API_UPSTREAM}.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
