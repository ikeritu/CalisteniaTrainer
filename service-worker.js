const CACHE='calistenia-trainer-v1.4.1';
const CORE=[
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const PROGRAM_WEEK_FIX=`
function programWeekNumber(){
  let start=localStorage.getItem('ct_program_start');
  if(!start){
    const h=loadH();
    if(h.length){
      const dates=h.map(x=>new Date(x.date)).filter(d=>!isNaN(d));
      if(dates.length){
        dates.sort((a,b)=>a-b);
        start=dates[0].toISOString().slice(0,10);
      }
    }
  }
  if(!start)return 1;
  const s=new Date(start+'T00:00:00');
  const now=new Date();
  const week=Math.floor((now-s)/(7*24*60*60*1000))+1;
  return Math.max(1,Math.min(8,week));
}
`;

function patchHtml(text){
  if(text.includes('function programWeekNumber(){')) return text;
  return text.replace('function programItems(n){',PROGRAM_WEEK_FIX+'\nfunction programItems(n){');
}

async function getPatchedIndex(){
  try{
    const response=await fetch('./index.html',{cache:'no-store'});
    const text=patchHtml(await response.text());
    const patched=new Response(text,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}});
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
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const isNavigation=event.request.mode==='navigate' || url.pathname.endsWith('/CalisteniaTrainer/') || url.pathname.endsWith('/CalisteniaTrainer/index.html');
  if(isNavigation){
    event.respondWith(getPatchedIndex());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached) return cached;
    try{
      const response=await fetch(event.request);
      const copy=response.clone();
      const cache=await caches.open(CACHE);
      await cache.put(event.request,copy);
      return response;
    }catch(e){
      return caches.match('./index.html');
    }
  })());
});
