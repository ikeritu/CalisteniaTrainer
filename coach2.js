/* Calistenia Trainer · Coach 2.0 · Fase 9C
   Microprogresiones conservadoras para principiante absoluto.
   Se apoya en historial local y exige 2 sesiones distintas antes de cambiar objetivo o variante.
*/
(function(){
'use strict';
const VERSION='2.0';
const STATE_KEY='ct_coach2_v1';
const LIMITS={
  'Flexión':{
    'Flexión inclinada · barra alta':{max:10,step:1},
    'Flexión inclinada · barra media':{max:10,step:1},
    'Flexión inclinada · barra baja':{max:10,step:1},
    'Flexión de suelo':{max:12,step:1}
  },
  'Remo':{
    'Remo australiano · cuerpo muy vertical':{max:8,step:1},
    'Remo australiano · inclinación media':{max:8,step:1},
    'Remo australiano · cuerpo más horizontal':{max:10,step:1}
  },
  'Dominada':{
    'Colgado pasivo':{max:20,step:2},
    'Retracción escapular':{max:8,step:1},
    'Dominada negativa':{max:5,step:1},
    'Dominada asistida':{max:6,step:1},
    'Dominada estricta':{max:5,step:1}
  }
};
function loadState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}}
function saveState(x){localStorage.setItem(STATE_KEY,JSON.stringify(x))}
function key(prog,variant){return prog+'::'+variant}
function baseTarget(prog,variant){
  const ladder=progressions[prog]||[];
  const v=ladder.find(x=>x.name===variant);
  return Number(v&&v.target)||1;
}
function limitFor(prog,variant){const base=baseTarget(prog,variant),cfg=(LIMITS[prog]||{})[variant]||{};return {base,max:Number(cfg.max)||base,step:Number(cfg.step)||1}}
function stateFor(prog,variant,all){
  all=all||loadState();const k=key(prog,variant),lim=limitFor(prog,variant);
  if(!all[k])all[k]={target:lim.base,lastChangeSessionId:0,lastAction:'init',lastMessage:'',updatedAt:null};
  all[k].target=Math.max(lim.base,Math.min(lim.max,Number(all[k].target)||lim.base));
  return all[k]
}
function exactSessionGroups(prog,variant,afterId){
  const out=[];
  for(const s of loadH()){
    const sid=Number(s.id)||new Date(s.date).getTime()||0;
    if(sid<=Number(afterId||0))continue;
    const ls=(s.logs||[]).filter(l=>(l.progression===prog||l.base===prog)&&l.variant===variant);
    if(ls.length)out.push({id:sid,date:s.date,session:s.session,logs:ls});
  }
  out.sort((a,b)=>b.id-a.id);return out
}
function classifySession(group,target){
  if(!group||!group.logs.length)return 'none';
  const clean=l=>(l.rpe==='Fácil'||l.rpe==='Bien')&&(l.techQuality||'Buena')==='Buena'&&(!l.pain||l.pain==='No')&&Number(l.value)>=target;
  const bad=l=>l.rpe==='Difícil'||l.techQuality==='Mala'||l.pain==='Molestia'||l.pain==='Dolor'||Number(l.value)<Math.max(1,target-1);
  if(group.logs.every(clean))return 'clean';
  const badCount=group.logs.filter(bad).length;
  return badCount>=Math.ceil(group.logs.length/2)?'bad':'mixed'
}
function evidence(prog,variant,target,afterId){
  const groups=exactSessionGroups(prog,variant,afterId),classified=groups.map(g=>({...g,status:classifySession(g,target)}));
  return {groups:classified,clean:classified.filter(x=>x.status==='clean'),bad:classified.filter(x=>x.status==='bad'),mixed:classified.filter(x=>x.status==='mixed')}
}
function progressSummary(prog,variant,target,afterId){
  const e=evidence(prog,variant,target,afterId);const firstTwo=e.groups.slice(0,2),clean=firstTwo.filter(x=>x.status==='clean').length,bad=firstTwo.filter(x=>x.status==='bad').length;
  return {e,clean,bad,total:firstTwo.length}
}
function currentMicro(prog){const lvl=levelFor(prog),v=progressions[prog][lvl],all=loadState(),st=stateFor(prog,v.name,all);saveState(all);return {lvl,v,st,lim:limitFor(prog,v.name)}}
function coachDecision(ex){
  const fatigue=fatigueStatus();
  if(!ex.prog)return {action:'keep',level:null,variant:{name:ex.base,target:ex.fixedTarget,unit:ex.unit},reason:fatigue.deload?'Descarga activa: reduce volumen y mantén una ejecución cómoda.':'Objetivo estable del programa.',micro:false};
  const {lvl,v,st,lim}=currentMicro(ex.prog),summary=progressSummary(ex.prog,v.name,st.target,st.lastChangeSessionId);
  const variant={...v,target:st.target};
  if(fatigue.deload)return {action:'keep',level:lvl,variant,reason:`Descarga activa: mantén ${st.target} ${v.unit}; hoy no se progresa.`,micro:true,evidence:summary};
  const latest=loadH()[0],freshChange=latest&&Number(latest.id)===Number(st.lastChangeSessionId);
  if(freshChange&&st.lastAction==='up')return {action:'up',level:lvl,variant,reason:st.lastMessage||`Microprogresión aplicada: nuevo objetivo ${st.target} ${v.unit}.`,micro:true,evidence:summary};
  if(freshChange&&st.lastAction==='down')return {action:'down',level:lvl,variant,reason:st.lastMessage||`Ajuste aplicado: objetivo ${st.target} ${v.unit}.`,micro:true,evidence:summary};
  if(summary.clean===1)return {action:'keep',level:lvl,variant,reason:`1/2 sesiones controladas con ${st.target} ${v.unit}. Repite el objetivo una sesión más.`,micro:true,evidence:summary};
  if(summary.bad>=1)return {action:'keep',level:lvl,variant,reason:`Mantén ${st.target} ${v.unit}. El coach prioriza técnica y reserva antes de progresar.`,micro:true,evidence:summary};
  const next=st.target<lim.max?`${Math.min(lim.max,st.target+lim.step)} ${v.unit}`:(lvl<progressions[ex.prog].length-1?progressions[ex.prog][lvl+1].name:'consolidar esta variante');
  return {action:'keep',level:lvl,variant,reason:`Objetivo ${st.target} ${v.unit}. Necesito 2 sesiones distintas limpias antes de subir. Siguiente paso: ${next}.`,micro:true,evidence:summary}
}
function adjustOne(prog,all,levels){
  let lvl=Math.max(0,Math.min((levels[prog]??0),progressions[prog].length-1)),v=progressions[prog][lvl],st=stateFor(prog,v.name,all),lim=limitFor(prog,v.name),sum=progressSummary(prog,v.name,st.target,st.lastChangeSessionId),two=sum.e.groups.slice(0,2);
  if(two.length<2)return;
  const newest=Math.max(...two.map(x=>x.id));
  if(two.every(x=>x.status==='clean')){
    if(st.target<lim.max){st.target=Math.min(lim.max,st.target+lim.step);st.lastChangeSessionId=newest;st.lastAction='up';st.lastMessage=`Dos sesiones controladas: subimos a ${st.target} ${v.unit} sin cambiar de variante.`;st.updatedAt=new Date().toISOString();return}
    if(lvl<progressions[prog].length-1){levels[prog]=lvl+1;const nv=progressions[prog][lvl+1],ns=stateFor(prog,nv.name,all);ns.lastChangeSessionId=newest;ns.lastAction='up';ns.lastMessage=`Variante dominada: pasamos a ${nv.name} con ${ns.target} ${nv.unit}.`;ns.updatedAt=new Date().toISOString();return}
    st.lastChangeSessionId=newest;st.lastAction='keep';st.lastMessage='Variante final consolidada. Mantén calidad antes de buscar más volumen.';st.updatedAt=new Date().toISOString();return
  }
  if(two.every(x=>x.status==='bad')){
    if(st.target>lim.base){st.target=Math.max(lim.base,st.target-lim.step);st.lastChangeSessionId=newest;st.lastAction='down';st.lastMessage=`Dos sesiones exigentes: reducimos a ${st.target} ${v.unit} y priorizamos técnica.`;st.updatedAt=new Date().toISOString();return}
    if(lvl>0){levels[prog]=lvl-1;const pv=progressions[prog][lvl-1],ps=stateFor(prog,pv.name,all);ps.lastChangeSessionId=newest;ps.lastAction='down';ps.lastMessage=`Dos sesiones exigentes en el mínimo: volvemos temporalmente a ${pv.name}.`;ps.updatedAt=new Date().toISOString()}
  }
}
function applyCoachProgressions(){
  const all=loadState(),levels=loadLevels();
  if(!fatigueStatus().deload)Object.keys(progressions).forEach(p=>adjustOne(p,all,levels));
  saveLevels(levels);saveState(all);
  const ba=bicepsAdvice(),bs=loadBiceps();if(ba.action!=='keep')bs.weight=ba.weight;bs.deload=fatigueStatus().deload;saveBiceps(bs)
}
function adaptiveSeries(ex,sets){
  if(!ex.prog)return sets;
  if(fatigueStatus().deload)return Math.max(1,sets-1);
  const {v,st}=currentMicro(ex.prog),sum=progressSummary(ex.prog,v.name,st.target,st.lastChangeSessionId),two=sum.e.groups.slice(0,2);
  if(two.length===2&&two.every(x=>x.status==='bad'))return Math.max(1,sets-1);
  return sets
}
function coachProgramItems(n){
  const w=programWeekNumber();return sessions[n].items.map((x,idx)=>{
    const y={...x};
    if(n.startsWith('Calistenia')&&idx>=4){
      if(w>=5&&w<=7&&['Sentadilla','Flexión','Remo'].includes(y.base))y.sets=3;
      if(w===8&&['Sentadilla','Flexión','Remo','Dominada'].includes(y.base))y.sets=Math.min(2,y.sets);
      y.sets=adaptiveSeries(y,y.sets)
    }
    return y
  })
}
function coachRest(ex){
  const base=ex.rest;if(fatigueStatus().deload)return {seconds:Math.min(120,base+15),why:'+15 s por descarga: más recuperación, sin buscar progresión.'};
  if(!ex.prog)return adaptiveRestLegacy?adaptiveRestLegacy(ex):{seconds:base,why:'Descanso base del programa.'};
  const {v,st}=currentMicro(ex.prog),groups=progressSummary(ex.prog,v.name,st.target,st.lastChangeSessionId).e.groups.slice(0,2);
  if(groups.some(x=>x.status==='bad'))return {seconds:Math.min(120,base+15),why:'+15 s para proteger técnica tras una sesión exigente.'};
  return {seconds:base,why:'Descanso base: el Coach 2.0 progresa primero repeticiones/tiempo, no recortando descanso.'}
}
const adaptiveRestLegacy=window.adaptiveRest;
window.decide=coachDecision;
window.applyProgressions=applyCoachProgressions;
window.programItems=coachProgramItems;
window.adaptiveRest=coachRest;

