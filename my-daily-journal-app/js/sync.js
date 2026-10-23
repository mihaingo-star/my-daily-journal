/* ============ MY DAILY JOURNAL — account, automatic sync, files and reminders ============ */
'use strict';
const API=location.protocol.startsWith('http')?'/api':null;
const b64=(buf)=>{let s='';const b=new Uint8Array(buf);for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)};
const unb64=(s)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64uToBytes=(s)=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return unb64(s)};
const hex=(buf)=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async(bytes)=>hex(await crypto.subtle.digest('SHA-256',bytes));
const LOCAL_ONLY=['lock','ui','sent'];
async function apiJSON(r){const t=(r.headers.get('content-type')||'');if(!t.includes('json'))throw new Error('The sync server is not installed on this site yet (the /api address answers with a page, not data). Check the last deployment on Cloudflare.');return r.json()}

/* ---------------- account ---------------- */
/* The journal is encrypted with a random journal key. The password (and the recovery code) only "wrap" that key,
   so changing the password never re-encrypts anything, and the recovery code keeps working. */
const SYNC={conf:null,key:null,busy:false,last:0,timer:null,status:'off',err:''};
function syncConf(){try{return JSON.parse(localStorage.getItem('mdj-sync'))}catch(e){return null}}
function syncSave(){try{localStorage.setItem('mdj-sync',JSON.stringify(SYNC.conf))}catch(e){}}
function devId(){let d=null;try{d=localStorage.getItem('mdj-dev')}catch(e){}if(!d){d=(crypto.randomUUID?crypto.randomUUID():uid()+uid()).replace(/-/g,'').slice(0,24);try{localStorage.setItem('mdj-dev',d)}catch(e){}}return d}
function devName(){const u=navigator.userAgent;if(/iPad/.test(u)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'iPad';if(/iPhone/.test(u))return'iPhone';if(/Android/.test(u))return'Android';if(/Mac/.test(u))return'Mac';if(/Win/.test(u))return'Windows PC';return'Computer'}
async function pbkdf(secret,salt){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  return{key,raw:b64(await crypto.subtle.exportKey('raw',key))}}
const acctId=async(user)=>sha(new TextEncoder().encode('mdj-account|'+String(user).trim().toLowerCase()));
async function deriveAccount(user,pass){const u=String(user).trim().toLowerCase();const p=await pbkdf(pass,'my-daily-journal-account|'+u);return{id:await acctId(u),...p}}
const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const deriveRecovery=(user,code)=>pbkdf(normCode(code),'my-daily-journal-recovery|'+String(user).trim().toLowerCase());
const kidOf=async(raw)=>(await sha(unb64(raw))).slice(0,16);
const authOf=async(raw,what='write')=>sha(new Uint8Array([...unb64(raw),...new TextEncoder().encode('|'+what)]));
const importAes=raw=>crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt']);
async function loadKey(){if(!SYNC.conf)return null;if(!SYNC.key)SYNC.key=await importAes(SYNC.conf.k);return SYNC.key}
async function enc(bytes,key){key=key||await loadKey();const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:b64(iv),data:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes))}}
async function dec(rec,key){key=key||await loadKey();return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(rec.iv)},key,unb64(rec.data)))}
const wrapKey=(raw,key)=>enc(unb64(raw),key);
const unwrapKey=async(w,key)=>b64(await dec(w,key));
function hdrs(extra){return{'x-auth':SYNC.conf?SYNC.conf.a:'','x-dev':devId(),'x-dev-name':devName(),...(extra||{})}}
function shareable(){const o={};for(const k in S)if(!LOCAL_ONLY.includes(k))o[k]=S[k];return o}
const encryptState=()=>enc(new TextEncoder().encode(JSON.stringify(shareable())));
async function decryptState(rec,key){return JSON.parse(new TextDecoder().decode(await dec(rec,key)))}
function applyRemote(remote){const keep={};for(const k of LOCAL_ONLY)keep[k]=S[k];S=Object.assign(remote,keep);load2();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}idbPut('state','current',S);applyTheme();applyModCfg();render(true)}
function signedOut(msg){const u=SYNC.conf&&SYNC.conf.user;syncDisable();try{rerender()}catch(e){}if(typeof showLogin==='function')showLogin(u,msg)}
async function denied(r){const o=await r.json().catch(()=>({}));
  if(o.signedOut)return signedOut('This device was signed out from another device. Sign in again to continue.');
  return signedOut('Your password was changed, so this device was signed out. Sign in with the new password.')}
