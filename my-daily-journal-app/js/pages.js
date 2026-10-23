/* ============ MY DAILY JOURNAL — pages ============ */
'use strict';
const I=(id,c='ic')=>`<svg class="${c}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const BOW=`<svg viewBox="0 0 120 92" style="width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M60 34 C48 16 20 8 15 23 C10 39 40 43 59 37"/><path d="M60 34 C72 16 100 8 105 23 C110 39 80 43 61 37"/><ellipse cx="60" cy="35.5" rx="5.5" ry="5"/><path d="M56 40 C50 54 41 64 36 82 C42 77 47 79 50 86 C54 70 57 56 59 41"/><path d="M64 40 C70 56 81 66 86 84 C80 79 75 81 72 88 C68 72 63 57 61 41"/></svg>`;
const P=()=>S.prof;
const logoTxt=()=>`${esc(P().t1)} <em>${esc(P().t2)}</em> ${esc(P().t3)}`;
const brand=(act='')=>`<header class="brand"><img src="icon-192.png" alt=""><span class="nm">${logoTxt()}</span><div class="act">${act}</div></header>`;
const title=(a,b,k='')=>`<div class="ttl"><div class="t"><em>${a}</em> ${b}</div><span class="k">${k}</span></div>`;
const box=(on,act,attrs='')=>`<button class="box ${on?'on':''}" data-act="${act}" ${attrs} aria-label="Tick"></button>`;
const NAV=[['home','home','Home'],['week','week','Week'],['cal','cal','Calendar'],['sem','sem','Semester'],['kcal','kcal','Calories'],['groc','bask','Groceries'],['binder','binder','Binder']];
function barHtml(route){const sec={home:'home',week:'week',today:'cal',cal:'cal',sem:'sem',wrapped:'sem',kcal:'kcal',groc:'groc',binder:'binder',mod:'binder',dump:'binder',focus:'home',stickers:'home',settings:'home',trash:'home'}[route]||'home';
  return `<nav class="bar"><div class="sidebrand"><img src="icon-192.png" alt=""><span>${esc(P().t1)} <em>${esc(P().t2)}</em><br>${esc(P().t3)}</span></div>${NAV.map(([r,i,l])=>`<a href="#${r}" class="${sec===r?'on':''}">${I(i)}<span>${l}</span></a>`).join('')}<div class="sidemore"><a href="#focus">◷ <span>Focus</span></a><a href="#stickers">★ <span>Stickers</span></a><a href="#settings">⚙ <span>Settings</span></a></div></nav>`}

/* ================= HOME ================= */
function pHome(){
  const t=today(),bi=blockOf(t),b=bi>=0?BLOCKS[bi]:null;
  const its=datedItems(TK()),left=its.filter(x=>!x.d).length;
  const st=streak();const G=S.groc;const planned=G.items.reduce((a,x)=>a+x.qty*x.price,0);
  const next=upcoming(14).find(x=>x.mod&&!x.d);
  return `<div class="page nobar">
  <div class="hero"><div class="spine"><span>${esc(P().spine)}</span></div><div class="cv"><div class="big">${esc(P().big1)}<br>${esc(P().big2)}</div>
   <span class="k" style="position:relative;color:inherit">${esc(P().label)}</span>
   <h1>${esc(P().t1)} <em>${esc(P().t2)}</em><br>${esc(P().t3)}</h1><span class="tag2">${esc(P().tagline)}</span>
   <span class="chipd">${fmtDay(t)} · ${b?blockName(b)+(b.brk?'':' · '+(isOnline(b)?'online':'face to face')):'off semester'}</span></div></div>
  <div class="hello"><em>${esc(P().hello)} ${esc(P().name)}</em><span class="k">where to today?</span>
   <a href="#stickers" class="streak" style="text-decoration:none"><span style="width:18px;height:14px;display:inline-block">${BOW}</span>${st}-day streak</a></div>
  <div class="tiles">
   <a class="tile" href="#week" style="--c:var(--pink)">${I('week')}<div class="tn">Week</div><div class="ts">${b?blockName(b):'Planner'}${b&&!b.brk?' · '+(isOnline(b)?'online':'F2F'):''}</div><span class="arr">›</span></a>
   <a class="tile" href="#cal" style="--c:var(--sage)">${I('cal')}<div class="tn">Calendar</div><div class="ts">${left} left today</div><span class="arr">›</span></a>
   <a class="tile" href="#sem" style="--c:var(--lilac)">${I('sem')}<div class="tn">Semester</div><div class="ts">${b?blockName(b):'18 weeks'}</div><span class="arr">›</span></a>
   <a class="tile" href="#kcal" style="--c:var(--pink)">${I('kcal')}<div class="tn">Calories</div><div class="ts">${dayKcal(TK())} kcal</div><span class="arr">›</span></a>
   <a class="tile" href="#groc" style="--c:var(--lemon)">${I('bask')}<div class="tn">Groceries</div><div class="ts">${G.items.length?rs(planned)+' / '+rs(G.budget):'Empty list'}</div><span class="arr">›</span></a>
   <a class="tile" href="#binder" style="--c:var(--sage)">${I('binder')}<div class="tn">My binder</div><div class="ts">${next?next.src+' · '+fmtDay(parseKey(next.k)):'6 notebooks'}</div><span class="arr">›</span></a>
  </div>
  <div class="quick"><a class="chip" href="#focus">◷ Focus</a><a class="chip" href="#stickers">★ Stickers</a><a class="chip" href="#settings">⚙ Settings</a></div>
 </div>`}
function upcoming(n){const out=[];for(let i=0;i<n;i++){const k=key(addDays(today(),i));out.push(...datedItems(k))}return out}

/* ================= WEEK ================= */
function pWeek(){
  if(S.ui.week==null)S.ui.week=nowBlock();const B=BLOCKS[S.ui.week],W=wk(B.id);
  let tt=0,td=0;for(let i=0;i<7;i++){for(const x of dayItems(key(addDays(B.start,i)))){tt++;if(x.d)td++}}
  const opts=BLOCKS.map((b,i)=>`<option value="${i}" ${i===S.ui.week?'selected':''}>${blockName(b)} · ${fmtRange(b)}</option>`).join('');
  let h=`<div class="page">${brand(`<a class="iconbtn" href="#today" aria-label="Today view">${I('clock')}</a><button class="iconbtn" data-act="pdfWeek" aria-label="Export PDF">${I('pdf')}</button>`)}
  <div class="wkbar"><button class="round" data-act="wkPrev" ${S.ui.week===0?'disabled':''}>‹</button>
   <div class="mid"><div class="t"><em>${B.brk?'Midterm':'Week'}</em> ${B.brk?'break '+B.num:B.num}</div>
   <div style="margin-top:6px">${modeTag(B)} <span class="tag t-brk">${td}/${tt} tasks</span></div>
   <select data-in="wkSel" aria-label="Choose week">${opts}</select></div>
   <button class="round" data-act="wkNext" ${S.ui.week===BLOCKS.length-1?'disabled':''}>›</button></div>`;
  if(B.brk)h+=`<div class="card" style="text-align:center;background:var(--blush)"><span class="hint" style="font-size:1.1rem">Midterm break — breathe, catch up, recharge ♡</span></div>`;
  h+=`<div class="card tp c-goals" style="--c:var(--pink)"><h3><em>Tasks</em> of the week <small>3 essentials</small></h3>
   ${W.goals.map((g,i)=>`<div class="li ${g.d?'done':''}">${box(g.d,'goalTog',`data-i="${i}"`)}<input class="tx inline-in" style="border:0" data-in="goal" data-i="${i}" value="${esc(g.t)}" placeholder="task ${i+1}…"><button class="x" data-act="goalDel" data-i="${i}">✕</button></div>`).join('')}
   <button class="btn sm" data-act="goalAdd" style="margin-top:8px">+ a task</button></div>
  <div class="card tp c-prio" style="--c:var(--sage)"><h3><em>Don't</em> forget <small>deadlines, appointments</small></h3><textarea class="lined" data-in="prio" placeholder="due dates, classes, appointments…">${esc(W.prio)}</textarea></div>
  <div class="card tp c-hab" style="--c:var(--lilac)"><h3><em>Habits</em> <small>little by little</small></h3>
   <div class="habits"><span></span>${'MTWTFSS'.split('').map(x=>`<span class="hh">${x}</span>`).join('')}<span></span>
   ${W.habits.map((n,i)=>`<input class="inline-in" style="border-bottom:1px solid var(--soft)" data-in="habit" data-i="${i}" value="${esc(n)}">${[0,1,2,3,4,5,6].map(d=>`<button class="hdot ${W.hab[i+'-'+d]?'on':''}" data-act="hab" data-i="${i}" data-d="${d}"></button>`).join('')}<button class="x" data-act="habDel" data-i="${i}">✕</button>`).join('')}</div>
   <button class="btn sm" data-act="habAdd" style="margin-top:10px">+ a habit</button></div>`;
  for(let i=0;i<7;i++){const d=addDays(B.start,i),k=key(d),its=dayItems(k),isT=k===TK();
    h+=`<section class="day ${isT?'today':''}" data-day="${k}" id="d-${k}"><div class="dh"><span class="dn">${pad(d.getDate())}</span><div><div class="k" style="color:var(--ink)">${DAYS[i]}</div><div class="dm">${MONTHS[d.getMonth()].toLowerCase()}</div></div><div class="right">${isT?'<span class="tag" style="background:var(--wine);color:var(--blush)">today</span>':''}${!B.brk&&i<5?modeTag(B):''}</div></div>
    ${its.map(t=>t.rec?`<div class="li ${t.d?'done':''}">${box(t.d,'recTog',`data-k="${k}" data-r="${t.rid}"`)}<span class="tx">${esc(t.t)}</span>${t.time?`<span class="meta">${t.time}</span>`:''}<span class="tag t-rec">↻</span><button class="x" data-act="recMenu" data-k="${k}" data-r="${t.rid}">⋯</button></div>`
      :`<div class="li ${t.d?'done':''}" data-task="${t.id}"><span class="grip" data-grip="${t.id}" data-k="${k}">⋮⋮</span>${box(t.d,'taskTog',`data-k="${k}" data-id="${t.id}"`)}<span class="tx" contenteditable="true" spellcheck="false" data-in="taskT" data-k="${k}" data-id="${t.id}">${esc(t.t)}</span>${t.time?`<span class="meta">${t.time}</span>`:''}<button class="x" data-act="taskDel" data-k="${k}" data-id="${t.id}">✕</button></div>`).join('')}
    <div class="add"><input class="inline-in" data-add="${k}" placeholder="+ add a task…"><button class="btn sm" data-act="taskMore" data-k="${k}">⏱ ↻</button></div>
    <textarea class="lined" style="min-height:56px;margin-top:6px" data-in="note" data-k="${k}" placeholder="little note…">${esc(S.days[k]?.note||'')}</textarea></section>`}
  h+=`<div class="card tp c-notes" style="--c:var(--blush)"><h3><em>Notes</em> of the week</h3><textarea class="lined" style="min-height:140px" data-in="wnotes" placeholder="ideas, gratitude, what went well…">${esc(W.notes)}</textarea></div></div>`;
  return h}
function taskSheet(k,editId){
  const t=editId?dayData(k).tasks.find(x=>x.id===editId):null;
  sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>New</em> task</div><span class="k">${fmtDay(parseKey(k))}</span></div>
   <div class="field" style="margin-top:10px"><label>Task</label><input id="nt-t" value="${esc(t?.t||'')}" placeholder="e.g. Workout 30 min"></div>
   <div class="row" style="margin-top:10px"><div class="field grow"><label>Date</label><input id="nt-d" type="date" value="${k}"></div><div class="field" style="width:96px"><label>Start</label><input id="nt-s" type="time"></div><div class="field" style="width:96px"><label>End</label><input id="nt-e" type="time"></div></div>
   <div class="field" style="margin-top:10px"><label>Repeat every</label><div class="repeat" id="nt-r">${DAYS3.map((d,i)=>`<button type="button" data-i="${i}">${d[0]}</button>`).join('')}</div><span class="hint">leave empty for a one-off task</span></div>
   <div class="btns" style="margin:14px 0 0"><button class="btn" data-act="closeSheet">Cancel</button><button class="btn d" data-act="taskSave">Add</button></div></div>`,sh=>{
    sh.querySelectorAll('#nt-r button').forEach(b=>b.onclick=()=>b.classList.toggle('on'));setTimeout(()=>sh.querySelector('#nt-t').focus(),300)})}

