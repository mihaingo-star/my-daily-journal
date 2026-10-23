/* My Daily Journal — offline cache + push reminders */
const CACHE='mdj-v6-0';
const SHELL=['./','index.html','styles.css','js/core.js','js/sync.js','js/pages.js','js/app.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png',
 'assets/gedm.webp','assets/shrm.webp','assets/hris.webp','assets/km.webp','assets/diss.webp','assets/dump.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    if(u.pathname.startsWith('/api/'))return; // always live
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
  }else if(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(u.host)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c));return res})));
  }});
/* push reminders sent by the Cloudflare reminder worker */
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(err){d={title:'My Daily Journal',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'My Daily Journal',{body:d.body||'',tag:d.tag||undefined,icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus'in c){c.navigate?c.navigate(url).catch(()=>{}):0;return c.focus()}}return self.clients.openWindow(url)}))});
self.addEventListener('pushsubscriptionchange',e=>{e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.postMessage('resubscribe'))))});
