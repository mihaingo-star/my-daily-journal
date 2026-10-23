// My Daily Journal — push notification registration (Cloudflare Pages Function)
// Needs the KV namespace bound as  MDJ . The reminders are sent by the small "cron worker"
// (worker/cron-worker.js) that reads the same KV namespace every 5 minutes.

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const validDev = (d) => /^[a-z0-9]{8,40}$/.test(d || '');

async function vapid(env) {
  let v = await env.MDJ.get('vapid', 'json');
  if (v && v.pub && v.jwk) return v;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  v = { pub, jwk, created: Date.now() };
  await env.MDJ.put('vapid', JSON.stringify(v));
  return v;
}

// GET /api/push  → public key + whether the reminder worker is running
export async function onRequestGet({ env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const v = await vapid(env);
  const cron = await env.MDJ.get('cron');
  return json({ key: v.pub, cron: cron ? +cron : 0 });
}

// POST /api/push  { dev, sub, queue:[{at,title,body,tag,url}] }
export async function onRequestPost({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
  if (!validDev(b.dev)) return json({ error: 'bad device' }, 400);
  const sub = b.sub;
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth)
    return json({ error: 'bad subscription' }, 400);
  const now = Date.now();
  const queue = (Array.isArray(b.queue) ? b.queue : [])
    .filter((q) => q && +q.at > now - 6e5 && +q.at < now + 15 * 864e5)
    .slice(0, 300)
    .map((q) => ({ at: +q.at, title: String(q.title || '').slice(0, 80), body: String(q.body || '').slice(0, 240), tag: String(q.tag || '').slice(0, 60), url: String(q.url || './').slice(0, 120) }));
  const site = new URL(request.url).origin;
  await env.MDJ.put('dev:' + b.dev, JSON.stringify({ sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, queue, site, upd: now }));
  return json({ ok: true, n: queue.length });
}

// DELETE /api/push?dev=…  → stop reminders on this device
export async function onRequestDelete({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const dev = new URL(request.url).searchParams.get('dev');
  if (!validDev(dev)) return json({ error: 'bad device' }, 400);
  await env.MDJ.delete('dev:' + dev);
  return json({ ok: true });
}
