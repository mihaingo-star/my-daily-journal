// My Daily Journal — reminders: device registration and the shared 30-day reminder list.
// Any signed-in device can refresh the reminders of every device of the account;
// each device keeps only the reminder types it chose, and can be switched off from another device.
import { authOk } from './sync.js';

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const validDev = (d) => /^[a-z0-9]{8,40}$/.test(d || '');
const TYPES = ['morning', 'dayBefore', 'three', 'streak', 'groc', 'water'];
const DAYS = 31;

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
const cleanTypes = (t) => Object.fromEntries(TYPES.map((k) => [k, !!(t && t[k])]));
function cleanQueue(q) {
  const now = Date.now();
  return (Array.isArray(q) ? q : [])
    .filter((x) => x && +x.at > now - 6e5 && +x.at < now + DAYS * 864e5)
    .slice(0, 900)
    .map((x) => ({ type: TYPES.includes(x.type) ? x.type : 'morning', at: +x.at, title: String(x.title || '').slice(0, 80), body: String(x.body || '').slice(0, 240), tag: String(x.tag || '').slice(0, 60), url: String(x.url || './').slice(0, 120) }));
}
const cleanExtra = (q) => (Array.isArray(q) ? q : []).slice(0, 5).filter((x) => x && +x.at > Date.now() - 6e5 && +x.at < Date.now() + 864e5)
  .map((x) => ({ type: 'focus', at: +x.at, title: String(x.title || '').slice(0, 80), body: String(x.body || '').slice(0, 240), tag: 'focus', url: String(x.url || './#focus').slice(0, 120) }));
async function indexDev(env, dev, add) {
  const all = (await env.MDJ.get('alldevs', 'json')) || [];
  const has = all.includes(dev);
  if (add && !has) { all.push(dev); await env.MDJ.put('alldevs', JSON.stringify(all.slice(-500))); }
  if (!add && has) await env.MDJ.put('alldevs', JSON.stringify(all.filter((x) => x !== dev)));
}
const forDevice = (queue, d) => (d.on === false ? [] : queue.filter((x) => d.types && d.types[x.type]).slice(0, 400));

async function devList(env, acct) {
  const ids = (await env.MDJ.get('ad:' + acct, 'json')) || [];
  const out = [];
  for (const id of ids) {
    const d = await env.MDJ.get('dev:' + id, 'json');
    if (d) out.push({ dev: id, name: d.name || 'Device', on: d.on !== false, push: !!d.sub, types: d.types || {}, upd: d.upd || 0 });
  }
  return out;
}
async function addToAccount(env, acct, dev) {
  const ids = (await env.MDJ.get('ad:' + acct, 'json')) || [];
  if (!ids.includes(dev)) { ids.push(dev); await env.MDJ.put('ad:' + acct, JSON.stringify(ids.slice(-20))); }
}
// write the shared list into every device of the account (each filtered by its own choices)
async function spread(env, acct, queue) {
  const ids = (await env.MDJ.get('ad:' + acct, 'json')) || [];
  const keep = [];
  for (const id of ids) {
    const d = await env.MDJ.get('dev:' + id, 'json');
    if (!d) continue;
    keep.push(id);
    if (!d.sub) continue;
    await env.MDJ.put('dev:' + id, JSON.stringify({ ...d, queue: forDevice(queue, d), upd: Date.now() }));
  }
  if (keep.length !== ids.length) await env.MDJ.put('ad:' + acct, JSON.stringify(keep));
}

// GET /api/push[?acct=…&auth=…] → public key, worker heartbeat, and (signed in) the devices of the account
export async function onRequestGet({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const q = new URL(request.url).searchParams;
  const v = await vapid(env);
  const cron = await env.MDJ.get('cron');
  const out = { key: v.pub, cron: cron ? +cron : 0 };
  const acct = q.get('acct');
  if (acct && (await authOk(env, acct, q.get('auth')))) out.devices = await devList(env, acct);
  return json(out);
}

// POST /api/push
//  { dev, name, types, queue, sub?, acct?, auth? }  register/refresh this device and share the list with the account
//  { acct, auth, setDev, on, queue? }                switch reminders of one device of the account on/off
export async function onRequestPost({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
  const acctOk = b.acct ? await authOk(env, b.acct, b.auth) : false;
  const queue = cleanQueue(b.queue);

  if (b.setDev) {
    if (!acctOk || !validDev(b.setDev)) return json({ error: 'not allowed' }, 403);
    const ids = (await env.MDJ.get('ad:' + b.acct, 'json')) || [];
    if (!ids.includes(b.setDev)) return json({ error: 'unknown device' }, 404);
    const d = await env.MDJ.get('dev:' + b.setDev, 'json');
    if (d) {
      const nd = { ...d, on: !!b.on };
      if (queue.length) nd.queue = forDevice(queue, nd);
      else if (!b.on) nd.queue = [];
      await env.MDJ.put('dev:' + b.setDev, JSON.stringify(nd));
    }
    return json({ ok: true, devices: await devList(env, b.acct) });
  }

  if (!validDev(b.dev)) return json({ error: 'bad device' }, 400);
  const prev = (await env.MDJ.get('dev:' + b.dev, 'json')) || {};
  const sub = b.sub;
  let cleanSub = prev.sub || null;
  if (sub) {
    if (typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth)
      return json({ error: 'bad subscription' }, 400);
    cleanSub = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  }
  // a device that is not in an account can only manage itself, and only once it has a subscription
  if (!cleanSub && !acctOk) return json({ ok: true, n: 0 });
  const d = {
    ...prev,
    sub: cleanSub,
    name: String(b.name || prev.name || 'Device').slice(0, 30),
    types: b.types ? cleanTypes(b.types) : prev.types || cleanTypes({ morning: 1, dayBefore: 1, three: 1, streak: 1, groc: 1 }),
    on: prev.on !== false,
    site: new URL(request.url).origin,
    acct: acctOk ? b.acct : prev.acct || '',
    upd: Date.now(),
  };
  const hasQueue = Array.isArray(b.queue);
  if (b.extra !== undefined) d.extra = cleanExtra(b.extra);
  if (cleanSub) {
    d.queue = hasQueue ? forDevice(queue, d) : prev.queue || [];
    await env.MDJ.put('dev:' + b.dev, JSON.stringify(d));
    if (!prev.sub) await indexDev(env, b.dev, true);
  }
  if (acctOk) {
    if (cleanSub) await addToAccount(env, b.acct, b.dev);
    if (hasQueue) await spread(env, b.acct, queue);
    return json({ ok: true, devices: await devList(env, b.acct) });
  }
  return json({ ok: true, n: (d.queue || []).length });
}

// DELETE /api/push?dev=…  → stop reminders on this device
export async function onRequestDelete({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const q = new URL(request.url).searchParams;
  const dev = q.get('dev');
  if (!validDev(dev)) return json({ error: 'bad device' }, 400);
  await env.MDJ.delete('dev:' + dev);
  await indexDev(env, dev, false);
  const acct = q.get('acct');
  if (acct && (await authOk(env, acct, q.get('auth')))) {
    const ids = ((await env.MDJ.get('ad:' + acct, 'json')) || []).filter((x) => x !== dev);
    await env.MDJ.put('ad:' + acct, JSON.stringify(ids));
  }
  return json({ ok: true });
}
