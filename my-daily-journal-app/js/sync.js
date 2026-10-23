/* ============ MY DAILY JOURNAL — automatic sync + push reminders ============ */
'use strict';
const API=location.protocol.startsWith('http')?'/api':null;
const b64=(buf)=>{let s='';const b=new Uint8Array(buf);for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)};
const unb64=(s)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64uToBytes=(s)=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return unb64(s)};
const LOCAL_ONLY=['lock','ui','sent'];

/* ---------------- sync ---------------- */
const SYNC={conf:null,key:null,busy:false,last:0,timer:null,status:'off',err:''};
function syncConf(){try{return JSON.parse(localStorage.getItem('mdj-sync'))}catch(e){return null}}
function syncSave(){try{localStorage.setItem('mdj-sync',JSON.stringify(SYNC.conf))}catch(e){}}
function devId(){let d=null;try{d=localStorage.getItem('mdj-dev')}catch(e){}if(!d){d=(crypto.randomUUID?crypto.randomUUID():uid()+uid()).replace(/-/g,'').slice(0,24);try{localStorage.setItem('mdj-dev',d)}catch(e){}}return d}
async function deriveFromCode(code){const c=code.trim().toLowerCase();
  const idBuf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mdj-sync-id|'+c));const id=[...new Uint8Array(idBuf)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(c),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('my-daily-journal-sync-v1'),iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  return{id,key,raw:b64(await crypto.subtle.exportKey('raw',key))}}
async function loadKey(){if(!SYNC.conf)return null;if(!SYNC.key)SYNC.key=await crypto.subtle.importKey('raw',unb64(SYNC.conf.k),{name:'AES-GCM'},false,['encrypt','decrypt']);return SYNC.key}
function shareable(){const o={};for(const k in S)if(!LOCAL_ONLY.includes(k))o[k]=S[k];return o}
async function encryptState(){const key=await loadKey(),iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(shareable())));return{iv:b64(iv),data:b64(data)}}
async function decryptState(rec){const key=await loadKey();const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(rec.iv)},key,unb64(rec.data));return JSON.parse(new TextDecoder().decode(pt))}
function applyRemote(remote){const keep={};for(const k of LOCAL_ONLY)keep[k]=S[k];S=Object.assign(remote,keep);load2();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}idbPut('state','current',S);applyTheme();render(true)}

async function syncPull(){if(!API||!SYNC.conf||SYNC.busy)return;SYNC.busy=true;
  try{const r=await fetch(`${API}/sync?u=${SYNC.conf.id}`,{cache:'no-store'});if(!r.ok)throw new Error('pull '+r.status);const rec=await r.json();
    if(rec.rev&&rec.rev>(SYNC.conf.rev||0)){const remote=await decryptState(rec);
      if(SYNC.conf.dirty&&(S.mt||0)>(rec.mt||0)){await idbPut('snaps','conflict-'+TK(),remote);SYNC.conf.rev=rec.rev;syncSave();SYNC.busy=false;return syncPush(true)}
      if(SYNC.conf.dirty)await idbPut('snaps','conflict-'+TK(),JSON.parse(JSON.stringify(S)));
      SYNC.conf.rev=rec.rev;SYNC.conf.dirty=false;syncSave();applyRemote(remote)}
    SYNC.status='ok';SYNC.err='';SYNC.last=Date.now()}
  catch(e){SYNC.status='offline';SYNC.err=String(e.message||e)}
  SYNC.busy=false}
