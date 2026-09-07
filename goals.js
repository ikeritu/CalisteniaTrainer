/* Calistenia Trainer · Fase 9F · Objetivos y motivación */
(function(){
'use strict';
const VERSION='1.0',KEY='ct_goal_v1',MILESTONE_KEY='ct_goal_milestones_v1';
const GOALS={
 first_pullup:{icon:'🪜',title:'Mi primera dominada',desc:'Avanzar de colgado y control escapular hasta una dominada estricta.',kind:'skill'},
 floor_pushup:{icon:'💪',title:'Flexiones de suelo',desc:'Progresar desde una barra alta hasta una flexión de suelo controlada.',kind:'skill'},
 consistency:{icon:'📅',title:'Crear constancia',desc:'Completar 20 sesiones del programa sin perseguir máximos.',kind:'habit'},
 general:{icon:'🌱',title:'Mejorar mi forma general',desc:'Construir una base equilibrada de empuje, tirón y constancia.',kind:'general'}
};
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function loadGoal(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function saveGoal(id){const old=loadGoal();localStorage.setItem(KEY,JSON.stringify({id,selectedAt:old&&old.id===id?old.selectedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));renderAll()}
function histories(){try{return typeof loadH==='function'?loadH():[]}catch{return []}}
function lvl(name){try{return typeof levelFor==='function'?levelFor(name):0}catch{return 0}}
function ladderLen(name){try{return progressions[name].length}catch{return 1}}
function sessionsCount(){return histories().length}
function skillProgress(name){const n=ladderLen(name),l=lvl(name);return n<=1?100:Math.round(l/(n-1)*100)}
function status(id){
 const h=sessionsCount();
 if(id==='first_pullup'){
   const l=lvl('Dominada'),n=ladderLen('Dominada'),pct=skillProgress('Dominada'),v=progressions.Dominada[Math.min(l,n-1)];
   return {pct,value:`Nivel ${l+1}/${n}`,current:v.name,next:l<n-1?progressions.Dominada[l+1].name:'Dominada estricta consolidada',done:l===n-1};
 }
 if(id==='floor_pushup'){
   const l=lvl('Flexión'),n=ladderLen('Flexión'),pct=skillProgress('Flexión'),v=progressions['Flexión'][Math.min(l,n-1)];
   return {pct,value:`Nivel ${l+1}/${n}`,current:v.name,next:l<n-1?progressions['Flexión'][l+1].name:'Flexión de suelo consolidada',done:l===n-1};
 }
 if(id==='consistency'){
   const target=20,pct=Math.min(100,Math.round(h/target*100));return {pct,value:`${Math.min(h,target)}/${target} sesiones`,current:h?`${h} sesiones registradas`:'Aún sin sesiones registradas',next:h>=target?'Mantener el hábito':`Faltan ${target-h} sesiones`,done:h>=target};
 }
 const p1=skillProgress('Flexión'),p2=skillProgress('Remo'),p3=skillProgress('Dominada'),habit=Math.min(100,Math.round(h/20*100)),pct=Math.round((p1+p2+p3+habit)/4);
 return {pct,value:`${pct}% de base`,current:`Empuje ${p1}% · Tirón ${Math.round((p2+p3)/2)}% · Constancia ${habit}%`,next:pct>=100?'Mantener y preparar el siguiente bloque':'Seguir el Coach 2.0 sin saltar etapas',done:pct>=100};
}
function defaultGoal(){return {id:'general',selectedAt:new Date().toISOString()}}
function current(){const g=loadGoal()||defaultGoal();return GOALS[g.id]?g:defaultGoal()}
function inject(){
 if(document.getElementById('goalModal'))return;
 const st=document.createElement('style');st.textContent='.goalModal{position:fixed;z-index:150;inset:0;background:#0009;display:none;align-items:end;justify-content:center;padding:14px}.goalModal.show{display:flex}.goalCard{width:min(100%,620px);max-height:92vh;overflow:auto;background:var(--card);color:var(--text);border-radius:22px;padding:18px}.goalChoice{width:100%;text-align:left;background:var(--card);border:1px solid var(--line);margin:6px 0;padding:12px}.goalChoice.sel{border-color:var(--a);box-shadow:0 0 0 3px #1769aa18}.goalPct{font-size:28px;font-weight:900}.goalMiniGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}';document.head.appendChild(st);
 const m=document.createElement('div');m.id='goalModal';m.className='goalModal';m.innerHTML='<div class="goalCard"><div class="eyebrow">Fase 9F</div><h2>¿Qué quieres conseguir primero?</h2><p class="mini">El objetivo cambia lo que la app destaca, no fuerza progresiones ni te hace entrenar al fallo.</p><div id="goalChoices"></div><button id="goalClose" class="secondary full" style="margin-top:10px">CERRAR</button></div>';document.body.appendChild(m);document.getElementById('goalClose').onclick=()=>m.classList.remove('show')
}
function open(){inject();const cur=current();document.getElementById('goalChoices').innerHTML=Object.entries(GOALS).map(([id,g])=>`<button class="goalChoice ${cur.id===id?'sel':''}" data-goal="${id}"><strong>${g.icon} ${esc(g.title)}</strong><div class="mini">${esc(g.desc)}</div></button>`).join('');document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{saveGoal(b.dataset.goal);open()});document.getElementById('goalModal').classList.add('show')}
function installHome(){const home=document.getElementById('home');if(!home||document.getElementById('homeGoal'))return;const hero=home.querySelector('.hero');if(!hero)return;const c=document.createElement('div');c.id='homeGoal';c.className='card';hero.insertAdjacentElement('afterend',c)}
function renderHome(){installHome();const box=document.getElementById('homeGoal');if(!box)return;const g=current(),def=GOALS[g.id],s=status(g.id);box.innerHTML=`<div class="eyebrow">Objetivo principal</div><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div><h2 style="margin-bottom:3px">${def.icon} ${esc(def.title)}</h2><div class="mini">${esc(s.current)}</div></div><div class="goalPct">${s.pct}%</div></div><div class="progress"><i style="width:${s.pct}%"></i></div><div class="mini"><strong>Siguiente:</strong> ${esc(s.next)}</div><button id="changeGoalBtn" class="secondary full" style="margin-top:9px">CAMBIAR OBJETIVO</button>`;document.getElementById('changeGoalBtn').onclick=open}
function installCoach(){const rec=document.getElementById('recommendations');if(!rec||document.getElementById('coachGoal'))return;const c=document.createElement('div');c.id='coachGoal';c.className='card';rec.insertAdjacentElement('beforebegin',c)}
function renderCoachGoal(){installCoach();const b=document.getElementById('coachGoal');if(!b)return;const g=current(),def=GOALS[g.id],s=status(g.id);b.innerHTML=`<div class="eyebrow">Tu objetivo</div><strong>${def.icon} ${esc(def.title)}</strong><div class="progress" style="margin:9px 0"><i style="width:${s.pct}%"></i></div><div class="mini">${esc(s.value)} · ${esc(s.next)}</div>`}
function milestoneState(){try{return JSON.parse(localStorage.getItem(MILESTONE_KEY)||'{}')}catch{return {}}}
function checkMilestones(){const g=current(),s=status(g.id),state=milestoneState(),marks=[25,50,75,100];let hit=null;for(const m of marks){const k=g.id+'_'+m;if(s.pct>=m&&!state[k]){state[k]=new Date().toISOString();hit=m}}localStorage.setItem(MILESTONE_KEY,JSON.stringify(state));if(hit&&typeof showMilestone==='function'){const def=GOALS[g.id],txt=hit===100?`Objetivo alcanzado: ${def.title}.`:`Has alcanzado el ${hit}% de tu objetivo: ${def.title}.`;showMilestone([hit===100?'Objetivo conseguido':`Hito ${hit}%`,txt])}}
const oldGo=window.go;if(typeof oldGo==='function')window.go=function(id){const r=oldGo(id);setTimeout(()=>{if(id==='home')renderHome();if(id==='coach')renderCoachGoal()},0);return r};
const oldFinish=window.finish;if(typeof oldFinish==='function')window.finish=function(){const r=oldFinish();setTimeout(()=>{renderHome();renderCoachGoal();checkMilestones()},350);return r};
inject();setTimeout(()=>{renderHome();renderCoachGoal();if(!loadGoal())saveGoal('general')},0);window.addEventListener('pageshow',()=>setTimeout(renderHome,0));window.CalisteniaGoals={open,current,status,goals:GOALS,version:VERSION};
})();