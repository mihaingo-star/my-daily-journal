// My Daily Journal — encrypted journal storage + account protection (KV namespace bound as MDJ)
// The server only stores encrypted data. Reading or writing needs a proof derived from the password.
// After 10 wrong tries the account is locked for 15 minutes; after 15 wrong tries the password hint is shown.

export const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export const validId = (u) => /^[a-f0-9]{64}$/.test(u || '');
export const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))))].map((x) => x.toString(16).padStart(2, '0')).join('');
const LOCK_AFTER = 10, LOCK_MIN = 15, HINT_AFTER = 15;

export const getAcct = (env, u) => env.MDJ.get('u:' + u, 'json');
// account settings (password proof, wrapped key, recovery, hint) live apart from the journal data
export async function getMeta(env, u) {
  const m = await env.MDJ.get('m:' + u, 'json');
  if (m) return m;
  const rec = await getAcct(env, u);
  return rec ? { ah: rec.ah || '', wp: rec.wp || null } : null;
}
export const putMeta = (env, u, m) => env.MDJ.put('m:' + u, JSON.stringify(m));
export async function getSess(env, u) { return (await env.MDJ.get('s:' + u, 'json')) || { devs: {}, revoked: [] }; }
export const putSess = (env, u, s) => env.MDJ.put('s:' + u, JSON.stringify(s));

// failed tries: lock + hint
export async function lockState(env, u) {
  const f = (await env.MDJ.get('fail:' + u, 'json')) || { n: 0, until: 0 };
  return f;
}
export async function failed(env, u, rec) {
  const f = await lockState(env, u);
  f.n++;
  if (f.n % LOCK_AFTER === 0) f.until = Date.now() + LOCK_MIN * 60e3;
  await env.MDJ.put('fail:' + u, JSON.stringify(f), { expirationTtl: 86400 });
  const out = { wrong: true, tries: f.n, left: f.until > Date.now() ? 0 : LOCK_AFTER - (f.n % LOCK_AFTER) };
  if (f.until > Date.now()) out.lockedUntil = f.until;
  if (f.n >= HINT_AFTER && rec && rec.hint) out.hint = rec.hint;
  return out;
}
export async function locked(env, u, rec) {
  const f = await lockState(env, u);
  if (f.until > Date.now()) {
    const out = { locked: true, lockedUntil: f.until, tries: f.n };
    if (f.n >= HINT_AFTER && rec && rec.hint) out.hint = rec.hint;
    return out;
  }
  return null;
}
export const clearFails = (env, u) => env.MDJ.delete('fail:' + u);

// checks the password proof and the device; returns null when fine, or a Response
export async function guard(env, u, rec, request, { countFail = true, auth: given = '', allowRevoked = false } = {}) {
  const auth = request.headers.get('x-auth') || given || '';
  const dev = request.headers.get('x-dev') || '';
  // a device that was signed out (password changed / signed out from another device) is told so, without counting a wrong try
  const s = dev ? await env.MDJ.get('s:' + u, 'json') : null;
  if (dev && !allowRevoked && s && (s.revoked || []).includes(dev)) return json({ signedOut: true }, 403);
  const lk = await locked(env, u, rec);
  // during a lock, only devices already signed in with the right password keep working
  if (lk && !(s && s.devs && s.devs[dev] && rec.ah === (await sha(auth)))) return json(lk, 429);
  if (rec.ah && rec.ah !== (await sha(auth))) return json(countFail ? await failed(env, u, rec) : { wrong: true }, 403);
  return null;
}

export async function onRequestGet({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const u = new URL(request.url).searchParams.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  const meta = await getMeta(env, u);
  if (!meta) return json({ rev: 0 });
  const g = await guard(env, u, meta, request);
  if (g) return g;
  const rec = (await getAcct(env, u)) || { rev: 0 };
  const { ah, ...pub } = rec;
  pub.wp = meta.wp || null;
  pub.hasRecovery = !!meta.rh;
  pub.hasHint = !!meta.hint;
  return json(pub);
}

export async function onRequestPut({ request, env }) {
  if (!env.MDJ) return json({ error: 'KV binding MDJ is missing' }, 503);
  const u = new URL(request.url).searchParams.get('u');
  if (!validId(u)) return json({ error: 'bad id' }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
  if (typeof body.data !== 'string' || typeof body.iv !== 'string') return json({ error: 'bad body' }, 400);
  if (body.data.length > 20 * 1024 * 1024) return json({ error: 'too big' }, 413);
  const auth = request.headers.get('x-auth') || body.auth || '';
  let meta = await getMeta(env, u);
  if (meta) {
    const g = await guard(env, u, meta, request, { auth });
    if (g) return g;
  }
  const cur = await getAcct(env, u);
  const curRev = cur ? cur.rev : 0;
  if ((body.base ?? 0) !== curRev && !body.force) {
    const { ah: _a, ...pub } = cur || {};
    return json({ conflict: true, ...pub }, 409);
  }
  const rec = {
    rev: curRev + 1, mt: +body.mt || Date.now(), iv: body.iv, data: body.data, at: Date.now(),
    dev: String(body.dev || '').slice(0, 40),
    kid: typeof body.kid === 'string' ? body.kid.slice(0, 32) : (cur && cur.kid) || '',
  };
  if (!meta || !meta.ah) {
    // new account (or an old one without settings yet): remember the password proof and the wrapped key
    meta = { ...(meta || {}), ah: auth ? await sha(auth) : '' };
    if (body.wp && typeof body.wp.iv === 'string') meta.wp = { iv: body.wp.iv, data: String(body.wp.data).slice(0, 400) };
    await putMeta(env, u, meta);
  }
  await env.MDJ.put('u:' + u, JSON.stringify(rec));
  // remember this device in the list of connected devices
  const dev = request.headers.get('x-dev') || '';
  if (/^[a-z0-9]{8,40}$/.test(dev)) {
    const s = await getSess(env, u);
    const d = s.devs[dev];
    if (!d || Date.now() - (d.last || 0) > 6 * 3600e3) {
      s.devs[dev] = { name: (d && d.name) || String(request.headers.get('x-dev-name') || 'Device').slice(0, 30), first: (d && d.first) || Date.now(), last: Date.now() };
      await putSess(env, u, s);
    }
  }
  return json({ rev: rec.rev, at: rec.at });
}

export async function onRequest({ request }) {
  return json({ error: 'method not allowed' }, request.method === 'OPTIONS' ? 204 : 405);
}

// used by the files and reminders endpoints
export async function authOk(env, acct, auth) {
  if (!validId(acct) || typeof auth !== 'string' || !auth) return false;
  const meta = await getMeta(env, acct);
  if (!meta) return false;
  return !meta.ah || meta.ah === (await sha(auth));
}