/* ================= TODAY ================= */
function pToday(){
  const k=S.ui.todayKey||TK(),d=parseKey(k),bi=blockOf(d),b=bi>=0?BLOCKS[bi]:null;
  const its=datedItems(k),timed=its.filter(x=>x.time),allday=its.filter(x=>!x.time);
  const H0=7,H1=23,PX=56;const toMin=s=>{const[a,c]=s.split(':').map(Number);return a*60+c};
  let tl=`<div class="tl" style="height:${(H1-H0)*PX}px">`;for(let h=H0;h<H1;h++)tl+=`<span class="h" style="top:${(h-H0)*PX}px">${pad(h)}:00</span><span class="ln" style="top:${(h-H0)*PX}px"></span>`;
  for(const x of timed){const s=toMin(x.time),e=x.end?toMin(x.end):s+60;const top=(s/60-H0)*PX,ht=Math.max(28,(e-s)/60*PX-4);tl+=`<div class="ev" style="top:${top}px;height:${ht}px;color:${x.col}"><small>${x.src}${x.rec?' · ↻':''} · ${x.time}${x.end?'–'+x.end:''}</small><b style="${x.d?'text-decoration:line-through;opacity:.6':''}">${esc(x.t)}</b></div>`}
  if(k===TK()){const n=new Date(),m=n.getHours()*60+n.getMinutes();if(m>=H0*60&&m<=H1*60)tl+=`<div class="nowl" style="top:${(m/60-H0)*PX}px"></div>`}
  tl+='</div>';
  return `<div class="page">${brand()}
  ${title(DAYS[dow(d)],`${d.getDate()} ${MON3[d.getMonth()].toUpperCase()}`,b?blockName(b)+(b.brk?'':' · '+(isOnline(b)?'online':'F2F')):'')}
  <div class="chips"><a class="chip" href="#week">Week</a><button class="chip on">Today</button><a class="chip" href="#cal">Month</a><span style="flex:1"></span><button class="chip" data-act="tdPrev">‹</button><button class="chip" data-act="tdToday">today</button><button class="chip" data-act="tdNext">›</button></div>
  ${allday.length?`<div class="card" style="padding:8px 14px"><div class="k">All day</div>${allday.map(x=>`<div class="li ${x.d?'done':''}"><span style="width:3px;height:20px;background:${x.col};border-radius:2px"></span><span class="tx">${esc(x.t)}</span><span class="meta">${x.src}</span></div>`).join('')}</div>`:''}
  ${tl}
  <div class="btns"><button class="btn d" data-act="taskMore" data-k="${k}">+ Add a time block</button></div></div>`}

/* ================= CALENDAR ================= */
function pCal(){
  const t=today();if(!S.ui.cal)S.ui.cal=[t.getFullYear(),t.getMonth()];const[y,m]=S.ui.cal;
  const first=new Date(y,m,1),last=new Date(y,m+1,0);let d=addDays(first,-dow(first));
  let g=`<div class="cal"><span></span>${'MTWTFSS'.split('').map(x=>`<span class="h">${x}</span>`).join('')}`;
  while(d<=last){const bi=blockOf(d),b=bi>=0?BLOCKS[bi]:null;g+=`<div class="w ${b?(b.brk?'brk':isOnline(b)?'on':'f2f'):''}">${b?(b.brk?'break':'W'+b.num+(isOnline(b)?' · online':' · F2F')):''}</div>`;
    for(let i=0;i<7;i++){const k=key(d),its=datedItems(k);g+=`<button class="c ${d.getMonth()!==m?'out':''} ${k===TK()?'td':''}" data-act="calDay" data-k="${k}"><span class="n">${d.getDate()}</span>${its.slice(0,3).map(x=>`<span class="e" style="color:${x.col};${x.d?'opacity:.5':''}">${esc(x.t)}</span>`).join('')}${its.length>3?`<span class="e" style="color:var(--muted);border:0">+${its.length-3}</span>`:''}</button>`;d=addDays(d,1)}}
  g+='</div>';
  const up=[];for(let i=0;i<14&&up.length<8;i++){const k=key(addDays(t,i));for(const x of datedItems(k))if(!x.d&&up.length<8)up.push(x)}
  return `<div class="page">${brand(`<button class="iconbtn" data-act="pdfMonth" aria-label="Export month PDF">${I('pdf')}</button>`)}
  <div class="wkbar"><button class="round" data-act="calPrev">‹</button><div class="mid"><div class="t"><em>${MONTHS[m]}</em> ${y}</div><div class="k" style="margin-top:6px">tap a day to open it</div></div><button class="round" data-act="calNext">›</button></div>
  <div class="chips"><a class="chip" href="#week">Week</a><a class="chip" href="#today">Today</a><button class="chip on">Month</button></div>
  ${g}
  <div class="legend"><span style="color:var(--c-task)">Tasks</span>${MODS.slice(0,5).map(x=>`<span style="color:${x.col}">${modShort(x)}</span>`).join('')}<span style="color:var(--c-groc)">Groceries</span></div>
  <div class="card tp" style="--c:var(--pink)"><h3><em>Coming</em> up <small>next 2 weeks</small></h3>${up.length?up.map(x=>`<div class="li"><span class="meta" style="width:52px">${fmtDay(parseKey(x.k)).slice(0,6)}</span><span style="width:3px;height:20px;background:${x.col};border-radius:2px"></span><span class="tx">${esc(x.t)}</span></div>`).join(''):'<div class="hint">Nothing planned — enjoy ♡</div>'}</div></div>`}
