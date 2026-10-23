/* ============ MY DAILY JOURNAL — router, actions, features ============ */
'use strict';
let ROUTE='home',ARGS=[];
function route(){const h=(location.hash||'#home').slice(1).split('/');ROUTE=h[0]||'home';ARGS=h.slice(1)}
function render(keepScroll){route();const y=window.scrollY;let html='';
  switch(ROUTE){case'week':html=pWeek();break;case'today':html=pToday();break;case'cal':html=pCal();break;case'sem':html=pSem();break;case'wrapped':html=pWrapped();break;case'kcal':html=pKcal();break;
    case'groc':html=ARGS[0]==='checkout'?pCheckout():ARGS[0]==='r'?pReceipt(ARGS[1],ARGS[2]==='print'):pGroc(ARGS[0]);break;
    case'binder':html=pBinder();break;case'mod':html=pMod(ARGS[0]);break;case'dump':html=pDump();break;case'focus':html=pFocus();break;case'stickers':html=pStickers();break;case'settings':html=pSettings();break;case'trash':html=pTrash();break;default:ROUTE='home';html=pHome()}
  $('#app').dataset.route=ROUTE;$('#app').innerHTML=html+(ROUTE==='home'?'':barHtml(ROUTE));
  if(keepScroll)window.scrollTo(0,y);else window.scrollTo(0,0);
  mount();}
function rerender(){render(true)}
function mount(){bindSwipes();
  if(ROUTE==='week'&&!window._weekScrolled){window._weekScrolled=true;const el=document.getElementById('d-'+TK());if(el&&ARGS[0]!=='top')setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),120)}
  if(ROUTE==='groc'&&!ARGS[0])bindGrocAdd();
  if(ROUTE==='groc'&&ARGS[0]==='checkout')bindCheckout();
  if(ROUTE==='groc'&&ARGS[0]==='r'&&ARGS[2]==='print'){const p=$('#printing');if(p)setTimeout(()=>{p.classList.add('tear');history.replaceState(null,'','#groc/r/'+ARGS[1]);setTimeout(()=>{if(ROUTE==='groc')rerender()},650)},2700)}
  if(ROUTE==='focus')focusTick();
  const lnf=$('#ln-f');if(lnf)lnf.onchange=attachFile;
  const imp=$('#importIn');if(imp)imp.onchange=importBackup;
  $$('[data-cover]').forEach(i=>i.onchange=setCover);
}
window.addEventListener('hashchange',()=>{window._weekScrolled=false;closeSheet();render()});

