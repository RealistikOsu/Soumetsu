# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Soumetsu, the RealistikOsu website (an osu! private server), including the RealistikPanel admin panel at `/admin`. It replaces Hanayo (Go, server-rendered) and the old Python RealistikPanel.

SvelteKit 2 with Svelte 5 runes, on Bun, built with `svelte-adapter-bun`. **SSR is off**: pages render in the browser and fetch their own data. Most data comes from [soumetsu-api](https://github.com/RealistikOsu/soumetsu-api). A thin server layer in the same app (`/site-api`) covers what the API doesn't.

## Commands

Run from the repo root (a Bun workspace: `apps/web` and `packages/ui`).

```bash
bun install                 # also runs prisma generate (postinstall)
bun run dev                 # http://localhost:5173
bun run check               # paraglide compile + svelte-kit sync + svelte-check
bunx eslint .
bunx prettier --write apps packages
bun run build               # prisma generate + vite build
```

Run check, eslint and prettier before every commit. All of them must be clean.

Needs `apps/web/.env` (copy `.env.example`). `config.ts` throws on missing `API_URL`, `DATABASE_URL`, `REDIS_URL` or `APP_BASE_URL`, except during `vite build`, which loads every route to analyse it without a runtime environment.

No test suite. To check UI, drive the dev server with Playwright. A throwaway script under `test-results/` (gitignored) can resolve the repo's `playwright`. Set `localStorage['soumetsu.token']` to log in, and the `PARAGLIDE_LOCALE` cookie to switch language. Never leave scripts in the repo root.

## Architecture

### Layout

- `apps/web/src/routes`: pages. The route groups are `(admin)` (staff panel, its own layout and `admin.css`), `(member)` (needs login) and `(guest)` (login, register, password reset).
- `apps/web/src/routes/site-api/**/+server.ts`: the server layer, one endpoint per file. **A `+server.ts` may only export HTTP verb handlers**, so put shared helpers in `src/server`.
- `apps/web/src/server`: server-only code (`$server` alias): `config`, `db` (Prisma with the MariaDB adapter), `redis` (ioredis, `lazyConnect`), `respond`, `auth`, `admin/*`.
- `apps/web/src/lib`: API clients (`lib/api/*`), components, and shared helpers (`format`, `modes`, `grades`, `mods`, `i18n`, `preferences`, `bbcode`, `docs`).
- `packages/ui`: design tokens, base CSS, motion, and shared bits like `ChartOverlay`, `CountUp`, `inView` and `tabInk`.
- `website-docs/<lang>/*.md`: the `/doc` pages, read from disk per request.

### Talking to services

| Service | Client | Notes |
| --- | --- | --- |
| soumetsu-api `/api/v2` | `api` in `lib/api/client.ts` | Envelope `{ status, data }`. Errors become `ApiError(status, code)`, and `describe()` in `lib/api/messages.ts` turns codes into text. |
| Site server layer `/site-api` | `siteApi` | Same envelope. Handlers wrap in `handle()` and throw `Failure(status, code)`. |
| Statistics service `/api/v1` | `lib/api/v1.ts` | Online count, profile rank/pp history, peak rank. Only exists behind nginx, so it's empty in dev. Refuses players restricted or inactive for over 60 days (`users.is_not_active`). |
| Beatmap mirror | `lib/api/mirror.ts` | Called directly from the browser via `PUBLIC_MIRROR_URL`. It must send CORS headers. |
| Bancho, score service, performance service | `src/server/*` | Server only. Online status is `GET {BANCHO_URL}/api/status/{id}` (200 means online). |
| Game servers, mirror | Redis pub/sub | `peppy:disconnect`, `peppy:ban`, `peppy:refresh_privs`, `peppy:change_username`, `ussr:refresh_bmap`, `rosu:clan_update`, and `beatmap:delete` (set ID) for the mirror when an uploaded set is deleted. |

Data fetching in components goes through `query()` (`lib/api/query.svelte.ts`). It aborts on rerun and exposes `reload()`. Never create a `query()` inside an event handler: it sets up an effect, which throws outside component init.

### Auth and privileges

- The login token lives in `localStorage` (`soumetsu.token`) and is sent as a Bearer header. `session` (`lib/auth/session.svelte.ts`) holds the logged-in user.
- Server endpoints call `requireCaller` or `requirePrivilege(request, flag)`. These validate the token against soumetsu-api, then **re-read privileges from MySQL**, since the session's copy is a snapshot from login.
- The privilege bits in `lib/auth/privileges.ts` match RealistikPanel's `2 << n` values. Admin endpoints check the same bit the old panel route checked, and `lib/admin.ts` maps each panel section to its bit.

### Database

The Prisma schema in `apps/web/prisma/schema.prisma` maps the **existing prod database**, trimmed to the models the server layer uses. Don't add columns or tables the game servers don't have; prod will lack them. To bring in another table, `prisma db pull` against a prod dump and keep only that model. Some columns have names Prisma can't express (`300_count` and so on), so use `$queryRaw` for those. Wrap array parameters in `$queryRaw` with `Prisma.join`.

Conventions in the game data:
- Score `completed`: 0 failed, 1 passed, 2 best by score, 3 best by pp.
- `user_clans.perms`: 1 member, 8 owner.
- Statistics `mode`: `mode + rx * 4`.
- Leaderboards are Redis sorted sets (`ripple:leaderboard[_relax|_ap]:{mode}[:{country}]`), filled by RealistikOsu.Cron.

## Conventions

- **Formatting:** Prettier (2 spaces, single quotes, semicolons) and the ESLint flat config.
- **Comments:** only for why, never what.
- **English:** British spelling in copy and identifiers, except where an API forces otherwise (`color`, `onclick`).
- **Svelte 5 runes:** use `$state.raw` for data replaced wholesale. The `svelte/prefer-svelte-reactivity` rule bans mutable `Map`/`Set`/`URLSearchParams`/`Date` in components; use plain objects and arrays, or a scoped eslint-disable for a throwaway `Date`.
- **Svelte gotchas:**
  - `<svelte:head>` must not sit inside `{#if}`.
  - Keyed `{#each}` keys must be unique. Log tables can repeat every field, so key those by index.
- **HTML:** `{@html}` only after `sanitise()` (DOMPurify) or BBCode rendering.
- **Styles:** split into `packages/ui/src/styles` (shared) and `apps/web/src/styles` (header, footer, `pages/*.css`).
  - `admin.css` is nested under `.admin`. SvelteKit preloads the admin route when someone hovers an admin link, which would otherwise leak its rules site-wide.
  - Don't name classes after Font Awesome's (`fa`, `fas`, `far`, `fab`): they pull in its font.
- **Motion:** animations only apply under `.motion` on `<html>`, which is set when `prefers-reduced-motion` isn't on. Keep it that way for anything new. Use `ms()` from `lib/motion` for JS durations.
- **Commits:** Conventional Commits, short imperative subject, no trailers. Don't commit docs or notes other than README.md and this file.

## Translations

Paraglide JS 2 with the inlang message-format plugin. English is the source, and Russian, Polish and Hungarian are translated. The language comes from the `PARAGLIDE_LOCALE` cookie, then `Accept-Language`, then English. `setLocale()` reloads the page, so messages don't need to be reactive.

- **Where strings live:** `apps/web/messages/{en,ru,pl,hu}/<area>.json`, one file per area: `common`, `profile`, `beatmaps`, `leaderboard`, `settings`, `auth`, `home`, `clans`, `support`, `messages`, `uploads`, `ranked`, `scores`. Every key is prefixed with its area (`profile_peak_label`). Every language must have the same keys.
- **Calling them:** `import { m } from '$lib/paraglide/messages'` and call `m.key({ params })`. Never call `m.*` at module top level in a `.ts` file; wrap it in a function or getter so it runs after the locale is known. `src/lib/paraglide` is generated and gitignored.
- **Plurals:** counts use the plural form (`declarations` / `selectors` / `match`). Russian and Polish need `one`, `few`, `many` and `other`; Hungarian only `one` and `other`. Avoid gendered past tense in Russian and Polish copy.
- **Dates and numbers:** go through `lib/format.ts`, which uses `intlLocale()`. Don't hardcode `'en'` or `'en-GB'` in public pages.
- **Tone:** casual, like one osu! player to another. osu! terms (pp, acc, FC, mods, mode names, Vanilla/Relax/Autopilot, Ranked/Loved) stay as players say them.
- **Admin panel:** English only.

Docs: `website-docs/ru/<slug>.md` overrides `en/<slug>.md` for Russian readers, with English as the fallback.

## Deployment notes

- The Docker image runs `bun ./build/index.js` on `PORT`. Every setting is read at runtime.
- nginx sends `^/api/v2` to soumetsu-api, `^/api/v1/statistics` and `^/api/v1/profile-history` to the statistics service, `/web/replays` to the score service, and everything else here. Regex locations must be anchored, or `/site-api/...api/v2...` paths get misrouted.
- Avatars and banners are served by soumetsu-api at `/api/v2/assets/{avatars,banners}/{id}.png`. Avatars fall back to `default.*` in the avatars folder.
- `TRUST_PROXY=true` only when nginx overwrites `X-Real-IP`.
- In dev, every hot reload of a server module creates a new Prisma client. If MySQL reports "Too many connections", restart the dev server.
