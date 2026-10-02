# Soumetsu

The website for [RealistikOsu](https://ussr.pl), an osu! private server. Profiles, leaderboards, beatmaps, clans, supporter perks, docs and the RealistikPanel admin panel, all in one SvelteKit app.

It's the frontend for [soumetsu-api](https://github.com/RealistikOsu/soumetsu-api).

## Quick Start

You'll need [Bun](https://bun.sh), soumetsu-api running locally, and a MySQL database and Redis with RealistikOsu's schema.

```bash
bun install
cp apps/web/.env.example apps/web/.env   # then fill it in
bun run dev
```

Open `http://localhost:5173`. Add that address to `SOUMETSUAPI_CORS_ALLOWED_ORIGINS` in soumetsu-api so the browser can reach it.

## Commands

| Command | Description |
|--------|-------------|
| `bun run dev` | Start the dev server |
| `bun run check` | Type-check |
| `bun run lint` | ESLint and Prettier |
| `bun run format` | Fix formatting |
| `bun run build` | Production build |
| `bun run start` | Run the production build |

## Deploying

```bash
docker build -t soumetsu .
```

Every setting comes from the environment, and `apps/web/.env.example` lists them all. Put nginx in front: `/api/v2` goes to soumetsu-api, `/api/v1/statistics` and `/api/v1/profile-history` go to the statistics service, and everything else comes here.

## Translating

The site is in English, Russian, Polish and Hungarian. Strings live in `apps/web/messages/<language>/`. To add a language, copy the `en` folder, translate it, and add the language code to `apps/web/project.inlang/settings.json`.

Doc pages live in `website-docs`. Put a translated copy in a language folder, e.g. `website-docs/ru`.