/* ---------- click actions ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,ds=el.dataset;if(ACT[a]){e.preventDefault();ACT[a](el,ds,e)}});
$('#sheetbg')?.addEventListener('click',closeSheet);
const ACT={
  closeSheet:()=>closeSheet(),
  /* week */
  wkPrev:()=>{S.ui.week=Math.max(0,S.ui.week-1);save();render()},wkNext:()=>{S.ui.week=Math.min(BLOCKS.length-1,S.ui.week+1);save();render()},
  goWeek:(el,d)=>{S.ui.week=+d.i;save();window._weekScrolled=true;location.hash='#week'},
  goalTog:(el,d)=>{const w=wk(BLOCKS[S.ui.week].id),g=w.goals[+d.i];g.d=!g.d;if(g.d)markActive();save();rerender()},
  goalAdd:()=>{wk(BLOCKS[S.ui.week].id).goals.push({id:uid(),t:'',d:false});save();rerender()},
  goalDel:(el,d)=>{const w=wk(BLOCKS[S.ui.week].id),i=+d.i,g=w.goals.splice(i,1)[0];trash('goal',g.t||'Weekly task',{wid:BLOCKS[S.ui.week].id,goal:g,idx:i});rerender()},
  hab:(el,d)=>{const w=wk(BLOCKS[S.ui.week].id),k=d.i+'-'+d.d;w.hab[k]?delete w.hab[k]:(w.hab[k]=true,markActive());el.classList.toggle('on');save();checkStickers()},
  habAdd:()=>{wk(BLOCKS[S.ui.week].id).habits.push('');save();rerender();const ins=$$('[data-in=habit]');ins[ins.length-1]?.focus()},
  habDel:(el,d)=>{const id=BLOCKS[S.ui.week].id,w=wk(id),i=+d.i,name=w.habits.splice(i,1)[0];const nh={};for(const k in w.hab){const[hi,dd]=k.split('-').map(Number);if(hi<i)nh[k]=1;else if(hi>i)nh[(hi-1)+'-'+dd]=1}w.hab=nh;trash('habit',name||'Habit',{wid:id,name,idx:i});rerender()},
  taskTog:(el,d)=>{const t=dayData(d.k).tasks.find(x=>x.id===d.id);t.d=!t.d;if(t.d){markActive();el.classList.add('anim')}save();afterTick(d.k);rerender()},
  recTog:(el,d)=>{const k=d.k+'|'+d.r;S.recDone[k]?delete S.recDone[k]:(S.recDone[k]=1,markActive());save();afterTick(d.k);rerender()},
  taskDel:(el,d)=>{const arr=dayData(d.k).tasks,i=arr.findIndex(x=>x.id===d.id),t=arr.splice(i,1)[0];trash('task',t.t||'Task',{k:d.k,task:t,idx:i});rerender()},
  taskMore:(el,d)=>taskSheet(d.k),
  taskSave:()=>{const t=$('#nt-t').value.trim();if(!t)return toast('Write the task first');const k=$('#nt-d').value||TK(),s=$('#nt-s').value,e=$('#nt-e').value;const rep=$$('#nt-r button.on').map(b=>+b.dataset.i);
    if(rep.length){S.rec.push({id:uid(),t,dow:rep,time:s||'',end:e||'',from:k});toast('Recurring task added ↻')}else{dayData(k).tasks.push({id:uid(),t,d:false,time:s||'',end:e||''});toast('Task added')}save();closeSheet();rerender()},
  recMenu:(el,d)=>{const r=S.rec.find(x=>x.id===d.r);sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Repeat</em></div></div><div class="hint" style="margin:6px 0 12px">“${esc(r.t)}” · every ${r.dow.map(i=>DAYS3[i]).join(', ')}${r.time?' at '+r.time:''}</div><div class="btns" style="margin:0;flex-direction:column"><button class="btn" data-act="recSkip" data-k="${d.k}" data-r="${d.r}">Skip only this day</button><button class="btn d" data-act="recDel" data-r="${d.r}">Delete the repeat</button><button class="btn" data-act="closeSheet">Cancel</button></div></div>`)},
  recSkip:(el,d)=>{S.recSkip[d.k+'|'+d.r]=1;save();closeSheet();rerender();toast('Skipped for this day',()=>{delete S.recSkip[d.k+'|'+d.r];save();rerender()})},
  recDel:(el,d)=>{const i=S.rec.findIndex(x=>x.id===d.r),r=S.rec.splice(i,1)[0];closeSheet();trash('rec',r.t,{rec:r,idx:i});rerender()},
  pdfWeek:()=>printWeek(),pdfMonth:()=>printMonth(),
  /* today / cal */
  tdPrev:()=>{S.ui.todayKey=key(addDays(parseKey(S.ui.todayKey||TK()),-1));rerender()},tdNext:()=>{S.ui.todayKey=key(addDays(parseKey(S.ui.todayKey||TK()),1));rerender()},tdToday:()=>{S.ui.todayKey=null;rerender()},
  calPrev:()=>{let[y,m]=S.ui.cal;m--;if(m<0){m=11;y--}S.ui.cal=[y,m];rerender()},calNext:()=>{let[y,m]=S.ui.cal;m++;if(m>11){m=0;y++}S.ui.cal=[y,m];rerender()},
  calDay:(el,d)=>daySheet(d.k),
  openDayWeek:(el,d)=>{const bi=blockOf(parseKey(d.k));closeSheet();if(bi<0)return toast('This day is outside the semester');S.ui.week=bi;save();location.hash='#week';setTimeout(()=>document.getElementById('d-'+d.k)?.scrollIntoView({behavior:'smooth',block:'center'}),200)},
  /* calories */
  kPrev:()=>{S.ui.kcalKey=key(addDays(parseKey(S.ui.kcalKey||TK()),-1));rerender()},kNext:()=>{S.ui.kcalKey=key(addDays(parseKey(S.ui.kcalKey||TK()),1));rerender()},kToday:()=>{S.ui.kcalKey=null;rerender()},
  water:(el,d)=>{const D=calDay(S.ui.kcalKey||TK()),n=+d.n;D.water=D.water===n?n-1:n;markActive();save();checkStickers();rerender()},
  kPlus:(el,d)=>kStep(d,1),kMinus:(el,d)=>kStep(d,-1),
  foodSheet:()=>foodSheet(),
  accTog:(el,d)=>{const o=window._openCats||(window._openCats={});o[d.c]=!o[d.c];el.parentElement.classList.toggle('open')},
  exAdd:()=>{const t=$('#ex-t').value.trim()||'Other',k=num($('#ex-k').value);if(!(k>0))return toast('Enter the kcal');calDay(S.ui.kcalKey||TK()).extra.push({id:uid(),t,k});markActive();save();toast(`+${Math.round(k)} kcal added`);foodSheet();rerender()},
  exDel:(el,d)=>{const k=S.ui.kcalKey||TK(),arr=calDay(k).extra,j=+d.j,x=arr.splice(j,1)[0];trash('extra',x.t,{k,x,idx:j});rerender()},
  foodAdd:()=>{const n=$('#nf-n').value.trim(),k=num($('#nf-k').value);if(!n||!(k>0))return toast('Add a name and kcal');const u=$('#nf-u').value;S.foods.push({id:'c'+uid(),name:n,kcal:k,cat:$('#nf-c').value,unit:u,step:u==='g'?10:u==='ml'?50:1,custom:true});save();toast('Food saved');foodSheet()},
  foodDel:(el,d)=>{const i=S.foods.findIndex(f=>f.id===d.id),f=S.foods.splice(i,1)[0];trash('food',f.name,{food:f,idx:i});foodSheet()},
  /* groceries */
  gTab:(el,d)=>{S.ui.grocTab=d.v;save();location.hash=d.v==='list'?'#groc':'#groc/'+d.v},
  gTick:(el,d)=>{const x=S.groc.items.find(i=>i.id===d.id);x.checked=!x.checked;if(x.checked){markActive();fly(el,`+ ${x.name}`)}save();rerender();if(x.checked){const v=$('#gvis');v&&(v.classList.add('bump'))}},
  gPlus:(el,d)=>{const x=S.groc.items.find(i=>i.id===d.id);x.qty++;save();rerender()},
  gMinus:(el,d)=>{const x=S.groc.items.find(i=>i.id===d.id);x.qty=Math.max(1,x.qty-1);save();rerender()},
  gAdd:()=>grocAdd(),
  gApprove:(el,d)=>{const v=num(d.v);S.groc.approved+=v;save();rerender();toast(`Difference of ${rs(v)} approved`,()=>{S.groc.approved=Math.max(0,S.groc.approved-v);save();rerender()})},
  gUnapprove:()=>{const v=S.groc.approved;S.groc.approved=0;save();rerender();toast('Approval cancelled',()=>{S.groc.approved=v;save();rerender()})},
  gAdjust:()=>{$('#glist')?.scrollIntoView({behavior:'smooth'});toast('Lower a quantity or swipe an item to remove it')},
  gUntick:()=>{const prev=S.groc.items.filter(x=>x.checked).map(x=>x.id);S.groc.items.forEach(x=>x.checked=false);save();rerender();toast('All items unticked',()=>{S.groc.items.forEach(x=>{if(prev.includes(x.id))x.checked=true});save();rerender()})},
  gCheckout:()=>{if(!S.groc.items.some(x=>x.checked))return toast('Tick what is in your basket first');S.ui.real=null;location.hash='#groc/checkout'},
  gSaveReceipt:()=>{const its=S.groc.items.filter(x=>x.checked);const calc=its.reduce((a,x)=>a+x.qty*x.price,0);const rv=$('#realT').value;const real=rv===''?calc:num(rv);
    const r={id:uid(),date:TK(),items:its.map(x=>({n:x.name,u:x.unit,q:x.qty,p:x.price})),calc,real,budget:S.groc.budget+S.groc.approved};
    S.groc.receipts.unshift(r);for(const x of its)if(x.price)S.groc.prices[x.name.toLowerCase()]=x.price;S.groc.items=S.groc.items.filter(x=>!x.checked);S.groc.approved=0;markActive();save();checkStickers();location.hash='#groc/r/'+r.id+'/print'},
  openReceipt:(el,d)=>{location.hash='#groc/r/'+d.id},
  rcptDel:(el,d)=>{const i=S.groc.receipts.findIndex(r=>r.id===d.id),r=S.groc.receipts.splice(i,1)[0];location.hash='#groc/receipts';trash('receipt','Receipt '+fmtDay(parseKey(r.date)),{r,idx:i})},
  menuNext:()=>{S.ui.menuSeed=(S.ui.menuSeed||0)+1;save();rerender()},
  menuToList:()=>{const M=menuOf(S.ui.menuSeed||0);let n=0;const added=[];for(const[,[,ings]]of M)for(const[name]of ings){if(onList(name))continue;const f=S.foods.find(x=>x.name===name);const clean=name.replace(/ \(.*\)/,'');const aisle=f?({starch:'Starches',prot:'Protein',veg:'Vegetables & fruit',fruit:'Vegetables & fruit',dairy:'Fresh',fat:'Pantry'}[f.cat]||'Other'):'Other';const it={id:uid(),name:clean,unit:'',qty:1,price:S.groc.prices[clean.toLowerCase()]||0,aisle,checked:false};S.groc.items.push(it);added.push(it.id);n++}
    save();rerender();toast(n?`${n} ingredient${n>1?'s':''} added to your list`:'Everything is already on your list ✓',n?()=>{S.groc.items=S.groc.items.filter(x=>!added.includes(x.id));save();rerender()}:null)},
  mealLog:(el,d)=>{const M=menuOf(S.ui.menuSeed||0).find(([c])=>c===d.c);const D=calDay(TK());for(const[name,q]of M[1][1]){const f=S.foods.find(x=>x.name===name);if(f)D.q[f.id]=(+D.q[f.id]||0)+q}markActive();save();toast(`${M[1][0]} logged · ${mealKcal(M[1][1])} kcal`)},
  /* binder */
  modTab:(el,d)=>{S.ui.modTab[d.mod]=d.l;save();rerender()},
  modTog:(el,d)=>{const x=S.mods[d.mod][d.l][+d.j];x.d=!x.d;if(x.d)markActive();save();checkStickers();rerender()},
  modSt:(el,d)=>{const x=S.mods[d.mod][d.l][+d.j];const n=STATUS[d.l==='tuto'&&d.mod==='diss'?'tuto_diss':d.l].length;x.st=((x.st||0)+1)%n;if(x.st)markActive();save();checkStickers();rerender()},
  modAdd:(el,d)=>{const t=$('#mi-t').value.trim();if(!t)return toast('Write something first');const date=$('#mi-d').value||'';S.mods[d.mod][d.l].push({id:uid(),t,date,d:false,st:0});save();rerender();toast(date?'Added · also in your calendar':'Added');setTimeout(()=>$('#mi-t')?.focus(),30)},
  linkAdd:(el,d)=>{const l=$('#ln-l').value.trim(),u=$('#ln-u').value.trim();if(!u)return toast('Paste a link first');S.mods[d.mod].links.push({id:uid(),label:l||u.replace(/^https?:\/\//,'').slice(0,24),url:/^https?:/.test(u)?u:'https://'+u});save();rerender()},
  linkDel:(el,d)=>{const arr=S.mods[d.mod].links,j=+d.j,L=arr.splice(j,1)[0];trash('link',L.label,{mod:d.mod,link:L,idx:j});rerender()},
  openFile:async(el,d)=>{const f=await idbGet('files',d.f);if(!f)return toast('File not found on this device');const url=URL.createObjectURL(f.blob);window.open(url,'_blank')},
  testAdd:(el,d)=>{S.mods[d.mod].tests.push({id:uid(),name:'Test '+(S.mods[d.mod].tests.length+1),score:'',weight:0});save();rerender()},
  testDel:(el,d)=>{const arr=S.mods[d.mod].tests,j=+d.j,t=arr.splice(j,1)[0];trash('test',t.name,{mod:d.mod,test:t,idx:j});rerender()},
  gradeT:(el,d)=>{S.mods[d.mod].target=d.g;save();checkStickers();rerender()},
  dumpAdd:()=>{const v=$('#dump-in').value.trim();if(!v)return;S.dump.unshift({id:uid(),t:v});save();rerender();setTimeout(()=>$('#dump-in')?.focus(),50)},
  dumpDel:(el,d)=>{const j=+d.j,n=S.dump.splice(j,1)[0];trash('dump',n.t,{n,idx:j});rerender()},
  dumpToday:(el,d)=>{const n=S.dump.splice(+d.j,1)[0];dayData(TK()).tasks.push({id:uid(),t:n.t,d:false});S.sorted=(S.sorted||0)+1;save();checkStickers();rerender();toast('Moved to today’s tasks',()=>{S.dump.splice(+d.j,0,n);const a=dayData(TK()).tasks;a.pop();save();rerender()})},
  dumpGroc:(el,d)=>{const n=S.dump.splice(+d.j,1)[0];S.groc.items.push({id:uid(),name:n.t,unit:'',qty:1,price:S.groc.prices[n.t.toLowerCase()]||0,aisle:'Other',checked:false});S.sorted=(S.sorted||0)+1;save();checkStickers();rerender();toast('Moved to groceries',()=>{S.dump.splice(+d.j,0,n);S.groc.items.pop();save();rerender()})},
  dumpNb:(el,d)=>{sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Send</em> to…</div></div><div class="hint" style="margin:6px 0 10px">“${esc(S.dump[+d.j].t)}” goes to the to-do of:</div>${MODS.filter(m=>m.id!=='dump').map(m=>`<button class="btn full" style="margin-top:6px" data-act="dumpTo" data-j="${d.j}" data-mod="${m.id}">${m.name}</button>`).join('')}<button class="btn full" style="margin-top:12px" data-act="closeSheet">Cancel</button></div>`)},
  dumpTo:(el,d)=>{const n=S.dump.splice(+d.j,1)[0];S.mods[d.mod].todo.push({id:uid(),t:n.t,date:'',d:false,st:0});S.sorted=(S.sorted||0)+1;save();closeSheet();checkStickers();rerender();toast('Moved to '+modById(d.mod).short)},
  /* focus */
  fMode:(el,d)=>{if(S.focus.run)return toast('Reset the timer first');S.focus.mode=d.v;save();rerender()},
  fMod:(el,d)=>{S.focus.mod=d.v;save();rerender()},
  fStart:()=>{const F=S.focus;if(!F.run)F.run={end:Date.now()+F[F.mode]*60000,paused:false,rem:0};else if(F.run.paused){F.run.end=Date.now()+F.run.rem*1000;F.run.paused=false}else{F.run.rem=Math.max(0,Math.round((F.run.end-Date.now())/1000));F.run.paused=true}save();rerender()},
  fReset:()=>{const F=S.focus;if(F.run&&F.mode==='work'){const spent=Math.round((F.work*60-(F.run.paused?F.run.rem:Math.max(0,(F.run.end-Date.now())/1000)))/60);if(spent>=5){F.log.push({date:TK(),mod:F.mod,mins:spent});toast(`${spent} min logged to ${modById(F.mod).short}`)}}F.run=null;save();rerender()},
  fEdit:()=>sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Edit</em> timer</div></div>${[['work','Focus'],['short','Short break'],['long','Long break']].map(([k,l])=>`<div class="row" style="margin-top:10px"><span class="grow" style="font:500 1.05rem var(--hand)">${l}</span><div class="field" style="width:90px"><input type="number" inputmode="numeric" id="fe-${k}" value="${S.focus[k]}"></div><span class="k">min</span></div>`).join('')}<div class="btns" style="margin:14px 0 0"><button class="btn" data-act="closeSheet">Cancel</button><button class="btn d" data-act="fEditSave">Save</button></div></div>`),
  fEditSave:()=>{for(const k of['work','short','long'])S.focus[k]=clamp(Math.round(num($('#fe-'+k).value))||1,1,180);save();closeSheet();rerender()},
  /* settings */
  theme:(el,d)=>{S.set.theme=d.v;applyTheme();save();rerender()},
  dark:(el,d)=>{S.set.dark=d.v;applyTheme();save();rerender()},
  introTog:()=>{S.set.intro=!S.set.intro;save();rerender()},
  swapTog:()=>{S.set.swapWeeks=!S.set.swapWeeks;save();rerender()},
  pinSet:()=>pinSetup(),
  pinOff:()=>{if(!confirm('Remove your PIN?'))return;S.lock.pin=null;S.lock.faceId=null;save();rerender();toast('PIN removed')},
  faceTog:()=>faceToggle(),
  lockAfter:(el,d)=>{S.lock.after=+d.v;save();rerender()},
  remTog:(el,d)=>{S.rem[d.k]=!S.rem[d.k];save();rerender()},
  notifOn:async()=>{if('Notification'in window&&Notification.permission==='denied'){return sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Allow</em> reminders</div></div><p class="hint" style="font-size:1.05rem">Notifications are blocked for this app.<br><br><b>iPhone / iPad:</b> Settings → Notifications → My Journal → Allow Notifications.<br><b>Android:</b> long-press the app icon → App info → Notifications.<br><b>Computer:</b> click the lock icon next to the address → Notifications → Allow.</p><button class="btn d full" data-act="closeSheet">OK</button></div>`)}
    const r=await enableNotifications();rerender();toast(r.msg);if(r.ok)setTimeout(()=>notify('Reminders are on ♡','You will get your morning to-do and your deadlines.'),400)},
  notifOff:async()=>{await disableNotifications();rerender();toast('Reminders turned off on this device')},
  syncOn:()=>syncSheet(),
  syncGo:async(el,d)=>{const c=$('#sy-code')?.value||window._syCode||'';if(c.trim().length<6)return toast('Use at least 6 characters');window._syCode=c;el.disabled=true;el.textContent='Checking…';
    try{const p=await syncProbe(c);if(p.exists&&!d.choice){return syncSheet(c,p)}const had=await syncEnable(c,d.choice||'');closeSheet();window._syCode=null;rerender();toast(had&&d.choice!=='upload'?'Synced ✓ — your journal is on this device':'Sync is on ✓')}
    catch(e){el.disabled=false;el.textContent='Try again';toast(e.message||'Could not turn on sync')}},
  syncNow:async()=>{await syncPull();await syncPush(true);rerender();toast(SYNC.status==='ok'?'Synced ✓':'Offline — will sync later')},
  syncOff:()=>{if(!confirm('Turn off sync on this device? Your data stays here and in the cloud.'))return;syncDisable();rerender();toast('Sync turned off on this device')},
  notifTest:()=>{if(!remindersOn())return toast('Turn notifications on first');notify(`${S.prof.t1} ${S.prof.t2} ${S.prof.t3}`,'This is how your reminders will look ♡')},
  backup:()=>{const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='my-daily-journal-'+TK()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);toast('Backup downloaded')},
  snaps:async()=>{const ks=(await idbKeys('snaps')).sort().reverse();sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Automatic</em> copies</div></div><div class="hint" style="margin:6px 0 10px">One copy is kept per day, for 7 days.</div>${ks.map(k=>`<div class="li"><span class="tx">${fmtDay(parseKey(k))}</span><button class="btn sm" data-act="snapRestore" data-k="${k}">Restore</button></div>`).join('')||'<div class="hint">No copy yet.</div>'}<button class="btn full" style="margin-top:12px" data-act="closeSheet">Close</button></div>`)},
  snapRestore:async(el,d)=>{if(!confirm('Go back to the copy of '+d.k+'? Your current data will be replaced (a backup file is downloaded first).'))return;ACT.backup();const s=await idbGet('snaps',d.k);if(s){S=s;load2();save(true);closeSheet();applyTheme();render();toast('Restored ✓')}},
  restore:(el,d)=>restore(d.id),
  purge:(el,d)=>{S.trash=S.trash.filter(t=>t.id!==d.id);save();rerender()},
  profReset:()=>{if(!confirm('Put back the original texts?'))return;S.prof=blank().prof;save();rerender()},
  coverReset:(el,d)=>{if(S.modCfg[d.mod])delete S.modCfg[d.mod].cover;applyModCfg();save();rerender()},
  purgeAll:()=>{if(!confirm('Delete everything in the trash for good?'))return;S.trash=[];save();rerender()},
};
function kStep(d,s){const k=S.ui.kcalKey||TK(),D=calDay(k),f=S.foods.find(x=>x.id===d.id);let g=(+D.q[f.id]||0)+s*(+f.step||1);g=Math.max(0,Math.round(g*10)/10);if(g)D.q[f.id]=g;else delete D.q[f.id];if(s>0)markActive();save();if(d.sh){foodSheet($('#fsearch')?.value||'')}rerender()}
function afterTick(k){const its=dayItems(k);if(its.length>=2&&its.every(x=>x.d)){confetti(40);toast('Every task of the day is done ♡')}checkStickers()}

/* ---------- input handlers ---------- */
document.addEventListener('input',e=>{const el=e.target,f=el.dataset.in;if(!f)return;const d=el.dataset,v=el.isContentEditable?el.textContent:el.value;
  const W=()=>wk(BLOCKS[S.ui.week].id);
  switch(f){
    case'goal':W().goals[+d.i].t=v;break;case'prio':W().prio=v;break;case'wnotes':W().notes=v;break;case'habit':W().habits[+d.i]=v;break;
    case'taskT':{const t=dayData(d.k).tasks.find(x=>x.id===d.id);if(t)t.t=v;break}
    case'note':dayData(d.k).note=v;break;
    case'calGoal':S.calGoal=num(v);break;
    case'kq':{const k=S.ui.kcalKey||TK(),D=calDay(k),g=Math.max(0,num(v));if(g)D.q[d.id]=g;else delete D.q[d.id];break}
    case'fk':{const fd=S.foods.find(x=>x.id===d.id);if(fd)fd.kcal=Math.max(0,num(v));break}
    case'gBudget':S.groc.budget=Math.max(0,num(v));break;
    case'gPrice':{const x=S.groc.items.find(i=>i.id===d.id);if(x)x.price=Math.max(0,num(v));break}
    case'modT':S.mods[d.mod][d.l][+d.j].t=v;break;
    case'testN':S.mods[d.mod].tests[+d.j].name=v;break;case'testS':S.mods[d.mod].tests[+d.j].score=v===''?'':clamp(num(v),0,100);break;case'testW':S.mods[d.mod].tests[+d.j].weight=num(v);break;case'examW':S.mods[d.mod].examW=num(v);break;
    case'dumpT':S.dump[+d.j].t=v;break;
    case'remTime':S.rem[d.k]=v;break;
    case'prof':S.prof[d.k]=v;break;
    case'sem':S.sem[d.k]=d.k==='start'?v:Math.max(0,Math.round(num(v)));break;
    case'modName':(S.modCfg[d.mod]=S.modCfg[d.mod]||{}).name=v.trim();applyModCfg();break;
    case'modShort':(S.modCfg[d.mod]=S.modCfg[d.mod]||{}).short=v.trim();applyModCfg();break;
    case'waterGoal':S.waterGoal=clamp(Math.round(num(v))||8,1,20);break;
  }
  save();
});
// re-render (keep focus) for fields whose totals depend on them
document.addEventListener('change',e=>{const el=e.target,f=el.dataset.in;
  if(f==='wkSel'){S.ui.week=+el.value;save();render();return}
  if(f==='sem'){if(S.sem.start&&!isNaN(parseKey(S.sem.start))){buildBlocks();S.ui.week=null;save();rerender()}return}
  if(['prof','modName','modShort','waterGoal'].includes(f)){applyModCfg();rerender();const ib=$('#intro .bk');return}
  if(['calGoal','kq','gBudget','gPrice','testS','testW','examW','fk'].includes(f)){if(el.dataset.sh)foodSheet($('#fsearch')?.value||'');rerender()}});
document.addEventListener('keydown',e=>{const el=e.target;
  if(e.key==='Enter'&&el.dataset.add){const v=el.value.trim();if(!v)return;dayData(el.dataset.add).tasks.push({id:uid(),t:v,d:false});save();rerender();const n=$(`[data-add="${el.dataset.add}"]`);n&&n.focus()}
  if(e.key==='Enter'&&el.isContentEditable){e.preventDefault();el.blur()}
  if(e.key==='Enter'&&el.id==='dump-in')ACT.dumpAdd();
  if(e.key==='Enter'&&(el.id==='gi-n'||el.id==='gi-p'||el.id==='gi-q'))grocAdd();
  if(e.key==='Enter'&&el.id==='mi-t')$('[data-act=modAdd]')?.click();
  if(e.key==='Enter'&&el.id==='nt-t')ACT.taskSave();
  if(e.key==='Enter'&&el.id==='sy-code')$('[data-act=syncGo]')?.click();});

/* ---------- groceries helpers ---------- */
function bindGrocAdd(){const n=$('#gi-n'),p=$('#gi-p'),q=$('#gi-q'),b=$('[data-act=gAdd]'),h=$('#gi-h');if(!n)return;
  const upd=()=>{const last=S.groc.prices[n.value.trim().toLowerCase()];if(last&&!p.dataset.touched){p.value=last}h.textContent=last?`last price paid: ${rs(last)}`:'';const add=num(p.value)*(num(q.value)||1);b.textContent=`Add · + ${rs(add)} to total`;
    const T=gTotals(),cap=S.groc.budget+S.groc.approved;if(T.planned+add>cap&&add>0)b.textContent+=' ⚠'};
  n.oninput=upd;p.oninput=()=>{p.dataset.touched=1;upd()};q.oninput=upd;upd()}
function grocAdd(){const n=$('#gi-n').value.trim();if(!n)return toast('Write the item first');const price=num($('#gi-p').value),qty=Math.max(1,Math.round(num($('#gi-q').value))||1);const last=S.groc.prices[n.toLowerCase()];
  const it={id:uid(),name:n,unit:$('#gi-u').value.trim(),qty,price,aisle:$('#gi-a').value,checked:false,prev:last||0};S.groc.items.push(it);save();
  toast(`${n} added · + ${rs(qty*price)}`,()=>{S.groc.items=S.groc.items.filter(x=>x.id!==it.id);save();rerender()});rerender();setTimeout(()=>{const a=$('#gi-a');if(a)a.value=it.aisle;$('#gi-n')?.focus()},30)}
function fly(fromEl,label){const vis=$('#gvis');if(!vis)return;const a=fromEl.getBoundingClientRect(),b=vis.getBoundingClientRect();const f=document.createElement('div');f.className='flyer';f.textContent=label;document.body.appendChild(f);
  f.animate([{left:a.left+'px',top:a.top+'px',opacity:1,transform:'scale(1)'},{left:(a.left+b.left)/2+'px',top:Math.min(a.top,b.top)-60+'px',opacity:1,transform:'scale(1.05)'},{left:b.left+30+'px',top:b.top+30+'px',opacity:0,transform:'scale(.5)'}],{duration:700,easing:'cubic-bezier(.3,.7,.4,1)'}).onfinish=()=>f.remove()}
function bindCheckout(){const r=$('#realT'),dv=$('#realDiff');const calc=S.groc.items.filter(x=>x.checked).reduce((a,x)=>a+x.qty*x.price,0);
  const upd=()=>{S.ui.real=r.value;const real=r.value===''?calc:num(r.value),diff=real-calc;dv.innerHTML=Math.abs(diff)<.005?'<span style="color:var(--ok)">✓ same as calculated</span>':`<span style="color:${diff>0?'var(--bad)':'var(--ok)'}">${diff>0?'▲ '+rs(diff)+' more':'▼ '+rs(-diff)+' less'} than calculated</span>`;const t=$('.rcpt .tot span:last-child');if(t)t.textContent='Rs '+real.toFixed(2)};
  r.oninput=upd;upd();$('#scanIn').onchange=scanReceipt}
async function scanReceipt(e){const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);const w=$('#scanwrap');w.innerHTML=`<div class="scanbox"><img src="${url}" alt=""><div class="lnr"></div><div class="st" id="scanSt">reading your receipt…</div></div>`;
  try{if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
    const{data}=await Tesseract.recognize(file,'eng',{logger:m=>{if(m.status==='recognizing text'){const s=$('#scanSt');s&&(s.textContent='reading… '+Math.round(m.progress*100)+'%')}}});
    const total=findTotal(data.text);const s=$('#scanSt');
    if(total){$('#realT').value=total.toFixed(2);$('#realT').dispatchEvent(new Event('input'));s.textContent='total found: '+rs(total)+' ✓';w.querySelector('.lnr')?.remove();toast('Total found: '+rs(total))}else{s.textContent='total not found — type it in';w.querySelector('.lnr')?.remove()}}
  catch(err){w.innerHTML='';toast('Scan unavailable offline — type the total')}}
function findTotal(text){const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);const amt=l=>{const m=l.replace(/O/g,'0').match(/(\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})\s*$/);return m?parseFloat(m[1].replace(/[ ,](?=\d{3})/g,'').replace(',','.')):null};
  for(const re of[/\b(grand\s*)?total\b|\btotal\s*(ttc|due|a payer|à payer)|net\s*à\s*payer|montant/i]){for(let i=lines.length-1;i>=0;i--){if(re.test(lines[i])&&!/sub|sous/i.test(lines[i])){const a=amt(lines[i])??(lines[i+1]?amt(lines[i+1]):null);if(a)return a}}}
  const all=lines.map(amt).filter(Boolean);return all.length?Math.max(...all):null}

/* ---------- swipe to delete ---------- */
function bindSwipes(){$$('[data-swipe]').forEach(row=>{const fg=row.querySelector('.fg');let x0=null,y0=0,dx=0,locked=null;
  fg.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,[contenteditable]'))return;x0=e.clientX;y0=e.clientY;dx=0;locked=null;row.classList.add('dragging')});
  fg.addEventListener('pointermove',e=>{if(x0==null)return;const mx=e.clientX-x0,my=e.clientY-y0;if(locked==null&&(Math.abs(mx)>8||Math.abs(my)>8))locked=Math.abs(mx)>Math.abs(my)?'x':'y';if(locked!=='x')return;dx=Math.min(0,mx);fg.style.transform=`translateX(${dx}px)`;fg.setPointerCapture?.(e.pointerId)});
  const end=()=>{if(x0==null)return;row.classList.remove('dragging');x0=null;if(locked==='x')row._justDragged=Date.now();if(dx<-140){fg.style.transform='translateX(-100%)';setTimeout(()=>swipeDelete(row),180)}else if(dx<-50){fg.style.transform='translateX(-90px)';row.dataset.open=1}else{fg.style.transform='';delete row.dataset.open}};
  fg.addEventListener('pointerup',end);fg.addEventListener('pointercancel',end);
  row.querySelector('.del').addEventListener('click',()=>swipeDelete(row));
  fg.addEventListener('click',e=>{if(row._justDragged&&Date.now()-row._justDragged<350){e.stopPropagation();e.preventDefault();return}if(row.dataset.open){e.stopPropagation();e.preventDefault();fg.style.transform='';delete row.dataset.open}},true)})}
function swipeDelete(row){const d=row.dataset;
  if(d.swipe==='groc'){const i=S.groc.items.findIndex(x=>x.id===d.id),x=S.groc.items.splice(i,1)[0];trash('groc',x.name,{item:x,idx:i})}
  else if(d.swipe==='receipt'){const i=S.groc.receipts.findIndex(r=>r.id===d.id),r=S.groc.receipts.splice(i,1)[0];trash('receipt','Receipt '+fmtDay(parseKey(r.date)),{r,idx:i})}
  else if(d.swipe==='mod'){const arr=S.mods[d.mod][d.l],j=+d.j,x=arr.splice(j,1)[0];trash('mod',x.t||'Item',{mod:d.mod,list:d.l,item:x,idx:j})}
  rerender()}

/* ---------- drag a task to another day ---------- */
let drag=null;
document.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-grip]');if(!g)return;e.preventDefault();const t=dayData(g.dataset.k).tasks.find(x=>x.id===g.dataset.grip);if(!t)return;
  const gh=document.createElement('div');gh.className='ghost';gh.textContent=t.t||'Task';document.body.appendChild(gh);drag={id:t.id,k:g.dataset.k,gh,over:null};moveGhost(e)});
document.addEventListener('pointermove',e=>{if(drag){e.preventDefault();moveGhost(e)}},{passive:false});
document.addEventListener('pointerup',e=>{if(!drag)return;const{id,k,gh,over}=drag;gh.remove();$$('.day.drop').forEach(x=>x.classList.remove('drop'));drag=null;
  if(over&&over!==k){const src=dayData(k).tasks,i=src.findIndex(x=>x.id===id),t=src.splice(i,1)[0];dayData(over).tasks.push(t);save();rerender();toast(`Moved to ${fmtDay(parseKey(over))}`,()=>{const a=dayData(over).tasks;a.splice(a.findIndex(x=>x.id===id),1);dayData(k).tasks.splice(i,0,t);save();rerender()})}});
function moveGhost(e){drag.gh.style.left=(e.clientX-40)+'px';drag.gh.style.top=(e.clientY-20)+'px';const under=document.elementFromPoint(e.clientX,e.clientY)?.closest('.day');$$('.day.drop').forEach(x=>x!==under&&x.classList.remove('drop'));if(under){under.classList.add('drop');drag.over=under.dataset.day}else drag.over=null;
  if(e.clientY<70)window.scrollBy(0,-14);else if(e.clientY>innerHeight-110)window.scrollBy(0,14)}

/* ---------- focus timer ---------- */
let fTimer=null;
function focusTick(){clearInterval(fTimer);fTimer=setInterval(()=>{const F=S.focus;if(!F.run||F.run.paused)return;const rem=Math.max(0,Math.round((F.run.end-Date.now())/1000));
  if(ROUTE==='focus'){const t=$('#fTime'),a=$('#fArc');if(t){t.textContent=pad(Math.floor(rem/60))+':'+pad(rem%60);const tot=F[F.mode]*60;a.setAttribute('stroke-dasharray',`${540.4*(1-rem/tot)} 540.4`)}}
  if(rem<=0)focusDone()},500)}
function focusDone(){const F=S.focus;if(!F.run)return;if(F.mode==='work'){F.log.push({date:TK(),mod:F.mod,mins:F.work});F.done++;markActive();notify('Focus session done ✦',`${F.work} min of ${modById(F.mod).short}. Time for a break ♡`);confetti(24);F.mode=F.done%4===0?'long':'short'}else{notify('Break is over','Ready for another focus session?');F.mode='work'}
  F.run=null;try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}save();checkStickers();if(ROUTE==='focus')rerender()}

/* ---------- confetti ---------- */
function confetti(n=30){const c=document.createElement('div');c.className='confetti';const cols=['#F06A9B','#F2D65C','#A9CBE8','#B5CFA0','#E2483D','#F4A259','#C4687B'];
  for(let i=0;i<n;i++){const p=document.createElement('i');p.style.left=Math.random()*100+'%';p.style.background=cols[i%cols.length];p.style.animationDelay=Math.random()*.4+'s';p.style.animationDuration=1.6+Math.random()*1.2+'s';p.style.borderRadius=i%3?'2px':'50%';c.appendChild(p)}document.body.appendChild(c);setTimeout(()=>c.remove(),3200)}

/* ---------- theme ---------- */
function applyTheme(){const r=document.documentElement;r.dataset.theme=S.set.theme;const dk=S.set.dark==='on'||(S.set.dark==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('dark',dk);$('meta[name=theme-color]')?.setAttribute('content',dk?'#24080F':'#F6DCE0')}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{applyTheme()});

/* ---------- PIN lock ---------- */
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
let lockedAt=null;
function showLock(mode='unlock',onDone){let entry='',first=null;const L=$('#lock');L.classList.remove('hide');
  const draw=(msg)=>{L.innerHTML=`<div style="width:64px;height:50px;color:var(--rd)">${BOW}</div><h2>${esc(S.prof.t1)} <em>${esc(S.prof.t2)}</em> ${esc(S.prof.t3)}</h2><div class="k">${msg}</div><div class="pdots">${[0,1,2,3].map(i=>`<i class="${i<entry.length?'f':''}"></i>`).join('')}</div><div class="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-n="${n}">${n}</button>`).join('')}<button class="t" data-n="face">${mode==='unlock'&&S.lock.faceId?'Face ID':mode!=='unlock'?'cancel':''}</button><button data-n="0">0</button><button class="t" data-n="del">⌫</button></div>`;
    L.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>press(b.dataset.n))};
  const msgs={unlock:'Enter your PIN',set:'Choose a 4-digit PIN',confirm:'Confirm your PIN'};let m='unlock'===mode?'unlock':'set';draw(msgs[m]);
  async function press(n){if(n==='del'){entry=entry.slice(0,-1);return draw(msgs[m])}if(n==='face'){if(mode!=='unlock'){L.classList.add('hide');return}return faceUnlock()}if(entry.length>=4)return;entry+=n;draw(msgs[m]);
    if(entry.length===4){if(m==='unlock'){if(await hash(entry+S.lock.salt)===S.lock.pin){L.classList.add('hide');lockedAt=null}else{const d=L.querySelector('.pdots');d.classList.add('err');setTimeout(()=>{entry='';draw('Wrong PIN, try again')},400)}}
      else if(m==='set'){first=entry;entry='';m='confirm';draw(msgs[m])}
      else{if(entry===first){S.lock.salt=uid();S.lock.pin=await hash(entry+S.lock.salt);save(true);L.classList.add('hide');toast('PIN saved ✓');onDone&&onDone()}else{entry='';first=null;m='set';draw('PINs did not match — choose again')}}}}
  if(mode==='unlock'&&S.lock.faceId)setTimeout(faceUnlock,300)}