/* readable message for a refused sign-in */
function refusal(o,status){if(status===429||o.locked||o.lockedUntil){const m=Math.max(1,Math.ceil(((o.lockedUntil||Date.now())-Date.now())/60000));return`Too many wrong tries. Try again in ${m} min.${o.hint?' Hint: '+o.hint:''}`}
  return`Wrong username or password.${o.left?` ${o.left} tr${o.left>1?'ies':'y'} left before a 15-minute pause.`:''}${o.hint?' Hint: '+o.hint:''}`}

/* ---------------- sync ---------------- */
let BASE=null; // last state known to be in the cloud: lets two devices' changes be merged
async function setBase(o){BASE=JSON.parse(JSON.stringify(o));try{await idbPut('state','base',BASE)}catch(e){}}
async function getBase(){if(BASE)return BASE;try{BASE=await idbGet('state','base')}catch(e){}return BASE}
async function syncPull(){if(!API||!SYNC.conf||SYNC.busy||SYNC.signingIn)return;SYNC.busy=true;const conf=SYNC.conf;
  try{const r=await fetch(`${API}/sync?u=${SYNC.conf.id}`,{cache:'no-store',headers:hdrs()});if(SYNC.conf!==conf){SYNC.busy=false;return}if(r.status===403){SYNC.busy=false;return denied(r)}if(!r.ok)throw new Error('pull '+r.status);const rec=await apiJSON(r);
    if(rec.rev&&rec.rev>(SYNC.conf.rev||0)){let remote;try{remote=await decryptState(rec)}catch(e){SYNC.busy=false;return signedOut('Your journal key changed. Sign in again.')}
      if(SYNC.conf.dirty){const base=await getBase();const merged=mergeStates(base,shareable(),remote,(S.mt||0)>(rec.mt||0));
        await idbPut('snaps','before-merge-'+TK(),JSON.parse(JSON.stringify(S)));
        SYNC.conf.rev=rec.rev;syncSave();await setBase(remote);applyRemote(merged);S.mt=Date.now();SYNC.conf.dirty=true;syncSave();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}SYNC.busy=false;return syncPush(true)}
      SYNC.conf.rev=rec.rev;SYNC.conf.dirty=false;syncSave();await setBase(remote);applyRemote(remote);fetchMissingFiles()}
    SYNC.status='ok';SYNC.err='';SYNC.last=Date.now();if(SYNC.conf&&SYNC.conf.dirty)schedulePush(500)}
  catch(e){SYNC.status='offline';SYNC.err=String(e.message||e)}
  SYNC.busy=false;if(ROUTE==='settings'&&!(document.activeElement&&document.activeElement.matches('input,textarea,select')))try{rerender()}catch(e){}}
async function syncPush(force){if(!API||!SYNC.conf||(!SYNC.conf.dirty&&!force))return;if(SYNC.signingIn&&!force){schedulePush(3000);return}if(SYNC.busy){schedulePush(3000);return}SYNC.busy=true;const conf=SYNC.conf;
  try{const state=shareable();const body=await encryptState();body.base=SYNC.conf.rev||0;body.mt=S.mt||Date.now();body.dev=devId();body.kid=await kidOf(SYNC.conf.k);if(SYNC.conf.wp)body.wp=SYNC.conf.wp;
    const r=await fetch(`${API}/sync?u=${SYNC.conf.id}`,{method:'PUT',headers:hdrs({'content-type':'application/json'}),body:JSON.stringify(body),keepalive:JSON.stringify(body).length<60000});
    if(SYNC.conf!==conf){SYNC.busy=false;return}
    if(r.status===403){SYNC.busy=false;return denied(r)}
    if(r.status===409){SYNC.busy=false;SYNC.conf.rev=Math.min(SYNC.conf.rev||0,0);syncSave();return syncPull()}
    if(!r.ok)throw new Error('push '+r.status);const o=await r.json();SYNC.conf.rev=o.rev;SYNC.conf.dirty=false;delete SYNC.conf.wp;syncSave();await setBase(JSON.parse(JSON.stringify(state)));SYNC.status='ok';SYNC.err='';SYNC.last=Date.now();
    uploadPendingFiles();pushQueueSoon(1500)}
  catch(e){SYNC.status='offline';SYNC.err=String(e.message||e)}
  SYNC.busy=false}
