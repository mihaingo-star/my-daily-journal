// My Daily Journal — one Worker for everything: the app files, sync, reminders registration and the 5-minute reminder sender.
import * as sync from '../functions/api/sync.js';
import * as push from '../functions/api/push.js';
import reminders from '../worker/cron-worker.js';

const routes = { '/api/sync': sync, '/api/push': push };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mod = routes[url.pathname.replace(/\/$/, '')];
    if (mod) {
      const m = request.method;
      const fn = mod['onRequest' + m[0] + m.slice(1).toLowerCase()] || mod.onRequest;
      if (!fn) return new Response('method not allowed', { status: 405 });
      return fn({ request, env, ctx });
    }
    if (url.pathname === '/api/run') return reminders.fetch(new Request(new URL('/run', url)), env);
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    return reminders.scheduled(event, env, ctx);
  },
};
