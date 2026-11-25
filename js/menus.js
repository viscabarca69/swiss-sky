// Menüs: Karriere (Missionen, Aufträge, Hangar, Abzeichen, Rekorde), Lackier-Editor, Flugzeugbilder, Ausstellungsplatz,
// Flughafenplan für die Pistenwahl, Freier Flug und Optionen. Ausgelagert aus main.js; gemeinsamer Zustand über ctx (Getter).
import * as THREE from 'three';
import {buildGrid,makeSampler,AIRPORTS,APM,ICAOS,TOWNS,PEAKS,LAKES,HALF,WORLD,toLocal,fromLocal,toXZ,AREA_ID,AREA_NAME,MAIN_AP,GEO,oldXZ} from './worldgen.js';
import {PLANES,AIRLINER,buildModel,bakeModel,animateModel,LIV_TPL,LIV_COL,LIV_BASE,livSpec} from './aircraft.js';
import {createCareer,PRICE,ORDER,fmtCHF,jobMission,dailyJob,freeJobs,BADGES,encodeShare,decodeShare,todayKey} from './career.js';
import {MISSIONS as ALL_MISSIONS,buildObjectives,objPath,turnRadius} from './missions.js';
import {runwayAt,approachOptions,planApproach,approachGuide,finalSlope} from './approach.js';
import {initOrtho,onOrthoReady,orthoPaved} from './ortho.js';
import {createLogbook,SPECIAL_LIV,logGet} from './logbook.js';
export function createMenus(ctx){const ZS=ctx.ZS;
// ---------- Karriere-Menü ----------
let CSUB='cMis',HSEL=null,DJ=null;const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function getDaily(){const {S}=ctx;const k=todayKey();if(!DJ||DJ.daily!==k){DJ=dailyJob(S,k);if(DJ)DJ.mis=jobMission(DJ,'daily');}return DJ;}
function openCareer(sub){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('sel',x.dataset.t==='tCareer'));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('hidden',t.id!=='tCareer'));setSub(sub);}
function setSub(sub){const {renderLog}=ctx;CSUB=sub;document.querySelectorAll('#cTabs button').forEach(b=>b.classList.toggle('sel',b.dataset.s===sub));document.querySelectorAll('#tCareer .sub').forEach(d=>d.classList.toggle('hidden',d.id!==sub));
  if(sub==='cHang')renderHangar();if(sub==='cRec')renderRecords();if(sub==='cBad')renderBadges();if(sub==='cJobs')renderJobs();if(sub==='cLog')renderLog();}
document.querySelectorAll('#cTabs button').forEach(b=>b.onclick=()=>{ctx.audio.init();setSub(b.dataset.s);});
function renderCareer(){const {$,S,audio,career,hourName,showBrief}=ctx;const C=career.C;career.refill(S);
  $('cHead').innerHTML=`<div class="money"><small>Kontostand</small><b>${fmtCHF(C.money)}</b></div><div class="cstat"><span>${Object.keys(C.badges).length} / ${BADGES.length} Abzeichen</span><span>${C.owned.length} / ${ORDER.length} Flugzeuge</span></div>`;
  const dj=getDaily(),dn=dj&&C.daily[dj.daily];const d=new Date();
  $('daily').innerHTML=dj?`<div class="dcard ${dn?'done':''}" id="dCard"><div class="dl"><small>TAGESAUFGABE · ${d.getDate()}.${d.getMonth()+1}.</small><b>${esc(dj.title)}</b><span>${PLANES[dj.plane].name} · ${hourName(dj.hour)} · ${dn?'erfüllt ✓':"CHF 5'000 + Abzeichen"}</span></div><button class="small" id="dGo">${dn?'Nochmal':'Los'}</button></div>`:'';
  if(dj)$('dGo').onclick=()=>{audio.init();showBrief(dj.mis);};
  setSub(CSUB);}
function renderJobs(){const {$,S,audio,career,hourName,showBrief,toast}=ctx;const C=career.C;const ic={arr:'🛬',dep:'🛫',rund:'📸',flug:'✈︎'};
  $('cJobs').innerHTML=`<p class="hint">Aufträge mit deinen eigenen Flugzeugen. Der Lohn hängt von Note, Komfort und Funk ab. Ein Unfall kostet Reparatur.</p>`+
    career.jobs().map(j=>`<div class="mis job ${j.locked?'locked':''}" data-n="${j.n}"><div class="jth" data-id="${j.plane}">${thumbImg(j.plane,'xs')}<i>${j.locked?'🔒':ic[j.kind]||'✈︎'}</i></div><div class="mi"><b>${esc(j.title)}</b><span>${PLANES[j.plane].name}${j.km?' · '+j.km+' km':''} · ${hourName(j.hour)}${j.pax?' · Passagiere':' · Fracht'}</span></div><div class="mr"><em>${fmtCHF(j.pay)}</em>${j.locked?`<small>Flugzeug kostet ${fmtCHF(PRICE[j.plane])}</small>`:''}</div></div>`).join('')+
    `<div class="btnrow"><button class="ghost small" id="jNew">Neue Aufträge</button></div>`;
  $('cJobs').querySelectorAll('.job').forEach(el=>el.onclick=()=>{audio.init();const j=career.jobs().find(x=>x.n==el.dataset.n);if(!j)return;if(j.locked){toast(`Dafür brauchst du den ${PLANES[j.plane].name} – im Hangar kaufen.`,3000);return;}showBrief(jobMission(j));});
  $('jNew').onclick=()=>{career.refill(S,true);renderJobs();toast('Neue Aufträge sind da.');};}
