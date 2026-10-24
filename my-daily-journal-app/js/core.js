/* ============ MY DAILY JOURNAL — core (state, storage, helpers) ============ */
'use strict';
const APP_VERSION='6.9';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseKey=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS3=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dow=d=>(d.getDay()+6)%7;
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const TK=()=>key(today());
const fmtDay=d=>`${DAYS3[dow(d)]} ${d.getDate()} ${MON3[d.getMonth()]}`;
const rs=n=>'Rs '+(Math.round((+n||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?0:n};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- semester (configurable in Settings) ---------- */
const BLOCKS=[];
function buildBlocks(){const c=(typeof S!=='undefined'&&S&&S.sem)||{start:'2026-10-19',weeks:15,breakAfter:9,breakLen:3};
  BLOCKS.length=0;const st=parseKey(c.start||'2026-10-19');const W=clamp(+c.weeks||15,1,30),bA=clamp(+c.breakAfter||0,0,W),bL=clamp(+c.breakLen||0,0,8);
  let w=0,b=0;for(let k=0;k<W+bL;k++){const brk=bL>0&&k>=bA&&k<bA+bL;brk?b++:w++;const s=addDays(st,7*k);BLOCKS.push({i:k,id:brk?'b'+b:'w'+w,num:brk?b:w,brk,bl:bL,start:s,end:addDays(s,6)})}}
const blockOf=d=>BLOCKS.findIndex(b=>d>=b.start&&d<=b.end);
const blockName=b=>b.brk?`Midterm break ${b.num}/${b.bl}`:`Week ${b.num}`;
const isOnline=b=>!b.brk&&((b.num%2===1)!==!!S.set.swapWeeks);
const modeTag=b=>b.brk?'<span class="tag t-brk">break</span>':isOnline(b)?'<span class="tag t-on">online</span>':'<span class="tag t-f2f">face to face</span>';
const fmtRange=b=>`${b.start.getDate()} ${MON3[b.start.getMonth()]} – ${b.end.getDate()} ${MON3[b.end.getMonth()]}`;
const nowBlock=()=>{let i=blockOf(today());if(i<0)i=today()<BLOCKS[0].start?0:BLOCKS.length-1;return i};

/* ---------- modules ---------- */
const MODS=[
 {id:'gedm',short:'GEDM',name:'Gender Equality & Diversity Management',col:'var(--c-gedm)',hex:'#B4506C'},
 {id:'shrm',short:'SHRM',name:'Strategic Human Resource Management',col:'var(--c-shrm)',hex:'#5d7653'},
 {id:'hris',short:'HRIS',name:'Human Resource Information System',col:'var(--c-hris)',hex:'#4d6c8c'},
 {id:'km',short:'KM',name:'Knowledge Management',col:'var(--c-km)',hex:'#9a7b2a'},
 {id:'diss',short:'Dissertation',name:'Dissertation',col:'var(--c-diss)',hex:'#7d4a77'},
 {id:'dump',short:'Brain dump',name:'Brain dump',col:'var(--c-task)',hex:'#A44C61'}];
const MOD_BASE=MODS.map(m=>({...m}));
function applyModCfg(){for(const m of MODS){const b=MOD_BASE.find(x=>x.id===m.id),c=(S.modCfg||{})[m.id]||{};m.name=c.name||b.name;m.short=c.short||b.short;m.cover=c.cover||null}}
const coverSrc=m=>m.cover||`assets/${m.id}.webp`;
const modShort=m=>m.short.length>10?m.short.slice(0,9)+'.':m.short;
const modById=id=>MODS.find(m=>m.id===id);

/* ---------- foods ---------- */
const FOOD_CATS={starch:'Starches',prot:'Protein',veg:'Vegetables',fruit:'Fruit',dairy:'Dairy',fat:'Fats & sugar',other:'Other'};
// [name,kcal,cat,step,unit] unit: g → per 100 g · ml → per 100 ml · other → per piece
const DEFAULT_FOODS=[
 ['Basmati rice (raw)',352,'starch',10,'g'],['Pasta (raw)',356,'starch',10,'g'],['Soba noodles (raw)',350,'starch',10,'g'],['Weetabix',133,'starch',1,'unit'],
 ['Chicken breast (raw)',120,'prot',10,'g'],['Lean beef (raw)',150,'prot',10,'g'],['Ground beef (raw)',225,'prot',10,'g'],['Sausage (34 g)',67,'prot',1,'unit'],['Tuna',106,'prot',10,'g'],['Egg (55 g +)',80,'prot',1,'unit'],
 ['Carrot (raw)',41,'veg',10,'g'],['Onion (raw)',40,'veg',10,'g'],['Garlic (≈ 3 g)',4.5,'veg',1,'clove'],['Tomato',18,'veg',10,'g'],['Green beans',32,'veg',10,'g'],['Peas',83,'veg',10,'g'],['Lettuce',15,'veg',10,'g'],
 ['Apple',69,'fruit',1,'unit'],
 ['Silhouette milk',38,'dairy',50,'ml'],['Fromage blanc (30 g)',44,'dairy',1,'portion'],
 ['Oil',120,'fat',1,'tbsp'],['Butter',717,'fat',5,'g'],['Brown sugar',380,'fat',5,'g']
].map(([n,k,c,st,u],i)=>({id:'f'+(i+1),name:n,kcal:k,cat:c,step:st,unit:u}));
const perPiece=f=>!(f.unit==='g'||f.unit==='ml');
const kOf=(f,q)=>perPiece(f)?q*f.kcal:q*f.kcal/100;
const perLbl=f=>perPiece(f)?`kcal / ${f.unit}`:`kcal / 100 ${f.unit}`;
const qLbl=f=>({unit:'u',portion:'port.',tbsp:'tbsp',clove:'clove'}[f.unit]||f.unit);

/* ---------- state ---------- */
const KEY='mdj-v2';
const blank=()=>({v:2,days:{},weeks:{},rec:[],recDone:{},recSkip:{},
  mods:Object.fromEntries(MODS.map(m=>[m.id,{todo:[],assign:[],tuto:[],lect:[],links:[],tests:[{id:uid(),name:'Test 1',score:'',weight:15},{id:uid(),name:'Test 2',score:'',weight:15}],examW:70,target:'A'}])),
  dump:[],foods:DEFAULT_FOODS.map(f=>({...f})),cal:{},calGoal:1600,
  groc:{budget:1300,approved:0,items:[],receipts:[],prices:{}},
  focus:{work:25,short:5,long:15,log:[],run:null,mod:'gedm',mode:'work',done:0},
  active:{},best:0,stickers:{},trash:[],sent:{},
  lock:{faceId:null},pin:{pin:null,salt:null,after:1},
  cfg:{lists:{todo:'To-do',assign:'Assignments',tuto:'Tutorials',lect:'Lectures',chapters:'Chapters'},status:{assign:['to do','in progress','submitted'],lect:['not started','to review','notes done'],tuto_diss:['draft','sent','corrected','final']},grades:{A:70,B:60,C:50,D:40},foodCats:{starch:'Starches',prot:'Protein',veg:'Vegetables',fruit:'Fruit',dairy:'Dairy',fat:'Fats & sugar',other:'Other'}},
  rem:{plan:true,ptime:'19:00',morning:true,mtime:'07:30',dayBefore:true,dtime:'19:00',stime:'21:00',gday:6,gtime:'09:00',wfrom:'09:00',wto:'21:00',wevery:2,three:true,streak:true,groc:true,water:false},
  set:{theme:'rose',dark:'auto',swapWeeks:false,testsW:30,intro:true},
  prof:{name:'Mihaingo',hello:'Hello',tagline:'más amor, por favor',label:'Year 3 · Semester 2',big1:'26',big2:'27',spine:'my daily journal',t1:'MY',t2:'Daily',t3:'JOURNAL',footer:'thank you & see you next week ♡',menuTitle:'Menu'},
  sem:{start:'2026-10-19',weeks:15,breakAfter:9,breakLen:3},modCfg:{},waterGoal:8,
  ui:{week:null,cal:null,todayKey:null,kcalKey:null,grocTab:'list',modTab:{},menuSeed:0}});
let S;
function load(){
  try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
  if(!S||typeof S!=='object'||!S.v){S=blank();migrateOld()}
  const b=blank();for(const k in b){if(S[k]===undefined)S[k]=b[k]}
  for(const k in b.set)if(S.set[k]===undefined)S.set[k]=b.set[k];
  for(const k in b.rem)if(S.rem[k]===undefined)S.rem[k]=b.rem[k];
  for(const k in b.prof)if(S.prof[k]===undefined)S.prof[k]=b.prof[k];
  for(const k in b.sem)if(S.sem[k]===undefined)S.sem[k]=b.sem[k];
  for(const m of MODS)if(!S.mods[m.id])S.mods[m.id]=b.mods[m.id];
  const cut=Date.now()-30*864e5;const gone=S.trash.filter(t=>t.ts<=cut);S.trash=S.trash.filter(t=>t.ts>cut);if(gone.length)setTimeout(()=>{try{forgetFiles(gone)}catch(e){}},5000);
  afterLoad();
}
function migrateOld(){
  let o=null;try{o=JSON.parse(localStorage.getItem('planner-y3s2-v1'))}catch(e){}
  if(!o)return;
  if(o.days)for(const[k,d]of Object.entries(o.days)){S.days[k]={tasks:(d.tasks||[]).map(t=>({id:uid(),t:t.t,d:!!t.d})),note:d.note||''}}
  if(o.weeks)for(const[k,w]of Object.entries(o.weeks)){S.weeks[k]={goals:(w.goals||[]).map(g=>({id:uid(),t:g.t,d:!!g.d})),prio:w.prio||'',notes:w.notes||'',habits:w.habits||[],hab:w.hab||{}}}
  if(o.calGoal)S.calGoal=+o.calGoal||1600;
  if(o.cal)for(const[k,c]of Object.entries(o.cal)){if(c&&c.water)S.cal[k]={q:{},water:c.water,extra:(c.extra||[]).map(x=>({id:uid(),t:x.t,k:x.k}))}}
}
let saveT=null,saveListeners=[],lastBody=null;
function contentOf(){const o={};for(const k in S)if(!['lock','ui','sent','mt'].includes(k))o[k]=S[k];return JSON.stringify(o)}
/* undo / redo for every change (typing in a row counts as one step) */
let UNDO=[],REDO=[],undoAt=0,noHist=false;
function histPush(prev){const now=Date.now(),ae=document.activeElement,typing=ae&&ae.matches&&ae.matches('input,textarea,[contenteditable="true"]');if(!typing||now-undoAt>1500||!UNDO.length){UNDO.push(prev);if(UNDO.length>40)UNDO.shift()}undoAt=now;REDO=[];histUi()}
function histApply(from,to,label){save(true);if(!from.length)return toast(label==='undo'?'Nothing to undo':'Nothing to redo');to.push(lastBody);const body=from.pop();
  const keep={};for(const k of['lock','ui','sent','mt'])keep[k]=S[k];S=Object.assign(JSON.parse(body),keep);noHist=true;load2();save(true);noHist=false;undoAt=0;applyTheme&&applyTheme();render(true);histUi();toast(label==='undo'?'Undone ↶':'Redone ↷')}
const undo=()=>histApply(UNDO,REDO,'undo'),redo=()=>histApply(REDO,UNDO,'redo');
function histUi(){document.querySelectorAll('[data-act=undo]').forEach(b=>b.classList.toggle('off',!UNDO.length));document.querySelectorAll('[data-act=redo]').forEach(b=>b.classList.toggle('off',!REDO.length))}
function save(now){clearTimeout(saveT);const run=()=>{const b=contentOf(),changed=b!==lastBody;if(changed){if(!noHist&&lastBody)histPush(lastBody);S.mt=Date.now();lastBody=b}
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Storage is full — export a backup in Settings')}idbPut('state','current',S);snapshot();if(changed)saveListeners.forEach(f=>{try{f()}catch(e){}})};now?run():(saveT=setTimeout(run,120))}
/* IndexedDB: mirror + daily snapshots + attached files */
let _db=null;
function idb(){if(_db)return _db;_db=new Promise((res,rej)=>{if(!('indexedDB'in window))return rej('no idb');const r=indexedDB.open('mdj',1);r.onupgradeneeded=()=>{const db=r.result;['state','snaps','files'].forEach(n=>db.objectStoreNames.contains(n)||db.createObjectStore(n))};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return _db}
async function idbPut(store,k,v){try{const db=await idb();db.transaction(store,'readwrite').objectStore(store).put(v,k)}catch(e){}}
async function idbGet(store,k){try{const db=await idb();return await new Promise(r=>{const q=db.transaction(store).objectStore(store).get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)})}catch(e){return null}}
async function idbKeys(store){try{const db=await idb();return await new Promise(r=>{const q=db.transaction(store).objectStore(store).getAllKeys();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>r([])})}catch(e){return[]}}
async function idbDel(store,k){try{const db=await idb();db.transaction(store,'readwrite').objectStore(store).delete(k)}catch(e){}}
let lastSnap=null;
async function snapshot(){const k=TK();if(lastSnap===k)return;lastSnap=k;await idbPut('snaps',k,JSON.parse(JSON.stringify(S)));const ks=(await idbKeys('snaps')).sort();while(ks.length>7)await idbDel('snaps',ks.shift())}
async function recoverIfEmpty(){ // if localStorage was wiped but IndexedDB still has data
  if(localStorage.getItem(KEY))return false;const st=await idbGet('state','current');if(st&&st.v){S=st;load2();return true}return false}
function load2(){const b=blank();for(const k in b)if(S[k]===undefined)S[k]=b[k];for(const g of['set','rem','prof','sem','cfg','pin'])for(const k in b[g])if(S[g][k]===undefined)S[g][k]=b[g][k];afterLoad()}
function linkArr(mod,w){const M=S.mods[mod];if(!w||w==='gen')return M.links;M.sec=M.sec||{};return M.sec[w]=M.sec[w]||[]}
function afterLoad(){try{for(const m in S.mods||{})for(const x of (S.mods[m].todo||[]))if(x.date){x.work=x.work||[];if(!x.work.some(w=>w.k===x.date))x.work.push({k:x.date,d:!!x.d});delete x.date}}catch(e){}try{for(const m in S.mods||{})for(const l of['assign','lect','tuto'])for(const x of (S.mods[m][l]||[]))if(isGauge(m,l)&&x.p==null&&x.st!=null){x.p=itemP(m,l,x)}}catch(e){}if(!noHist){UNDO=[];REDO=[]}if(S.lock&&S.lock.pin&&!(S.pin&&S.pin.pin)){S.pin={pin:S.lock.pin,salt:S.lock.salt,after:S.lock.after||1}}if(S.lock){delete S.lock.pin;delete S.lock.salt;delete S.lock.after}buildBlocks();applyModCfg();lastBody=contentOf()}

/* ---------- activity / streak ---------- */
function markActive(){const k=TK();if(!S.active[k]){S.active[k]=1;const s=streak();if(s>S.best)S.best=s}}
function streak(){let n=0,d=today();if(!S.active[key(d)])d=addDays(d,-1);while(S.active[key(d)]){n++;d=addDays(d,-1)}return n}

/* ---------- trash & undo ---------- */
function trash(type,label,data){const e={id:uid(),ts:Date.now(),type,label,data};S.trash.unshift(e);save();toast(`“${label}” deleted`,()=>restore(e.id));return e}
function restore(id){const i=S.trash.findIndex(t=>t.id===id);if(i<0)return;const e=S.trash[i],d=e.data;S.trash.splice(i,1);
  const ins=(arr,idx,x)=>arr.splice(Math.min(idx??arr.length,arr.length),0,x);
  switch(e.type){
    case'task':(S.days[d.k]||(S.days[d.k]={tasks:[],note:''})).tasks.splice(d.idx,0,d.task);break;
    case'rec':ins(S.rec,d.idx,d.rec);break;
    case'goal':ins(wk(d.wid).goals,d.idx,d.goal);break;
    case'groc':ins(S.groc.items,d.idx,d.item);break;
    case'receipt':ins(S.groc.receipts,d.idx,d.r);break;
    case'dump':ins(S.dump,d.idx,d.n);break;
    case'mod':ins(S.mods[d.mod][d.list],d.idx,d.item);break;
    case'todolink':{const x=(S.mods[d.mod][d.list]||[]).find(y=>y.id===d.id);if(x)delete x.noTodo;break}
    case'link':ins(linkArr(d.mod,d.w),d.idx,d.link);break;
    case'test':ins(S.mods[d.mod].tests,d.idx,d.test);break;
    case'food':ins(S.foods,d.idx,d.food);break;
    case'extra':ins(calDay(d.k).extra,d.idx,d.x);break;
    case'habit':{const w=wk(d.wid);w.habits.splice(d.idx,0,d.name);break}
  }
  save();render();toast('Restored ✓');}

/* ---------- toast ---------- */
let toastT=null;
function toast(msg,undo){if(!msg)return;const t=$('#toast');t.innerHTML=`<span>${esc(msg)}</span>${undo?'<button>Undo</button>':''}`;t.classList.add('show');if(undo)t.querySelector('button').onclick=()=>{t.classList.remove('show');undo()};clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),undo?5200:2400)}

/* ---------- sheet ---------- */
function sheet(html,onMount){const bg=$('#sheetbg'),sh=$('#sheet');sh.innerHTML='<div class="grab"></div>'+html;bg.classList.add('show');sh.classList.add('show');onMount&&onMount(sh)}
function closeSheet(){$('#sheetbg').classList.remove('show');$('#sheet').classList.remove('show')}

/* ---------- day data ---------- */
function dayData(k){return S.days[k]||(S.days[k]={tasks:[],note:''})}
function wk(id){return S.weeks[id]||(S.weeks[id]={goals:[{id:uid(),t:'',d:false},{id:uid(),t:'',d:false},{id:uid(),t:'',d:false}],prio:'',notes:'',habits:['Drink water','Workout','Reading','Revision'],hab:{}})}
function recFor(k){const d=parseKey(k),w=dow(d);return S.rec.filter(r=>r.dow.includes(w)&&k>=r.from&&!S.recSkip[k+'|'+r.id])}
function dayItems(k){const real=(S.days[k]?.tasks||[]).map(t=>({...t,k}));const rec=recFor(k).map(r=>({id:'r:'+r.id,rid:r.id,t:r.t,d:!!S.recDone[k+'|'+r.id],time:r.time,end:r.end,rec:true,k}));return[...rec,...real]}
function calDay(k){const D=S.cal[k]||(S.cal[k]={q:{},water:0,extra:[]});D.q=D.q||{};D.extra=D.extra||[];return D}
function dayKcal(k){const D=S.cal[k];if(!D)return 0;let t=0;for(const f of S.foods)t+=kOf(f,+(D.q||{})[f.id]||0);(D.extra||[]).forEach(x=>t+=+x.k||0);return Math.round(t)}

/* ---------- module progress ---------- */
const LISTS={todo:'To-do',assign:'Assignments',tuto:'Tutorials',lect:'Lectures'};
const CFG=()=>S.cfg||{};
const listLabel=(mod,l)=>(mod==='diss'&&l==='tuto'?(CFG().lists||{}).chapters||'Chapters':(CFG().lists||{})[l]||LISTS[l]);
const statusOf=k=>{const v=(CFG().status||{})[k];return Array.isArray(v)&&v.length?v:STATUS[k]};
const foodCats=()=>({...FOOD_CATS,...(CFG().foodCats||{})});
const gradeMins=()=>{const g=CFG().grades||{};return{A:+g.A||70,B:+g.B||60,C:+g.C||50,D:+g.D||40}};
const STATUS={assign:['to do','in progress','submitted'],lect:['not started','to review','notes done'],tuto_diss:['draft','sent','corrected','final']};
/* progress of a notebook item: a gauge (0–100 %) for assignments, lectures and dissertation chapters, a tick for the others */
const isGauge=(mod,l)=>l==='assign'||l==='lect'||(l==='tuto'&&mod==='diss');
function itemP(mod,l,x){if(isGauge(mod,l)){if(x.p!=null)return +x.p||0;if(x.st!=null){const n=(STATUS[l==='tuto'?'tuto_diss':l]||[0,0,0]).length;return Math.round(Math.min(x.st,n-1)/(n-1)*100)}return 0}return x.d?100:0}
const itemDone=(mod,l,x)=>itemP(mod,l,x)>=100;
/* To-do of a notebook = its own to-dos + every assignment / tutorial / lecture (unless removed from To-do).
   Each entry can have work days (x.work=[{k,d}]) that show in My week; deadlines (x.date) of assignments/tutorials/lectures go to the Calendar. */
function todoEntries(mod){const M=S.mods[mod],out=[];(M.todo||[]).forEach((x,j)=>out.push({x,l:'todo',j,own:true}));
  for(const l of['assign','tuto','lect'])(M[l]||[]).forEach((x,j)=>{if(!x.noTodo)out.push({x,l,j,own:false})});return out}
const entryDone=(mod,e)=>e.own?!!e.x.d:itemDone(mod,e.l,e.x);
/* days until a deadline (negative = late) */
const daysTo=k=>Math.round((parseKey(k)-today())/864e5);
function dueLabel(k){const n=daysTo(k);return n===0?'due today':n===1?'tomorrow':n>1?`in ${n} days`:n===-1?'1 day late':`${-n} days late`}
const notPlanned=(mod,e)=>!e.own&&!!e.x.date&&!entryDone(mod,e)&&!(e.x.work||[]).length;
/* To-do order: ★ first, then nearest deadline, finished at the bottom */
function todoSorted(mod){const key=e=>e.x.date||((e.x.work||[])[0]||{}).k||'9999';return todoEntries(mod).sort((a,b)=>(entryDone(mod,a)-entryDone(mod,b))||((b.x.star?1:0)-(a.x.star?1:0))||(key(a)<key(b)?-1:key(a)>key(b)?1:0))}
/* work days left undone before today (last 7 days) */
function missedWork(){const out=[],t=TK(),from=key(addDays(today(),-7));for(const m of MODS){if(m.id==='dump'||!S.mods[m.id])continue;for(const e of todoEntries(m.id)){if(entryDone(m.id,e))continue;(e.x.work||[]).forEach((w,wi)=>{if(!w.d&&!w.skip&&w.k<t&&w.k>=from)out.push({m,...e,w,wi})})}}return out}
/* to hand in between two dates, not finished, no work day yet */
function toPlan(k1,k2){const out=[];for(const m of MODS){if(m.id==='dump'||!S.mods[m.id])continue;for(const e of todoEntries(m.id))if(e.x.date&&e.x.date>=k1&&e.x.date<=k2&&notPlanned(m.id,e))out.push({m,...e})}return out.sort((a,b)=>a.x.date<b.x.date?-1:1)}
function deadlinesBetween(k1,k2){const out=[];for(const m of MODS){if(m.id==='dump'||!S.mods[m.id])continue;for(const e of todoEntries(m.id))if(e.x.date&&e.x.date>=k1&&e.x.date<=k2&&!entryDone(m.id,e))out.push({m,...e})}return out.sort((a,b)=>a.x.date<b.x.date?-1:1)}
/* "Plan for me": spread n work days before the deadline, on the least busy days */
function dayLoad(k){return dayItems(k).length+workOn(k).length}
function suggestDays(x,n){const t=today(),last=addDays(parseKey(x.date),-1),have=new Set((x.work||[]).map(w=>w.k));const days=[];for(let d=t;d<=last;d=addDays(d,1)){const k=key(d);if(!have.has(k))days.push(k)}
  if(!days.length)return[];n=Math.max(1,Math.min(n,days.length));const out=[];for(let i=0;i<n;i++){const a=Math.floor(i*days.length/n),b=Math.floor((i+1)*days.length/n);const seg=days.slice(a,Math.max(b,a+1));seg.sort((p,q)=>dayLoad(p)-dayLoad(q)||(p<q?-1:1));out.push(seg[0])}return[...new Set(out)].sort()}
function workOn(k){const out=[];for(const m of MODS){if(m.id==='dump'||!S.mods[m.id])continue;for(const e of todoEntries(m.id))(e.x.work||[]).forEach((w,wi)=>{if(w.k===k)out.push({m,...e,w,wi})})}return out.sort((a,b)=>(b.x.star?1:0)-(a.x.star?1:0))}
function listStats(mod,l){if(l==='todo'){const es=todoEntries(mod);const d=es.filter(e=>entryDone(mod,e)).length;return{n:es.length,d,p:es.length?d/es.length:0}}const a=S.mods[mod][l];const n=a.length;let d=0,sum=0;for(const x of a){const p=itemP(mod,l,x);sum+=p;if(p>=100)d++}return{n,d,p:n?sum/n/100:0}}
function modProgress(mod){const own=S.mods[mod].todo||[];const ls=[{n:own.length,p:own.length?own.filter(x=>x.d).length/own.length:0},...['assign','tuto','lect'].map(l=>listStats(mod,l))].filter(s=>s.n);return ls.length?ls.reduce((a,s)=>a+s.p,0)/ls.length:0}
function gradeNeeds(mod){const M=S.mods[mod];let got=0,tw=0;for(const t of M.tests){tw+=num(t.weight);const out=num(t.out)>0?num(t.out):100;got+=Math.min(num(t.score),out)/out*num(t.weight)}
  const ew=num(M.examW);const need=T=>ew?(T-got)/(ew/100):Infinity;
  return{got,tw,ew,ok:Math.abs(tw+ew-100)<.01,grades:(()=>{const m=gradeMins();return[['A',m.A+'–100',m.A],['B',m.B+'–'+(m.A-1),m.B],['C',m.C+'–'+(m.B-1),m.C],['D',m.D+'–'+(m.C-1),m.D],['F','< '+m.D,0]]})().map(([g,r,T])=>({g,r,T,need:g==='F'?null:Math.max(0,Math.ceil(need(T)-1e-9))}))}}

/* ---------- all dated items (for calendar / today / reminders) ---------- */
/* what is planned on a day: tasks, deadlines and binder work days (Home, Today, My week PDF, morning reminder) */
function dayPlan(k){return[...datedItems(k),...workOn(k).map(e=>({k,t:`${e.m.short} · ${e.x.t}`,d:!!e.w.d,col:e.m.col,src:e.m.short,work:true}))]}
function datedItems(k){
  const out=[];for(const t of dayItems(k))out.push({k,t:t.t,d:t.d,time:t.time,end:t.end,col:'var(--c-task)',src:'Task',rec:t.rec});
  for(const m of MODS)for(const l of['assign','tuto','lect'])for(const x of S.mods[m.id][l])if(x.date===k)out.push({k,t:`${m.short} · ${x.t} due`,d:itemDone(m.id,l,x),p:itemP(m.id,l,x),col:m.col,src:m.short,mod:m.id,list:l});
  for(const r of S.groc.receipts)if(r.date===k)out.push({k,t:`Groceries · ${rs(r.real)}`,d:true,col:'var(--c-groc)',src:'Groceries'});
  return out}
