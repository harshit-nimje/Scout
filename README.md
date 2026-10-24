# Scout / cine

This repository contains the existing single-file `cine` movie and TV discovery app hosted at `https://scout.edgeone.dev`, plus backend deployment assets. The existing app HTML is preserved; no redesign or rewrite is intended.

## Current deployment model

- Static frontend: EdgeOne Pages (`https://scout.edgeone.dev`)
- Backend: Supabase Auth + `cine_state` table + TMDB Edge Function
- Android: Trusted Web Activity (TWA), package `app.cine`

## Important

Do not commit TMDB API keys, Supabase service-role keys, Google OAuth client secrets, signing keystores, or signing passwords. Use GitHub Actions repository secrets and Supabase Function secrets as described in `DEPLOYMENT.md`.

The HTML is currently wired to `https://qsddtnorjfudbmafzjdr.supabase.co/functions/v1/tmdb`, inferred from the Supabase CLI error shown during setup. Verify that project reference in your Supabase dashboard before relying on the proxy.

## Hybrid mood engine (lexicon + semantic embeddings)

Cine keeps its existing rule-based mood lexicon and feature/genre scoring. When the semantic model is available, the Moods tab embeds the raw prompt and compares it with cached title/genre embeddings. The final score blends the original score (60%) with cosine similarity mapped to 0–1 (40%). If model initialization or an embedding request fails, or a prompt embedding takes longer than two seconds, the search quietly uses the original lexicon score.

The embedding runs in `mood-worker.js`, away from the main UI thread. Title embeddings are cached in localStorage under `cine.emb:<title-id>`; a background warm-up attempts the first 100 pool titles after the model becomes ready. This is best-effort and does not block swiping, watchlist actions, or onboarding.

### Updating the model / enabling offline inference

The model directory is `models/all-MiniLM-L6-v2/`. See its README for the exact model assets needed. The binary ONNX weights have not been included by the GitHub text-file connector; until the real compatible assets are committed, the worker falls back to the Hugging Face model ID through Transformers.js and semantic matching requires a network connection. To make first-run offline inference possible, add the actual Transformers.js-compatible config/tokenizer files and quantized ONNX weights via Git LFS, then confirm the deployed static host serves them with JSON and `application/octet-stream` (or another suitable binary) content types. The service worker uses cache-first for model assets after they have been downloaded and runtime-caches the Transformers.js CDN module when the browser permits it.
