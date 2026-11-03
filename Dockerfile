# 1. Nuxt-app bouwen (statisch, ssr: false)
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm test && npx nuxt generate

# 2. PocketBase met de app in pb_public
FROM alpine:3.22
ARG PB_VERSION=0.40.6
ARG TARGETARCH
WORKDIR /pb
RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip \
         https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt \
 && grep " pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip$" checksums.txt | sha256sum -c - \
 && unzip -q pocketbase_*.zip pocketbase && rm pocketbase_*.zip checksums.txt \
 && adduser -D -H pb && mkdir pb_data && chown pb pb_data
COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks
COPY --from=web /web/.output/public ./pb_public

USER pb
VOLUME /pb/pb_data
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public", \
     "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations", "--automigrate=false"]