function pinSetup(){showLock('set',()=>render(true))}
async function faceToggle(){if(S.lock.faceId){S.lock.faceId=null;save();return rerender()}
  if(!window.PublicKeyCredential)return toast('Face ID is not available in this browser');
  try{const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'My Daily Journal'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'me',displayName:'Me'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required'},timeout:60000}});
    S.lock.faceId=btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));save();rerender();toast('Face ID is on ✓')}catch(e){toast('Face ID was not set up')}}
async function faceUnlock(){try{const id=Uint8Array.from(atob(S.lock.faceId),c=>c.charCodeAt(0));await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id}],userVerification:'required',timeout:60000}});$('#lock').classList.add('hide');lockedAt=null}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!S.lock.pin)return;if(document.hidden){lockedAt=Date.now()}else if(lockedAt&&Date.now()-lockedAt>=S.lock.after*60000){showLock('unlock')}});

/* ---------- notifications ---------- */
async function notify(title,body){if(!('Notification'in window)||Notification.permission!=='granted')return toast(title+' — '+body);try{const reg=navigator.serviceWorker?await Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),3000))]):null;if(reg&&reg.active)return await reg.showNotification(title,{body,icon:'icon-192.png',badge:'icon-192.png',tag:title});new Notification(title,{body,icon:'icon-192.png'})}catch(e){toast(title)}}
function checkReminders(){if(!remindersOn()||serverPushActive())return;const R=S.rem,n=new Date(),hm=pad(n.getHours())+':'+pad(n.getMinutes()),k=TK(),sent=S.sent;const once=(id,t,b)=>{if(sent[id])return;sent[id]=1;notify(t,b);save()};
  if(R.morning&&hm>=R.mtime){const its=datedItems(k).filter(x=>!x.d);once('m'+k,'Good morning ☀',its.length?`${its.length} thing${its.length>1?'s':''} today: ${its.slice(0,3).map(x=>x.t).join(' · ')}`:'Nothing planned today — enjoy ♡')}
  if(R.dayBefore&&hm>=R.dtime){const t=key(addDays(today(),1));const due=datedItems(t).filter(x=>x.mod&&!x.d);if(due.length)once('d'+t,'Due tomorrow',due.map(x=>x.t).join(' · '))}
  if(R.three&&hm>=R.dtime){const t=key(addDays(today(),3));const due=datedItems(t).filter(x=>x.mod&&!x.d);if(due.length)once('t'+t,'Due in 3 days',due.map(x=>x.t).join(' · '))}
  if(R.streak&&hm>='21:00'&&!S.active[k]&&streak()>0)once('s'+k,`Keep your ${streak()}-day streak 🎀`,'Tick one thing in your planner today.');
  if(R.groc&&n.getDay()===6&&hm>='09:00'&&S.groc.items.length)once('g'+k,'Groceries day 🛒',`${S.groc.items.length} items on your list · budget ${rs(S.groc.budget)}`);
  if(R.water&&n.getHours()>=9&&n.getHours()<=21&&n.getHours()%2===1&&n.getMinutes()<5)once('w'+k+n.getHours(),'Water time 💧',`${S.cal[k]?.water||0}/${S.waterGoal} glasses so far`);
  const cut=key(addDays(today(),-10));for(const x in sent)if(x.slice(1,11)<cut)delete sent[x]}