let lastPushAt=0;
function schedulePush(ms=2500){clearTimeout(SYNC.timer);const wait=Math.max(ms,8000-(Date.now()-lastPushAt));SYNC.timer=setTimeout(()=>{lastPushAt=Date.now();syncPush()},wait)}
function onLocalSave(){if(SYNC.conf){SYNC.conf.dirty=true;syncSave();schedulePush()}pushQueueSoon()}
function hasContent(){try{return Object.keys(S.days||{}).length>0||(S.groc&&S.groc.items.length>0)||(S.dump||[]).length>0}catch(e){return false}}

/* ---------- merge: keeps the changes made on both devices ---------- */
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const byId=a=>Array.isArray(a)&&a.length>0&&a.every(x=>isObj(x)&&x.id!=null);
function merge3(base,mine,theirs,mineNewer){
  if(same(mine,theirs))return theirs;
  if(base!==undefined&&same(base,mine))return theirs;
  if(base!==undefined&&same(base,theirs))return mine;
  if(isObj(mine)&&isObj(theirs)){const o={},b=isObj(base)?base:{};for(const k of new Set([...Object.keys(mine),...Object.keys(theirs)])){
      const inM=k in mine,inT=k in theirs,inB=k in b;
      if(inM&&inT)o[k]=merge3(b[k],mine[k],theirs[k],mineNewer);
      else if(inM){if(!(inB&&same(b[k],mine[k])))o[k]=mine[k]}       // added here (or deleted there but changed here)
      else{if(!(inB&&same(b[k],theirs[k])))o[k]=theirs[k]}}
    return o}
  if((byId(mine)||mine&&mine.length===0)&&(byId(theirs)||theirs&&theirs.length===0)&&Array.isArray(mine)&&Array.isArray(theirs)){
    const bm=new Map((byId(base)?base:[]).map(x=>[x.id,x])),mm=new Map(mine.map(x=>[x.id,x])),tm=new Map(theirs.map(x=>[x.id,x]));
    const out=[],seen=new Set();
    const order=[...theirs.map(x=>x.id),...mine.map(x=>x.id)];
    for(const id of order){if(seen.has(id))continue;seen.add(id);const m=mm.get(id),t=tm.get(id),b=bm.get(id);
      if(m&&t)out.push(merge3(b,m,t,mineNewer));
      else if(m){if(!(b&&same(b,m)))out.push(m)}      // new here, or deleted there but edited here
      else if(t){if(!(b&&same(b,t)))out.push(t)}}
    return out}
  return mineNewer?mine:theirs}
function mergeStates(base,mine,theirs,mineNewer){try{return merge3(base||undefined,mine,theirs,mineNewer)}catch(e){return mineNewer?mine:theirs}}