function renderBadges(){const {$,career}=ctx;const C=career.C;
  $('cBad').innerHTML=`<div class="bgrid">${BADGES.map(([id,n,dsc,ico])=>`<div class="badge ${C.badges[id]?'on':''}"><div class="bm">${ico}</div><b>${n}</b><span>${dsc}</span></div>`).join('')}</div>`;}
// Lackier-Editor (Hangar und freier Flug)
function livHTML(id){const {$,career}=ctx;const C=career.C,L=livSpec(id,C.liv[id]),named=!['alpina','saentis'].includes(id);
  const sw=(k,v)=>LIV_COL.map(c=>`<button class="sw ${v===c?'sel':''}" data-k="${k}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  return `<h4>Lackierung · Vorlage</h4><div class="chips">${LIV_TPL.map(([k,n])=>`<button class="chip ${L.tpl===k?'sel':''}" data-k="tpl" data-v="${k}">${n}</button>`).join('')}</div>
      <h4>Hauptfarbe</h4><div class="sws">${sw('c1',L.c1)}</div><h4>Akzentfarbe</h4><div class="sws">${sw('c2',L.c2)}</div>
      <h4>Rumpf</h4><div class="chips">${LIV_BASE.map(([c,n])=>`<button class="chip ${L.base===c?'sel':''}" data-k="base" data-v="${c}"><i class="dot" style="background:${c}"></i>${n}</button>`).join('')}</div>
      ${named?`<h4>Schriftzug</h4><input type="text" class="lvN" maxlength="16" value="${esc(L.name)}" placeholder="z. B. LUIS AIRLINES">`:''}
      <h4>Sonderlackierungen</h4><div class="chips">${SPECIAL_LIV.map((q,i)=>{const ok=(C.visited||{})[q.icao];const ap=AIRPORTS.find(a=>a.icao===q.icao);return`<button class="chip ${ok?'':'locked'}" ${ok?`data-pre="${i}"`:'disabled'} title="${ok?'':'Freischalten: in '+(ap?ap.name:q.icao)+' landen'}"><i class="dot" style="background:${q.c1}"></i>${q.n}<small>${ok?'':'🔒 '+(ap?ap.name:q.icao)}</small></button>`;}).join('')}</div>
      <div class="btnrow"><button class="ghost small lvAll">Auf alle Flugzeuge übertragen</button><button class="ghost small lvReset">Standard</button></div>`;}
function livBind(root,id,rerender,fleet){const {career,persist,toast}=ctx;const C=career.C;const setL=(k,v)=>{C.liv[id]={...livSpec(id,C.liv[id]),[k]:v};persist();rerender();};
  root.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>setL(el.dataset.k,el.dataset.v));
  root.querySelectorAll('[data-pre]').forEach(el=>el.onclick=()=>{const q=SPECIAL_LIV[+el.dataset.pre];C.liv[id]={...livSpec(id,C.liv[id]),tpl:q.tpl,c1:q.c1,c2:q.c2,base:q.base};persist();rerender();});
  const n=root.querySelector('.lvN');if(n)n.onchange=e=>setL('name',e.target.value.toUpperCase());
  const a=root.querySelector('.lvAll');if(a)a.onclick=()=>{const L=livSpec(id,C.liv[id]);for(const k of (fleet||Object.keys(PLANES))){const o={...livSpec(k,C.liv[k]),tpl:L.tpl,c1:L.c1,c2:L.c2,base:L.base};if(!['alpina','saentis'].includes(k)&&!['alpina','saentis'].includes(id))o.name=L.name;C.liv[k]=o;}persist();toast('Lackierung auf die ganze Flotte übertragen.');rerender();};
  const r=root.querySelector('.lvReset');if(r)r.onclick=()=>{delete C.liv[id];persist();rerender();};}
function renderHangar(){const {$,S,audio,career,checkBadges,save,toast}=ctx;const C=career.C;HSEL=HSEL||save.free.plane||'alpina';const id=HSEL,P=PLANES[id],own=career.owns(id);
  let det='';
  if(!own){const can=C.money>=PRICE[id];det=`<div class="hbuy"><b>${P.name}</b><span>${P.type}</span><p>${P.desc}</p><button id="hBuy" ${can?'':'disabled'}>Kaufen für ${fmtCHF(PRICE[id])}</button>${can?'':`<small>Es fehlen noch ${fmtCHF(PRICE[id]-C.money)} – erledige Aufträge und Missionen.</small>`}</div>`;}
  else det=livHTML(id);
  $('cHang').innerHTML=`<div class="hgrid">${ORDER.map(k=>{const o=career.owns(k);return`<div class="pc hp ${k===id?'sel':''} ${o?'own':''}" data-id="${k}">${thumbImg(k,'sm')}<b>${PLANES[k].name}</b><span>${o?'✓ im Hangar':fmtCHF(PRICE[k])}</span></div>`;}).join('')}</div><div id="hDet">${det}</div>`;
  $('cHang').querySelectorAll('.hp').forEach(el=>el.onclick=()=>{HSEL=el.dataset.id;renderHangar();});
  if($('hBuy'))$('hBuy').onclick=()=>{if(career.buy(id)){audio.chime();toast(`${P.name} gehört jetzt dir! Gestalte die Lackierung.`,3500);checkBadges();career.refill(S);renderCareer();}};
  livBind($('cHang'),id,renderHangar,C.owned);
  $('cHead').querySelector('b').textContent=fmtCHF(C.money);
  showroomSet(id);}
function shareObj(){const {career,save}=ctx;const C=career.C;return{n:C.name||'Pilot',s:save.stars,t:C.best,e:(save.edelweiss||[]).length,b:Object.keys(C.badges).length};}
function renderRecords(){const {$,MISSIONS,career,fmtT,persist,save,starsHtml,toast,totalStars}=ctx;const C=career.C,fr=C.friends[0]||null,code=encodeShare(shareObj());
  const rows=MISSIONS.map(m=>{const mine=C.best[m.id],his=fr&&fr.t&&fr.t[m.id];const win=mine&&his?(mine<=his?'me':'fr'):'';
    return`<tr><td>${m.name}</td><td>${starsHtml(save.stars[m.id]||0)}</td><td class="${win==='me'?'win':''}">${mine?fmtT(mine):'–'}</td>${fr?`<td class="${win==='fr'?'win':''}">${his?fmtT(his):'–'}</td>`:''}</tr>`;}).join('');
  $('cRec').innerHTML=`<h4>Pilotenname</h4><input type="text" id="rName" maxlength="16" value="${esc(C.name)}" placeholder="Dein Name">
    <h4>Geisterflugzeug</h4><div class="chips"><button class="chip ${C.ghost!==false?'sel':''}" data-g="1">An</button><button class="chip ${C.ghost===false?'sel':''}" data-g="0">Aus</button></div>
    <h4>Bestzeiten</h4><table class="rec"><tr><th>Mission</th><th>Sterne</th><th>Du</th>${fr?`<th>${esc(fr.n)}</th>`:''}</tr>${rows}</table>
    <h4>Dein Code zum Teilen</h4><div class="code"><input type="text" id="rCode" readonly value="${code}"><button class="small" id="rCopy">Kopieren</button></div>
    <h4>Code eines Freundes</h4><div class="code"><input type="text" id="rFriend" placeholder="AF1-…"><button class="small" id="rCmp">Vergleichen</button></div>
    ${fr?`<p class="hint">${esc(fr.n)}: ${Object.values(fr.s||{}).reduce((a,b)=>a+b,0)} Sterne · ${fr.e||0} Edelweiss · ${fr.b||0} Abzeichen. Du: ${totalStars()} Sterne · ${(save.edelweiss||[]).length} Edelweiss · ${Object.keys(C.badges).length} Abzeichen.</p>`:'<p class="hint">Schick deinen Code einem Freund – mit seinem Code vergleicht ihr eure Bestzeiten. Es gibt keine Online-Rangliste.</p>'}`;
  $('rName').onchange=e=>{C.name=e.target.value.trim().slice(0,16);persist();renderRecords();};
  $('cRec').querySelectorAll('[data-g]').forEach(el=>el.onclick=()=>{C.ghost=el.dataset.g==='1';persist();renderRecords();});
  $('rCopy').onclick=()=>{const t=$('rCode');t.select();try{navigator.clipboard.writeText(t.value).then(()=>toast('Code kopiert'),()=>{document.execCommand('copy');toast('Code kopiert');});}catch(e){document.execCommand('copy');toast('Code kopiert');}};
  $('rCmp').onclick=()=>{const o=decodeShare($('rFriend').value);if(!o){toast('Ungültiger Code',2500);return;}C.friends=[o,...C.friends.filter(f=>f.n!==o.n)].slice(0,3);persist();renderRecords();toast(`Vergleich mit ${o.n||'Freund'}`);};}
// ---------- Flugzeugbilder (einmal im Studio gerendert, zwischengespeichert) ----------
const THUMB={},TH={sc:null,cam:null,q:[]};
const thumbKey=id=>id+'|'+JSON.stringify(ctx.myLivery(id)||{});
function thumbImg(id,cls){const {$}=ctx;const u=THUMB[thumbKey(id)];if(!u&&!TH.q.includes(id))TH.q.push(id);return`<div class="pimg ${cls||''}">${u?`<img src="${u}" alt="">`:'<i class="ld"></i>'}</div>`;}
function thumbTick(){const {DEG,myLivery,renderer,scene,state}=ctx;if(!TH.q.length||state!=='menu')return;const id=TH.q.shift(),key=thumbKey(id);if(THUMB[key]){thumbFill(id);return;}
  try{if(!TH.sc){const sc=new THREE.Scene();const g=document.createElement('canvas');g.width=4;g.height=256;const x=g.getContext('2d'),gr=x.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#3a4a5e');gr.addColorStop(0.62,'#1d2735');gr.addColorStop(1,'#121821');x.fillStyle=gr;x.fillRect(0,0,4,256);
      const bt=new THREE.CanvasTexture(g);bt.colorSpace=THREE.SRGBColorSpace;sc.background=bt;
      sc.add(new THREE.HemisphereLight(0xdce9ff,0x4a4440,0.95));const d=new THREE.DirectionalLight(0xfff0d8,3.2);d.position.set(-10,9,-3);sc.add(d);const d2=new THREE.DirectionalLight(0x8fb8ff,1.6);d2.position.set(8,5,9);sc.add(d2);const d3=new THREE.DirectionalLight(0xffffff,0.6);d3.position.set(0,-4,-10);sc.add(d3);
      const sh=document.createElement('canvas');sh.width=sh.height=128;const y=sh.getContext('2d'),rg=y.createRadialGradient(64,64,4,64,64,64);rg.addColorStop(0,'rgba(0,0,0,.55)');rg.addColorStop(1,'rgba(0,0,0,0)');y.fillStyle=rg;y.fillRect(0,0,128,128);
      TH.shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sh),transparent:true,depthWrite:false}));TH.shadow.rotation.x=-Math.PI/2;sc.add(TH.shadow);
      TH.sc=sc;TH.cam=new THREE.PerspectiveCamera(24,1.6,0.3,3000);}
    TH.sc.environment=scene.environment||null;
    const P=PLANES[id],m=buildModel(id,{livery:myLivery(id)});animateModel(m,{flapPos:0,gearPos:1,rpm:0,groundSpeed:0,ail:0,elev:0,rud:0,night:0},0,0.016);
    m.rotation.y=window.__thRot??(P.heli?0.3:0.18);TH.sc.add(m);m.traverse(q=>{if(q.isPoints||q.isSprite||q.isLight||(q.material&&(q.material.blending===THREE.AdditiveBlending||q.material.transparent&&q.material.opacity<0.5)))q.visible=false;});m.updateMatrixWorld(true);
    const b=new THREE.Box3();m.traverseVisible(q=>{if(q.isMesh){q.geometry.computeBoundingBox();b.union(q.geometry.boundingBox.clone().applyMatrix4(q.matrixWorld));}});const c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.z)*0.5;
    TH.shadow.scale.set(sz.x*1.15,sz.z*1.15,1);TH.shadow.position.set(c.x,b.min.y+0.02,c.z);
    const dir=new THREE.Vector3(-0.82,0.15,-0.56).normalize(),pts=[];m.traverseVisible(q=>{if(!q.isMesh)return;const pa=q.geometry.attributes.position;if(!pa)return;const st=Math.max(1,Math.ceil(pa.count/400));for(let i=0;i<pa.count;i+=st)pts.push(new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(q.matrixWorld));});
    let dist=r/Math.tan(12*DEG);const tg=c.clone(),ty=Math.tan(12*DEG),tx=ty*1.6,rt=new THREE.Vector3(),up=new THREE.Vector3();
    for(let it=0;it<6;it++){TH.cam.position.copy(tg).addScaledVector(dir,dist);TH.cam.lookAt(tg);TH.cam.updateMatrixWorld();let x0=9,x1=-9,y0=9,y1=-9;for(const q of pts){const v=q.clone().project(TH.cam);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
      rt.setFromMatrixColumn(TH.cam.matrixWorld,0);up.setFromMatrixColumn(TH.cam.matrixWorld,1);tg.addScaledVector(rt,(x0+x1)/2*dist*tx).addScaledVector(up,((y0+y1)/2+0.04)*dist*ty);dist*=Math.max((x1-x0)/2/0.86,(y1-y0)/2/0.7);}
    TH.cam.position.copy(tg).addScaledVector(dir,dist);TH.cam.lookAt(tg);
    const W=320,H=200,pr=renderer.getPixelRatio(),cvs=renderer.domElement,ex=renderer.toneMappingExposure;
    renderer.setRenderTarget(null);renderer.setScissorTest(true);renderer.setViewport(0,0,W/pr,H/pr);renderer.setScissor(0,0,W/pr,H/pr);renderer.toneMappingExposure=0.82;
    renderer.render(TH.sc,TH.cam);const o=document.createElement('canvas');o.width=W;o.height=H;o.getContext('2d').drawImage(cvs,0,cvs.height-H,W,H,0,0,W,H);
    renderer.setScissorTest(false);const v=renderer.getSize(new THREE.Vector2());renderer.setViewport(0,0,v.x,v.y);renderer.toneMappingExposure=ex;
    TH.sc.remove(m);m.traverse(q=>{if(q.geometry)q.geometry.dispose();});
    THUMB[key]=o.toDataURL('image/jpeg',0.86);thumbFill(id);}catch(e){console.warn('thumb',id,e);}}
function thumbFill(id){const u=THUMB[thumbKey(id)];if(!u)return;document.querySelectorAll(`[data-id="${id}"] .pimg`).forEach(el=>{if(!el.querySelector('img'))el.innerHTML=`<img src="${u}" alt="">`;else el.querySelector('img').src=u;});}
// ---------- Ausstellungsplatz vor dem Hangar ----------
const SHOW={key:'',m:null,r:10,on:false};
function showroomSet(id){const {AP,S,myLivery,scene}=ctx;const spec=myLivery(id),key=id+'|'+JSON.stringify(spec||{});if(SHOW.key===key&&SHOW.m)return;
  if(SHOW.m)scene.remove(SHOW.m);SHOW.key=key;const m=buildModel(id,{livery:spec});const A=ZS?AP.ZRH16:MAIN_AP,p=fromLocal(A,SPOT[0],SPOT[1]);
  m.position.set(p.x,(S?S.heightAt(p.x,p.z):A.elev)+PLANES[id].gearH,p.z);m.rotation.y=-A.a+2.3;m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m);SHOW.r=b.getSize(new THREE.Vector3()).length()/2;SHOW.c=b.getCenter(new THREE.Vector3());
  animateModel(m,{flapPos:0,gearPos:1,rpm:0,groundSpeed:0,ail:0,elev:0,rud:0,night:0},0,0.016);scene.add(m);SHOW.m=m;}
const SPOT=ZS?[1660,-310]:[-MAIN_AP.len*0.3,MAIN_AP.side*110];
function showroomOn(){const {$,state}=ctx;return state==='menu'&&CSUB==='cHang'&&!$('menu').classList.contains('hidden')&&!$('tCareer').classList.contains('hidden')&&$('brief').classList.contains('hidden');}
// ---------- Flughafenplan für die Pistenwahl ----------
// Startrichtung einer Piste (Grad, 0 = Nord): rev=false startet am Ende rwyA in Richtung +along
function rwyHdg(A,rev){const {DEG}=ctx;const a=fromLocal(A,-A.len/2,0),b=fromLocal(A,A.len/2,0);const dx=(rev?a.x-b.x:b.x-a.x),dz=(rev?a.z-b.z:b.z-a.z);return((Math.atan2(dx,-dz)/DEG)+360)%360;}
function hdgName(h){const {$}=ctx;return['Nord','Nordost','Ost','Südost','Süd','Südwest','West','Nordwest'][Math.round(h/45)%8]+` (${String(Math.round(h)).padStart(3,'0')}°)`;}
function airportPlan(icao,f){const {$,AP,DEG,S}=ctx;const I=ICAOS.find(q=>q.icao===icao);if(!I)return'';const W=420,H=280,pad=50;
  const ends=I.rwys.flatMap(A=>[fromLocal(A,-A.len/2,0),fromLocal(A,A.len/2,0)]);let x0=Math.min(...ends.map(p=>p.x)),x1=Math.max(...ends.map(p=>p.x)),z0=Math.min(...ends.map(p=>p.z)),z1=Math.max(...ends.map(p=>p.z));
  const cx=(x0+x1)/2,cz=(z0+z1)/2,span=Math.max(x1-x0,z1-z0,600),k=Math.min((W-2*pad)/span,(H-2*pad)/span),X=x=>W/2+(x-cx)*k,Y=z=>H/2+(z-cz)*k;
  let g=`<svg class="apPlan" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:4px 0 10px;border-radius:14px;background:radial-gradient(circle at 50% 45%,#2b3a2a,#172019);">`;
  // Massstab und Nordpfeil
  const sc=span>3000?1000:500;g+=`<g fill="#cfd8cf" font-size="11" font-family="Inter,Arial"><line x1="14" y1="${H-16}" x2="${14+sc*k}" y2="${H-16}" stroke="#cfd8cf" stroke-width="2"/><text x="14" y="${H-22}">${sc>=1000?sc/1000+' km':sc+' m'}</text></g>`;
  g+=`<g transform="translate(${W-26},28)"><circle r="17" fill="rgba(0,0,0,0.35)" stroke="#9fb0a0"/><path d="M0,-13 L5,3 L0,0 L-5,3 Z" fill="#ff5a4a"/><path d="M0,13 L5,-3 L0,0 L-5,-3 Z" fill="#cfd8cf"/><text y="-19" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="Inter,Arial">N</text></g>`;
  if(f.wind&&f.wind.dir!=null){const a=f.wind.dir*DEG;g+=`<g transform="translate(${W-26},${H-30}) rotate(${f.wind.dir+180})"><path d="M0,-14 L0,12 M-5,6 L0,12 L5,6" stroke="#7ec8ff" stroke-width="2.4" fill="none"/></g><text x="${W-26}" y="${H-8}" text-anchor="middle" fill="#7ec8ff" font-size="10" font-family="Inter,Arial">Wind</text>`;}
  const labs=[];for(const A of I.rwys){const a=fromLocal(A,-A.len/2,0),b=fromLocal(A,A.len/2,0),ang=Math.atan2(Y(b.z)-Y(a.z),X(b.x)-X(a.x))/DEG,len=Math.hypot(X(b.x)-X(a.x),Y(b.z)-Y(a.z)),wd=Math.max(7,A.w*k*1.6);
    g+=`<g transform="translate(${(X(a.x)+X(b.x))/2},${(Y(a.z)+Y(b.z))/2}) rotate(${ang})"><rect x="${-len/2}" y="${-wd/2}" width="${len}" height="${wd}" rx="2" fill="#3a3f45" stroke="#6b737c"/><line x1="${-len/2+10}" y1="0" x2="${len/2-10}" y2="0" stroke="#e8e8e8" stroke-width="1.2" stroke-dasharray="6 5"/></g>`;
    for(const rev of [false,true]){const st=rev?b:a,to=rev?a:b,sel=f.ap===A.id&&f.rev===rev&&!f.gate,ux=(X(to.x)-X(st.x))/len,uy=(Y(to.z)-Y(st.z))/len;
      labs.push({A,rev,sel,ux,uy,sx:X(st.x),sy:Y(st.z),lx:X(st.x)-ux*22,ly:Y(st.z)-uy*22,len});}}
  // Nummern-Kreise nicht überlappen lassen
  for(let it=0;it<30;it++)for(let i=0;i<labs.length;i++)for(let j=i+1;j<labs.length;j++){const p=labs[i],q=labs[j],dx=q.lx-p.lx,dy=q.ly-p.ly,d=Math.hypot(dx,dy)||0.1;if(d<32){const m=(32-d)/2;p.lx-=dx/d*m;p.ly-=dy/d*m;q.lx+=dx/d*m;q.ly+=dy/d*m;}}
  // Jets an Bergflugplätzen: Pistenenden mit steilem Endanflug orange markieren (Landung in Gegenrichtung = Start hier)
  const PL=PLANES[f.plane],jet=PL&&!PL.prop&&!PL.heli,steep=new Map();
  if(jet&&S)for(const L of labs){try{const fs=finalSlope(L.A,L.rev,S,true);steep.set(L,fs);}catch(e){}}
  for(const L of labs){const {A,rev,sel,ux,uy,sx,sy,lx,ly,len}=L;const st=steep.get(L),hard=st&&st.deg>3.6;
      g+=`<g class="apEnd" data-id="${A.id}" data-r="${rev}" style="cursor:pointer"><line x1="${sx}" y1="${sy}" x2="${lx}" y2="${ly}" stroke="rgba(255,255,255,0.35)"/><circle cx="${lx}" cy="${ly}" r="15" fill="${sel?'#ffd84a':'rgba(20,28,22,0.85)'}" stroke="${hard?'#ff9a3c':sel?'#fff':'#c9d1c9'}" stroke-width="${hard?3:1.5}"/><text x="${lx}" y="${ly+4}" text-anchor="middle" font-size="12" font-weight="800" fill="${sel?'#1b1b1b':'#fff'}" font-family="Inter,Arial">${rev?A.rwyB:A.rwyA}</text>`+
        (sel?`<path d="M${sx+ux*8},${sy+uy*8} L${sx+ux*Math.min(len*0.7,120)},${sy+uy*Math.min(len*0.7,120)}" stroke="#ffd84a" stroke-width="3" marker-end="url(#ah)"/>`:'')+`</g>`;}
  g+=`<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ffd84a"/></marker></defs>`;
  const sA=AP[f.ap],tt=sA&&sA.icao===icao?`<p style="margin:2px 0 4px;font-weight:700">${f.gate?'Am Gate (mit Pushback)':'Start auf Piste '+(f.rev?sA.rwyB:sA.rwyA)+' · Richtung '+hdgName(rwyHdg(sA,f.rev))}</p>`:'';
  // Warnung: Landung auf dieser Piste (Anflug über das markierte Ende) ist für Jets steil
  let warn='';if(jet&&steep.size){const hardL=[...steep.entries()].filter(([L,v])=>v.deg>3.6);
    if(hardL.length){const nm=hardL.map(([L,v])=>`Piste ${L.rev?L.A.rwyB:L.A.rwyA}: ${v.deg>20?'kein freier Gleitpfad':v.deg.toFixed(1).replace('.',',')+'°'}`).join(' · '),allHard=hardL.length===labs.length;
      warn=`<p class="tip" style="margin:-2px 0 8px;border-left:3px solid #ff9a3c;padding-left:8px"><b>Bergflugplatz:</b> Für Linienflugzeuge ist der Anflug steil, weil Gelände im Weg ist (normal 3°) – ${nm}. `+
        (allHard?'Hier landen in Wirklichkeit keine Linienflugzeuge – nimm besser ein Propellerflugzeug oder einen grossen Flughafen.':'Die orange markierten Pistenenden meiden – die anderen sind gut anfliegbar.')+`</p>`;}}
  return tt+g+`</svg>`+warn+`<p class="hint" style="margin:-4px 0 8px">Tippe auf eine Pistennummer: dort beginnt dein Start, der gelbe Pfeil zeigt die Startrichtung.</p>`;}
function renderFree(){const {$,AP,fmtH,liveWeather,persist,save}=ctx;
  const f=save.free;
  $('fArea').innerHTML=`<button class="chip sel" disabled>Ganze Karte<small>Zürich · Luzern · Bern · Berner Oberland · Wallis – alles verbunden</small></button>`;
  $('fPlanes').innerHTML=Object.values(PLANES).map(p=>`<div class="pc ${f.plane===p.id?'sel':''}" data-id="${p.id}">${thumbImg(p.id)}<b>${p.name}</b><span>${p.type}</span><small>${p.desc}</small></div>`).join('');
  $('fPlanes').querySelectorAll('.pc').forEach(el=>el.onclick=()=>{f.plane=el.dataset.id;persist();renderFree();});
  if(PLANES[f.plane]&&!PLANES[f.plane].heli){$('fLiv').innerHTML=livHTML(f.plane);livBind($('fLiv'),f.plane,renderFree);}else $('fLiv').innerHTML='<p class="hint">Dieses Luftfahrzeug hat eine feste Lackierung.</p>';
  const cur=AP[f.ap];
  {const P=PLANES[f.plane];$('fSum').textContent=`${P?P.name:''} · ${cur?cur.name:''} · ${f.air?'im Anflug':f.hold?'am Rollhalt':'auf der Piste'}`;}
  $('fAP').innerHTML=ICAOS.map(I=>`<button class="chip ${cur.icao===I.icao?'sel':''}" data-i="${I.icao}">${I.name}<small>${I.icao} · ${Math.max(...I.rwys.map(r=>r.len))} m</small></button>`).join('');
  $('fAP').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.ap=ICAOS.find(I=>I.icao===el.dataset.i).rwys[0].id;f.rev=false;persist();renderFree();});
  const rw=ICAOS.find(I=>I.icao===cur.icao).rwys;
  $('fRwy').innerHTML=airportPlan(cur.icao,f)+rw.flatMap(A=>[false,true].map(r=>`<button class="chip ${f.ap===A.id&&f.rev===r?'sel':''}" data-id="${A.id}" data-r="${r}">Piste ${r?A.rwyB:A.rwyA}<small>Start Richtung ${hdgName(rwyHdg(A,r))}</small></button>`)).join('')+'<br>'+
    [['rwy','Auf der Piste','startbereit'],['hold','Am Rollhalt','neben der Piste'],['air','Im Anflug',PLANES[f.plane]&&PLANES[f.plane].prop?'6 km vor der Piste':'10 km vor der Piste']].map(([k,n,d])=>`<button class="chip ${(k==='air'?f.air:k==='hold'?(!f.air&&f.hold):(!f.air&&!f.hold))?'sel':''}" data-a="${k}">${n}<small>${d}</small></button>`).join('');
  $('fRwy').querySelectorAll('[data-r]').forEach(el=>el.onclick=()=>{f.ap=el.dataset.id;f.rev=el.dataset.r==='true';f.gate=false;persist();renderFree();});
  $('fRwy').querySelectorAll('[data-a]').forEach(el=>el.onclick=()=>{f.air=el.dataset.a==='air';f.hold=el.dataset.a==='hold';f.gate=false;persist();renderFree();});
  $('fRwy').querySelectorAll('.apEnd').forEach(el=>el.onclick=()=>{f.ap=el.dataset.id;f.rev=el.dataset.r==='true';f.gate=false;persist();renderFree();});
  if(cur.icao==='LSZH'&&PLANES[f.plane].cls==='jet'){$('fRwy').insertAdjacentHTML('beforeend',`<button class="chip ${f.gate?'sel':''}" id="fGate">Am Gate (mit Pushback)<small>Rollen zur Piste 34</small></button>`);$('fGate').onclick=()=>{f.gate=!f.gate;if(f.gate){f.air=false;f.hold=false;f.ap='ZRH16';f.rev=true;}persist();renderFree();};}else f.gate=false;
  $('fTime').innerHTML=[[7.2,'Morgen'],[12.5,'Mittag'],[17,'Nachmittag'],[20.1,'Abendrot'],[22.8,'Nacht']].map(([h,n])=>`<button class="chip ${Math.abs(f.hour-h)<0.01?'sel':''}" data-h="${h}">${n}<small>${fmtH(h)}</small></button>`).join('');
  $('fTime').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.hour=+el.dataset.h;persist();renderFree();});
  $('fWx').innerHTML=[['clear','Klar'],['fair','Schönwetterwolken'],['cloudy','Bewölkt'],['rain','Regen'],['storm','Gewitter'],['snow','Schneefall'],['fog','Nebelmeer'],['foehn','Föhn (klar)']].map(([k,n])=>`<button class="chip ${f.weather===k?'sel':''}" data-w="${k}">${n}</button>`).join('');
  $('fWx').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.weather=el.dataset.w;f.live=null;f.liveCH=false;if(f.weather==='foehn'&&f.wind!=='foehn')f.wind='foehn';persist();renderFree();});
  $('fLive').innerHTML=`<button class="chip ${f.live?'sel':''}" id="fLiveB">☁ Echtwetter Schweiz${f.liveCH&&f.live?' ✓':' laden'}<small>${f.live?esc(f.live):'aktuelles Wetter an 40 Orten – unterwegs immer das Wetter der Gegend'}</small></button>`;$('fLiveB').onclick=liveWeather;
  f.season=f.season||'summer';$('fSeason').innerHTML=[['summer','Sommer'],['winter','Winter (Schnee)']].map(([k,n])=>`<button class="chip ${f.season===k?'sel':''}" data-s="${k}">${n}</button>`).join('');
  $('fSeason').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.season=el.dataset.s;persist();renderFree();});
  f.wind=f.wind||'light';$('fWind').innerHTML=[['calm','Windstill'],['light','Leicht'],['mid','Mässig'],['strong','Stark, böig'],['foehn','Föhnsturm']].map(([k,n])=>`<button class="chip ${f.wind===k?'sel':''}" data-k="${k}">${n}</button>`).join('');
  $('fWind').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.wind=el.dataset.k;f.live=null;f.liveCH=false;persist();renderFree();});
}
function ewInfo(){const {$,attr,ewIds}=ctx;const n=ewIds().length;$('ewInfo').innerHTML=`<b>Goldene Edelweiss: ${n} / ${attr?attr.edelweissTotal:72}</b> – versteckt bei Wahrzeichen, auf Gipfeln und tief über Seen: von Genf und dem Matterhorn über Zürich, Luzern und die Jungfrau bis nach St. Moritz und Lugano. Flieg im freien Flug hindurch und sammle alle! Dazu: Kunstflugstaffel, Zeppelin über Zürich, Heissluftballone, Gleitschirme, Seilbahnen und nachts Feuerwerk.`;}
function renderSettings(){const {$,audio,buildComposer,env,persist,save}=ctx;const st=save.settings;
  const opt=(id,vals,key)=>{$(id).innerHTML=vals.map(([v,n])=>`<button class="chip ${st[key]===v?'sel':''}" data-v="${v}">${n}</button>`).join('');$(id).querySelectorAll('.chip').forEach(el=>el.onclick=()=>{let v=el.dataset.v;if(v==='true')v=true;if(v==='false')v=false;st[key]=v;persist();renderSettings();if(key==='quality')$('qHint').style.display='';if(key==='ao'&&env)buildComposer();});};
  opt('sUnits',[['metric','Metrisch (km/h, m)'],['aviation','Luftfahrt (kt, ft)']],'units');
  opt('sAssist',[[true,'Flughilfe an'],[false,'Manuell']],'assist');
  opt('sInvert',[[false,'↓ = Nase hoch'],[true,'↑ = Nase hoch']],'invert');
  opt('sLevel',[['off','Aus'],['weak','Schwach'],['mid','Mittel'],['strong','Stark']],'level');
  opt('sAtc',[[true,'Funk & Freigaben an'],[false,'Funk aus']],'atc');
  opt('sVoice',[[true,'Tower-Stimme an'],[false,'Nur Text']],'voice');
  opt('sCall',[[true,'Callouts & Kabinenansagen an'],[false,'aus']],'callouts');
  opt('sVib',[['0','Vibration aus'],['0.5','schwach'],['1','normal'],['1.6','stark']],'vib');
  opt('sTouch',[['auto','Touch: automatisch'],['on','immer'],['off','aus']],'touch');
  opt('sTraffic',[[true,'KI-Verkehr an'],[false,'Kein Verkehr']],'traffic');
  opt('sPad',[['0.7','Sanft'],['1','Normal'],['1.3','Direkt']],'padSensS');
  opt('sQual',[['ultra','Ultra'],['high','Hoch'],['medium','Mittel'],['low','Niedrig']],'quality');
  opt('sAO',[['auto','Auto'],['on','An'],['off','Aus']],'ao');
  $('sVol').value=st.vol;$('sVol').oninput=e=>{st.vol=+e.target.value;audio.setVolume(st.vol);persist();};}
return {getCSUB:()=>CSUB,esc,THUMB,TH,thumbKey,SHOW,SPOT,airportPlan,ewInfo,getDaily,hdgName,livBind,livHTML,openCareer,renderBadges,renderCareer,renderFree,renderHangar,renderJobs,renderRecords,renderSettings,rwyHdg,setSub,shareObj,showroomOn,showroomSet,thumbFill,thumbImg,thumbTick};}
