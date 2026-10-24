// cine — hosted TMDB key (Supabase Edge Function)
//
// Your TMDB key lives HERE, in the function's environment, and is never sent to
// the browser. The app calls this function; this function adds the key and
// forwards the request to TMDB. Anyone can call the function, but nobody can
// read the key out of it.
//
// ── Deploy ──────────────────────────────────────────────────────────────────
//   supabase functions deploy tmdb --no-verify-jwt
//   supabase secrets set TMDB_KEY=your_tmdb_key_or_v4_token
//
//   --no-verify-jwt is required: without it the gateway demands a Supabase login
//   before the function runs, and anonymous visitors get a 401.
//
// ── Lock it to your site (recommended) ──────────────────────────────────────
//   supabase secrets set ALLOW_ORIGIN=https://scout.edgeone.dev
//
// ── Then, in index_15.html ──────────────────────────────────────────────────
//   const TMDB_PROXY = 'https://YOUR-PROJECT.supabase.co/functions/v1/tmdb';

const UPSTREAM = 'https://api.themoviedb.org/3';
const KEY = Deno.env.get('TMDB_KEY') || '';
const ALLOW = Deno.env.get('ALLOW_ORIGIN') || '*';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOW,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// TMDB metadata barely changes, so a short cache both speeds up the app and
// keeps your quota safe from repeated identical requests.
const cache = new Map<string, { at: number; body: string; status: number }>();
const TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 400;

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);
  if (!KEY) return json({ error: 'TMDB_KEY is not set on this function' }, 500);

  const url = new URL(req.url);
  // the app sends the TMDB path as ?p=/discover/movie, alongside TMDB's own params
  const path = url.searchParams.get('p') || '/';
  if (!/^\/[A-Za-z0-9_/-]*$/.test(path)) return json({ error: 'bad path' }, 400);

  const target = new URL(UPSTREAM + path);
  url.searchParams.forEach((v, k) => { if (k !== 'p') target.searchParams.set(k, v); });
  target.searchParams.set('api_key', KEY);

  const ck = target.pathname + target.search;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return raw(hit.body, hit.status);

  let up: Response;
  try {
    up = await fetch(target, { headers: { accept: 'application/json' } });
  } catch {
    return json({ error: 'upstream unreachable' }, 502);
  }

  const body = await up.text();
  if (up.ok) {
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(ck, { at: Date.now(), body, status: up.status });
  }
  return raw(body, up.status);
});

function raw(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'public, max-age=600' },
  });
}