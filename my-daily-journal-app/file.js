// My Daily Journal — attached files (PDFs, images…), encrypted on the device, stored in KV.
import { authOk } from './sync.js';

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const params = (request) => {
  const q = new URL(request.url).searchParams;
  return { u: q.get('u') || '', f: q.get('f') || '', auth: request.headers.get('x-auth') || '' };
};
const validF = (f) => /^[A-Za-z0-9_-]{4,60}$/.test(f);

export async function onRequestGet({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const { u, f, auth } = params(request);
  if (!validF(f)) return json({ error: 'bad file' }, 400);
  if (!(await authOk(env, u, auth))) return json({ error: 'not allowed' }, 403);
  const v = await env.MDJ.get(`f:${u}:${f}`);
  if (!v) return json({ error: 'not found' }, 404);
  return new Response(v, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export async function onRequestPut({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const { u, f, auth } = params(request);
  if (!validF(f)) return json({ error: 'bad file' }, 400);
  if (!(await authOk(env, u, auth))) return json({ error: 'not allowed' }, 403);
  const text = await request.text();
  if (text.length > 24 * 1024 * 1024) return json({ error: 'too big' }, 413);
  let o;
  try { o = JSON.parse(text); } catch { return json({ error: 'bad body' }, 400); }
  if (typeof o.iv !== 'string' || typeof o.data !== 'string') return json({ error: 'bad body' }, 400);
  await env.MDJ.put(`f:${u}:${f}`, JSON.stringify({ iv: o.iv, data: o.data, name: String(o.name || '').slice(0, 120), type: String(o.type || '').slice(0, 80) }));
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const { u, f, auth } = params(request);
  if (!validF(f)) return json({ error: 'bad file' }, 400);
  if (!(await authOk(env, u, auth))) return json({ error: 'not allowed' }, 403);
  await env.MDJ.delete(`f:${u}:${f}`);
  return json({ ok: true });
}