const oldFinish=window.finish;
window.finish=function(){
  try{
    for(const l of logs){
      if(l.progression&&l.variant){const all=loadState(),st=stateFor(l.progression,l.variant,all);l.targetPrescribed=st.target;l.coachVersion=VERSION;saveState(all)}
      else{l.targetPrescribed=l.targetPrescribed??null;l.coachVersion=VERSION}
    }
  }catch(e){console.warn('Coach2 annotation',e)}
  return oldFinish()
};
function nextText(prog){
  const {lvl,v,st,lim}=currentMicro(prog),sum=progressSummary(prog,v.name,st.target,st.lastChangeSessionId),two=sum.e.groups.slice(0,2),clean=two.filter(x=>x.status==='clean').length;
  let next;if(st.target<lim.max)next=`${Math.min(lim.max,st.target+lim.step)} ${v.unit}`;else if(lvl<progressions[prog].length-1)next=progressions[prog][lvl+1].name;else next='Consolidar';
  return {lvl,v,st,clean,next}
}
window.renderCoach=function(){
  const st=document.getElementById('coachStatus'),rec=document.getElementById('recommendations'),pull=document.getElementById('pullupLadder'),bi=document.getElementById('bicepsAdvice'),fat=fatigueStatus(),miss=missedPlan();
  if(st)st.innerHTML=`<div class="alert ${fat.deload?'bad':miss.missed?'warn':'good'}"><strong>${fat.deload?'Descarga recomendada':miss.missed?'Plan con sesión pendiente':'Coach 2.0 activo'}</strong><br><span class="muted">${fat.deload?fat.text:miss.text} Los cambios de objetivo exigen 2 sesiones distintas controladas.</span></div>`;
  if(rec){rec.innerHTML='';['Flexión','Remo','Dominada'].forEach(name=>{const x=nextText(name),pct=Math.min(100,x.clean/2*100);rec.innerHTML+=`<div class="card rec"><div class="eyebrow">${name} · Nivel ${x.lvl+1}/${progressions[name].length}</div><h2 style="margin-bottom:4px">${x.v.name}</h2><div><strong>Hoy: ${x.st.target} ${x.v.unit}</strong></div><div class="progress" style="margin:9px 0"><i style="width:${pct}%"></i></div><div class="mini">Sesiones limpias para el siguiente cambio: ${x.clean}/2 · Siguiente: ${x.next}</div></div>`})}
  if(pull){pull.innerHTML='';const lvl=levelFor('Dominada');progressions.Dominada.forEach((x,j)=>{const all=loadState(),s=stateFor('Dominada',x.name,all);saveState(all);pull.innerHTML+=`<div class="stepcard ${j<lvl?'done':j===lvl?'current':''}"><div class="stepnum">${j<lvl?'✓':j+1}</div><div><strong>${x.name}</strong><div class="mini">${j===lvl?`Objetivo actual: ${s.target} ${x.unit}`:`Base: ${x.target} ${x.unit}`}</div></div></div>`})}
  if(bi){const a=bicepsAdvice();bi.innerHTML='<p>'+a.text+'</p><div class="mini">La lógica específica de carga de mancuernas se revisará por separado; Coach 2.0 no inventa incrementos que no tengas disponibles.</div>'}
};
function installHomeCoach(){
  const metrics=document.querySelector('#home .grid');if(!metrics||document.getElementById('homeCoach2'))return;
  const card=document.createElement('div');card.id='homeCoach2';card.className='card rec';metrics.insertAdjacentElement('afterend',card)
}
function renderHomeCoach(){
  installHomeCoach();const card=document.getElementById('homeCoach2');if(!card)return;
  const rec=plannedSessionForToday();
  if(!rec||!rec.startsWith('Calistenia')){card.innerHTML='<div class="eyebrow">Coach 2.0</div><strong>Día de recuperación o bíceps</strong><div class="mini">Las progresiones de calistenia se mantienen hasta la próxima sesión de parque.</div>';return}
  const x=nextText('Dominada');card.innerHTML=`<div class="eyebrow">Coach 2.0 · objetivo principal</div><strong>Dominada: ${x.v.name}</strong><div class="mini">Hoy ${x.st.target} ${x.v.unit} · ${x.clean}/2 sesiones limpias para el siguiente cambio.</div><button class="secondary full" style="margin-top:9px" onclick="go('coach')">VER ENTRENADOR</button>`
}
const oldHome=window.home;
window.home=function(){const r=oldHome();renderHomeCoach();return r};
try{document.querySelector('#coach .eyebrow').textContent='Coach adaptativo 2.0 · Fase 9C'}catch{}
try{home()}catch(e){console.warn('Coach2 home refresh',e)}
console.info('Calistenia Trainer Coach 2.0 activo');
})();
