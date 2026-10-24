/* Cine semantic mood worker. Lexicon scoring remains the fallback. */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = true;
env.allowRemoteModels = true;
env.localModelPath = './models/';

let pipe = null;
let initPromise = null;

async function init() {
  if (pipe) return true;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      pipe = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', { dtype: 'q8' });
      return true;
    } catch (localError) {
      try {
        pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
        return true;
      } catch (remoteError) {
        pipe = null;
        throw new Error('Semantic model unavailable (local and CDN fallback failed).');
      }
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

self.addEventListener('message', async event => {
  const { type, data, id } = event.data || {};
  try {
    if (type === 'init') {
      await init();
      self.postMessage({ type: 'ready', id });
    } else if (type === 'embed') {
      await init();
      const output = await pipe(String(data || ''), { pooling: 'mean', normalize: true });
      self.postMessage({ type: 'embedding', data: Array.from(output.data), id });
    }
  } catch (error) {
    self.postMessage({ type: 'error', data: error && error.message ? error.message : 'Semantic model unavailable', id });
  }
});
