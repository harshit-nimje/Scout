# Scout / cine

This repository contains the existing single-file `cine` movie and TV discovery app hosted at `https://scout.edgeone.dev`, plus backend deployment assets. The existing app HTML is preserved; no redesign or rewrite is intended.

## Current deployment model

- Static frontend: EdgeOne Pages (`https://scout.edgeone.dev`)
- Backend: Supabase Auth + `cine_state` table + TMDB Edge Function
- Android: Trusted Web Activity (TWA), package `app.cine`

## Important

Do not commit TMDB API keys, Supabase service-role keys, Google OAuth client secrets, signing keystores, or signing passwords. Use GitHub Actions repository secrets and Supabase Function secrets as described in `DEPLOYMENT.md`.

The TMDB proxy URL cannot be finalized until the Supabase project reference is known. The HTML therefore keeps the proxy switch disabled until you set it in `index.html` and redeploy to EdgeOne.