// My Daily Journal — reminder sender (Cloudflare Worker with a Cron Trigger "*/5 * * * *")
// Paste this whole file into a new Worker, bind the same KV namespace as  MDJ , add the cron trigger.
// Every 5 minutes it sends the reminders that are due to every device that turned notifications on.

const enc = new TextEncoder();
const b64uToBytes = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const bytesToB64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const concat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// RFC 8291 (aes128gcm) payload encryption
export async function encryptPayload(sub, payload) {
  const uaPublic = b64uToBytes(sub.keys.p256dh), authSecret = b64uToBytes(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, shared);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

// VAPID (RFC 8292) JWT signed with ES256
export async function vapidJwt(vapid, endpoint, subject) {
  const key = await crypto.subtle.importKey('jwk', vapid.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = bytesToB64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return head + '.' + body + '.' + bytesToB64u(sig);
}

export async function sendPush(vapid, sub, msg, subject) {
  const body = await encryptPayload(sub, JSON.stringify(msg));
  const jwt = await vapidJwt(vapid, sub.endpoint, subject);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: `vapid t=${jwt}, k=${vapid.pub}`, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' },
    body,
  });
}

async function run(env) {
  const now = Date.now();
  const vapid = await env.MDJ.get('vapid', 'json');
  const last = +(await env.MDJ.get('cron')) || 0;
  if (now - last > 55 * 60e3) await env.MDJ.put('cron', String(now)); // heartbeat, about once an hour
  if (!vapid) return { sent: 0, note: 'no key yet' };
  let sent = 0, cursor;
  do {
    const page = await env.MDJ.list({ prefix: 'dev:', cursor });
    for (const k of page.keys) {
      const d = await env.MDJ.get(k.name, 'json');
      if (!d || !d.sub) continue;
      const due = d.queue.filter((q) => q.at <= now && q.at > now - 3 * 3600e3);
      const later = d.queue.filter((q) => q.at > now);
      if (!due.length && later.length === d.queue.length) continue;
      let gone = false;
      for (const q of due.slice(-4)) {
        try {
          const r = await sendPush(vapid, d.sub, { title: q.title, body: q.body, tag: q.tag, url: q.url }, d.site || 'mailto:reminders@example.com');
          if (r.status === 404 || r.status === 410) { gone = true; break; }
          if (r.ok) sent++;
        } catch (e) { /* try again next run */ }
      }
      if (gone) await env.MDJ.delete(k.name);
      else await env.MDJ.put(k.name, JSON.stringify({ ...d, queue: later }));
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return { sent };
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch(request, env) {
    if (!env.MDJ) return new Response('KV binding MDJ is missing — add it in Settings → Bindings.', { status: 503 });
    const url = new URL(request.url);
    if (url.pathname === '/run') return new Response(JSON.stringify(await run(env)), { headers: { 'content-type': 'application/json' } });
    return new Response('My Daily Journal reminders ✓ running. Open /run to send due reminders now.');
  },
};