/* ---------- sign in / password / recovery / devices ---------- */
async function syncLogin(user,pass){if(!API)throw new Error('Sign-in works on the published site.');
  const u=String(user||'').trim();if(!u||!pass)throw new Error('Type your username and password.');
  let p;try{p=await deriveAccount(u,pass)}catch(e){throw new Error('This browser cannot encrypt data ('+(e.message||e)+').')}
  const a=await authOf(p.raw);
  let r;try{r=await fetch(`${API}/sync?u=${p.id}`,{cache:'no-store',headers:{'x-auth':a}})}catch(e){const er=new Error('No internet connection. Connect to the internet to sign in.');er.offline=true;throw er}
  if(r.status===403||r.status===429){const o=await r.json().catch(()=>({}));throw new Error(refusal(o,r.status))}
  if(!r.ok)throw new Error(r.status===503?'Cloud storage is not connected (KV binding MDJ).':'The sync server answered with error '+r.status+'.');
  const rec=await apiJSON(r);SYNC.signingIn=true;try{
  if(rec.rev){let k=p.raw;if(rec.wp){try{k=await unwrapKey(rec.wp,p.key)}catch(e){throw new Error('Wrong username or password.')}}
    SYNC.conf={id:p.id,k,a,user:u.toLowerCase(),rev:0,dirty:false};SYNC.key=null;
    let remote;try{remote=await decryptState(rec)}catch(e){SYNC.conf=null;SYNC.key=null;throw new Error('Wrong username or password.')}
    if(hasContent()){try{await idbPut('snaps','before-sign-in-'+TK(),JSON.parse(JSON.stringify(S)))}catch(e){}}
    SYNC.conf.rev=rec.rev;syncSave();await setBase(remote);applyRemote(remote);fetchMissingFiles();
    if(!rec.wp)acctPost('wrap',{wp:await wrapKey(k,p.key)})}
  else{const k=b64(crypto.getRandomValues(new Uint8Array(32)));
    SYNC.conf={id:p.id,k,a,user:u.toLowerCase(),rev:0,dirty:true,wp:await wrapKey(k,p.key)};SYNC.key=null;syncSave();lastPushAt=0;await syncPush(true);
    if(SYNC.status==='offline'||!SYNC.conf){const m=SYNC.err;syncDisable();throw new Error('Could not create the account in the cloud: '+m)}
    markAllFilesPending();uploadPendingFiles()}
  await acctPost('session',{name:devName()});}finally{SYNC.signingIn=false}accountInfo().then(()=>{if(ROUTE==='settings')rerender()});
  SYNC.status='ok';SYNC.last=Date.now();syncStart();pushQueueSoon(500);return!!rec.rev}
async function acctPost(op,body,extraHdrs){const r=await fetch(`${API}/account?u=${SYNC.conf.id}`,{method:'POST',headers:hdrs({'content-type':'application/json',...(extraHdrs||{})}),body:JSON.stringify({op,...(body||{})})});
  const o=await r.json().catch(()=>({}));if(r.status===403&&o.signedOut){signedOut('This device was signed out from another device.');throw new Error('Signed out')}if(!r.ok)throw new Error(o.error||refusal(o,r.status));return o}
async function accountInfo(){if(!API||!SYNC.conf||SYNC.signingIn)return null;const conf=SYNC.conf;try{const r=await fetch(`${API}/account?u=${SYNC.conf.id}`,{cache:'no-store',headers:hdrs()});if(SYNC.conf!==conf)return null;if(r.status===403){denied(r);return null}if(!r.ok)return null;SYNC.acct=await r.json();return SYNC.acct}catch(e){return null}}
async function changePassword(cur,nw){if(!SYNC.conf||!SYNC.conf.user)throw new Error('Sign in first.');
  if(String(nw).length<4)throw new Error('The new password needs at least 4 characters.');
  const c=await deriveAccount(SYNC.conf.user,cur);if(await authOf(c.raw)!==SYNC.conf.a)throw new Error('Current password is not right.');
  const n=await deriveAccount(SYNC.conf.user,nw);const newAuth=await authOf(n.raw);
  await acctPost('password',{newAuth,wp:await wrapKey(SYNC.conf.k,n.key)});
  SYNC.conf.a=newAuth;syncSave();accountInfo();return true}
const CODE_ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(){const b=crypto.getRandomValues(new Uint8Array(20));let s='';for(const x of b)s+=CODE_ABC[x%CODE_ABC.length];return s.match(/.{4}/g).join('-')}
async function createRecovery(){const code=newCode();const r=await deriveRecovery(SYNC.conf.user,code);
  await acctPost('recovery',{rauth:await authOf(r.raw,'recover'),wr:await wrapKey(SYNC.conf.k,r.key)});accountInfo();return code}
