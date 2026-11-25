// Logbuch: jeder Flug mit Strecke (eigener Speicher, höchstens 120 Flüge), besuchte Flugplätze, Sonderlackierungen
// Ausgelagert aus main.js.
import * as THREE from 'three';
import {AIRPORTS,LAKES} from './worldgen.js';
import {PLANES} from './aircraft.js';
const LOGK='alpenflug-log1';export function logGet(){try{return JSON.parse(localStorage.getItem(LOGK)||'[]');}catch(e){return[];}}
export function logAdd(e){try{const L=logGet();L.unshift(e);while(L.length>120)L.pop();localStorage.setItem(LOGK,JSON.stringify(L));}catch(e2){}}
// Sonderlackierungen: werden mit der ersten Landung auf dem jeweiligen Platz freigeschaltet
export const SPECIAL_LIV=[{icao:'LSZH',n:'Züri',tpl:'klassisch',c1:'#1d4ed8',c2:'#38a3e8',base:'#f8f8f7'},{icao:'LSGG',n:'Léman',tpl:'swoosh',c1:'#d7263d',c2:'#e8b330',base:'#f8f8f7'},
  {icao:'LSZB',n:'Bärn',tpl:'bauch',c1:'#15171b',c2:'#d7263d',base:'#efe6d2'},{icao:'LFSB',n:'Rhy',tpl:'voll',c1:'#15171b',c2:'#f8f8f7',base:'#dfe3e8'},
  {icao:'LSZA',n:'Ticino',tpl:'swoosh',c1:'#d7263d',c2:'#1d4ed8',base:'#f8f8f7'},{icao:'LSGS',n:'Valais',tpl:'voll',c1:'#d7263d',c2:'#f8f8f7',base:'#f8f8f7'},
  {icao:'LSZS',n:'Engadin',tpl:'retro',c1:'#38a3e8',c2:'#e8b330',base:'#2a2e35'},{icao:'LSZR',n:'Bodensee',tpl:'bauch',c1:'#1f8a5b',c2:'#38a3e8',base:'#f8f8f7'},
  {icao:'LSXZ',n:'Wiggertal',tpl:'retro',c1:'#d7263d',c2:'#f8f8f7',base:'#efe6d2'},{icao:'LSMP',n:'Patrouille',tpl:'schweiz',c1:'#d7263d',c2:'#f8f8f7',base:'#f8f8f7'},
  {icao:'LSZC',n:'Pilatus',tpl:'klassisch',c1:'#0f4d36',c2:'#e8b330',base:'#f8f8f7'},{icao:'LSTA',n:'Raron',tpl:'swoosh',c1:'#9b1c2c',c2:'#e8b330',base:'#efe6d2'}];