/* ---------- PDF export (print) ---------- */
function printWeek(){const B=BLOCKS[S.ui.week??nowBlock()];const W=wk(B.id);
  $('#print').innerHTML=`<div class="pp"><h1>${blockName(B)}</h1><div class="sub2">${fmtRange(B)} ${B.start.getFullYear()} · ${B.brk?'midterm break':isOnline(B)?'online classes':'face to face'}</div>
  <div class="pgrid">${[0,1,2,3,4,5,6].map(i=>{const d=addDays(B.start,i),k=key(d);return `<div class="pday"><h4>${DAYS[i]} ${d.getDate()}</h4>${datedItems(k).map(x=>`<div>${x.d?'☑':'☐'} ${esc(x.t)}${x.time?' · '+x.time:''}</div>`).join('')}${S.days[k]?.note?`<div style="font-style:italic">${esc(S.days[k].note)}</div>`:''}<div>&nbsp;</div><div>&nbsp;</div></div>`}).join('')}
  <div class="pday"><h4>Tasks of the week</h4>${W.goals.filter(g=>g.t).map(g=>`<div>${g.d?'☑':'☐'} ${esc(g.t)}</div>`).join('')}<h4 style="margin-top:8px">Notes</h4><div>${esc(W.notes)}</div></div></div></div>`;window.print()}
