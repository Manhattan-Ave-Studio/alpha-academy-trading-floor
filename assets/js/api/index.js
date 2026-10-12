import { DemoApi } from './demo.js';
import { LiveApi } from './live.js';

/** Live mode when config.js has a Supabase URL and key and the client library loaded; otherwise demo. */
export function createApi(config) {
  const live = !!(config.supabaseUrl && config.supabaseKey && typeof window !== 'undefined' && window.supabase);
  return live ? new LiveApi(config) : new DemoApi(config);
}
