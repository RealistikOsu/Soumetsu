FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN bun run --cwd apps/web svelte-kit sync && bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/ui packages/ui
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY --from=build /app/apps/web/build apps/web/build
COPY website-docs website-docs

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/apps/web
EXPOSE 3000
USER bun
CMD ["bun", "./build/index.js"]
