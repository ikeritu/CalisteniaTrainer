/* Calistenia Trainer · Fase 9D · Check-in y recuperación adaptativa */
(function(){
'use strict';
const VERSION='1.0';
const KEY='ct_checkins_v1';
let pendingSession=null,current=null;

function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
function save(x){localStorage.setItem(KEY,JSON.stringify(x.slice(0,120)))}
function today(){return new Date().toISOString().slice(0,10)}
function selected(name){const b=document.querySelector(`[data-ci-group="${name}"].sel`);return b?b.dataset.value:null}
function scoreOf(x){
 let s=0;
 if(x.energy==='Baja')s+=1;
 if(x.sleep==='Malo')s+=1;
 if(x.soreness==='Leves')s+=1;
 if(x.soreness==='Fuertes')s+=2;
 if(x.discomfort!=='Ninguna')s+=2;
 return s
}
function planFor(score,discomfort){
 if(discomfort!=='Ninguna' || score>=4)return {mode:'reduce',freeze:true,reduceSets:true,extraRest:15,label:'Sesión reducida',text:'Hoy priorizamos recuperación: una serie menos en el trabajo principal, más descanso y sin progresiones.'};
 if(score>=2)return {mode:'hold',freeze:true,reduceSets:false,extraRest:10,label:'Mantener',text:'Hoy mantenemos objetivos y bloqueamos progresiones. Añadimos un poco más de descanso.'};
 return {mode:'normal',freeze:false,reduceSets:false,extraRest:0,label:'Carga normal',text:'Buen contexto para realizar la sesión prevista. La técnica sigue teniendo prioridad.'}
}
function inject(){
 if(document.getElementById('checkinModal'))return;
 const style=document.createElement('style');style.textContent=`
 .ciModal{position:fixed;z-index:140;inset:0;background:#0009;display:none;align-items:end;justify-content:center;padding:14px}.ciModal.show{display:flex}
 .ciCard{width:min(100%,620px);max-height:92vh;overflow:auto;background:var(--card);color:var(--text);border-radius:22px;padding:18px;box-shadow:0 20px 60px #0006}
 .ciGroup{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:7px 0 14px}.ciGroup.five{grid-template-columns:repeat(2,1fr)}
 .ciGroup button{background:var(--card);border:1px solid var(--line);font-size:12px;padding:10px 5px}.ciGroup button.sel{outline:3px solid #1769aa22;border-color:var(--a);background:var(--soft)}
 .ciResult{border-left:5px solid var(--a);background:var(--soft);border-radius:13px;padding:11px;margin:10px 0}.ciResult.reduce{border-left-color:var(--y)}.ciResult.normal{border-left-color:var(--g)}
 `;document.head.appendChild(style);
 const m=document.createElement('div');m.id='checkinModal';m.className='ciModal';m.innerHTML=`<div class="ciCard"><div class="eyebrow">Check-in · 10–15 segundos</div><h2>¿Cómo llegas hoy?</h2><p class="mini">Esto no diagnostica nada. Solo ayuda al entrenador a ajustar carga y recuperación.</p>
 <h3>Energía</h3><div class="ciGroup">${btns('energy',['Baja','Normal','Alta'],['😴','🙂','⚡'])}</div>
 <h3>Sueño</h3><div class="ciGroup">${btns('sleep',['Malo','Normal','Bueno'],['🌙','😐','😴'])}</div>
 <h3>Agujetas</h3><div class="ciGroup">${btns('soreness',['Ninguna','Leves','Fuertes'],['✅','~','⚠️'])}</div>
 <h3>Molestias actuales</h3><div class="ciGroup five">${btns('discomfort',['Ninguna','Hombro/brazo','Espalda','Cadera/rodilla','Otra'],['✅','💪','↔️','🦵','⚠️'])}</div>
 <div id="ciPreview" class="ciResult"><strong>Completa las cuatro preguntas.</strong></div>
 <div class="grid"><button id="ciCancel" class="secondary">CANCELAR</button><button id="ciGo" class="primary">EMPEZAR</button></div></div>`;
 document.body.appendChild(m);
 m.querySelectorAll('[data-ci-group]').forEach(b=>b.onclick=()=>{const g=b.dataset.ciGroup;m.querySelectorAll(`[data-ci-group="${g}"]`).forEach(x=>x.classList.remove('sel'));b.classList.add('sel');preview()});
 document.getElementById('ciCancel').onclick=close;
 document.getElementById('ciGo').onclick=confirm;
}
function btns(group,vals,icons){return vals.map((v,i)=>`<button data-ci-group="${group}" data-value="${esc(v)}">${icons[i]} ${esc(v)}</button>`).join('')}
function values(){return {energy:selected('energy'),sleep:selected('sleep'),soreness:selected('soreness'),discomfort:selected('discomfort')}}
function preview(){const x=values(),p=document.getElementById('ciPreview');if(Object.values(x).some(v=>!v)){p.className='ciResult';p.innerHTML='<strong>Completa las cuatro preguntas.</strong>';return}const score=scoreOf(x),plan=planFor(score,x.discomfort);p.className='ciResult '+plan.mode;p.innerHTML=`<strong>${plan.label}</strong><div class="mini">${plan.text}</div>`}
function open(session){inject();pendingSession=session;document.getElementById('checkinModal').classList.add('show')}
function close(){document.getElementById('checkinModal')?.classList.remove('show');pendingSession=null}
function confirm(){
 const x=values();if(Object.values(x).some(v=>!v)){preview();return}
 const score=scoreOf(x),plan=planFor(score,x.discomfort),entry={id:Date.now(),date:new Date().toISOString(),day:today(),session:pendingSession,...x,score,plan,version:VERSION};
 const h=load();h.unshift(entry);save(h);current=entry;window.CT_CHECKIN=entry;
 document.getElementById('checkinModal').classList.remove('show');
 const s=pendingSession;pendingSession=null;
 originalStart(s)
}

inject();
const originalStart=window.start;
if(typeof originalStart==='function')window.start=function(n){
 // Cada nueva sesión empieza con un check-in. Reanudar una sesión no vuelve a preguntarlo.
 open(n)
};

const originalProgramItems=window.programItems;
if(typeof originalProgramItems==='function')window.programItems=function(n){
 const arr=originalProgramItems(n),ci=window.CT_CHECKIN;
 if(!ci||ci.session!==n||!ci.plan.reduceSets)return arr;
 return arr.map((x,idx)=>{
   const y={...x};
   const isWarm=n.startsWith('Calistenia')&&idx<4;
   if(!isWarm&&Number(y.sets)>1)y.sets=Math.max(1,Number(y.sets)-1);
   return y
 })
};

const originalRest=window.adaptiveRest;
if(typeof originalRest==='function')window.adaptiveRest=function(ex){
 const r=originalRest(ex),ci=window.CT_CHECKIN,extra=ci&&ci.plan?Number(ci.plan.extraRest||0):0;
 return extra?{seconds:Math.min(150,r.seconds+extra),why:`${r.why} +${extra} s por el check-in de recuperación.`}:r
};

const originalApply=window.applyProgressions;
if(typeof originalApply==='function')window.applyProgressions=function(){
 const ci=window.CT_CHECKIN;
 if(ci&&ci.plan&&ci.plan.freeze){
   // En un día de recuperación no se aplican progresiones de variante/objetivo.
   return;
 }
 return originalApply()
};

const originalFinish=window.finish;
if(typeof originalFinish==='function')window.finish=function(){
 try{
   const ci=window.CT_CHECKIN||current;
   if(ci&&Array.isArray(window.logs||logs)){
     const ls=window.logs||logs;
     ls.forEach(l=>{l.checkin={energy:ci.energy,sleep:ci.sleep,soreness:ci.soreness,discomfort:ci.discomfort,score:ci.score,mode:ci.plan.mode};l.checkinVersion=VERSION})
   }
 }catch(e){console.warn('Check-in annotation',e)}
 return originalFinish()
};

function addHomeStatus(){
 const home=document.getElementById('home');if(!home||document.getElementById('homeCheckinStatus'))return;
 const hero=home.querySelector('.hero');if(!hero)return;
 const box=document.createElement('div');box.id='homeCheckinStatus';box.className='card';hero.insertAdjacentElement('afterend',box);renderHomeStatus()
}
function renderHomeStatus(){
 const b=document.getElementById('homeCheckinStatus');if(!b)return;const last=load().find(x=>x.day===today());
 if(!last){b.innerHTML='<div class="eyebrow">Recuperación</div><strong>Check-in pendiente</strong><div class="mini">Se hará automáticamente al empezar el entrenamiento.</div>';return}
 b.innerHTML=`<div class="eyebrow">Recuperación · último check-in de hoy</div><strong>${esc(last.plan.label)}</strong><div class="mini">Energía ${esc(last.energy)} · Sueño ${esc(last.sleep)} · Agujetas ${esc(last.soreness)}${last.discomfort!=='Ninguna'?' · Molestia: '+esc(last.discomfort):''}</div>`
}
setTimeout(addHomeStatus,0);
window.addEventListener('pageshow',()=>setTimeout(renderHomeStatus,0));
window.CalisteniaCheckin={open,load,planFor,version:VERSION};
})();