function daySheet(k){const its=datedItems(k),d=parseKey(k);
  sheet(`<div style="padding:0 16px">${title(DAYS[dow(d)],`${d.getDate()} ${MON3[d.getMonth()]}`,'')}
  ${its.length?its.map(x=>`<div class="li ${x.d?'done':''}"><span style="width:3px;height:22px;background:${x.col};border-radius:2px"></span><span class="tx">${esc(x.t)}</span><span class="meta">${x.time||''} ${x.src}</span></div>`).join(''):'<div class="hint" style="padding:10px 0">Nothing on this day yet.</div>'}
  <div class="btns" style="margin:14px 0 0"><button class="btn" data-act="openDayWeek" data-k="${k}">Open in week</button><button class="btn d" data-act="taskMore" data-k="${k}">+ Add</button></div></div>`)}

/* ================= SEMESTER ================= */
function pSem(){const nb=blockOf(today()),cur=nb<0?0:nb;const wkN=BLOCKS[cur].brk?0:BLOCKS[cur].num,nW=BLOCKS.filter(b=>!b.brk).length,last=BLOCKS[BLOCKS.length-1];
  const cols=['var(--blush)','var(--pink)','var(--lilac)'];
  return `<div class="page">${brand()}${title('The','SEMESTER',`${BLOCKS[0].start.getDate()} ${MON3[BLOCKS[0].start.getMonth()]} → ${last.end.getDate()} ${MON3[last.end.getMonth()]}`)}
  <div class="card tp" style="--c:var(--lemon)"><div class="row"><div class="grow"><div class="k">Semester progress</div><div style="font:500 1.35rem var(--serif);color:var(--rd)">${BLOCKS[cur].brk?'Midterm break':'Week '+wkN+' of '+nW}</div><div class="prog" style="margin-top:6px"><i style="width:${Math.round((cur+1)/BLOCKS.length*100)}%"></i></div></div><a class="btn d" href="#wrapped">Wrapped ›</a></div></div>
  <div class="tickets">${BLOCKS.map((b,i)=>{let t=0,dn=0;for(let j=0;j<7;j++)for(const x of dayItems(key(addDays(b.start,j)))){t++;if(x.d)dn++}
    return `<button class="tk ${nb===i?'now':''}" style="background:${b.brk?'repeating-linear-gradient(90deg,var(--sage) 0 14px,var(--paper) 14px 28px)':cols[i%3]}" data-act="goWeek" data-i="${i}"><span class="big">${b.brk?'B'+b.num:pad(b.num)}</span><div class="n" style="position:relative">${blockName(b)}</div><div class="d" style="position:relative">${fmtRange(b)}</div><div style="position:relative;margin-top:5px">${modeTag(b)}</div><div class="k" style="position:relative;margin-top:5px;color:inherit">${dn}/${t} done</div></button>`}).join('')}</div></div>`}
function wrappedStats(){let done=0,tot=0;for(const b of BLOCKS)for(let j=0;j<7;j++)for(const x of dayItems(key(addDays(b.start,j)))){tot++;if(x.d)done++}
  const per={};let mins=0;for(const l of S.focus.log){mins+=l.mins;per[l.mod]=(per[l.mod]||0)+l.mins}
  const top=Object.entries(per).sort((a,b)=>b[1]-a[1]);const spent=S.groc.receipts.reduce((a,r)=>a+num(r.real),0);
  return{done,tot,hours:mins/60,best:Math.max(S.best,streak()),spent,top,stickers:Object.keys(S.stickers).length}}
function pWrapped(){const w=wrappedStats(),h=v=>v>=10?Math.round(v):Math.round(v*10)/10;
  return `<div class="page">${brand()}<a class="back" href="#sem">‹ Semester</a>
  <div class="wrapped"><div class="lab">${esc(P().label)}</div><div style="font:400 2.6rem/1 var(--script);color:#F6DCE0;margin-top:8px">Your semester</div><div style="font:500 1.9rem/1 var(--serif);letter-spacing:.06em">WRAPPED</div>
  <div class="g"><div class="bx" style="animation-delay:.1s"><b>${w.done}</b><span class="lab">tasks done</span></div><div class="bx" style="animation-delay:.25s"><b>${h(w.hours)} h</b><span class="lab">focus time</span></div><div class="bx" style="animation-delay:.4s"><b>${w.best}</b><span class="lab">best streak (days)</span></div><div class="bx" style="animation-delay:.55s"><b>${rs(w.spent)}</b><span class="lab">groceries spent</span></div></div>
  <div class="bx" style="margin-top:10px;animation-delay:.7s"><span class="lab">Most studied</span><b style="font-size:1.25rem;margin-top:4px">${w.top.length?modById(w.top[0][0]).short+' · '+h(w.top[0][1]/60)+' h':'Start a focus session ✦'}</b>${w.top.slice(1,3).map(([m,v])=>`<span class="lab" style="color:#F6DCE0;margin-right:10px">${modById(m).short} ${h(v/60)} h</span>`).join('')}</div>
  <div style="margin-top:16px;text-align:center;font:italic 500 1.05rem var(--hand)">“${esc(P().tagline)}” ♡ ${w.stickers} sticker${w.stickers===1?'':'s'} collected</div></div>
  <div class="hint" style="text-align:center;margin-top:10px">Take a screenshot to share it ♡</div></div>`}

/* ================= CALORIES ================= */
function pKcal(){const k=S.ui.kcalKey||TK(),d=parseKey(k),D=S.cal[k]||{q:{},water:0,extra:[]};const tot=dayKcal(k),goal=+S.calGoal||0,p=goal?Math.min(tot/goal,1):0,C=326.7;
  const eaten=S.foods.filter(f=>+(D.q||{})[f.id]>0);
  return `<div class="page">${brand()}
  <div class="wkbar"><button class="round" data-act="kPrev">‹</button><div class="mid"><div class="t"><em>${DAYS[dow(d)]}</em> ${d.getDate()} ${MON3[d.getMonth()]}</div>${k!==TK()?'<button class="k" data-act="kToday" style="margin-top:6px;text-decoration:underline">back to today</button>':''}</div><button class="round" data-act="kNext">›</button></div>
  <div class="card tp c-ring" style="--c:var(--pink);text-align:center"><h3 style="justify-content:flex-start"><em>Calories</em> today ${I('pulse')}</h3>
   <svg class="ring" viewBox="0 0 120 120" width="160" height="160"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--blush)" stroke-width="7"/><circle class="fg" cx="60" cy="60" r="52" fill="none" stroke="var(--rose)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C*p} ${C}" transform="rotate(-90 60 60)" opacity="${p?1:0}"/><text x="60" y="64" text-anchor="middle" font-family="Bodoni Moda" font-size="26" fill="var(--rd)">${tot.toLocaleString('en-US')}</text><text x="60" y="80" text-anchor="middle" font-family="Jost" font-size="7" letter-spacing="2" fill="var(--muted)">KCAL</text></svg>
   <div class="k">goal <input type="number" inputmode="numeric" data-in="calGoal" value="${esc(S.calGoal)}" style="width:70px;text-align:center;font:500 1rem var(--serif);color:var(--ink);border-bottom:1px solid var(--line)"> kcal · ${goal?(tot<=goal?rs(goal-tot).replace('Rs ','')+' left':'+'+(tot-goal)+' over'):''}</div></div>
  <div class="card tp c-water" style="--c:var(--sage)"><h3><em>Hydration</em> ${I('drop')} <small>1 glass ≈ 250 ml · ${D.water||0}/${S.waterGoal}</small></h3><div class="drops">${Array.from({length:S.waterGoal},(_,i)=>i+1).map(n=>`<button class="${n<=(D.water||0)?'on':''}" data-act="water" data-n="${n}" aria-label="${n} glasses">${I('drop')}</button>`).join('')}</div></div>
  <div class="card tp c-eaten" style="--c:var(--lilac)"><h3><em>Eaten</em> today <small>${eaten.length+(D.extra||[]).length} items</small></h3>
   ${eaten.map(f=>`<div class="food has"><span class="nm">${esc(f.name)}<small>${f.kcal} ${perLbl(f)}</small></span><span class="step"><button data-act="kMinus" data-id="${f.id}">−</button><input type="number" inputmode="decimal" data-in="kq" data-id="${f.id}" value="${D.q[f.id]}"><span class="u">${qLbl(f)}</span><button data-act="kPlus" data-id="${f.id}">+</button></span><span class="kv">${Math.round(kOf(f,D.q[f.id]))}</span></div>`).join('')}
   ${(D.extra||[]).map((x,j)=>`<div class="food has"><span class="nm">${esc(x.t)}<small>other</small></span><span class="kv">${Math.round(x.k)}</span><button class="x" data-act="exDel" data-j="${j}">✕</button></div>`).join('')}
   ${!eaten.length&&!(D.extra||[]).length?'<div class="hint">Nothing logged yet.</div>':''}
   <button class="btn d full" data-act="foodSheet" style="margin-top:12px">+ Add what I ate</button><div class="hint" style="text-align:center;margin-top:4px">the full food list opens from this button</div></div></div>`}