function printMonth(){const t=today();const[y,m]=S.ui.cal||[t.getFullYear(),t.getMonth()];const first=new Date(y,m,1),last=new Date(y,m+1,0);let d=addDays(first,-dow(first)),cells='';
  while(d<=last){for(let i=0;i<7;i++){const k=key(d);cells+=`<div class="pc" style="${d.getMonth()!==m?'opacity:.35':''}"><b>${d.getDate()}</b>${datedItems(k).slice(0,5).map(x=>`<div>• ${esc(x.t)}</div>`).join('')}</div>`;d=addDays(d,1)}}
  $('#print').innerHTML=`<div class="pp"><h1>${MONTHS[m]} ${y}</h1><div class="sub2">${esc(S.prof.t1+' '+S.prof.t2+' '+S.prof.t3)} · ${esc(S.prof.label)}</div><div class="pmonth">${DAYS3.map(x=>`<div class="ph2">${x.toUpperCase()}</div>`).join('')}${cells}</div></div>`;window.print()}

/* ---------- sync sheet ---------- */
function syncSheet(code,probe){if(!API)return toast('Sync works once the app is published online.');
  if(probe){const when=probe.at?fmtDay(new Date(probe.at)):'';return sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Journal</em> found</div></div><p class="hint" style="font-size:1.05rem">A journal with this code is already in the cloud${when?' (last saved '+when+')':''}.</p><div class="btns" style="margin:12px 0 0;flex-direction:column"><button class="btn d" data-act="syncGo" data-choice="use">Use it on this device</button><button class="btn" data-act="syncGo" data-choice="upload">Replace it with this device's data</button><button class="btn" data-act="closeSheet">Cancel</button></div></div>`)}
  sheet(`<div style="padding:0 16px"><div class="ttl" style="padding:6px 0 0"><div class="t"><em>Turn on</em> sync</div></div>
  <p class="hint" style="font-size:1.02rem">Choose a personal code (at least 6 characters). Type the <b>same code</b> on your phone, iPad and computer — that's all. Your data is encrypted with this code before it leaves the device, so keep it safe: it cannot be recovered.</p>
  <div class="field"><label>Personal code</label><input id="sy-code" type="password" autocomplete="new-password" placeholder="e.g. a word + numbers" value="${esc(code||'')}"></div>
  <div class="btns" style="margin:14px 0 0"><button class="btn" data-act="closeSheet">Cancel</button><button class="btn d" data-act="syncGo">Continue</button></div></div>`,sh=>setTimeout(()=>sh.querySelector('#sy-code')?.focus(),300))}
/* ---------- custom covers ---------- */
function setCover(e){const f=e.target.files[0],id=e.target.dataset.cover;if(!f)return;const img=new Image(),u=URL.createObjectURL(f);img.onload=()=>{const W=360,h=Math.round(img.height*W/img.width),c=document.createElement('canvas');c.width=W;c.height=h;c.getContext('2d').drawImage(img,0,0,W,h);let d=c.toDataURL('image/webp',.82);if(d.length<20||!d.startsWith('data:image/webp'))d=c.toDataURL('image/jpeg',.85);(S.modCfg[id]=S.modCfg[id]||{}).cover=d;URL.revokeObjectURL(u);applyModCfg();save();rerender();toast('Cover updated ✓')};img.onerror=()=>toast('This image could not be read');img.src=u}
/* ---------- files & import ---------- */
async function attachFile(e){const f=e.target.files[0];if(!f)return;if(f.size>25*1024*1024)return toast('File too big (max 25 MB)');const id='file'+uid();await idbPut('files',id,{name:f.name,blob:f});const mod=e.target.dataset.mod;S.mods[mod].links.push({id:uid(),label:f.name.replace(/\.[^.]+$/,'').slice(0,28),file:id});save();rerender();toast('File attached on this device')}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!d.v)throw 0;if(!confirm('Replace your current data with this backup?'))return;S=d;load2();save(true);applyTheme();render();toast('Backup imported ✓')}catch(err){toast('This file is not a My Daily Journal backup')}};r.readAsText(f)}

