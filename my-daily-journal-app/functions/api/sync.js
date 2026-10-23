// My Daily Journal — encrypted sync storage (Cloudflare Pages Function)
// Needs a KV namespace bound as  MDJ  (Pages project → Settings → Bindings).
// The server only ever sees encrypted data: it is encrypted on the device with your personal code.

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const validId = (u) => /^[a-f0-9]{64}$/.test(u || '');

export async function onRequestGet({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const u = new URL(request.url).searchParams.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  const rec = await env.MDJ.get('u:' + u, { type: 'json', cacheTtl: 30 });
  return json(rec || { rev: 0 });
}

export async function onRequestPut({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const u = new URL(request.url).searchParams.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
  if (typeof body.data !== 'string' || typeof body.iv !== 'string') return json({ error: 'bad body' }, 400);
  if (body.data.length > 20 * 1024 * 1024) return json({ error: 'too big' }, 413);
  const cur = await env.MDJ.get('u:' + u, { type: 'json', cacheTtl: 30 });
  const curRev = cur ? cur.rev : 0;
  if ((body.base ?? 0) !== curRev && !body.force) return json({ conflict: true, ...cur }, 409);
  const rec = { rev: curRev + 1, mt: +body.mt || Date.now(), iv: body.iv, data: body.data, at: Date.now(), dev: String(body.dev || '').slice(0, 40) };
  await env.MDJ.put('u:' + u, JSON.stringify(rec));
  return json({ rev: rec.rev, at: rec.at });
}

export async function onRequest({ request }) {
  return json({ error: 'method not allowed' }, request.method === 'OPTIONS' ? 204 : 405);
}