function foodSheet(filter=''){const k=S.ui.kcalKey||TK(),D=calDay(k);const q=filter.trim().toLowerCase();
  const rows=c=>S.foods.filter(f=>f.cat===c&&(!q||f.name.toLowerCase().includes(q))).map(f=>{const v=+D.q[f.id]||0;return `<div class="food ${v?'has':''}"><span class="nm">${esc(f.name)}<small><input type="number" inputmode="decimal" data-in="fk" data-id="${f.id}" value="${f.kcal}" style="width:40px;font:inherit;color:var(--rd);border-bottom:1px solid var(--soft)"> ${perLbl(f)}</small></span><span class="step"><button data-act="kMinus" data-id="${f.id}" data-sh="1">−</button><input type="number" inputmode="decimal" data-in="kq" data-id="${f.id}" data-sh="1" value="${v||''}" placeholder="0"><span class="u">${qLbl(f)}</span><button data-act="kPlus" data-id="${f.id}" data-sh="1">+</button></span><span class="kv">${v?Math.round(kOf(f,v)):'—'}</span><button class="x" data-act="foodDel" data-id="${f.id}" aria-label="Remove from list">✕</button></div>`}).join('');
  const open=window._openCats||(window._openCats={starch:true});
  sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Add</em> food</div><button class="chip" data-act="closeSheet">done ✕</button></div>
  <input class="inline-in" id="fsearch" placeholder="search a food…" value="${esc(filter)}" style="margin-top:8px"></div>
  ${Object.entries(FOOD_CATS).map(([c,l])=>{const r=rows(c);if(c!=='other'&&!r)return'';return `<div class="acc ${open[c]||q?'open':''}" data-cat="${c}"><button data-act="accTog" data-c="${c}">${I(catIcon(c))}${l}<span class="cv">›</span></button><div class="body">${r}${c==='other'?`
   <div class="addf"><div class="k" style="color:var(--rd)">+ Other calories (restaurant, snack…)</div><div class="r"><div class="field grow"><input id="ex-t" placeholder="e.g. slice of cake"></div><div class="field" style="width:90px"><input id="ex-k" type="number" inputmode="decimal" placeholder="kcal"></div></div><button class="btn d full" data-act="exAdd" style="margin-top:8px">Add to today</button></div>
   <div class="addf"><div class="k" style="color:var(--rd)">+ Save a new food in the list</div><div class="r"><div class="field grow"><input id="nf-n" placeholder="name"></div><div class="field" style="width:80px"><input id="nf-k" type="number" placeholder="kcal"></div></div><div class="r"><div class="field grow"><select id="nf-u"><option value="g">per 100 g</option><option value="ml">per 100 ml</option><option value="unit">per unit</option><option value="portion">per portion</option></select></div><div class="field grow"><select id="nf-c">${Object.entries(FOOD_CATS).filter(([c])=>c!=='other').map(([c,l])=>`<option value="${c}">${l}</option>`).join('')}</select></div></div><button class="btn full" data-act="foodAdd" style="margin-top:8px">Save food</button></div>`:''}</div></div>`}).join('')}`,sh=>{const s=sh.querySelector('#fsearch');s.oninput=()=>{foodSheet(s.value);const n=$('#fsearch');n.focus();n.setSelectionRange(n.value.length,n.value.length)}})}
const catIcon=c=>({starch:'wheat',prot:'dumbbell',veg:'carrot',fruit:'apple',dairy:'cup',fat:'bottle',other:'plus'}[c]);

/* ================= GROCERIES ================= */
const AISLES=['Starches','Protein','Fresh','Vegetables & fruit','Pantry','Household','Other'];
function gTotals(){const G=S.groc;let planned=0,basket=0,nb=0;for(const x of G.items){const v=x.qty*x.price;planned+=v;if(x.checked){basket+=v;nb++}}return{planned,basket,nb,n:G.items.length}}
function pGroc(sub){const G=S.groc,tab=sub||S.ui.grocTab||'list';
  const seg=`<div class="seg">${[['list','My list'],['receipts','Receipts'],['menus','Menus']].map(([v,l])=>`<button class="${tab===v?'on':''}" data-act="gTab" data-v="${v}">${l}</button>`).join('')}</div>`;
  let h=`<div class="page">${brand()}${title('My','GROCERIES',fmtDay(today()))}${seg}`;
  if(tab==='receipts')return h+gReceipts()+'</div>';
  if(tab==='menus')return h+gMenus()+'</div>';
  const T=gTotals(),cap=G.budget+G.approved,over=T.planned-cap;
  h+=`<div class="card gtot"><div class="c1"><div class="k">Planned</div><div class="n">${rs(T.planned)}</div><div class="k">${T.n} items</div></div><div class="c1"><div class="k">In ${T.nb>10?'cart':'basket'}</div><div class="n" style="color:var(--rd)">${rs(T.basket)}</div><div class="k" style="color:var(--rd)">${T.nb} / ${T.n} ticked</div></div><div class="vis" id="gvis"><svg viewBox="0 0 200 160"><use href="#${T.nb>10?'cart':'basket'}"/></svg></div></div>
  <div class="budrow"><span class="k">Budget</span><input type="number" inputmode="decimal" data-in="gBudget" value="${G.budget}"><span class="prog"><i class="a" style="width:${cap?Math.min(100,T.planned/cap*100):0}%"></i><i style="width:${cap?Math.min(100,T.basket/cap*100):0}%"></i></span><span class="k">${over>0?'+'+rs(over).replace('Rs ','')+' over':rs(cap-T.planned).replace('Rs ','Rs ')+' left'}</span></div>`;
  if(over>0.001)h+=`<div class="warn"><div class="k" style="color:inherit">⚠ Over budget</div><div class="big">+ ${rs(over)}<small>above your ${G.approved?'new cap':'budget'}</small></div><div class="btns" style="margin:10px 0 0"><button class="btn" data-act="gAdjust">Adjust the list</button><button class="btn d" data-act="gApprove" data-v="${over}">Approve difference</button></div></div>`;
  else if(G.approved>0)h+=`<div class="okbar">✓ Difference of ${rs(G.approved)} approved · cap ${rs(cap)}<button data-act="gUnapprove">undo</button></div>`;
  h+=`<div class="card" id="glist" style="padding-top:4px">`;
  for(const a of AISLES){const its=G.items.filter(x=>x.aisle===a);if(!its.length)continue;
    h+=`<div class="grp"><span>${a}</span><span>${rs(its.reduce((s,x)=>s+x.qty*x.price,0))}</span></div>`+its.map(x=>`<div class="sw-row" data-swipe="groc" data-id="${x.id}"><div class="del">${I('trash')}Delete</div><div class="fg gi ${x.checked?'done':''}">${box(x.checked,'gTick',`data-id="${x.id}"`)}<span class="nm">${esc(x.name)}${x.unit?`<small>${esc(x.unit)}</small>`:''}${x.prev&&x.price>x.prev?`<span class="up">▲ +${Math.round((x.price-x.prev)*100)/100}</span>`:''}</span><span class="qty"><button data-act="gMinus" data-id="${x.id}">−</button><span>${x.qty}</span><button data-act="gPlus" data-id="${x.id}">+</button></span><input class="price" type="number" inputmode="decimal" data-in="gPrice" data-id="${x.id}" value="${x.price||''}" placeholder="Rs"></div></div>`).join('')}
  if(!G.items.length)h+=`<div class="hint" style="padding:12px 0">Your list is empty. Add your first item below ♡</div>`;
  const names=[...new Set([...Object.keys(G.prices),...S.foods.map(f=>f.name)])];
  h+=`<div class="addf"><div class="k" style="color:var(--rd)">+ New item</div>
   <div class="r"><div class="field grow"><label>Item</label><input id="gi-n" list="gnames" placeholder="e.g. Onions" autocomplete="off"></div><div class="field" style="width:70px"><label>Qty</label><input id="gi-q" type="number" inputmode="decimal" value="1"></div></div>
   <div class="r"><div class="field" style="width:96px"><label>Price (Rs)</label><input id="gi-p" type="number" inputmode="decimal" placeholder="0"></div><div class="field" style="width:70px"><label>Unit</label><input id="gi-u" placeholder="1 kg"></div><div class="field grow"><label>Aisle</label><select id="gi-a">${AISLES.map(a=>`<option>${a}</option>`).join('')}</select></div></div>
   <div class="hint" id="gi-h" style="margin-top:4px"></div>
   <button class="btn d full" data-act="gAdd" style="margin-top:8px">Add · + Rs 0 to total</button><datalist id="gnames">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div></div>
  <div class="btns"><button class="btn" data-act="gUntick">Untick all</button><button class="btn d" data-act="gCheckout" ${T.nb?'':'disabled style="opacity:.4"'}>Finish · receipt ›</button></div>
  <div class="hint" style="text-align:center;margin-top:8px">← swipe an item to delete it</div>`;
  return h+'</div>'}
function gReceipts(){const R=S.groc.receipts;const m=today().getMonth(),y=today().getFullYear();
  const month=R.filter(r=>{const d=parseKey(r.date);return d.getMonth()===m&&d.getFullYear()===y});const tot=month.reduce((a,r)=>a+num(r.real),0);
  return `<div class="card tp" style="--c:var(--lemon)"><div class="row"><div class="grow"><div class="k">${MONTHS[m]} spending</div><div style="font:500 1.5rem var(--serif);color:var(--rd)">${rs(tot)}</div><div class="k">${month.length} trips · avg ${rs(month.length?tot/month.length:0)}</div></div></div></div>
  <div class="card">${R.length?R.map((r,i)=>{const diff=num(r.real)-num(r.calc);return `<div class="sw-row" data-swipe="receipt" data-id="${r.id}"><div class="del">${I('trash')}Delete</div><div class="fg" data-act="openReceipt" data-id="${r.id}" style="cursor:pointer"><span class="dbox"><b>${parseKey(r.date).getDate()}</b><span>${MON3[parseKey(r.date).getMonth()].toUpperCase()}</span></span><span class="grow" style="font:500 1.02rem var(--hand)">${r.items.length} items<br><span class="k">calc ${rs(r.calc)}${diff?` · <span style="color:${diff>0?'var(--bad)':'var(--ok)'}">${diff>0?'+':''}${Math.round(diff*100)/100}</span>`:''}</span></span><span style="font:500 1.1rem var(--serif);color:var(--rd)">${rs(r.real)}</span></div></div>`}).join(''):'<div class="hint">No receipts yet. Tick items in your list, then “Finish”.</div>'}</div>`}

/* ---- menus ---- */
const MEALS={breakfast:[['Weetabix & Silhouette milk',[['Weetabix',2],['Silhouette milk',200],['Apple',1]],5],['Tomato omelette',[['Egg (55 g +)',2],['Tomato',100],['Onion (raw)',30],['Oil',0.5]],10],['Fromage blanc bowl',[['Fromage blanc (30 g)',2],['Apple',1],['Brown sugar',5]],3]],
 lunch:[['Chicken, basmati & green beans',[['Chicken breast (raw)',150],['Basmati rice (raw)',80],['Green beans',100],['Garlic (≈ 3 g)',1],['Oil',1]],25],['Beef & pea pasta',[['Ground beef (raw)',120],['Pasta (raw)',80],['Peas',80],['Onion (raw)',50],['Tomato',100]],25],['Tuna rice salad',[['Tuna',100],['Basmati rice (raw)',70],['Tomato',100],['Lettuce',50],['Oil',0.5]],15]],
 dinner:[['Tuna soba & vegetables',[['Soba noodles (raw)',80],['Tuna',100],['Carrot (raw)',60],['Onion (raw)',40],['Oil',0.5]],15],['Sausages, peas & carrots',[['Sausage (34 g)',2],['Peas',80],['Carrot (raw)',80],['Butter',10]],20],['Beef & soba stir-fry',[['Lean beef (raw)',120],['Soba noodles (raw)',70],['Carrot (raw)',60],['Onion (raw)',40],['Garlic (≈ 3 g)',1],['Oil',1]],20]]};
function menuOf(seed){return['breakfast','lunch','dinner'].map((c,i)=>{const arr=MEALS[c];return[c,arr[(seed+i)%arr.length]]})}
function mealKcal(ings){return Math.round(ings.reduce((a,[n,q])=>{const f=S.foods.find(x=>x.name===n);return a+(f?kOf(f,q):0)},0))}
const ingTxt=(n,q)=>{const f=S.foods.find(x=>x.name===n);const u=f?(perPiece(f)?(q>1&&f.unit==='unit'?'':' '+f.unit):f.unit):'';return `${q}${f&&!perPiece(f)?' '+u:''} ${n.replace(/ \(.*\)/,'').toLowerCase()}${f&&perPiece(f)&&f.unit!=='unit'?' ('+f.unit+')':''}`};
const onList=n=>{const b=n.replace(/ \(.*\)/,'').toLowerCase().split(' ')[0];return S.groc.items.some(x=>x.name.toLowerCase().includes(b))};
function gMenus(){const seed=S.ui.menuSeed||0,M=menuOf(seed),b=blockOf(today());
  return `<div class="menu"><div class="k" style="letter-spacing:.32em;color:#8B1E2D">${b>=0?blockName(BLOCKS[b]):''}</div><div class="mt">${esc(P().menuTitle)}</div><div class="ms">OF THE DAY</div><div style="width:40px;height:32px;margin:6px auto 0;color:#8B1E2D">${BOW}</div>
  ${M.map(([c,[n,ings,min]])=>{const miss=ings.filter(([x])=>!onList(x));return `<div class="course"><div class="h">${c.toUpperCase()}</div><div class="dish"><span class="n">${esc(n)}</span><span class="dots"></span><span class="kc">${mealKcal(ings)} kcal</span></div><div class="det">${ings.map(([x,q])=>ingTxt(x,q)).join(', ')} · ${min} min</div><div style="text-align:left">${miss.length?`<span class="tag" style="background:var(--blush);color:var(--rd)">${miss.length} to buy</span>`:'<span class="tag t-f2f">all on your list ✓</span>'} <button class="tag" style="background:#fff;color:#A44C61;border:1px solid rgba(164,76,97,.3)" data-act="mealLog" data-c="${c}">+ log to calories</button></div></div>`}).join('')}
  <div class="btns" style="margin:16px 0 0"><button class="btn" data-act="menuNext">Another idea ↻</button><button class="btn d" data-act="menuToList">+ Ingredients to list</button></div></div>`}

/* ---- checkout / receipt ---- */
function pCheckout(){const G=S.groc,its=G.items.filter(x=>x.checked),calc=its.reduce((a,x)=>a+x.qty*x.price,0);const real=S.ui.real??'';
  return `<div class="page">${brand()}<a class="back" href="#groc">‹ My list</a>${title('My','RECEIPT',fmtDay(today()))}
  <div id="scanwrap"></div>
  <div class="card realbox"><div class="row" style="align-items:flex-end"><div><div class="k">Calculated</div><div style="font:500 1.3rem var(--serif);color:var(--muted)">${rs(calc)}</div></div><div class="field grow"><label style="color:var(--rd)">Real total (till)</label><input type="number" inputmode="decimal" id="realT" value="${real}" placeholder="${Math.round(calc*100)/100}"></div></div>
   <div id="realDiff" class="k" style="margin-top:8px"></div>
   <div class="btns" style="margin:10px 0 0"><label class="btn" style="cursor:pointer">📷 Scan receipt<input type="file" accept="image/*" capture="environment" id="scanIn" hidden></label><button class="btn d" data-act="gSaveReceipt">Print receipt ›</button></div></div>
  <div class="rcpt" style="margin-top:16px">${receiptBody({items:its.map(x=>({n:x.name,u:x.unit,q:x.qty,p:x.price})),calc,real:real||calc,budget:G.budget+G.approved,date:TK()})}</div></div>`}
function receiptBody(r){const diff=num(r.real)-num(r.calc);const d=parseKey(r.date),b=blockOf(d);
  return `<div class="c" style="font:700 .95rem var(--mono);letter-spacing:.1em">${esc((P().t1+' '+P().t2+' '+P().t3).toUpperCase())}</div><div class="c">· groceries ·</div><div class="c">${b>=0?blockName(BLOCKS[b])+' · ':''}${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}</div><div class="hr"></div>
  ${r.items.map(x=>`<div class="l"><span>${esc(x.n.toUpperCase())}${x.u?' '+esc(x.u.toUpperCase()):''}${x.q>1?' x'+x.q:''}</span><span>${(x.q*x.p).toFixed(2)}</span></div>`).join('')||'<div class="c">no items</div>'}
  <div class="hr"></div><div class="l"><span>ITEMS</span><span>${r.items.length}</span></div><div class="l"><span>BUDGET</span><span>${num(r.budget).toFixed(2)}</span></div><div class="l"><span>CALCULATED</span><span>${num(r.calc).toFixed(2)}</span></div>
  <div class="tot"><span>REAL TOTAL</span><span>Rs ${num(r.real).toFixed(2)}</span></div>${Math.abs(diff)>.004?`<div class="l" style="color:${diff>0?'#A3283F':'#4f6146'}"><span>DIFFERENCE</span><span>${diff>0?'+':''}${diff.toFixed(2)}</span></div>`:''}
  <div class="bar2"></div><div class="c" style="font-size:.66rem">${esc(P().footer)}</div>`}
function pReceipt(id,printing){const r=S.groc.receipts.find(x=>x.id===id);if(!r)return pGroc('receipts');
  return `<div class="page">${brand()}<a class="back" href="#groc/receipts">‹ Receipts</a>${title('My','RECEIPT',fmtDay(parseKey(r.date)))}
  ${printing?'<div class="printer"></div><div class="printing" id="printing">':''}<div class="rcpt" id="rcptEl">${receiptBody(r)}</div>${printing?'</div>':''}
  <div class="btns"><button class="btn" data-act="rcptDel" data-id="${r.id}">Delete</button><a class="btn d" href="#groc/receipts">Done</a></div>
  ${printing?'<div class="hint" style="text-align:center;margin-top:8px">Saved ✓ — prices remembered for next time</div>':''}</div>`}

/* ================= BINDER ================= */
function nbLabel(m){if(m.id==='dump')return `${S.dump.length} notes`;if(m.id==='diss'){const s=listStats('diss','tuto');return s.n?`Ch. ${s.d}/${s.n}`:'chapters'}const s=listStats(m.id,'lect');return s.n?`${s.d}/${s.n} notes`:Math.round(modProgress(m.id)*100)+' %'}
function pBinder(){const rows=[MODS.slice(0,3),MODS.slice(3)];
  return `<div class="page">${brand()}
  <div style="text-align:center;padding-top:18px"><div class="k">${esc(P().label)}</div><div style="font:500 2rem/1 var(--serif);margin-top:6px">MY <span style="font:400 2.6rem var(--script);color:var(--rd)">Binder</span></div><div style="width:44px;height:34px;margin:4px auto 0;color:var(--rd)">${BOW}</div></div>
  <div class="shelfwrap">${rows.map(r=>`<div class="shelfrow">${r.map(m=>`<a class="nb" href="#${m.id==='dump'?'dump':'mod/'+m.id}"><img src="${coverSrc(m)}" alt="${esc(m.name)}"></a>`).join('')}<div class="shelf"></div></div><div class="nbl">${r.map(m=>`<span>${modShort(m)} · <b>${nbLabel(m)}</b></span>`).join('')}</div>`).join('<div style="height:14px"></div>')}</div></div>`}
function pMod(id){const m=modById(id);if(!m||id==='dump')return pDump();const M=S.mods[id],tab=S.ui.modTab[id]||'todo',ov=modProgress(id);
  const tiles=['todo','assign','tuto','lect'].map((l,i)=>{const s=listStats(id,l);return `<button class="pt ${tab===l?'on':''}" style="--c:${['var(--pink)','var(--sage)','var(--lilac)','var(--lemon)'][i]}" data-act="modTab" data-mod="${id}" data-l="${l}"><div class="n">${listLabel(id,l)}</div><div class="v"><b>${s.d}</b><span>/ ${s.n}</span></div><div class="prog"><i style="width:${Math.round(s.p*100)}%"></i></div></button>`}).join('');
  const items=M[tab];const stKey=tab==='tuto'&&id==='diss'?'tuto_diss':tab;
  const rows=items.map((x,j)=>{const date=x.date?`<span class="dbox"><b>${parseKey(x.date).getDate()}</b><span>${MON3[parseKey(x.date).getMonth()].toUpperCase()}</span></span>`:'';
    const stc=STATUS[stKey];const st=stc?`<button class="st-sel ${['','s2','s3','s3'][x.st||0]} ${x.st===stc.length-1?'s3':''}" data-act="modSt" data-mod="${id}" data-l="${tab}" data-j="${j}">${stc[x.st||0]}</button>`:'';
    return `<div class="sw-row" data-swipe="mod" data-mod="${id}" data-l="${tab}" data-j="${j}"><div class="del">${I('trash')}Delete</div><div class="fg">${stc?'':box(x.d,'modTog',`data-mod="${id}" data-l="${tab}" data-j="${j}"`)}${date}<span class="tx grow" contenteditable="true" spellcheck="false" data-in="modT" data-mod="${id}" data-l="${tab}" data-j="${j}" style="font:500 1.03rem/1.2 var(--hand);outline:none;${x.d?'text-decoration:line-through;color:var(--muted)':''}">${esc(x.t)}</span>${st}</div></div>`}).join('');
  const G=gradeNeeds(id);const tgt=M.target||'A';const tg=G.grades.find(g=>g.g===tgt)||G.grades[0];
  return `<div class="page">${brand()}<a class="back" href="#binder">‹ My binder</a>
  <div class="modhead"><img src="${coverSrc(m)}" alt=""><div class="grow"><div class="k">Module</div><div class="t">${esc(m.name)}</div><div class="row" style="margin-top:8px"><div class="prog grow"><i style="width:${Math.round(ov*100)}%;background:var(--wine)"></i></div><span style="font:500 1.1rem var(--serif);color:var(--rd)">${Math.round(ov*100)}%</span></div><div class="k" style="margin-top:2px">overall progress</div></div></div>
  <div class="ptiles">${tiles}</div>
  <div class="card tp c-list" style="--c:var(--pink)"><h3><em>${listLabel(id,tab)}</em><small>dated items go to the calendar</small></h3>${rows||'<div class="hint">Nothing yet.</div>'}
   <div class="addf"><div class="r" style="margin:0"><div class="field grow"><input id="mi-t" placeholder="+ add ${listLabel(id,tab).toLowerCase().replace(/s$/,'')}…"></div><div class="field" style="width:132px"><input id="mi-d" type="date"></div></div><button class="btn d full" data-act="modAdd" data-mod="${id}" data-l="${tab}" style="margin-top:8px">Add</button></div></div>
  <div class="card tp c-links" style="--c:var(--sage)"><h3><em>Links</em> &amp; files</h3><div class="links">${M.links.map((L,j)=>`<span style="display:inline-flex;align-items:center;gap:2px"><a href="${L.file?'#':esc(L.url)}" ${L.file?`data-act="openFile" data-f="${L.file}"`:'target="_blank" rel="noopener"'}>${L.file?'📄':'▶'} ${esc(L.label)}</a><button class="x" data-act="linkDel" data-mod="${id}" data-j="${j}">✕</button></span>`).join('')||'<span class="hint">Class link, slides, WhatsApp group…</span>'}</div>
   <div class="addf"><div class="r" style="margin:0"><div class="field grow"><input id="ln-l" placeholder="label (e.g. Online class)"></div></div><div class="r"><div class="field grow"><input id="ln-u" placeholder="https://…"></div></div><div class="btns" style="margin:8px 0 0"><label class="btn" style="cursor:pointer">📄 Attach file<input type="file" id="ln-f" data-mod="${id}" hidden></label><button class="btn d" data-act="linkAdd" data-mod="${id}">Add link</button></div></div></div>
  <div class="card tp c-grades" style="--c:var(--lilac)"><h3><em>Grades</em> tests ${G.tw}% · exam ${G.ew}%</h3>
   ${M.tests.map((t,j)=>`<div class="li"><input class="inline-in" style="flex:1;border:0" data-in="testN" data-mod="${id}" data-j="${j}" value="${esc(t.name)}"><input type="number" inputmode="decimal" class="price" style="width:52px" data-in="testS" data-mod="${id}" data-j="${j}" value="${esc(t.score)}" placeholder="/100"><input type="number" inputmode="decimal" class="price" style="width:40px" data-in="testW" data-mod="${id}" data-j="${j}" value="${esc(t.weight)}"><span class="meta">%</span><button class="x" data-act="testDel" data-mod="${id}" data-j="${j}">✕</button></div>`).join('')}
   <div class="li"><span class="tx">Final exam</span><input type="number" class="price" style="width:40px" data-in="examW" data-mod="${id}" value="${G.ew}"><span class="meta">%</span></div>
   <button class="btn sm" data-act="testAdd" data-mod="${id}" style="margin-top:8px">+ add a test</button>
   ${G.ok?'':`<div class="warn" style="margin:10px 0 0;padding:8px 10px"><span class="k" style="color:inherit">weights add up to ${G.tw+G.ew}% — should be 100%</span></div>`}
   <div class="k" style="color:var(--rd);margin-top:12px">Mark needed in the exam (/100) · tests so far ${Math.round(G.got*10)/10} / ${G.tw}</div>
   <div class="grades">${G.grades.map(g=>`<button class="${g.g===tgt?'on':''}" data-act="gradeT" data-mod="${id}" data-g="${g.g}"><b>${g.g}</b><span>${g.r}</span><em>${g.need==null?'—':g.need>100?'✕':g.need}</em><span>${g.need==null?'below D':g.need>100?'not reachable':'in exam'}</span></button>`).join('')}</div>
   <div class="verdict"><div class="L">${tg.g}</div><p>${tg.g==='F'?'F is any total under 40.':tg.need>100?`An <b>${tg.g}</b> is out of reach with these tests — aim for the next grade.`:tg.need<=0?`Your <b>${tg.g}</b> is already secured ♡`:`For ${tg.g==='A'?'an':'a'} <b>${tg.g}</b> you need <b>${tg.need} / 100</b> in the exam. To pass (D) you need ${G.grades[3].need}.`}</p></div>
   <div class="hint" style="text-align:center;margin-top:6px">empty test scores count as 0 · tap a grade to set your target</div></div></div>`}
function pDump(){const cols=['#FBF8F1','#E8EDE2','#F6DCE0','#F1E6BE','#EBCDE2'];
  return `<div class="page">${brand()}<a class="back" href="#binder">‹ My binder</a>
  <div class="modhead"><img src="${coverSrc(modById('dump'))}" alt=""><div><div class="k">Notebook 06</div><div class="t">${esc(modById('dump').name)}</div><div class="hint">empty your head, sort later</div></div></div>
  <div class="card"><div class="row"><input class="inline-in grow" id="dump-in" placeholder="write whatever's on your mind…"><button class="btn d sm" data-act="dumpAdd">+ Note</button></div>
  ${S.dump.map((n,j)=>`<div class="slip" style="background-color:${cols[j%cols.length]};transform:rotate(${(j%2?1:-1)*.8}deg)"><div class="tx" contenteditable="true" spellcheck="false" data-in="dumpT" data-j="${j}">${esc(n.t)}</div><div class="acts"><button data-act="dumpToday" data-j="${j}">→ today</button><button data-act="dumpNb" data-j="${j}">→ notebook</button><button data-act="dumpGroc" data-j="${j}">→ groceries</button><button data-act="dumpDel" data-j="${j}" style="margin-left:auto;color:#8C5E68">✕</button></div></div>`).join('')||'<div class="hint" style="margin-top:10px">Nothing here yet ♡</div>'}</div></div>`}

/* ================= FOCUS ================= */
function pFocus(){const F=S.focus,run=F.run;const total=(F[F.mode]||25)*60;let rem=total;if(run){rem=run.paused?run.rem:Math.max(0,Math.round((run.end-Date.now())/1000))}
  const C=540.4,p=1-rem/total;const wkStart=BLOCKS[nowBlock()].start;const per={};for(const l of F.log){if(parseKey(l.date)>=wkStart)per[l.mod]=(per[l.mod]||0)+l.mins}const mx=Math.max(60,...Object.values(per));
  return `<div class="page">${brand()}${title('Focus','TIME','pomodoro')}
  <div class="chips" style="justify-content:center">${[['work','Focus'],['short','Short break'],['long','Long break']].map(([v,l])=>`<button class="chip ${F.mode===v?'on':''}" data-act="fMode" data-v="${v}">${l} ${F[v]}</button>`).join('')}</div>
  <svg class="fring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" fill="var(--card)" stroke="var(--blush)" stroke-width="10"/><circle id="fArc" cx="100" cy="100" r="86" fill="none" stroke="var(--rose)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C*p} ${C}" transform="rotate(-90 100 100)"/><text id="fTime" x="100" y="106" text-anchor="middle" font-family="Bodoni Moda" font-size="40" fill="var(--ink)">${pad(Math.floor(rem/60))}:${pad(rem%60)}</text><text x="100" y="130" text-anchor="middle" font-family="Jost" font-size="8" letter-spacing="2.5" fill="var(--muted)">SESSION ${F.done%4+1} OF 4</text></svg>
  <div class="chips" style="justify-content:center">${MODS.filter(m=>m.id!=='dump').map(m=>`<button class="chip ${F.mod===m.id?'on':''}" data-act="fMod" data-v="${m.id}">${modShort(m)}</button>`).join('')}</div>
  <div class="btns"><button class="btn" data-act="fReset">Reset</button><button class="btn d" data-act="fStart">${run&&!run.paused?'Pause':run?'Resume':'Start'}</button><button class="btn" data-act="fEdit">Edit ✎</button></div>
  <div class="card tp" style="--c:var(--sage)"><h3><em>This week</em> by module</h3>${MODS.filter(m=>m.id!=='dump').map(m=>{const v=per[m.id]||0;return `<div class="fstat"><span class="k">${modShort(m)}</span><span class="prog grow"><i style="width:${v/mx*100}%;background:${m.col}"></i></span><span style="font:500 .85rem var(--serif);width:46px;text-align:right">${v>=60?Math.round(v/6)/10+' h':v+' m'}</span></div>`}).join('')}</div></div>`}

/* ================= STICKERS ================= */
const STICKERS=[
 ['first','★','First task done',()=>Object.values(S.days).some(d=>d.tasks.some(t=>t.d))],
 ['s7','🎀','7-day streak',()=>Math.max(S.best,streak())>=7],
 ['s30','💝','30-day streak',()=>Math.max(S.best,streak())>=30],
 ['allday','♡','All tasks of a day done',()=>Object.entries(S.days).some(([k,d])=>{const it=dayItems(k);return it.length>=3&&it.every(x=>x.d)})],
 ['chap','☀','Dissertation chapter submitted',()=>S.mods.diss.assign.some(x=>x.st===2)||S.mods.diss.tuto.some(x=>x.st>=1)],
 ['sub','✉','First assignment submitted',()=>MODS.some(m=>S.mods[m.id].assign.some(x=>x.st===2))],
 ['budget','🛒','Groceries under budget',()=>S.groc.receipts.some(r=>num(r.real)<=num(r.budget))],
 ['focus10','📚','10 h of focus',()=>S.focus.log.reduce((a,l)=>a+l.mins,0)>=600],
 ['notes','✦','All lecture notes of a module',()=>MODS.some(m=>{const s=listStats(m.id,'lect');return s.n>=3&&s.d===s.n})],
 ['water','💧','Water goal reached',()=>Object.values(S.cal).some(c=>c.water>=S.waterGoal)],
 ['tasks50','✿','50 tasks done',()=>Object.values(S.days).reduce((a,d)=>a+d.tasks.filter(t=>t.d).length,0)>=50],
 ['receipt','🧾','First receipt saved',()=>S.groc.receipts.length>0],
 ['gradeA','🅰','Target A within reach',()=>MODS.some(m=>m.id!=='dump'&&S.mods[m.id].tests.some(t=>t.score!=='')&&(gradeNeeds(m.id).grades[0].need??999)<=80)],
 ['dump10','🧠','10 brain-dump notes sorted',()=>(S.sorted||0)>=10],
 ['wk','🌷','A full week of habits',()=>Object.values(S.weeks).some(w=>w.habits.some((h,i)=>[0,1,2,3,4,5,6].every(d=>w.hab[i+'-'+d])))],
 ['semester','🎓','Semester completed',()=>today()>BLOCKS[BLOCKS.length-1].end]];
function checkStickers(){let n=null;for(const[id,e,l,f]of STICKERS){try{if(!S.stickers[id]&&f()){S.stickers[id]=TK();n=[e,l]}}catch(err){}}if(n){toast(`New sticker unlocked ${n[0]} ${n[1]}`);confetti(18)}}
function pStickers(){const st=streak();
  return `<div class="page">${brand()}${title('My','STICKERS',Object.keys(S.stickers).length+' / '+STICKERS.length)}
  <div class="card tp" style="--c:var(--pink)"><div class="row"><div style="width:${46+Math.min(st,30)}px;height:${36+Math.min(st,30)*.8}px;color:var(--rd);transition:all .4s">${BOW}</div><div><div class="k">Streak</div><div style="font:500 1.7rem/1 var(--serif);color:var(--rd)">${st} day${st===1?'':'s'}</div><div class="hint">the bow grows with your streak · best ${Math.max(S.best,st)}</div></div></div></div>
  <div class="stk">${STICKERS.map(([id,e,l])=>`<div class="stc ${S.stickers[id]?'':'lock'}"><span class="e">${S.stickers[id]?e:'🔒'}</span><small>${l}</small></div>`).join('')}</div>
  <div class="hint" style="text-align:center;margin:12px 16px 0">A day counts in your streak when you tick something in the planner.</div></div>`}

/* ================= SETTINGS ================= */
function ago(t){const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago'}
function notifLabel(){const sup=pushSupport();if(!('Notification'in window))return sup==='ios-browser'?'add to Home Screen first':'not supported';if(Notification.permission==='denied')return'blocked';if(!remindersOn())return'off';if(PUSH.sub)return serverPushActive()?'on · even when closed':'on';return'on · while open'}
function pSettings(){const L=S.lock,R=S.rem,sw=(on,act,extra='')=>`<button class="sw ${on?'on':''}" data-act="${act}" ${extra}></button>`;
  const perm=('Notification'in window)?Notification.permission:'unsupported';
  return `<div class="page">${brand()}${title('My','SETTINGS','')}
  <div class="card set"><h3>Personalize · texts</h3>
   ${[['name','Your name'],['hello','Greeting'],['tagline','Tagline'],['label','Cover label'],['t1','Title · word 1'],['t2','Title · script word'],['t3','Title · word 3'],['big1','Cover big number 1'],['big2','Cover big number 2'],['spine','Cover spine text'],['menuTitle','Menu title'],['footer','Receipt footer']].map(([k,l])=>`<div class="r"><span style="width:44%">${l}</span><input class="inline-in" style="flex:1;text-align:right" data-in="prof" data-k="${k}" value="${esc(S.prof[k])}"></div>`).join('')}
   <div class="r"><span class="hint">Changes show everywhere right away.</span><button class="v" data-act="profReset">reset texts</button></div></div>
  <div class="card set"><h3>Semester dates</h3>
   <div class="r">First Monday<input type="date" data-in="sem" data-k="start" value="${esc(S.sem.start)}" style="margin-left:auto;font:500 .9rem var(--sans);color:var(--rd)"></div>
   <div class="r">Teaching weeks<input type="number" inputmode="numeric" class="price" style="margin-left:auto;width:60px" data-in="sem" data-k="weeks" value="${S.sem.weeks}"></div>
   <div class="r">Break starts after week<input type="number" inputmode="numeric" class="price" style="margin-left:auto;width:60px" data-in="sem" data-k="breakAfter" value="${S.sem.breakAfter}"></div>
   <div class="r">Break length (weeks)<input type="number" inputmode="numeric" class="price" style="margin-left:auto;width:60px" data-in="sem" data-k="breakLen" value="${S.sem.breakLen}"></div>
   <div class="r"><span class="hint">${BLOCKS.length} weeks · ${fmtRange(BLOCKS[0])} → ${fmtRange(BLOCKS[BLOCKS.length-1])}</span></div></div>
  <div class="card set"><h3>Notebooks</h3>
   ${MODS.map(m=>`<div class="r" style="align-items:flex-start"><img src="${coverSrc(m)}" alt="" style="width:46px;flex:none"><div class="grow"><input class="inline-in" data-in="modName" data-mod="${m.id}" value="${esc(m.name)}" aria-label="Full name"><input class="inline-in" style="font-size:.9rem" data-in="modShort" data-mod="${m.id}" value="${esc(m.short)}" aria-label="Short name"><div style="display:flex;gap:6px;margin-top:6px"><label class="btn sm" style="cursor:pointer">Change cover<input type="file" accept="image/*" data-cover="${m.id}" hidden></label>${m.cover?`<button class="btn sm" data-act="coverReset" data-mod="${m.id}">Original</button>`:''}</div></div></div>`).join('')}</div>
  <div class="card set"><h3>Goals</h3>
   <div class="r">Calories per day<input type="number" inputmode="numeric" class="price" style="margin-left:auto;width:70px" data-in="calGoal" value="${S.calGoal}"></div>
   <div class="r">Glasses of water per day<input type="number" inputmode="numeric" class="price" style="margin-left:auto;width:70px" data-in="waterGoal" value="${S.waterGoal}"></div>
   <div class="r">Groceries budget<input type="number" inputmode="decimal" class="price" style="margin-left:auto;width:70px" data-in="gBudget" value="${S.groc.budget}"></div></div>
  <div class="card set"><h3>Theme</h3><div class="themes">${[['rose','#F6DCE0','#A44C61'],['sage','#E3EBDD','#4F6E45'],['lilac','#EFE2F0','#7D4A88'],['butter','#F7EFD2','#8B1E2D']].map(([t,a,b])=>`<button class="${S.set.theme===t?'on':''}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)" data-act="theme" data-v="${t}" aria-label="${t}"></button>`).join('')}</div><div class="lbls k"><span>Rose</span><span>Sage</span><span>Lilac</span><span>Butter</span></div>
   <div class="r" style="margin-top:8px">Dark mode<span class="v" style="display:flex;gap:4px">${['auto','on','off'].map(v=>`<button class="chip ${S.set.dark===v?'on':''}" data-act="dark" data-v="${v}">${v}</button>`).join('')}</span></div>
   <div class="r">Opening animation${sw(S.set.intro,'introTog','style="margin-left:auto"')}</div></div>
  <div class="card set"><h3>Security</h3><div class="r">PIN code<button class="v" data-act="pinSet">${L.pin?'change':'set a PIN'}</button></div>${L.pin?`<div class="r">Face ID / fingerprint${sw(!!L.faceId,'faceTog','style="margin-left:auto"')}</div><div class="r">Lock after<span class="v" style="display:flex;gap:4px">${[0,1,5].map(v=>`<button class="chip ${L.after===v?'on':''}" data-act="lockAfter" data-v="${v}">${v?v+' min':'now'}</button>`).join('')}</span></div><div class="r">Remove PIN<button class="v" data-act="pinOff">remove</button></div>`:''}</div>
  <div class="card set"><h3>Sync across devices</h3>${SYNC.conf?`<div class="r">✓ On · ${SYNC.status==='offline'?'offline — will sync when back online':SYNC.last?'last sync '+ago(SYNC.last):'syncing…'}</div><div class="r">This device<span class="v">${esc(devId().slice(0,6))}</span></div><div class="r">Sync now<button class="v" data-act="syncNow">sync</button></div><div class="r">Turn off on this device<button class="v" data-act="syncOff">turn off</button></div>`:`<div class="r"><span class="hint">Your journal on your phone, iPad and computer. Everything saves on its own — you only type your personal code once per device.</span></div><button class="btn d full" data-act="syncOn" style="margin-top:6px">Turn on sync</button>`}</div>
  <div class="card set"><h3>Reminders</h3><div class="r">Notifications<span class="hint" style="margin-left:auto;margin-right:8px">${notifLabel()}</span>${remindersOn()?`${pushSupport()==='push'&&!PUSH.sub?'<button class="v" data-act="notifOn" style="margin-right:10px">connect</button>':''}<button class="v" data-act="notifOff">turn off</button>`:`<button class="btn sm d" data-act="notifOn">${perm==='denied'?'help':'turn on'}</button>`}</div>${isIOS&&!isStandalone()?'<div class="r"><span class="hint">On iPhone/iPad: Share → Add to Home Screen, then open the app from its icon to turn reminders on.</span></div>':''}
   <div class="r">Morning to-do${sw(R.morning,'remTog','data-k="morning" style="margin-left:auto"')}</div><div class="r">Time<input type="time" data-in="remTime" data-k="mtime" value="${R.mtime}"></div>
   <div class="r">Day before a deadline${sw(R.dayBefore,'remTog','data-k="dayBefore" style="margin-left:auto"')}</div><div class="r">Time<input type="time" data-in="remTime" data-k="dtime" value="${R.dtime}"></div>
   <div class="r">Also 3 days before${sw(R.three,'remTog','data-k="three" style="margin-left:auto"')}</div><div class="r">Streak reminder (21:00)${sw(R.streak,'remTog','data-k="streak" style="margin-left:auto"')}</div><div class="r">Groceries day (Sat 9:00)${sw(R.groc,'remTog','data-k="groc" style="margin-left:auto"')}</div><div class="r">Water (every 2 h)${sw(R.water,'remTog','data-k="water" style="margin-left:auto"')}</div>
   <div class="r">Send a test notification<button class="v" data-act="notifTest">test</button></div></div>
  <div class="card set"><h3>Semester</h3><div class="r">Odd weeks<span class="v">${S.set.swapWeeks?'face to face':'online'}</span></div><div class="r">Even weeks<span class="v">${S.set.swapWeeks?'online':'face to face'}</span></div><div class="r">Swap online / F2F${sw(S.set.swapWeeks,'swapTog','style="margin-left:auto"')}</div></div>
  <div class="card set"><h3>Export</h3><div class="r">This week as PDF<button class="v" data-act="pdfWeek">⤓ export</button></div><div class="r">This month as PDF<button class="v" data-act="pdfMonth">⤓ export</button></div><div class="r">Backup file (.json)<button class="v" data-act="backup">⤓ save</button></div><div class="r">Import a backup<label class="v" style="cursor:pointer">⤒ import<input type="file" id="importIn" accept="application/json" hidden></label></div></div>
  <div class="card set"><h3>Saving</h3><div class="r">✓ Everything saves automatically on this device</div><div class="r">Daily automatic copies (last 7 days)<button class="v" data-act="snaps">restore…</button></div><div class="r">Trash · ${S.trash.length} item${S.trash.length===1?'':'s'}<a class="v" href="#trash">open ›</a></div></div>
  <div class="hint" style="text-align:center;margin:16px">My Daily Journal · made with love ♡</div></div>`}
function pTrash(){const lbl={task:'Task',rec:'Recurring task',goal:'Weekly task',groc:'Grocery item',receipt:'Receipt',dump:'Brain dump note',mod:'Notebook item',link:'Link',test:'Test',food:'Food',extra:'Calories',habit:'Habit'};
  return `<div class="page">${brand()}<a class="back" href="#settings">‹ Settings</a>${title('The','TRASH','kept 30 days')}
  <div class="card">${S.trash.length?S.trash.map(t=>`<div class="li"><span class="grow"><span class="tx">${esc(t.label)}</span><br><span class="meta">${lbl[t.type]||t.type} · ${fmtDay(new Date(t.ts))}</span></span><button class="btn sm" data-act="restore" data-id="${t.id}">Restore</button><button class="x" data-act="purge" data-id="${t.id}">✕</button></div>`).join(''):'<div class="hint">The trash is empty.</div>'}</div>
  ${S.trash.length?'<div class="btns"><button class="btn" data-act="purgeAll">Empty trash</button></div>':''}</div>`}