/* ---------- boot ---------- */
async function boot(){load();await recoverIfEmpty();applyTheme();
  try{navigator.storage?.persist?.()}catch(e){}
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  saveListeners.push(onLocalSave);
  navigator.serviceWorker?.addEventListener?.('message',ev=>{if(ev.data==='resubscribe'&&Notification.permission==='granted')enableNotifications()});
  render();save();
  syncInit();pushInit();pushServer();
  const intro=$('#intro');const ic=$('#intro .cover>div');if(ic)ic.innerHTML=`<div style="font:500 .5rem Jost;letter-spacing:.2em;text-transform:uppercase">${esc(S.prof.label)}</div><div style="font:500 1.6rem/1 'Bodoni Moda';margin-top:6px">${esc(S.prof.t1)} <span style="font:400 2.1rem 'Pinyon Script';color:#A44C61">${esc(S.prof.t2)}</span><br>${esc(S.prof.t3)}</div>`;if(S.set.intro&&!sessionStorage.getItem('mdj-intro')){sessionStorage.setItem('mdj-intro','1');intro.classList.remove('hide');setTimeout(()=>{intro.classList.add('out');setTimeout(()=>intro.classList.add('hide'),450)},1500)}else intro.classList.add('hide');
  if(S.lock.pin)showLock('unlock');
  checkStickers();checkReminders();setInterval(checkReminders,60000);focusTick();
  setInterval(()=>{if(ROUTE==='today'&&!document.hidden)rerender()},60000)}
boot();
