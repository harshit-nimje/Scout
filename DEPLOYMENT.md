# cine deployment runbook

Frontend origin: **https://scout.edgeone.dev**. The existing app remains a single HTML file and continues to work signed out with its local demo catalogue.

## 1. Deploy the static frontend

Upload `index.html`, `manifest.webmanifest`, `sw.js`, and the `icons/` folder to the root of the EdgeOne Pages site. Preserve the existing domain. The service worker caches the app shell for repeat/offline launches; the first visit still needs internet.

## 2. Supabase project and row security

Create a Supabase project on the free plan. Choose Mumbai if available in the project-region picker; otherwise choose Singapore for a nearby region. Keep the project reference handy.

In SQL Editor, run:

```sql
create table if not exists public.cine_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cine_state enable row level security;

drop policy if exists "read own" on public.cine_state;
drop policy if exists "insert own" on public.cine_state;
drop policy if exists "update own" on public.cine_state;

create policy "read own" on public.cine_state
  for select using (auth.uid() = user_id);
create policy "insert own" on public.cine_state
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.cine_state
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The browser app uses only the public anon/publishable key that you enter in its Sync panel. RLS ensures a signed-in user can only read or modify the row whose `user_id` matches their authenticated ID. **Never put the service-role key in HTML or GitHub Actions build artifacts.**

## 3. Auth URL configuration and Google (optional)

In Supabase → Authentication → URL Configuration:
- Site URL: `https://scout.edgeone.dev`
- Redirect URL allowlist: `https://scout.edgeone.dev/`

In Google Cloud Console, create an OAuth Client ID of type **Web application**. Add this exact authorised redirect URI:
`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

Paste the Google client ID and client secret into Supabase → Authentication → Providers → Google. The email magic-link flow does not require Google. Magic-link redirects must use the site URL/allowlist above.

## 4. GitHub Actions secrets for the TMDB proxy

In GitHub → Settings → Secrets and variables → Actions → New repository secret, add:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token used by GitHub Actions to deploy.
- `SUPABASE_PROJECT_REF`: the project reference from the Supabase dashboard URL.
- `TMDB_KEY`: your TMDB API key.

The workflow sets `ALLOW_ORIGIN=https://scout.edgeone.dev` as a non-secret value. These secrets are not written into the repository or frontend. The workflow runs when the Edge Function changes on `main`, or manually from Actions → Deploy TMDB proxy → Run workflow.

## 5. Deploy the function

The source is `supabase/functions/tmdb/index.ts`. The workflow runs the equivalent of:

```bash
supabase secrets set --project-ref YOUR_PROJECT_REF TMDB_KEY=YOUR_TMDB_KEY ALLOW_ORIGIN=https://scout.edgeone.dev
supabase functions deploy tmdb --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` is required because the app's catalogue is available to anonymous visitors. The function itself only forwards validated GET paths to TMDB and never returns the secret. Because this endpoint is intentionally public, the cache reduces repeated upstream calls but is not a complete abuse/rate-limit defense.

## 6. Enable the hosted TMDB key in the frontend

After the Supabase project exists, update the one-line switch near the TMDB engine code in `index.html`:

```js
const TMDB_PROXY = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/tmdb';
```

Commit and upload the updated `index.html` to EdgeOne Pages. Until you replace this placeholder, cine stays in its existing demo / user-supplied-key mode; no private key is embedded in the app.

## 7. Cloud sync

Open cine → Taste → Sync across devices. Enter the Supabase Project URL and the public anon/publishable key from Project Settings → API. This configuration remains in that device's local storage. The sync payload excludes TMDB caches and API keys. The service-role key is never needed by the browser.

## 8. Android Trusted Web Activity (TWA)

Package ID: `app.cine`; display name: `cine`; start URL: `https://scout.edgeone.dev/`.

A TWA keeps OAuth on the same HTTPS origin and avoids bundling a second copy of the app. To produce a Play-ready Android package, use Bubblewrap on a machine with Java and Android SDK installed, initialize from the hosted web manifest, and generate a signing keystore. Do not commit the keystore or passwords. After signing, host a real Digital Asset Links file at:

`https://scout.edgeone.dev/.well-known/assetlinks.json`

It must contain the Android package name `app.cine` and the **actual SHA-256 fingerprint of the release signing certificate**. Do not deploy a placeholder fingerprint. For Google Play releases, account for Play App Signing's app-signing certificate as well. Until a keystore/fingerprint exists, Android verification cannot be finalized.

## Troubleshooting

- **401 from the function:** verify deployment included `--no-verify-jwt`.
- **500 saying TMDB_KEY is not set:** check the GitHub Actions secrets and rerun the deployment workflow.
- **Google redirect error:** verify the Google callback URI and Supabase redirect allowlist exactly.
- **Sync 401/403:** confirm the app has the correct project URL/public anon key and the table RLS policies above are enabled.
- **Offline first launch:** service worker caching only becomes available after the first successful online visit.
