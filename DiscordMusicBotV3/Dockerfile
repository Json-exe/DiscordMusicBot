# syntax=docker/dockerfile:1.7
FROM node:24-bookworm AS builder
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY src ./src
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml ./
RUN useradd --create-home --uid 10001 botuser && chown -R botuser:botuser /app
USER botuser
CMD ["node", "dist/index.js"]