async function resetWithRecovery(user,code,newPass){if(String(newPass).length<4)throw new Error('The new password needs at least 4 characters.');
  const u=String(user||'').trim().toLowerCase();const id=await acctId(u);const r=await deriveRecovery(u,code);const rauth=await authOf(r.raw,'recover');
  let res;try{res=await fetch(`${API}/account?u=${id}&op=recover`,{cache:'no-store',headers:{'x-rauth':rauth}})}catch(e){throw new Error('No internet connection.')}
  const o=await res.json().catch(()=>({}));if(res.status===403||res.status===429)throw new Error(refusal(o,res.status).replace('username or password','username or recovery code'));if(!res.ok)throw new Error(o.error||'Could not use the recovery code.');
  let k;try{k=await unwrapKey(o.wr,r.key)}catch(e){throw new Error('Wrong recovery code.')}
  const n=await deriveAccount(u,newPass);
  const r2=await fetch(`${API}/account?u=${id}`,{method:'POST',headers:{'content-type':'application/json','x-rauth':rauth,'x-dev':devId()},body:JSON.stringify({op:'reset',newAuth:await authOf(n.raw),wp:await wrapKey(k,n.key)})});
  if(!r2.ok){const e=await r2.json().catch(()=>({}));throw new Error(e.error||refusal(e,r2.status))}
  return syncLogin(u,newPass)}
const setHint=h=>acctPost('hint',{hint:h}).then(()=>accountInfo());
const signOutDevice=dev=>acctPost('signout',{dev}).then(o=>{if(SYNC.acct)SYNC.acct.devices=o.devices;return o});
const signOutOthers=()=>acctPost('signout',{others:true}).then(o=>{if(SYNC.acct)SYNC.acct.devices=o.devices;return o});
const renameDevice=(dev,name)=>acctPost('rename',{dev,name}).then(o=>{if(SYNC.acct)SYNC.acct.devices=o.devices;return o});
function syncDisable(){SYNC.busy=false;SYNC.conf=null;SYNC.key=null;SYNC.acct=null;BASE=null;SYNC.status='off';try{localStorage.removeItem('mdj-sync')}catch(e){}idbPut('state','base',null).catch?.(()=>{})}
let syncStarted=false;
async function syncInit(){SYNC.conf=syncConf();if(SYNC.conf&&!SYNC.conf.user){syncDisable()}if(!SYNC.conf)return;
  if(!SYNC.conf.a){SYNC.conf.a=await authOf(SYNC.conf.k);syncSave()} // accounts created with the previous version
  SYNC.status='…';syncPull().then(()=>syncPush());syncStart();setTimeout(()=>{uploadPendingFiles();fetchMissingFiles();accountInfo()},4000)}
function syncStart(){if(syncStarted)return;syncStarted=true;
  window.addEventListener('focus',()=>{if(SYNC.conf)syncPull()});window.addEventListener('pageshow',()=>{if(SYNC.conf)syncPull()});
  document.addEventListener('visibilitychange',()=>{if(!SYNC.conf)return;if(document.hidden){if(SYNC.conf.dirty){lastPushAt=0;syncPush()}}else syncPull()});
  window.addEventListener('online',()=>{if(SYNC.conf){syncPull().then(()=>syncPush());uploadPendingFiles()}});
  setInterval(()=>{if(SYNC.conf&&!document.hidden)syncPull()},20000)}

