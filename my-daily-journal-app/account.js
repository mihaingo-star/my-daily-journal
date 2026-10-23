// My Daily Journal — account: password change, recovery code, password hint, connected devices.
import { json, validId, sha, getMeta, putMeta, getSess, putSess, guard, locked, failed, clearFails } from './sync.js';

const validDev = (d) => /^[a-z0-9]{8,40}$/.test(d || '');
const wrapOk = (w) => w && typeof w.iv === 'string' && typeof w.data === 'string' && w.data.length < 400;
const devList = (s) => Object.entries(s.devs || {}).map(([dev, d]) => ({ dev, name: d.name || 'Device', first: d.first || 0, last: d.last || 0 }));

// GET /api/account?u=…            (x-auth)  → connected devices, recovery/hint status
// GET /api/account?u=…&op=recover (x-rauth) → the journal key wrapped with the recovery code
export async function onRequestGet({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const q = new URL(request.url).searchParams;
  const u = q.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  const rec = await getMeta(env, u);
  if (!rec) return json({ error: 'no account' }, 404);
  if (q.get('op') === 'recover') {
    const lk = await locked(env, u, rec);
    if (lk) return json(lk, 429);
    if (!rec.rh || !rec.wr) return json({ error: 'This account has no recovery code yet.' }, 404);
    if (rec.rh !== (await sha(request.headers.get('x-rauth') || ''))) return json(await failed(env, u, rec), 403);
    return json({ wr: rec.wr });
  }
  const g = await guard(env, u, rec, request);
  if (g) return g;
  const s = await getSess(env, u);
  return json({ devices: devList(s), hasRecovery: !!rec.rh, hint: rec.hint || '' });
}

// POST /api/account?u=…  { op, … }
export async function onRequestPost({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const u = new URL(request.url).searchParams.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
  const rec = await getMeta(env, u);
  if (!rec) return json({ error: 'no account' }, 404);
  const me = request.headers.get('x-dev') || '';

  // reset the password with the recovery code (no password needed)
  if (b.op === 'reset') {
    const lk = await locked(env, u, rec);
    if (lk) return json(lk, 429);
    if (!rec.rh || rec.rh !== (await sha(request.headers.get('x-rauth') || ''))) return json(await failed(env, u, rec), 403);
    if (typeof b.newAuth !== 'string' || !wrapOk(b.wp)) return json({ error: 'bad body' }, 400);
    await putMeta(env, u, ({ ...rec, ah: await sha(b.newAuth), wp: { iv: b.wp.iv, data: b.wp.data } }));
    const s = await getSess(env, u);
    s.revoked = [...new Set([...(s.revoked || []), ...Object.keys(s.devs || {})])].filter((d) => d !== me).slice(-50);
    s.devs = {};
    await putSess(env, u, s);
    await clearFails(env, u);
    return json({ ok: true });
  }

  const g = await guard(env, u, rec, request, { allowRevoked: b.op === 'session' });
  if (g) return g;
  const s = await getSess(env, u);

  switch (b.op) {
    case 'session': { // this device signed in
      if (!validDev(me)) return json({ error: 'bad device' }, 400);
      s.devs[me] = { name: String(b.name || 'Device').slice(0, 30), first: (s.devs[me] && s.devs[me].first) || Date.now(), last: Date.now() };
      s.revoked = (s.revoked || []).filter((d) => d !== me);
      await putSess(env, u, s);
      await clearFails(env, u);
      return json({ ok: true, devices: devList(s) });
    }
    case 'rename': {
      if (!validDev(b.dev) || !s.devs[b.dev]) return json({ error: 'unknown device' }, 404);
      s.devs[b.dev].name = String(b.name || 'Device').slice(0, 30);
      await putSess(env, u, s);
      return json({ ok: true, devices: devList(s) });
    }
    case 'signout': { // sign out one device, or every other device
      const out = b.others ? Object.keys(s.devs).filter((d) => d !== me) : validDev(b.dev) ? [b.dev] : [];
      for (const d of out) delete s.devs[d];
      s.revoked = [...new Set([...(s.revoked || []), ...out])].slice(-50);
      await putSess(env, u, s);
      return json({ ok: true, devices: devList(s) });
    }
    case 'password': { // new password: the journal key is wrapped again, every other device is signed out
      if (typeof b.newAuth !== 'string' || !wrapOk(b.wp)) return json({ error: 'bad body' }, 400);
      await putMeta(env, u, ({ ...rec, ah: await sha(b.newAuth), wp: { iv: b.wp.iv, data: b.wp.data } }));
      const out = Object.keys(s.devs).filter((d) => d !== me);
      for (const d of out) delete s.devs[d];
      s.revoked = [...new Set([...(s.revoked || []), ...out])].slice(-50);
      await putSess(env, u, s);
      return json({ ok: true });
    }
    case 'wrap': { // older accounts: store the wrapped journal key once
      if (!wrapOk(b.wp)) return json({ error: 'bad body' }, 400);
      if (!rec.wp) await putMeta(env, u, ({ ...rec, wp: { iv: b.wp.iv, data: b.wp.data } }));
      return json({ ok: true });
    }
    case 'recovery': { // new recovery code (the old one stops working)
      if (typeof b.rauth !== 'string' || !wrapOk(b.wr)) return json({ error: 'bad body' }, 400);
      await putMeta(env, u, ({ ...rec, rh: await sha(b.rauth), wr: { iv: b.wr.iv, data: b.wr.data } }));
      return json({ ok: true });
    }
    case 'hint': {
      const hint = String(b.hint || '').slice(0, 80);
      const nr = { ...rec };
      if (hint) nr.hint = hint; else delete nr.hint;
      await putMeta(env, u, (nr));
      return json({ ok: true });
    }
  }
  return json({ error: 'unknown op' }, 400);
}
