# Recip.it

Save recipes from websites, videos, photos and PDFs in one common format: ingredients, tools and steps that
reference them, with cooking time, servings and tags.

One [TanStack Start](https://tanstack.com/start) app in [`app/`](app): React with TanStack Router and Query
for the UI, server functions for the API, [TanStack AI](https://tanstack.com/ai) for extraction, and SQLite
(`node:sqlite`) for storage.

## Getting started

Requires Node 22.13 or newer (24 recommended).

```bash
cd app
npm install
cp .env.example .env   # then fill in JWT_SECRET, LLM_MODEL and the matching API key
npm run dev            # http://localhost:3000
```

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Dev server, loads `.env`                                          |
| `npm run build`        | Production build in `.output/`                                    |
| `npm start`            | Runs the production build, loads `.env`                           |
| `npm test`             | Flow tests with a fake model (no network)                         |
| `npm run test:live`    | Same flows against the real model and services, using `.env`      |
| `npm run typecheck`    | TypeScript                                                        |
| `npm run lint`         | ESLint                                                            |

## Configuration

All settings are environment variables, see [`app/.env.example`](app/.env.example).

- `LLM_MODEL` picks the extraction model as `<provider>:<model>`: `openai:gpt-5-mini`,
  `anthropic:claude-haiku-5-5`, `gemini:gemini-3.5-flash`... Only the chosen provider's key is needed
  (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`). The model must accept images and PDFs.
- `DATA_FOLDER` holds `recipes.db` and `uploads/` (photos of uploaded recipes). Use an absolute path in
  production.
- `SUPADATA_API_KEY` enables video imports (YouTube, TikTok, Instagram, X).
- `JWT_SECRET` signs the session cookie.

## How extraction works

The code lives in [`app/src/server/extraction`](app/src/server/extraction) and has no framework imports.

1. A source gathers content:
   - **Websites** ([`web.ts`](app/src/server/extraction/sources/web.ts)): schema.org Recipe JSON-LD when the
     page has it, plus the page text. Private and local addresses are refused.
   - **Videos** ([`video.ts`](app/src/server/extraction/sources/video.ts)): transcript and description.
   - **Files** ([`file.ts`](app/src/server/extraction/sources/file.ts)): the type is detected from the
     content. Photos (JPEG, PNG, WebP, HEIC...) are rotated upright and resized, sent to the model as images
     and kept as the recipe image. PDFs are sent as documents. Text files are sent as text.
2. [`model.ts`](app/src/server/extraction/model.ts) calls `chat()` with the Zod
   [`ExtractionSchema`](app/src/server/extraction/schema.ts) as `outputSchema`, so the provider returns
   validated structured output.
3. `toRecipeContent` drops step references to unknown ingredients or tools and caps tags at 5.

A recipe is extracted once per normalized link (or per uploaded file content); later imports reuse it.

## Users and admins

Anyone can import recipes; signed-in users also keep them in "My Recipes". Admins see `/admin` (users,
reimport, delete). To make a user an admin:

```bash
sqlite3 "$DATA_FOLDER/recipes.db" "UPDATE users SET authorized_endpoints = '[\"*\"]' WHERE username = 'me'"
```

## Deployment

Pushing to `main` runs [`deploy-app.yml`](.github/workflows/deploy-app.yml): typecheck, lint and tests,
then a Linux build uploaded by [`app/scripts/deploy.sh`](app/scripts/deploy.sh), which starts it under PM2
on port 3000 with the server's env file (`RECIPIT_ENV_FILE`, default `/home/deploy/secrets/recipit-backend.env`).
[`config/nginx-config`](config/nginx-config) (deployed by `deploy-config.yml`) proxies `recipit.me` to the
app and redirects the old `api.` and `admin.` subdomains.

Prefixing any recipe URL with the site's address imports it: `https://recipit.me/https://example.com/recipe`.