/* ---------------- attached files (encrypted, synced) ---------------- */
const MAX_FILE=15*1024*1024;
function allFileIds(){const ids=[];for(const m in S.mods||{})for(const l of (S.mods[m].links||[]))if(l.file)ids.push(l.file);return ids}
function pendingFiles(v){try{if(v)localStorage.setItem('mdj-fileq',JSON.stringify(v));return JSON.parse(localStorage.getItem('mdj-fileq')||'[]')}catch(e){return[]}}
function markFilePending(id){const q=pendingFiles();if(!q.includes(id)){q.push(id);pendingFiles(q)}}
function markAllFilesPending(){pendingFiles([...new Set([...pendingFiles(),...allFileIds()])])}
let filesBusy=false;
async function uploadPendingFiles(){if(!API||!SYNC.conf||filesBusy)return;filesBusy=true;
  try{for(const id of pendingFiles()){const f=await idbGet('files',id);if(!f){pendingFiles(pendingFiles().filter(x=>x!==id));continue}
      const bytes=new Uint8Array(await f.blob.arrayBuffer());const e=await enc(bytes);
      const r=await fetch(`${API}/file?u=${SYNC.conf.id}&f=${encodeURIComponent(id)}`,{method:'PUT',headers:hdrs({'content-type':'application/json'}),body:JSON.stringify({...e,name:f.name,type:f.blob.type||''})});
      if(r.status===403)break;if(!r.ok)break;pendingFiles(pendingFiles().filter(x=>x!==id))}}
  catch(e){}filesBusy=false}
async function downloadFile(id){const r=await fetch(`${API}/file?u=${SYNC.conf.id}&f=${encodeURIComponent(id)}`,{cache:'no-store',headers:hdrs()});
  if(r.status===404)throw new Error('This file is not in your account yet — open the app on the device where you added it.');
  if(!r.ok)throw new Error('Could not download the file ('+r.status+').');
  const o=await r.json();const bytes=await dec(o);const rec={name:o.name,blob:new Blob([bytes],{type:o.type||'application/octet-stream'})};await idbPut('files',id,rec);return rec}
/* a file removed from the trash for good is deleted on this device and in the account */
async function forgetFiles(entries){const used=new Set(allFileIds());for(const t of entries||[]){const f=t&&t.type==='link'&&t.data&&t.data.link&&t.data.link.file;if(!f||used.has(f))continue;
    try{await idbDel('files',f)}catch(e){}pendingFiles(pendingFiles().filter(x=>x!==f));
    if(API&&SYNC.conf)try{await fetch(`${API}/file?u=${SYNC.conf.id}&f=${encodeURIComponent(f)}`,{method:'DELETE',headers:hdrs()})}catch(e){}}}
async function fetchMissingFiles(){if(!API||!SYNC.conf)return;for(const id of allFileIds()){try{if(!await idbGet('files',id))await downloadFile(id)}catch(e){}}}

