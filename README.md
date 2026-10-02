# Soumetsu

The RealistikOsu website. SvelteKit (Svelte 5) on Bun, client-rendered, reading from soumetsu-api.

## Layout

- `apps/web`: the site, plus a thin server layer under `src/routes/site-api` for what soumetsu-api doesn't cover.
- `packages/ui`: design tokens, base styles and motion, shared with the admin panel.

## Development

```sh
bun install
cp apps/web/.env.example apps/web/.env
bun run dev
```

The dev origin (`http://localhost:5173`) has to be in `SOUMETSUAPI_CORS_ALLOWED_ORIGINS` in soumetsu-api's `configuration/app.env`.

## Checks

```sh
bun run check
bun run lint
```

## Production

```sh
bun run build
bun run start
```