async function syncPush(force){if(!API||!SYNC.conf||(!SYNC.conf.dirty&&!force))return;if(SYNC.busy){schedulePush(3000);return}SYNC.busy=true;
  try{const body=await encryptState();body.base=SYNC.conf.rev||0;body.mt=S.mt||Date.now();body.dev=devId();
    const r=await fetch(`${API}/sync?u=${SYNC.conf.id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:JSON.stringify(body).length<60000});
    if(r.status===409){SYNC.busy=false;const rec=await r.json();if((rec.mt||0)>(S.mt||0)){SYNC.conf.dirty=false;SYNC.conf.rev=0;syncSave();return syncPull()}SYNC.conf.rev=rec.rev;syncSave();return syncPush(true)}
    if(!r.ok)throw new Error('push '+r.status);const o=await r.json();SYNC.conf.rev=o.rev;SYNC.conf.dirty=false;syncSave();SYNC.status='ok';SYNC.err='';SYNC.last=Date.now()}
  catch(e){SYNC.status='offline';SYNC.err=String(e.message||e)}
  SYNC.busy=false}
let lastPushAt=0;
function schedulePush(ms=4000){clearTimeout(SYNC.timer);const wait=Math.max(ms,30000-(Date.now()-lastPushAt));SYNC.timer=setTimeout(()=>{lastPushAt=Date.now();syncPush()},wait)}
function onLocalSave(){if(SYNC.conf){SYNC.conf.dirty=true;syncSave();schedulePush()}pushQueueSoon()}
async function syncEnable(code,choice){const d=await deriveFromCode(code);SYNC.conf={id:d.id,k:d.raw,rev:0,dirty:false};SYNC.key=d.key;
  const r=await fetch(`${API}/sync?u=${d.id}`,{cache:'no-store'});if(!r.ok){SYNC.conf=null;throw new Error(r.status===503?'Cloudflare storage is not connected yet (KV binding MDJ).':'Could not reach the server.')}
  const rec=await r.json();
  if(rec.rev){let remote;try{remote=await decryptState(rec)}catch(e){SYNC.conf=null;SYNC.key=null;throw new Error('Wrong code for this journal.')}
    if(choice==='upload'){SYNC.conf.rev=rec.rev;SYNC.conf.dirty=true;syncSave();await syncPush(true)}
    else{SYNC.conf.rev=rec.rev;syncSave();applyRemote(remote)}}
  else{SYNC.conf.dirty=true;syncSave();await syncPush(true)}
  SYNC.status='ok';return!!rec.rev}
function syncDisable(){SYNC.conf=null;SYNC.key=null;SYNC.status='off';try{localStorage.removeItem('mdj-sync')}catch(e){}}
async function syncProbe(code){const d=await deriveFromCode(code);const r=await fetch(`${API}/sync?u=${d.id}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status===503?'Cloudflare storage is not connected yet (KV binding MDJ).':'Could not reach the server.');const rec=await r.json();return{exists:!!rec.rev,at:rec.at}}
function syncInit(){SYNC.conf=syncConf();if(!SYNC.conf)return;SYNC.status='…';syncPull().then(()=>syncPush());
  document.addEventListener('visibilitychange',()=>{if(!SYNC.conf)return;if(document.hidden){if(SYNC.conf.dirty){lastPushAt=0;syncPush()}}else syncPull()});
  window.addEventListener('online',()=>{if(SYNC.conf){syncPull().then(()=>syncPush())}});
  setInterval(()=>{if(SYNC.conf&&!document.hidden)syncPull()},60000)}

/* ---------------- push reminders ---------------- */
const PUSH={status:null,sub:null,hash:null,timer:null};
const notifFlag=v=>{try{if(v)localStorage.setItem('mdj-notif',v);return localStorage.getItem('mdj-notif')}catch(e){return null}};
const remindersOn=()=>('Notification'in window)&&Notification.permission==='granted'&&notifFlag()!=='off';
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function pushSupport(){if(!('serviceWorker'in navigator)||!('Notification'in window))return isIOS&&!isStandalone()?'ios-browser':'none';if(!('PushManager'in window))return isIOS&&!isStandalone()?'ios-browser':'local';return'push'}
async function pushServer(){if(!API)return null;try{const r=await fetch(`${API}/push`,{cache:'no-store'});if(!r.ok)return null;PUSH.status=await r.json();return PUSH.status}catch(e){return null}}
async function currentSub(){try{const reg=await navigator.serviceWorker.getRegistration();return reg?await reg.pushManager.getSubscription():null}catch(e){return null}}
const within=(pr,ms)=>Promise.race([pr,new Promise((_,no)=>setTimeout(()=>no(new Error('no answer from the push service')),ms))]);
async function enableNotifications(){const sup=pushSupport();notifFlag('on');
  if(sup==='ios-browser')return{ok:false,msg:'On iPhone and iPad, first add the app to your Home Screen (Share → Add to Home Screen), open it from the icon, then turn reminders on.'};
  if(sup==='none')return{ok:false,msg:'This browser does not support notifications.'};
  // iPhone/iPad: ask for push straight inside the tap (Safari needs the user gesture), key and worker prepared at start-up
  let early=null;if(sup==='push'&&PUSH.reg&&PUSH.status&&PUSH.status.key){try{early=PUSH.reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(PUSH.status.key)})}catch(e){early=null}}
  if(early){try{const sub=await within(early,12000);PUSH.sub=sub;PUSH.hash=null;await uploadQueue(true);const st=PUSH.status;
      return{ok:true,msg:st.cron&&Date.now()-st.cron<3*3600e3?'Reminders on — even when the app is closed ✓':'Reminders registered. They arrive when the app is closed once the reminder worker runs on Cloudflare.'}}
    catch(e){if(Notification.permission==='denied')return{ok:false,msg:'Notifications are blocked. Allow them in your device settings for this app.'}}}
  const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(p!=='granted')return{ok:false,msg:p==='denied'?'Notifications are blocked. Allow them in your device settings for this app.':'Permission not given.'};
  if(sup==='local')return{ok:true,msg:'Reminders on (they show while the app is open).'};
  const st=await pushServer();if(!st||!st.key)return{ok:true,local:true,msg:'Reminders on while the app is open. To get them when the app is closed, finish the Cloudflare setup (KV + reminder worker).'};
  try{const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await within(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(st.key)}),12000);PUSH.sub=sub;PUSH.hash=null;await uploadQueue(true);
    return{ok:true,msg:st.cron&&Date.now()-st.cron<3*3600e3?'Reminders on — even when the app is closed ✓':'Reminders registered. They arrive when the app is closed once the reminder worker runs on Cloudflare.'}}
  catch(e){return{ok:true,local:true,msg:'Reminders on while the app is open ('+(e.message||e)+').'}}}
