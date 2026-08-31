const CACHE='calistenia-trainer-v1.4.2';
const CORE=[
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const APP_FIX=`
/* v1.4.2 runtime recovery: restore helpers lost during v1.4 integration */
function programWeekNumber(){
  let start=localStorage.getItem('ct_program_start');
  if(!start){
    const h=loadH();
    if(h.length){
      const dates=h.map(x=>new Date(x.date)).filter(d=>!isNaN(d));
      if(dates.length){dates.sort((a,b)=>a-b);start=dates[0].toISOString().slice(0,10);}
    }
  }
  if(!start)return 1;
  const s=new Date(start+'T00:00:00'),now=new Date();
  const week=Math.floor((now-s)/(7*24*60*60*1000))+1;
  return Math.max(1,Math.min(8,week));
}
function currentCalPattern(){
  const odd=programWeekNumber()%2===1;
  return odd
    ? {1:'Calistenia A',2:'Bíceps A',3:'Calistenia B',4:'Bíceps B',5:'Calistenia A'}
    : {1:'Calistenia B',2:'Bíceps A',3:'Calistenia A',4:'Bíceps B',5:'Calistenia B'};
}
function plannedSessionForToday(){return currentCalPattern()[new Date().getDay()]||null;}
function renderProgram(){
  const w=programWeekNumber(),status=document.getElementById('programStatus'),box=document.getElementById('programWeeks');
  if(status)status.innerHTML='<div class="alert good"><strong>Semana '+w+' de 8</strong><br><span class="muted">La progresión adaptativa tiene prioridad sobre el calendario.</span></div>';
  if(!box)return;
  box.innerHTML='';
  for(let n=1;n<=8;n++){
    const odd=n%2===1,focus=n<=2?'Adaptación':n<=4?'Base':n<=6?'Volumen gradual':n===7?'Consolidación':'Descarga + evaluación';
    const cls=n<w?'done':n===w?'current':'';
    box.innerHTML+=\`<div class="programWeek \${cls}"><div class="weekBadge">\${n<w?'✓':n}</div><div><strong>Semana \${n} · \${focus}</strong><div class="mini">L: \${odd?'Calistenia A':'Calistenia B'} · M: Bíceps A · X: \${odd?'Calistenia B':'Calistenia A'} · J: Bíceps B · V: \${odd?'Calistenia A':'Calistenia B'}</div></div></div>\`;
  }
}
function renderCoach(){
  const st=document.getElementById('coachStatus'),rec=document.getElementById('recommendations'),pull=document.getElementById('pullupLadder'),bi=document.getElementById('bicepsAdvice');
  const fat=fatigueStatus(),miss=missedPlan();
  if(st)st.innerHTML='<div class="alert '+(fat.deload?'bad':miss.missed?'warn':'good')+'"><strong>'+(fat.deload?'Descarga recomendada':miss.missed?'Plan con sesión pendiente':'Carga adecuada')+'</strong><br><span class="muted">'+(fat.deload?fat.text:miss.text)+'</span></div>';
  if(rec){
    rec.innerHTML='';
    ['Flexión','Remo','Dominada'].forEach(name=>{const lvl=levelFor(name),v=progressions[name][lvl];rec.innerHTML+=\`<div class="card"><strong>\${name}</strong><div class="mini">Nivel \${lvl+1}/\${progressions[name].length} · \${v.name}</div></div>\`;});
  }
  if(pull){pull.innerHTML='';const lvl=levelFor('Dominada');progressions.Dominada.forEach((x,j)=>{pull.innerHTML+=\`<div class="stepcard \${j<lvl?'done':j===lvl?'current':''}"><div class="stepnum">\${j<lvl?'✓':j+1}</div><div><strong>\${x.name}</strong><div class="mini">\${x.target} \${x.unit}</div></div></div>\`;});}
  if(bi){const a=bicepsAdvice();bi.innerHTML='<p>'+a.text+'</p>';}
}
function showOnboarding(){
  localStorage.setItem('ct_onboarded_v12','1');
}
`;

function patchHtml(text){
  let out=text;
  if(!out.includes('/* v1.4.2 runtime recovery')){
    out=out.replace('function home(){',APP_FIX+'\nfunction home(){');
  }
  return out;
}

async function getPatchedIndex(){
  try{
    const response=await fetch('./index.html?build=142',{cache:'no-store'});
    const text=patchHtml(await response.text());
    const patched=new Response(text,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    const cache=await caches.open(CACHE);
    await cache.put('./index.html',patched.clone());
    await cache.put('./',patched.clone());
    return patched;
  }catch(e){
    const cache=await caches.open(CACHE);
    return (await cache.match('./index.html')) || (await cache.match('./'));
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await getPatchedIndex();
  })());
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(getPatchedIndex());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      const copy=response.clone();
      const cache=await caches.open(CACHE);
      await cache.put(event.request,copy);
      return response;
    }catch(e){return caches.match('./index.html');}
  })());
});