/* ---------------- reminders ---------------- */
const PUSH={status:null,sub:null,hash:null,timer:null,devs:null};
const notifFlag=v=>{try{if(v)localStorage.setItem('mdj-notif',v);return localStorage.getItem('mdj-notif')}catch(e){return null}};
const remindersOn=()=>('Notification'in window)&&Notification.permission==='granted'&&notifFlag()!=='off';
const REM_TYPES=[['morning','Morning to-do'],['dayBefore','Day before a deadline'],['three','Also 3 days before'],['streak','Streak reminder'],['groc','Groceries day'],['water','Water']];
const hm2h=t=>{const[h,m]=String(t||'0:0').split(':').map(Number);return h+(m||0)/60};
function waterHours(){const R=S.rem,a=hm2h(R.wfrom||'09:00'),b=hm2h(R.wto||'21:00'),e=Math.max(.5,+R.wevery||2),out=[];for(let h=a;h<=b+1e-9&&out.length<24;h+=e)out.push(h);return out}
const h2hm=h=>pad(Math.floor(h))+':'+pad(Math.round((h%1)*60));
/* which reminders THIS device shows (each device has its own choice) */
function devTypes(v){try{if(v)localStorage.setItem('mdj-remdev',JSON.stringify(v));const o=JSON.parse(localStorage.getItem('mdj-remdev')||'null');if(o)return o}catch(e){}
  const R=S.rem||{};return{morning:R.morning!==false,dayBefore:R.dayBefore!==false,three:R.three!==false,streak:R.streak!==false,groc:R.groc!==false,water:!!R.water}}
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function pushSupport(){if(!('serviceWorker'in navigator)||!('Notification'in window))return isIOS&&!isStandalone()?'ios-browser':'none';if(!('PushManager'in window))return isIOS&&!isStandalone()?'ios-browser':'local';return'push'}
async function acctQS(){return SYNC.conf?`acct=${SYNC.conf.id}&auth=${SYNC.conf.a}`:''}
async function pushServer(){if(!API)return null;try{const r=await fetch(`${API}/push?${await acctQS()}`,{cache:'no-store'});if(!r.ok)return null;PUSH.status=await r.json();PUSH.devs=PUSH.status.devices||null;return PUSH.status}catch(e){return null}}
async function currentSub(){try{const reg=await navigator.serviceWorker.getRegistration();return reg?await reg.pushManager.getSubscription():null}catch(e){return null}}
const within=(pr,ms)=>Promise.race([pr,new Promise((_,no)=>setTimeout(()=>no(new Error('no answer from the push service')),ms))]);
const okMsg=()=>{const st=PUSH.status||{};return st.cron&&Date.now()-st.cron<3*3600e3?'Reminders on — even when the app is closed ✓':'Reminders registered. They arrive when the app is closed once the reminder worker runs on Cloudflare.'};
async function enableNotifications(){const sup=pushSupport();notifFlag('on');
  if(sup==='ios-browser')return{ok:false,msg:'On iPhone and iPad, first add the app to your Home Screen (Share → Add to Home Screen), open it from the icon, then turn reminders on.'};
  if(sup==='none')return{ok:false,msg:'This browser does not support notifications.'};
  // iPhone/iPad: ask for push straight inside the tap (Safari needs the user gesture), key and worker prepared at start-up
  let early=null;if(sup==='push'&&PUSH.reg&&PUSH.status&&PUSH.status.key){try{early=PUSH.reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(PUSH.status.key)})}catch(e){early=null}}
  if(early){try{const sub=await within(early,12000);PUSH.sub=sub;PUSH.hash=null;await uploadQueue(true);return{ok:true,msg:okMsg()}}
    catch(e){if(Notification.permission==='denied')return{ok:false,msg:'Notifications are blocked. Allow them in your device settings for this app.'}}}
  const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(p!=='granted')return{ok:false,msg:p==='denied'?'Notifications are blocked. Allow them in your device settings for this app.':'Permission not given.'};
  if(sup==='local')return{ok:true,msg:'Reminders on (they show while the app is open).'};
  const st=await pushServer();if(!st||!st.key)return{ok:true,local:true,msg:'Reminders on while the app is open. To get them when the app is closed, the Cloudflare part must be online.'};
  try{const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await within(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(st.key)}),12000);PUSH.sub=sub;PUSH.hash=null;await uploadQueue(true);return{ok:true,msg:okMsg()}}
  catch(e){return{ok:true,local:true,msg:'Reminders on while the app is open ('+(e.message||e)+').'}}}