export function createLogbook(ctx){
function renderLog(){const {$,career,fmtT,esc}=ctx;const L=logGet(),C=career.C,vis=C.visited||{},all=[...new Set(AIRPORTS.map(a=>a.icao))],nv=all.filter(i=>vis[i]).length;
  const hrs=L.reduce((a,e)=>a+e.t,0)/3600,km=L.reduce((a,e)=>a+e.km,0);
  const fmtDate=d=>{const x=new Date(d);return`${x.getDate()}.${x.getMonth()+1}. ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`;};
  $('cLog').innerHTML=`<div class="cstat" style="display:flex;gap:18px;flex-wrap:wrap;margin:4px 0 10px"><span><b>${L.length}</b> Flüge</span><span><b>${hrs.toFixed(1)}</b> Stunden</span><span><b>${Math.round(km)}</b> km</span><span><b>${nv} / ${all.length}</b> Flugplätze besucht</span><span><b>${Object.keys(C.spitals||{}).length}</b> Spital-Landeplätze</span></div>
    <canvas id="logMap" width="900" height="520" style="width:100%;max-width:900px;border-radius:12px;background:#0f1a24"></canvas>
    <div class="loglist" style="margin-top:10px">${L.length?L.slice(0,40).map(e=>`<div style="display:grid;grid-template-columns:92px 1fr auto;gap:8px;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px"><span style="opacity:.7">${fmtDate(e.d)}</span><span><b>${esc(e.n)}</b> · ${esc((PLANES[e.p]||{}).name||e.p)}<br><small style="opacity:.75">${esc(e.from||'')}${e.to?' → '+esc(e.to):''} · ${fmtT(e.t)} · ${e.km} km · max. ${e.alt} m</small></span><span style="font-weight:800">${e.crash?'✕':e.g||(e.ok?'✓':'')}</span></div>`).join(''):'<p class="hint">Noch keine Flüge. Jeder Flug ab einer halben Minute landet hier, mit Strecke auf der Karte.</p>'}</div>`;
  const cv=$('logMap'),x=cv.getContext('2d'),W=cv.width,H=cv.height;let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9;for(const A of AIRPORTS){mnx=Math.min(mnx,A.x);mxx=Math.max(mxx,A.x);mnz=Math.min(mnz,A.z);mxz=Math.max(mxz,A.z);}
  mnx-=15000;mxx+=15000;mnz-=15000;mxz+=15000;const k=Math.min(W/(mxx-mnx),H/(mxz-mnz)),ox=(W-(mxx-mnx)*k)/2,oz=(H-(mxz-mnz)*k)/2,X=v=>ox+(v-mnx)*k,Y=v=>oz+(v-mnz)*k;
  x.fillStyle='#0f1a24';x.fillRect(0,0,W,H);
  x.fillStyle='#1d4f7a';for(const lk of LAKES||[]){if(lk.cx==null)continue;const r=Math.sqrt((lk.cells||1)*6724/Math.PI)*k;x.beginPath();x.arc(X(lk.cx),Y(lk.cz),Math.max(1.5,r),0,7);x.fill();}
  const col=['#ffd23f','#41d2ff','#ff6b6b','#7dff9b','#c79bff','#ffa24f'];L.slice(0,60).reverse().forEach((e,i)=>{x.strokeStyle=col[i%col.length];x.globalAlpha=0.75;x.lineWidth=2;x.beginPath();e.pts.forEach(([a,b],j)=>j?x.lineTo(X(a*10),Y(b*10)):x.moveTo(X(a*10),Y(b*10)));x.stroke();});
  x.globalAlpha=1;for(const A of AIRPORTS){const v=vis[A.icao];x.fillStyle=v?'#3dff8a':'#8a939e';x.beginPath();x.arc(X(A.x),Y(A.z),v?4.5:3,0,7);x.fill();}
  x.fillStyle='#cfd6de';x.font='600 12px Inter,sans-serif';const done=new Set();for(const A of AIRPORTS){if(done.has(A.icao))continue;done.add(A.icao);x.fillText(A.name,X(A.x)+6,Y(A.z)-6);}}
function logCommit(res){const {G,award,nearestAP}=ctx;if(!G||G.logged||G.lesson||!G.rec||G.rec.length<200)return;G.logged=true;const R=G.rec,step=Math.max(1,Math.ceil(R.length/150)),pts=[];let km=0,maxA=0;
  for(let i=0;i<R.length;i+=step){pts.push([Math.round(R[i][0]/10),Math.round(R[i][2]/10)]);maxA=Math.max(maxA,R[i][1]);}
  for(let i=10;i<R.length;i+=10)km+=Math.hypot(R[i][0]-R[i-10][0],R[i][2]-R[i-10][2])/1000;
  const lt=G.lastTouch,to=lt&&(lt.ap||nearestAP(new THREE.Vector3(R[R.length-1][0],0,R[R.length-1][2])));
  logAdd({d:Date.now(),p:G.P.id,n:G.mission?G.mission.name:'Freier Flug',from:G.startAP?G.startAP.name:'',to:lt&&to?to.name:'',t:Math.round(G.t),km:Math.round(km*10)/10,alt:Math.round(maxA),
    g:res&&res.letter||(lt&&lt.grade)||'',ok:res?res.ok:undefined,crash:!!(G.F&&G.F.crashed),pts});
  if(logGet().length>=50)award('logbuch');}
function markVisit(ap){const {$,award,career,persist,toast}=ctx;if(!ap||!ap.icao)return;const C=career.C;C.visited=C.visited||{};const first=!C.visited[ap.icao];C.visited[ap.icao]=(C.visited[ap.icao]||0)+1;persist();
  if(first){const sp=SPECIAL_LIV.find(q=>q.icao===ap.icao);if(sp)setTimeout(()=>toast(`Neue Sonderlackierung freigeschaltet: «${sp.n}» (im Hangar wählbar)`,4500),2500);}
  const all=[...new Set(AIRPORTS.map(a=>a.icao))];if(all.every(i=>C.visited[i]))award('plaetze');}
return {renderLog,logCommit,markVisit};}