async function disableNotifications(){notifFlag('off');const sub=await currentSub();if(sub){try{await sub.unsubscribe()}catch(e){}}PUSH.sub=null;if(API)try{await fetch(`${API}/push?dev=${devId()}`,{method:'DELETE'})}catch(e){}}
function at(d,hm){const[h,m]=(hm||'00:00').split(':').map(Number);const x=new Date(d);x.setHours(h,m,0,0);return x.getTime()}
function buildQueue(){const R=S.rem,q=[],now=Date.now(),t0=today();
  for(let i=0;i<8;i++){const d=addDays(t0,i),k=key(d);
    if(R.morning){const its=datedItems(k).filter(x=>!x.d);q.push({at:at(d,R.mtime),title:'Good morning ☀',body:its.length?`${its.length} thing${its.length>1?'s':''} today: ${its.slice(0,4).map(x=>x.t).join(' · ')}`:'Nothing planned today — enjoy ♡',tag:'m'+k,url:'./#today'})}
    if(R.dayBefore){const due=datedItems(key(addDays(d,1))).filter(x=>x.mod&&!x.d);if(due.length)q.push({at:at(d,R.dtime),title:'Due tomorrow',body:due.map(x=>x.t).join(' · '),tag:'d'+k,url:'./#cal'})}
    if(R.three){const due=datedItems(key(addDays(d,3))).filter(x=>x.mod&&!x.d);if(due.length)q.push({at:at(d,R.dtime)+60e3,title:'Due in 3 days',body:due.map(x=>x.t).join(' · '),tag:'t'+k,url:'./#cal'})}
    if(R.streak&&i<2)q.push({at:at(d,'21:00'),title:'Keep your streak 🎀',body:'Tick one thing in your planner today ♡',tag:'s'+k,url:'./#week',ifInactive:k});
    if(R.groc&&d.getDay()===6&&S.groc.items.length)q.push({at:at(d,'09:00'),title:'Groceries day 🛒',body:`${S.groc.items.length} items on your list · budget ${rs(S.groc.budget)}`,tag:'g'+k,url:'./#groc'});
    if(R.water&&i<2)for(let h=9;h<=21;h+=2)q.push({at:at(d,pad(h)+':00'),title:'Water time 💧',body:`Goal: ${S.waterGoal} glasses today`,tag:'w'+k+h,url:'./#kcal'});
  }
  return q.filter(x=>x.at>now&&!(x.ifInactive&&S.active[x.ifInactive])).map(({ifInactive,...x})=>x).sort((a,b)=>a.at-b.at)}
async function uploadQueue(force){if(!API)return;const sub=PUSH.sub||await currentSub();if(!sub)return;PUSH.sub=sub;
  const queue=buildQueue(),h=JSON.stringify(queue);if(!force&&h===PUSH.hash)return;
  try{const r=await fetch(`${API}/push`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dev:devId(),sub:sub.toJSON(),queue})});if(r.ok)PUSH.hash=h}catch(e){}}
function pushQueueSoon(){clearTimeout(PUSH.timer);PUSH.timer=setTimeout(()=>uploadQueue(),6000)}
async function pushInit(){if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(r=>{PUSH.reg=r}).catch(()=>{});if(pushSupport()!=='push'||!remindersOn())return;PUSH.sub=await currentSub();if(PUSH.sub){await pushServer();uploadQueue(true)}}
const serverPushActive=()=>!!(PUSH.sub&&PUSH.status&&PUSH.status.cron&&Date.now()-PUSH.status.cron<3*3600e3);