async function disableNotifications(){notifFlag('off');const sub=await currentSub();if(sub){try{await sub.unsubscribe()}catch(e){}}PUSH.sub=null;if(API)try{await fetch(`${API}/push?dev=${devId()}&${await acctQS()}`,{method:'DELETE'})}catch(e){}pushServer()}
function at(d,hm){const[h,m]=(hm||'00:00').split(':').map(Number);const x=new Date(d);x.setHours(h,m,0,0);return x.getTime()}
const REM_DAYS=30;
/* every reminder of the next 30 days, for all types — each device keeps only the types it wants */
function buildQueue(){const R=S.rem,q=[],now=Date.now(),t0=today();
  for(let i=0;i<REM_DAYS;i++){const d=addDays(t0,i),k=key(d);
    {const its=datedItems(k).filter(x=>!x.d);q.push({type:'morning',at:at(d,R.mtime),title:'Good morning ☀',body:its.length?`${its.length} thing${its.length>1?'s':''} today: ${its.slice(0,4).map(x=>x.t).join(' · ')}`:'Nothing planned today — enjoy ♡',tag:'m'+k,url:'./#today'})}
    {const due=datedItems(key(addDays(d,1))).filter(x=>x.mod&&!x.d);if(due.length)q.push({type:'dayBefore',at:at(d,R.dtime),title:'Due tomorrow',body:due.map(x=>x.t).join(' · '),tag:'d'+k,url:'./#cal'})}
    {const due=datedItems(key(addDays(d,3))).filter(x=>x.mod&&!x.d);if(due.length)q.push({type:'three',at:at(d,R.dtime)+60e3,title:'Due in 3 days',body:due.map(x=>x.t).join(' · '),tag:'t'+k,url:'./#cal'})}
    if(!S.active[k])q.push({type:'streak',at:at(d,R.stime||'21:00'),title:'Keep your streak 🎀',body:'Tick one thing in your planner today ♡',tag:'s'+k,url:'./#week'});
    if(d.getDay()===(+R.gday||0)&&S.groc.items.length)q.push({type:'groc',at:at(d,R.gtime||'09:00'),title:'Groceries day 🛒',body:`${S.groc.items.length} items on your list · budget ${rs(S.groc.budget)}`,tag:'g'+k,url:'./#groc'});
    for(const h of waterHours())q.push({type:'water',at:at(d,h2hm(h)),title:'Water time 💧',body:`Goal: ${S.waterGoal} glasses today`,tag:'w'+k+h2hm(h),url:'./#kcal'});
  }
  return q.filter(x=>x.at>now).sort((a,b)=>a.at-b.at)}
/* any signed-in device refreshes the reminders of ALL devices of the account */
async function uploadQueue(force){if(!API)return;const sub=PUSH.sub||(remindersOn()?await currentSub():null);if(sub)PUSH.sub=sub;
  if(!sub&&!SYNC.conf)return;
  const queue=buildQueue(),types=devTypes(),h=JSON.stringify([queue,types,!!sub,SYNC.conf&&SYNC.conf.id]);if(!force&&h===PUSH.hash)return;
  const body={dev:devId(),name:devName(),types,queue};if(sub)body.sub=sub.toJSON();if(SYNC.conf){body.acct=SYNC.conf.id;body.auth=SYNC.conf.a}
  try{const r=await fetch(`${API}/push`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.ok){PUSH.hash=h;const o=await r.json().catch(()=>({}));if(o.devices)PUSH.devs=o.devices}}catch(e){}}
/* focus timer: the end is sent as a real notification (arrives even when the phone is locked) */
async function focusPush(){if(!API)return;const sub=PUSH.sub||(remindersOn()?await currentSub():null);if(!sub)return;const F=S.focus;
  const extra=F.run&&!F.run.paused&&F.run.end>Date.now()?[{at:F.run.end,title:F.mode==='work'?'Focus session done ✦':'Break is over',body:F.mode==='work'?'Time for a break ♡':'Ready for another focus session?',url:'./#focus'}]:[];
  const body={dev:devId(),name:devName(),sub:sub.toJSON(),extra};if(SYNC.conf){body.acct=SYNC.conf.id;body.auth=SYNC.conf.a}
  try{await fetch(`${API}/push`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})}catch(e){}}
function pushQueueSoon(ms=6000){clearTimeout(PUSH.timer);PUSH.timer=setTimeout(()=>uploadQueue(),ms)}
async function setDeviceOn(dev,on){if(!API||!SYNC.conf)return;try{const r=await fetch(`${API}/push`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({acct:SYNC.conf.id,auth:SYNC.conf.a,setDev:dev,on:!!on,queue:buildQueue()})});const o=await r.json().catch(()=>({}));if(o.devices)PUSH.devs=o.devices}catch(e){}}
async function pushInit(){if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(r=>{PUSH.reg=r}).catch(()=>{});
  if(pushSupport()==='push'&&remindersOn())PUSH.sub=await currentSub();await pushServer();if(PUSH.sub||SYNC.conf)uploadQueue(true)}
const serverPushActive=()=>!!(PUSH.sub&&PUSH.status&&PUSH.status.cron&&Date.now()-PUSH.status.cron<3*3600e3);
