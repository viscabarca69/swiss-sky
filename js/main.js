// SWISS SKY (früher Alpenflug) – Hauptprogramm
import * as THREE from 'three';
import {buildGrid,makeSampler,AIRPORTS,APM,ICAOS,TOWNS,PEAKS,LAKES,HALF,WORLD,toLocal,fromLocal,toXZ,AREA_ID,AREA_NAME,MAIN_AP,GEO,oldXZ} from './worldgen.js';
const ZS=true;// eine grosse Karte (früher: zs oder bo)
const EWZ=24,EWC=48;const ewIds=()=>[...(save.edelweiss||[]),...(save.edelweissBO||[]).map(i=>i+EWZ),...(save.edelweissCH||[]).map(i=>i+EWC)];
document.querySelectorAll('.lsub').forEach(e=>e.textContent='Flugsimulator · '+AREA_NAME);
import {buildWorld} from './world3d.js';
import {createEnv,glowU,makeGlow} from './env.js';
import {buildAirports} from './airports3d.js';
import {PLANES,AIRLINER,buildModel,bakeModel,animateModel,LIV_TPL,LIV_COL,LIV_BASE,livSpec} from './aircraft.js';
import {createGround} from './ground.js';
import {createHeli,stepHeli} from './heli.js';
import {createCareer,PRICE,ORDER,fmtCHF,jobMission,dailyJob,BADGES,encodeShare,decodeShare,todayKey} from './career.js';
import {createFlight,stepFlight,stallSpeed} from './flight.js';
import {MISSIONS as ALL_MISSIONS,buildObjectives,objPath,turnRadius} from './missions.js';
import {runwayAt,approachOptions,planApproach,approachGuide} from './approach.js';
const MISSIONS=ALL_MISSIONS;
import {createHUD} from './hud.js';
import {createAudio} from './audio.js';
import {nightU} from './gfx.js';
import {LESSONS,tutorTick} from './tutorial.js';
import {createGamepad,createMenuNav,BTN} from './gamepad.js';
import {createWeather,WIND_PRESETS} from './weather.js';
import {createATC,CALLSIGN} from './atc.js';
import {createTraffic} from './traffic.js';
import {createAttractions} from './attractions.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {Lensflare,LensflareElement} from 'three/addons/objects/Lensflare.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const _el={},$=id=>_el[id]&&_el[id].isConnected?_el[id]:(_el[id]=document.getElementById(id)),DEG=Math.PI/180;
const _tv=new Map();function setTxt(id,v){v=String(v);if(_tv.get(id+'t')!==v){_tv.set(id+'t',v);$(id).textContent=v;}}
function setHTML(id,v){v=String(v);if(_tv.get(id+'h')!==v){_tv.set(id+'h',v);$(id).innerHTML=v;}}
function setSty(id,k,v){v=String(v);if(_tv.get(id+k)!==v){_tv.set(id+k,v);$(id).style[k]=v;}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const AP=APM;

// ---------- Speicher ----------
let save={stars:{},grades:{},settings:{units:'metric',assist:true,vol:0.7,quality:'high',invert:false,level:'weak',atc:true,voice:true,traffic:true,padSensS:'1',callouts:true,vib:'1',touch:'auto',keys:{}},free:{plane:'alpina',ap:'ZRH16',rev:false,air:false,hour:12.5,weather:'fair'}};
save.lessons={};
try{const s=JSON.parse(localStorage.getItem('alpenflug-ch1'));if(s){save.lessons=s.lessons||{};save.stars=s.stars||{};save.grades=s.grades||{};Object.assign(save.settings,s.settings||{});Object.assign(save.free,s.free||{});save.edelweiss=s.edelweiss||[];save.edelweissBO=s.edelweissBO||[];save.edelweissCH=s.edelweissCH||[];if(s.career)save.career=s.career;}}catch(e){}
const persist=()=>{try{localStorage.setItem('alpenflug-ch1',JSON.stringify(save));}catch(e){}};
const career=createCareer(save,persist);
const myLivery=id=>career.owns(id)?career.C.liv[id]||null:null;
const QUAL={ultra:{tex:4096,trees:50000,treeSpacing:18,treeRadius:4400,farms:2200,house:1.15,shadows:true,aniso:16,pr:2,reflect:true,bloom:true},
  high:{tex:4096,trees:36000,treeSpacing:20,treeRadius:4000,farms:1900,house:1,shadows:true,aniso:8,pr:1.5,reflect:false,bloom:false},
  medium:{tex:4096,trees:20000,treeSpacing:25,treeRadius:3200,farms:1200,house:0.75,shadows:true,aniso:4,pr:1.25,reflect:false,bloom:false},
  low:{tex:2048,trees:7000,treeSpacing:36,treeRadius:2300,farms:500,house:0.45,shadows:false,aniso:2,pr:1,reflect:false,bloom:false}};
const Q={...(QUAL[save.settings.quality]||QUAL.high),world:WORLD};
const LEVEL={off:0,weak:0.35,mid:0.8,strong:1.7};
if(!AP[save.free.ap]){save.free.ap=MAIN_AP.id;save.free.rev=false;}

// ---------- Renderer ----------
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,Q.pr));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=Q.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
let composer=null,bloom=null;
const cam=new THREE.PerspectiveCamera(60,1,1,160000);
function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(composer){composer.setSize(innerWidth,innerHeight);}}
addEventListener('resize',resize);resize();

const hud=createHUD(),audio=createAudio();audio.setVolume(save.settings.vol);
const wx=createWeather(scene);
const atc=createATC(audio,{voice:()=>save.settings.voice!==false,onPenalty:t=>{toast('Regelverstoss: '+t,5000);pad.rumble(0.3,0.6,250);},onInfo:t=>toast(t,6500)});
const nav=createMenuNav();
const pad=createGamepad((on,P)=>{toast(on?`Controller verbunden${P.isPS?' (PlayStation)':''} – los geht's!`:'Controller getrennt',3500);document.body.classList.toggle('haspad',on);if(state==='menu')renderSettings();});
let S,world,env,airports,WF,cityGlow,traffic,attr,groundT=null;const cityU={uI:{value:0},uScale:{value:500},uFogD:{value:0.00003}};
const prog=(p,t)=>{$('lbar').style.width=(p*100).toFixed(1)+'%';if(t)$('lstep').textContent=t;if(window.__desk)window.__desk.progress(Math.min(1,p),t);};
let deskOn=!!document.getElementById('desk');
window.__deskPlay=()=>{deskOn=false;audio.init();last=performance.now();};
// zurück auf den Desktop: Flug pausieren, Ton aus, Spiel ruht, bis man über die Taskleiste zurückkehrt
function toDesktop(){if(!window.__desk||!window.__desk.show)return;if(state==='map')toggleMap();if(state==='fly')togglePause();try{speechSynthesis.cancel();}catch(e){}audio.update({silent:true});K.clear();deskOn=true;window.__desk.show();}if(window.__deskWantPlay)setTimeout(()=>window.__deskPlay(),0);

// ---------- Laden ----------
async function boot(){
  prog(0.01,'Höhenmodell wird berechnet');await new Promise(r=>setTimeout(r,30));
  const {H,LK}=await buildGrid(p=>prog(p*0.08,'Höhendaten der Schweiz werden geladen'));S=makeSampler(H,LK);
  world=await buildWorld(scene,H,LK,S,Q,(p,t)=>prog(0.08+p*1.1,t));
  prog(0.85,'Himmel und Licht');await new Promise(r=>setTimeout(r,0));
  env=createEnv(renderer,scene,Q);env.onSun=d=>world.uSun.value.copy(d);
  if(Q.bloom){const rt=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});composer=new EffectComposer(renderer,rt);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);
    composer.addPass(new RenderPass(scene,cam));bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.3,0.5,2.2);composer.addPass(bloom);composer.addPass(new OutputPass());}
  prog(0.9,'Flughäfen werden gebaut');await new Promise(r=>setTimeout(r,0));
  airports=buildAirports(scene,S,addParked);
  traffic=createTraffic(scene,S,buildModel,animateModel,PLANES);traffic.prewarm();
  attr=createAttractions(scene,S,{collected:ewIds(),area:AREA_ID,realCover:world.inReal});
  try{groundT=createGround(scene,S,Q);}catch(e){console.warn('Bodenverkehr',e);}
  {const cl=world.cityLights,n=cl.length/3,col=[],sz=[];for(let i=0;i<n;i++){const r=Math.random();col.push(1,0.72+r*0.2,0.38+r*0.25);sz.push(4+r*4);}cityGlow=makeGlow(cl,col,sz,cityU);scene.add(cityGlow);}
  WF={heightAt:S.heightAt,slopeAt:S.slopeAt,isLake:S.isLake,waterLevel:S.waterLevel,groundAt:S.groundAt,
    runwayAt:(x,z)=>{for(const A of AIRPORTS){const l=toLocal(A,x,z);if(Math.abs(l.across)<A.w/2+3&&Math.abs(l.along)<A.len/2+6)return A;}return null;},
    airportZone:(x,z)=>{for(const A of AIRPORTS){const l=toLocal(A,x,z);if(Math.abs(l.across)<A.flatW-8&&Math.abs(l.along)<A.flatL-8)return A;}return null;}};
  env.setTime(20.0,'fair');
  menuCam(0);world.updateTrees(cam.position,true);
  prog(0.97,'Shader werden vorbereitet');await new Promise(r=>setTimeout(r,0));
  renderer.compile(scene,cam);
  prog(1,'Bereit');
  $('loading').classList.add('fade');setTimeout(()=>$('loading').remove(),900);
  showMenu();
}
function addParked(id,A,along,across,rot,nose){const m=bakeModel(buildModel(id));let info=null;if(nose){m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m);const nf=-b.min.z;across=Math.sign(nose)*(Math.abs(nose)-nf);info={nf,across};}const p=fromLocal(A,along,across);m.position.set(p.x,A.elev+PLANES[id].gearH,p.z);m.rotation.y=-A.a+rot;
  const pr=m.userData.parts;if(pr.lights)pr.lights.P.visible=false;scene.add(m);PARKED.push({id,m,A,along,rot});return Object.assign(info||{},{m});}
const PARKED=[];

// ---------- Eingabe ----------
const K=new Set();
let state='load',G=null;
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT'&&e.target.type==='text'){if(e.code==='Escape'||e.code==='Enter')e.target.blur();return;}
  if(deskOn)return;
  if(REC){e.preventDefault();recordKey(e.code);return;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();
  const code=REMAP[e.code]??e.code;K.add(code);if(e.repeat)return;
  // Menü: Esc schliesst das Briefing, Enter startet es
  if(state==='menu'&&!$('brief').classList.contains('hidden')){if(e.code==='Escape'){$('brief').classList.add('hidden');return;}if(e.code==='Enter'&&$('bGo')){$('bGo').click();return;}}
  if(state==='result'&&e.code==='Escape'&&$('rMenu')){$('rMenu').click();return;}
  keyAction(code);
});
function keyAction(code){
  if(G&&G.tut&&G.tut.s)G.tut.s[code]=true;
  if(state==='replay'){if(code==='Escape'||code==='KeyP'||code==='Backspace')endReplay();else if(code==='Space'||code==='KeyC')RP.next=true;return;}
  if(state==='pause'&&['KeyP','Escape','Tab'].includes(code)){togglePause();return;}
  if(state==='map'){if(['KeyM','Escape'].includes(code)){toggleMap();return;}if(code==='Equal'||code==='NumpadAdd'||code==='BracketRight'){mapZoom(1.5);return;}if(code==='Minus'||code==='NumpadSubtract'||code==='Slash'){mapZoom(1/1.5);return;}if(code==='Delete'||code==='Backspace'||code==='KeyX'){clearWp();return;}if(code==='Digit0'||code==='Numpad0'){mapCenter();return;}}
  if(state==='photo'){photoKey(code);return;}
  if(code==='KeyK'&&G&&(state==='fly'||state==='pause')){togglePhoto();return;}
  if(state!=='fly'||!G)return;const F=G.F;
  if(G.atGate&&(code==='KeyJ'||code==='KeyU')){startPushback();return;}
  if(G.apAsk){if(code==='KeyU'||code==='Digit1'||code==='Numpad1'||code==='Enter'){apEngage(false);return;}if(code==='KeyH'||code==='Digit2'||code==='Numpad2'){apEngage(true);return;}if(code==='Escape'||code==='Backspace'){apAskClose();return;}}
  switch(code){
    case'KeyG':if(G.gearStuck){G.pump=(G.pump||0)+1;audio.click();pad.rumble(0.15,0.3,90);if(G.pump>=6){G.gearStuck=false;F.gear=true;audio.gear();toast('Fahrwerk ausgefahren und verriegelt ✓',2600);hideEmerg();}else toast(`Handpumpe: ${G.pump} / 6`,900);break;}
      if(F.P.fixedGear)toast('Festes Fahrwerk – immer ausgefahren');else if(F.onGround)toast('Am Boden bleibt das Fahrwerk unten');else{F.gear=!F.gear;audio.gear();toast(F.gear?'Fahrwerk wird ausgefahren':'Fahrwerk wird eingefahren');}break;
    case'KeyF':if(F.flaps<3){F.flaps++;audio.click();toast('Klappen '+F.P.flapNames[F.flaps]);}break;
    case'KeyV':if(F.flaps>0){F.flaps--;audio.click();toast('Klappen '+F.P.flapNames[F.flaps]);}break;
    case'KeyC':G.cam=(G.cam+1)%4;G.camSnap=true;G.look.set(0,0);toast(['Verfolgerkamera','Cockpit','Vorbeiflug-Kamera','Weitwinkel-Kamera'][G.cam]);break;
    case'KeyM':toggleMap();break;
    case'KeyP':case'Escape':case'Tab':togglePause();break;
    case'Space':dropCrate();break;
    case'KeyH':F.assist=!F.assist;F.gammaT=Math.asin(clamp(F.vel.y/Math.max(F.vel.length(),1),-1,1));toast(F.assist?'Flughilfe EIN (hält die Flugbahn)':'Flughilfe AUS (manuell)');break;
    case'KeyN':toast(audio.toggleMute()?'Ton aus':'Ton an');break;
    case'KeyU':if(F.P.heli){toast('Der Helikopter hält mit der Flughilfe die Höhe von selbst');break;}if(G.ap){G.ap=null;toast('Autopilot AUS');}else if(F.onGround)toast('Autopilot erst in der Luft');else apAskOpen();break;
    case'KeyR':startFlight(G.cfg);break;
    case'KeyT':atc.press(atcCtx());break;
  }
}
addEventListener('keyup',e=>K.delete(REMAP[e.code]??e.code));
addEventListener('blur',()=>{K.clear();if(state==='fly')togglePause();});
let drag=null,lastDrag=0;
$('c').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};audio.init();});
addEventListener('pointerup',()=>{drag=null;lastDrag=performance.now();});
addEventListener('pointermove',e=>{if(!drag||!G)return;G.look.x-=(e.clientX-drag.x)*0.006;G.look.y=clamp(G.look.y+(e.clientY-drag.y)*0.005,-1.2,1.3);drag={x:e.clientX,y:e.clientY};lastDrag=performance.now();});
$('c').addEventListener('wheel',e=>{if(G){G.zoom=clamp(G.zoom*(1+Math.sign(e.deltaY)*0.1),0.45,4);}},{passive:true});

// ---------- Flug starten ----------
const ringTex=(a,b)=>{const c=document.createElement('canvas');c.width=512;c.height=16;const x=c.getContext('2d');for(let i=0;i<32;i++){x.fillStyle=i%2?a:b;x.fillRect(i*16,0,16,16);}x.fillStyle='rgba(255,255,255,.55)';x.fillRect(0,0,512,3);x.fillStyle='rgba(120,70,0,.35)';x.fillRect(0,13,512,3);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;},RING_TEX=ringTex('#ffb21c','#fff3b0'),RING_TEX_B=ringTex('#22b4ff','#e4f7ff');
const ringMat=(fin)=>new THREE.MeshBasicMaterial({color:0xffffff,map:fin?RING_TEX_B:RING_TEX,transparent:true,opacity:1,fog:env.weather!=='fog',toneMapped:false});
const ringHalo=(r,col)=>{const h=new THREE.Mesh(new THREE.TorusGeometry(r,3.0,8,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.1,blending:THREE.AdditiveBlending,depthWrite:false,fog:true,toneMapped:false}));h.name='halo';return h;};
const crateGeo=new THREE.BoxGeometry(1.4,1.4,1.4),crateMat=new THREE.MeshStandardMaterial({color:0x9a6a36,roughness:0.85});
const chuteGeo=new THREE.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),chuteMat=new THREE.MeshStandardMaterial({color:0xff6a1a,roughness:0.7,side:THREE.DoubleSide});
function cleanup(){{const b=$('tdb');if(b)b.className='';}if(G&&G.cshadow){try{G.cshadow.userData.rt.dispose();}catch(e){}}atc.stop();PARKED.forEach(p=>p.m.visible=true);wx.set({dir:240},0);audio.setRain&&audio.setRain(0);if(!G)return;for(const o of G.dyn){scene.remove(o);}if(G.rfx)G.rfx.forEach(f=>scene.remove(f.m));G=null;}
function startFlight(cfg){
  perf.hold=3;cleanup();audio.init();
  const mission=cfg.dyn||(cfg.mission?MISSIONS.find(m=>m.id===cfg.mission):null);
  const lesson=cfg.lesson?LESSONS.find(l=>l.id===cfg.lesson):null;
  const planeId=mission?mission.plane:lesson?lesson.plane:cfg.plane,P=PLANES[planeId];
  const hour=mission?mission.hour:lesson?lesson.hour:cfg.hour,weather=mission?mission.weather:lesson?lesson.weather:cfg.weather;
  env.setTime(hour,weather);
  let pos,yaw,air=!mission&&(lesson?lesson.air:cfg.air||P.glider);
  if(mission&&mission.air){const p=toXZ(mission.air.lat,mission.air.lon);pos=new THREE.Vector3(p.x,mission.air.alt,p.z);yaw=-mission.air.hdg*DEG;air=true;}
  else{const [apId,rev,mAir]=mission?mission.start:lesson?[lesson.ap,lesson.rev]:[cfg.ap,cfg.rev];const A=AP[apId],s=rev?-1:1;yaw=-A.a+(rev?Math.PI:0);if(mAir)air=true;
    if(air){const aa=lesson&&lesson.airAt||(mAir&&[mAir.dist,mAir.agl]),dist=aa?aa[0]:P.prop?6000:9000;const p=fromLocal(A,-s*(A.len/2+dist),0);let alt=A.elev+(aa?aa[1]:P.prop?420:560);
      for(let d=0;d<=dist+800;d+=150){const q=fromLocal(A,-s*(A.len/2+d),0);alt=Math.max(alt,S.groundAt(q.x,q.z)+(d>dist-1500?280:150));}
      pos=new THREE.Vector3(p.x,alt,p.z);}
    else{const p=fromLocal(A,-s*(A.len/2-25-(P.prop?0:30)),0);pos=new THREE.Vector3(p.x,A.elev+P.gearH,p.z);}}
  let gateP=null;if((mission?mission.gate:cfg.gate)&&P.cls==='jet'){const cand=PARKED.filter(q=>q.A.icao==='LSZH'&&AIRLINER[q.id]);gateP=cand.find(q=>q.id===planeId&&q.along>1500)||cand.find(q=>q.id===planeId)||cand.sort((a,b)=>b.along-a.along)[0];
    if(gateP){gateP.m.visible=false;pos=gateP.m.position.clone();yaw=gateP.m.rotation.y;air=false;}}
  let startAP=null,startRev=false;if(!(mission&&mission.air)){const st=mission?mission.start:lesson?[lesson.ap,lesson.rev]:[cfg.ap,cfg.rev];startAP=AP[st[0]];startRev=!!st[1];}
  if(P.heli&&!air&&!(mission&&mission.air)){const st=mission?mission.start:[cfg.ap,cfg.rev];const A=AP[st[0]],s=st[1]?-1:1,p=fromLocal(A,-s*(A.len/2-120),A.side*Math.min(75,(A.flatW||100)-30));pos=new THREE.Vector3(p.x,S.heightAt(p.x,p.z)+P.gearH,p.z);}
  const F=P.heli?createHeli(P,pos,yaw,{air,assist:save.settings.assist,speed:25}):createFlight(P,pos,yaw,{air,assist:save.settings.assist,level:LEVEL[save.settings.level]??0.35,speed:P.Vref*1.3});
  if(air&&!P.heli){F.thr=F.eng=P.glider?0:P.prop?0.55:0.42;F.gammaT=mission&&mission.air?-1.5*DEG:-2.5*DEG;if(!P.prop){F.flaps=1;F.flapPos=1/3;}}
  if(gateP){F.brake=true;}
  if(lesson&&lesson.airAt){F.gammaT=0;F.thr=F.eng=0.62;}if(lesson&&lesson.noAssist)F.assist=false;
  const model=buildModel(planeId,{landingLight:true,livery:myLivery(planeId)});scene.add(model);if(SHOW.m)SHOW.m.visible=false;cam.clearViewOffset();setMFade(0);
  G={cfg,mission,F,P,model,dyn:[model],obj:mission?buildObjectives(mission,S,{vref:P.heli?0:P.Vref}):[],oi:0,t:0,cam:0,camSnap:true,look:new THREE.Vector2(),zoom:1,
     crates:mission?(mission.obj.toString().includes('D(')?P.crates:0):lesson?0:P.crates,lesson,tut:lesson?{k:0,alt00:pos.y}:null,boxes:[],fx:[],trail:[],lastTouch:null,done:false,liftMsg:false,comfort:100,rec:[],recT:0,startAP,startRev,flyby:null,camPos:new THREE.Vector3(),lastWarn:'',gh:[],ghN:0};
  if(mission&&!mission.dyn&&career.C.ghost!==false){const gd=career.ghostGet(mission.id);if(gd&&gd.d&&gd.d.length>70){G.ghost={d:gd.d,t:gd.t,m:makeGhost(planeId)};scene.add(G.ghost.m);G.dyn.push(G.ghost.m);}}
  // Cockpit-Innenraum
  G.cockpit=buildCockpit(model,P);
  try{G.cshadow=makeContactShadow(model);scene.add(G.cshadow);G.dyn.push(G.cshadow);}catch(e){console.warn('Kontaktschatten',e);G.cshadow=null;}
  G.vap=null;try{vaporSetup();}catch(e){console.warn('Kondensfahnen',e);}
  setupStage3(mission,P);G.atGate=!!gateP;if(gateP&&!mission)G.obj=buildObjectives({obj:({TX})=>[TX()]},S);if(gateP)setupGate();
  // Ziele
  let prev=pos.clone();
  G.obj.forEach((o,i)=>{
    if(o.type==='ring'){const m=new THREE.Mesh(new THREE.TorusGeometry(o.r,o.final?1.0:1.5,12,64),ringMat(o.final));m.add(ringHalo(o.r,o.final?0x41d2ff:0xffc23a));
      m.position.set(o.x,o.y,o.z);const nx=G.obj[i+1]||o;let d=o.dir?new THREE.Vector3(o.dir[0],0,o.dir[1]):new THREE.Vector3(nx.x-prev.x,(nx.y-prev.y)*0.3,nx.z-prev.z);
      if(d.lengthSq()<1)d.set(0,0,-1);m.lookAt(m.position.clone().add(d));o.mesh=m;scene.add(m);G.dyn.push(m);prev=m.position.clone();}
    else if(o.type==='drop'){const g=new THREE.Group();
      const hut=new THREE.Mesh(new THREE.BoxGeometry(9,5,12),new THREE.MeshStandardMaterial({color:0x6b4a32,roughness:0.9}));hut.position.y=2.5;g.add(hut);
      const rf=new THREE.Mesh(new THREE.ConeGeometry(9,4.5,4),new THREE.MeshStandardMaterial({color:0x50525a}));rf.position.y=7;rf.rotation.y=Math.PI/4;rf.scale.z=1.35;g.add(rf);
      const tg=new THREE.Mesh(new THREE.RingGeometry(o.r-5,o.r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff3b2f,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false}));tg.position.y=1.5;g.add(tg);o.ringMesh=tg;
      const fl=makeGlow([0,22,0],[1,0.3,0.1],[14]);g.add(fl);
      g.position.set(o.x,o.y,o.z);scene.add(g);G.dyn.push(g);o.mesh=g;prev=new THREE.Vector3(o.x,o.y+300,o.z);}
    else prev=new THREE.Vector3(o.x,o.y,o.z);
  });
  // sichtbare Flugbahn durch die Ringe (nicht bei Helikoptern und Rennen mit eigener Linie)
  G.path=null;if(G.obj.some(o=>o.type==='ring')&&!P.heli){G.path=objPath(G.obj,{x:pos.x,y:pos.y-(air?0:P.gearH),z:pos.z,hx:-Math.sin(yaw),hz:-Math.cos(yaw),ground:!air,jet:!P.prop,r:turnRadius(P)});if(G.path.length>4)buildPathRibbon();else G.path=null;
    // Ringe quer zur Bahn ausrichten
    for(const o of G.obj)if(o.type==='ring'&&o.mesh&&o.hd&&!o.dir){const k=o.pi?Math.min(G.path.length-1,o.pi[1]-1):-1,q=k>0?G.path[k]:null,qp=k>2?G.path[k-3]:null,dy=q&&qp?(q.y-qp.y)/Math.max(1,Math.hypot(q.x-qp.x,q.z-qp.z)):0;o.mesh.lookAt(o.mesh.position.clone().add(new THREE.Vector3(o.hd[0],dy*0.5,o.hd[1])));}}
  G.pred=new THREE.Mesh(new THREE.RingGeometry(4,7,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,side:THREE.DoubleSide,depthWrite:false}));G.pred.visible=false;scene.add(G.pred);G.dyn.push(G.pred);
  refreshRings();
  state='fly';
  ['menu','brief','result','pause','mapov'].forEach(id=>$(id).classList.add('hidden'));$('hud').classList.remove('hidden');
  world.updateTrees(pos,true);
  // Wetter, Wind, Funk, Verkehr
  let wk=mission?(mission.wind||'light'):lesson?'calm':(cfg.wind||'light');if(weather==='storm'&&(wk==='light'||wk==='calm'))wk='storm';const wp=typeof wk==='string'?WIND_PRESETS[wk]||WIND_PRESETS.light:wk;
  const wdir=(typeof wk==='object'&&wk.dir!=null)?wk.dir:wk==='foehn'?195:(mission&&mission.windDir)||(cfg.windDir??(240+Math.round((Math.random()-0.5)*60)));
  const wet=weather==='rain'||weather==='storm'||weather==='snow';wx.set({...wp,dir:wdir},wet?1:0,weather==='snow');audio.setRain&&audio.setRain(weather==='rain'||weather==='storm'?1:0);G.windDir=wdir;
  world.setWinter((mission?mission.season:lesson?null:cfg.season)==='winter'||weather==='snow');G.ltT=4+Math.random()*6;
  const dest=G.obj.find(o=>o.type==='land')?.ap||null;
  atc.start({enabled:!lesson&&!(mission&&mission.race)&&!P.heli&&!P.glider&&save.settings.atc!==false,onGround:!air,startAP,dest,callsign:CALLSIGN[planeId]||'HB-XYZ'});
  if(traffic){traffic.on=save.settings.traffic!==false;traffic.reset();}
  if(mission&&mission.race)G.race=true;
  if(lesson){toast('Flugschule: '+lesson.name,3500);return;}
  if(G.atGate){toast('Am Gate in Zürich · Pushback mit J (Controller: ◀)',6000);return;}
  if(G.ghost){const g=G;setTimeout(()=>{if(G===g&&state==='fly')toast(`Geisterflug: Rekord ${fmtT(g.ghost.t)} – schlag ihn!`,3500);},4800);}
  toast(air?'Im Anflug – viel Glück!':P.fixedGear?'Vollgas mit W – bei der blauen R-Marke ↓ ziehen':'Vollgas mit W – bei R ↓ ziehen, danach Fahrwerk einfahren (G)',4500);
}
function buildCockpit(model,P){
  const body=model.children[0],eye=model.userData.parts.eye,g=new THREE.Group();g.position.copy(eye);body.add(g);
  const small=P.cls==='small'||P.heli,jet=P.cls==='jet',cx=-eye.x,hw=small?(P.id==='titlis'?0.72:0.62):P.cls==='regional'?0.95:1.18;
  const dark=new THREE.MeshStandardMaterial({color:0x1b1d21,roughness:0.85}),panelM=new THREE.MeshStandardMaterial({color:jet?0x3b4048:0x2c2f34,roughness:0.7}),
    frameM=new THREE.MeshStandardMaterial({color:0x22252a,roughness:0.6}),metal=new THREE.MeshStandardMaterial({color:0x9097a0,roughness:0.35,metalness:0.7});
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  // Blendschutz und Instrumentenbrett
  add(new THREE.BoxGeometry(hw*2,0.07,0.55),dark,cx,-0.2,-0.88);
  add(new THREE.BoxGeometry(hw*2,0.62,0.05),panelM,cx,-0.55,-1.0,-0.2);
  const scr=(tex,w,h,x,y)=>{const m=add(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}),x,y,-0.968,-0.2);return m;};
  const pfd=new THREE.CanvasTexture(hud.pfdCanvas);pfd.colorSpace=THREE.SRGBColorSpace;
  const nd=new THREE.CanvasTexture($('mini'));nd.colorSpace=THREE.SRGBColorSpace;
  const ec=document.createElement('canvas');ec.width=256;ec.height=256;const et=new THREE.CanvasTexture(ec);et.colorSpace=THREE.SRGBColorSpace;
  if(jet){scr(pfd,0.24,0.2,0,-0.48);scr(nd,0.2,0.2,0.25,-0.48);scr(et,0.2,0.2,cx,-0.48);scr(nd,0.2,0.2,2*cx-0.25,-0.48);scr(pfd,0.24,0.2,2*cx,-0.48);}
  else{scr(pfd,0.3,0.22,0,-0.5);scr(nd,0.2,0.2,small?0.3:0.32,-0.5);scr(et,0.18,0.18,cx+(small?0.12:0),-0.5);}
  // Scheibenrahmen
  const post=(x,top)=>{const m=add(new THREE.BoxGeometry(0.028,0.6,0.03),frameM,x,0.08,-0.92,-0.55,0,0);if(top)m.rotation.z=top;return m;};
  if(!small||P.id==='titlis'){post(cx,0);}
  for(const s of [-1,1]){const pl=post(cx+s*hw*0.98,-s*0.42);pl.rotation.x=-0.45;
    add(new THREE.BoxGeometry(0.03,0.45,0.03),frameM,cx+s*hw*1.1,0.05,0.05);}
  add(new THREE.BoxGeometry(hw*2.1,0.04,0.3),frameM,cx,0.38,-0.62);
  // Titlis: lange Motorhaube vor der Scheibe (verdeckt auch den Spinner)
  if(P.id==='titlis'){const h=add(new THREE.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xeef0f2,roughness:0.35,metalness:0.1}),cx,-0.4,-2.62);h.scale.set(0.6,0.27,1.5);}
  // Mittelkonsole mit Hebeln
  const ped=add(new THREE.BoxGeometry(small?0.18:0.34,0.18,0.55),panelM,cx,-0.62,-0.55);
  const lev=(x,len,col)=>{const piv=new THREE.Group();piv.position.set(x,-0.53,-0.6);g.add(piv);const r=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,len,8),metal);r.position.y=len/2;piv.add(r);
    const k=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.035,0.035),new THREE.MeshStandardMaterial({color:col,roughness:0.5}));k.position.y=len;piv.add(k);return piv;};
  const thr=[];const ne=P.cls==='jet'&&['l340','l380','l747'].includes(P.id)?4:jet||P.id==='foehn'?2:1;for(let i=0;i<ne;i++)thr.push(lev(cx+(i-(ne-1)/2)*0.05,0.16,0x2a2a2a));
  const flapL=lev(cx+(small?0.07:0.14),0.11,0xdedede);
  const gearL=P.fixedGear?null:(()=>{const piv=new THREE.Group();piv.position.set(cx+0.06+(jet?0.05:0),-0.44,-0.98);g.add(piv);const r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.09,8),metal);r.position.y=0.045;piv.add(r);
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.02,16),new THREE.MeshStandardMaterial({color:0xdddddd}));wh.rotation.z=Math.PI/2;wh.position.y=0.095;piv.add(wh);return piv;})();
  // Sidestick (Jets) oder Steuerhorn
  const stick=new THREE.Group();g.add(stick);
  if(jet){stick.position.set(-0.32,-0.5,-0.38);const s1=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.13,10),dark);s1.position.y=0.065;stick.add(s1);const s2=new THREE.Mesh(new THREE.CapsuleGeometry(0.025,0.05,4,10),dark);s2.position.y=0.14;stick.add(s2);}
  else{stick.position.set(0,-0.42,-0.72);const col=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.25,8),metal);col.rotation.x=Math.PI/2;col.position.z=-0.12;stick.add(col);
    const yk=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.014,8,24,Math.PI),dark);yk.rotation.z=Math.PI;yk.position.y=0.03;stick.add(yk);}
  g.visible=false;g.userData={tex:pfd,nd,et,ec,thr,flapL,gearL,stick,jet,small};return g;
}
function updateCockpit(F){const u=G.cockpit.userData;u.tex.needsUpdate=true;u.nd.needsUpdate=true;
  for(const l of u.thr)l.rotation.x=-0.5+F.thr*1.0;u.flapL.rotation.x=0.2-F.flaps*0.25;if(u.gearL)u.gearL.rotation.x=F.gear?0.5:-0.5;
  u.stick.rotation.set(-F.elev*0.25*(u.jet?1:0),0,-F.ail*0.25);if(!u.jet)u.stick.position.z=-0.72+F.elev*0.06;
  if((G.t*8|0)!==u.lastE){u.lastE=G.t*8|0;const c=u.ec.getContext('2d'),W=256;c.fillStyle='#05080c';c.fillRect(0,0,W,W);c.font='bold 20px Inter,Arial';c.fillStyle='#7fe0ff';c.textAlign='left';
    c.fillText(F.P.prop?'TRIEBWERK':'N1 %',14,28);const ne=u.thr.length;for(let i=0;i<ne;i++){const x=20+i*(220/ne),w=220/ne-14;c.strokeStyle='#4a5560';c.strokeRect(x,40,w,120);const v=F.eng;c.fillStyle=v>0.95?'#ffcf3a':'#3ddc6a';c.fillRect(x+2,160-118*v,w-4,118*v);
      c.fillStyle='#fff';c.font='bold 18px Inter,Arial';c.textAlign='center';c.fillText(Math.round(v*100),x+w/2,182);}
    c.textAlign='left';c.fillStyle='#cfd8e3';c.font='bold 17px Inter,Arial';c.fillText('KLAPPEN '+F.P.flapNames[F.flaps],14,214);
    c.fillText('FAHRWERK '+(F.P.fixedGear?'FEST':F.gearPos>0.98?'AUS':F.gearPos<0.02?'EIN':'…'),14,240);c.fillStyle=F.gearPos>0.98?'#3ddc6a':'#ffcf3a';c.beginPath();c.arc(232,234,9,0,7);c.fill();u.et.needsUpdate=true;}}
// kurzer Leucht-Impuls beim Durchfliegen eines Rings
function ringPop(o){if(!o.mesh)return;const m=new THREE.Mesh(o.mesh.geometry,new THREE.MeshBasicMaterial({color:o.final?0x7fe3ff:0xffe08a,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  m.position.copy(o.mesh.position);m.quaternion.copy(o.mesh.quaternion);scene.add(m);(G.rfx=G.rfx||[]).push({m,t:0});}
function ringFx(dt){if(!G||!G.rfx||!G.rfx.length)return;for(const f of G.rfx){f.t+=dt;f.m.scale.setScalar(1+f.t*2.2);f.m.material.opacity=Math.max(0,0.9*(1-f.t/0.7));}
  G.rfx=G.rfx.filter(f=>{if(f.t<0.7)return true;scene.remove(f.m);f.m.material.dispose();return false;});}
function refreshRings(){PATH_U.uOi.value=G.oi;G.obj.forEach((o,i)=>{if(o.type!=='ring'||!o.mesh)return;if(i<G.oi){o.mesh.visible=false;return;}const m=o.mesh.material;m.opacity=i===G.oi?1:0.32;o.mesh.scale.setScalar(i===G.oi?1:0.9);const h=o.mesh.getObjectByName('halo');if(h)h.visible=i===G.oi;});}
function dropCrate(){
  if(G.P.amphib){dropWater();return;}
  const F=G.F;if(F.onGround||G.crates<=0){toast(G.crates<=0?'Keine Kisten an Bord':'Am Boden nicht möglich');return;}
  G.crates--;audio.click();
  const g=new THREE.Group();g.add(new THREE.Mesh(crateGeo,crateMat));const ch=new THREE.Mesh(chuteGeo,chuteMat);ch.position.y=7;ch.visible=false;g.add(ch);
  const lines=new THREE.Mesh(new THREE.ConeGeometry(4,6,8,1,true),new THREE.MeshBasicMaterial({color:0xdddddd,wireframe:true}));lines.position.y=3.8;lines.visible=false;g.add(lines);
  g.position.copy(F.pos).add(new THREE.Vector3(0,-F.P.bellyH-1.5,0));scene.add(g);G.dyn.push(g);
  G.boxes.push({g,ch,lines,v:F.vel.clone(),t:0,landed:false});
}
function crateStep(p,v,t,dt){const chute=t>0.9;v.y-=9.81*dt;if(chute){const k=Math.exp(-dt*1.1);v.x*=k;v.z*=k;v.y=-6+(v.y+6)*Math.exp(-dt*2.2);}else v.multiplyScalar(1-0.02*dt);p.addScaledVector(v,dt);}

// ---------- Bewertung ----------
function gradeLanding(ev,F){
  const A=ev.rw,P=F.P;const l=toLocal(A,ev.x,ev.z);const dir=new THREE.Vector3(A.sin,0,-A.cos);const s=F.vel.dot(dir)>=0?1:-1;
  const td=s>0?l.along+A.len/2:A.len/2-l.along;const aim=A.len>=2400?400:A.len>=1200?250:150;
  const lin=(v,g,b)=>clamp(1-(v-g)/(b-g),0,1);
  const sG={small:0.9,regional:1.0,jet:1.1}[P.cls],s1=lin(ev.sink,sG,P.ldgSink*1.25)*25;
  const s2=lin(Math.abs(l.across),A.w*0.08,A.w*0.42)*25;
  const s3=td<aim*0.4?clamp(td/(aim*0.4),0,1)*25:td<=aim*1.6?25:lin(td,aim*1.6,aim*3.2)*25;
  const [p0,p1]={small:[2,11],regional:[1.5,8],jet:[1.5,7.5]}[P.cls];const pp=ev.pitch<p0?lin(p0-ev.pitch,0,4):ev.pitch>p1?lin(ev.pitch-p1,0,4):1;
  const s4=lin(ev.bank,2,10)*15+pp*10;const tot=s1+s2+s3+s4;
  const letter=tot>=90?'S':tot>=76?'A':tot>=60?'B':tot>=45?'C':'D';
  return{ap:A,tot,letter,parts:[['Sinkrate',s1,ev.sink.toFixed(1)+' m/s'],['Mittellinie',s2,Math.abs(l.across).toFixed(1)+' m daneben'],['Aufsetzpunkt',s3,Math.round(td)+' m nach Schwelle'],['Fluglage',s4,`Neigung ${ev.bank.toFixed(0)}°, Nase ${ev.pitch.toFixed(0)}°`]]};
}

// ---------- Sonnen-Linsenreflex (nur bei sichtbarer Sonne) ----------
let FLARE=null;
function flareTex(kind){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  if(kind===0){g.addColorStop(0,'rgba(255,255,245,1)');g.addColorStop(0.12,'rgba(255,240,200,0.9)');g.addColorStop(0.4,'rgba(255,200,140,0.18)');g.addColorStop(1,'rgba(255,180,120,0)');}
  else if(kind===1){g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.72,'rgba(180,220,255,0.0)');g.addColorStop(0.86,'rgba(180,220,255,0.35)');g.addColorStop(1,'rgba(180,220,255,0)');}
  else{g.addColorStop(0,'rgba(255,230,190,0.5)');g.addColorStop(1,'rgba(255,230,190,0)');}
  x.fillStyle=g;x.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function flareTick(){if(!FLARE){const f=new Lensflare(),t0=flareTex(0),t1=flareTex(1),t2=flareTex(2);f.addElement(new LensflareElement(t0,520,0,new THREE.Color(1,0.95,0.85)));
    for(const [sz,d,col] of [[60,0.35,[0.6,0.8,1]],[110,0.55,[1,0.85,0.6]],[40,0.7,[0.7,1,0.8]],[160,0.95,[0.5,0.7,1]]])f.addElement(new LensflareElement(d===0.55||d===0.95?t1:t2,sz,d,new THREE.Color(...col)));
    FLARE=f;scene.add(f);}
  const vis=env.elev>-1&&(env.weather==='clear'||env.weather==='fair'||env.weather==='foehn')&&state!=='menu';FLARE.visible=vis;if(vis)FLARE.position.copy(cam.position).addScaledVector(env.sunDir,8000);}
// ---------- Kondensfahnen an den Flügelspitzen bei hoher Last oder feuchter Luft ----------
const VAP_N=48;
function vaporSetup(){const P=G.P;if(P.heli)return;const pl=G.model.userData.parts.lights;if(!pl)return;
  const tips=pl.pts.filter(q=>!q.beacon&&!q.strobe&&Math.abs(q.p[0])>P.wingTip*0.7).slice(0,2);if(tips.length<2)return;
  const mk=()=>{const g=new THREE.BufferGeometry(),pos=new Float32Array(VAP_N*2*3),al=new Float32Array(VAP_N*2),idx=[];for(let i=0;i<VAP_N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('al',new THREE.BufferAttribute(al,1));g.setIndex(idx);
    const m=new THREE.Mesh(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'attribute float al;varying float vA;void main(){vA=al;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying float vA;void main(){gl_FragColor=vec4(0.96,0.97,1.0,vA);}'}));
    m.frustumCulled=false;scene.add(m);G.dyn.push(m);return m;};
  G.vap={tips:tips.map(q=>new THREE.Vector3(...q.p)),m:[mk(),mk()],hist:[[],[]],acc:0,n:1,pv:G.F.vel.clone(),w:P.prop?0.12:0.3};}
const _vv=new THREE.Vector3(),_vu=new THREE.Vector3(),_vc=new THREE.Vector3();
function vaporTick(dt){const V=G.vap;if(!V||dt<=0)return;const F=G.F,body=G.model.children[0];
  // Lastvielfaches aus der Beschleunigung (spezifische Kraft entlang der Hochachse)
  _vv.copy(F.vel).sub(V.pv).divideScalar(Math.max(dt,1e-3));V.pv.copy(F.vel);_vv.y+=9.81;_vu.set(0,1,0).applyQuaternion(F.q);const n=F.onGround?1:_vv.dot(_vu)/9.81;V.n+=(n-V.n)*Math.min(1,dt*6);
  const wet=['rain','fog','cloudy','storm','snow'].includes(env.weather),thr=wet?1.25:1.75,k=F.onGround||F.crashed?0:clamp((V.n-thr)/0.9,0,1)*(F.vel.length()>45?1:0);
  V.acc+=dt;if(V.acc>=1/40){V.acc=0;G.model.updateMatrixWorld(true);for(let w=0;w<2;w++){const h=V.hist[w];h.unshift({p:body.localToWorld(V.tips[w].clone()),k,t:0});if(h.length>VAP_N)h.pop();}}
  for(let w=0;w<2;w++){const h=V.hist[w],m=V.m[w],pos=m.geometry.attributes.position.array,al=m.geometry.attributes.al.array;let any=false;
    for(let i=0;i<VAP_N;i++){const q=h[Math.min(i,h.length-1)];if(!q){al[i*2]=al[i*2+1]=0;continue;}q.t+=i<h.length?dt:0;const nx=h[Math.min(i+1,h.length-1)],pr=h[Math.min(Math.max(i-1,0),h.length-1)];
      _vv.copy(pr.p).sub(nx.p);_vc.copy(q.p).sub(cam.position);_vu.crossVectors(_vv,_vc).normalize().multiplyScalar(V.w*(1+i*0.035));
      pos[i*6]=q.p.x+_vu.x;pos[i*6+1]=q.p.y+_vu.y;pos[i*6+2]=q.p.z+_vu.z;pos[i*6+3]=q.p.x-_vu.x;pos[i*6+4]=q.p.y-_vu.y;pos[i*6+5]=q.p.z-_vu.z;
      const a=i<h.length?q.k*0.32*Math.pow(1-i/VAP_N,1.5)*Math.min(1,i/2):0;al[i*2]=al[i*2+1]=a;if(a>0.01)any=true;}
    m.visible=any;if(any){m.geometry.attributes.position.needsUpdate=true;m.geometry.attributes.al.needsUpdate=true;}}}

// ---------- Aufsetzen: Bewertung, Reifenqualm, Kamerastoss ----------
let PUFF_T=null;const puffTex=()=>PUFF_T||(PUFF_T=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.5,'rgba(235,235,235,0.45)');g.addColorStop(1,'rgba(220,220,220,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})());
function touchFx(F,ev){const P=F.P,sink=ev.sink,lim=P.ldgSink||2.5;
  G.shake=Math.max(G.shake||0,clamp(0.12+sink/lim*0.5,0.1,1.4));
  // Bewertung als grosser Schriftzug
  const [t,c]=sink<0.6?['BUTTERWEICH','g1']:sink<1.2?['SANFT','g1']:sink<lim*0.85?['SAUBER','g2']:sink<lim*1.3?['HART','g3']:['SEHR HART','g4'];
  const el=$('tdb');if(el){el.className='';void el.offsetWidth;el.classList.add('on',c);setTxt('tdbT',ev.heli?t.replace('BUTTERWEICH','SAMTWEICH'):t);
    setTxt('tdbS',`Sinkrate ${sink.toFixed(1)} m/s${G.tdLetter&&!ev.heli?' · Note '+G.tdLetter:''}${ev.grass?' · Gras':''}`);G.tdbUntil=G.t+3;}
  G.tdLetter=null;
  // Reifenqualm an den Hauptfahrwerksrädern (nicht auf Gras/Wasser, nicht beim Heli)
  if(ev.grass||ev.heli)return;const ws=G.model.userData.parts.wheels||[];if(!ws.length)return;
  const v=new THREE.Vector3(),pos=ws.map(w=>w.getWorldPosition(new THREE.Vector3())).sort((a,b)=>a.y-b.y);const lowY=pos[0].y,main=pos.filter(q=>q.y<lowY+0.6);
  const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(F.q),mains=main.filter(q=>q.clone().sub(F.pos).dot(fwd)>-60&&q.clone().sub(F.pos).dot(fwd)<P.wingTip*0.5+3);
  const use=(mains.length?mains:main).slice(0,6),n=clamp(Math.round(2+F.vel.length()/25),2,6),sz=clamp(P.wingTip*0.14,1.2,6);
  for(const q of use)for(let i=0;i<n;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex(),transparent:true,depthWrite:false,opacity:0.75,color:0xf0f0ee,fog:true}));
    m.position.copy(q).add(new THREE.Vector3((Math.random()-0.5)*0.8,0.2+Math.random()*0.4,(Math.random()-0.5)*0.8));m.scale.setScalar(sz*(0.6+Math.random()*0.5));scene.add(m);G.dyn.push(m);
    (G.puffs=G.puffs||[]).push({m,t:-i*0.05,v:F.vel.clone().multiplyScalar(0.18+Math.random()*0.12).add(new THREE.Vector3(0,0.6+Math.random(),0)),s0:m.scale.x});}}
function puffTick(dt){if(!G.puffs||!G.puffs.length)return;for(let i=G.puffs.length-1;i>=0;i--){const p=G.puffs[i];p.t+=dt;if(p.t<0){p.m.visible=false;continue;}p.m.visible=true;
  p.m.position.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.exp(-dt*1.6));const k=p.t/2.2;p.m.scale.setScalar(p.s0*(1+p.t*2.6));p.m.material.opacity=Math.max(0,0.75*(1-k));
  if(k>=1){scene.remove(p.m);p.m.material.dispose();G.puffs.splice(i,1);}}}
function applyShake(dt){const F=G.F;let a=G.shake||0;if(a>0.005){G.shake=a*Math.exp(-dt*5);}else G.shake=0;
  const roll=F.onGround&&!F.crashed?clamp(F.vel.length()/90,0,1)*0.03:0;a=a+roll;if(a<0.003)return;const t=performance.now()*0.001,k=G.cam===1?0.35:1;
  cam.position.y+=Math.sin(t*61)*a*0.35*k;cam.position.x+=Math.sin(t*47+1)*a*0.18*k;cam.rotateZ(Math.sin(t*53)*a*0.012);cam.rotateX(Math.sin(t*67)*a*0.01);}

// ---------- Kontaktschatten: Silhouette des Flugzeugs senkrecht auf den Boden, scharf und dunkel kurz vor dem Aufsetzen ----------
function makeContactShadow(model){
  const rt=new THREE.WebGLRenderTarget(256,256,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter});
  const sp=model.position.clone(),sq=model.quaternion.clone(),par=model.parent;model.position.set(0,0,0);model.quaternion.identity();model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),hw=Math.max(Math.abs(box.min.x),Math.abs(box.max.x),1)*1.1,hl=Math.max(Math.abs(box.min.z),Math.abs(box.max.z),1)*1.1;
  const sc=new THREE.Scene();sc.add(model);sc.overrideMaterial=new THREE.MeshBasicMaterial({color:0x000000});
  const oc=new THREE.OrthographicCamera(-hw,hw,hl,-hl,0.1,2000);oc.position.set(0,box.max.y+50,0);oc.up.set(0,0,-1);oc.lookAt(0,0,0);
  const prev=renderer.getRenderTarget(),cc=new THREE.Color();renderer.getClearColor(cc);const ca=renderer.getClearAlpha();
  renderer.setRenderTarget(rt);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(sc,oc);renderer.setRenderTarget(prev);renderer.setClearColor(cc,ca);
  sc.remove(model);if(par)par.add(model);model.position.copy(sp);model.quaternion.copy(sq);
  const mat=new THREE.ShaderMaterial({uniforms:{map:{value:rt.texture},uA:{value:0},uB:{value:0}},transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform sampler2D map;uniform float uA,uB;varying vec2 vUv;void main(){float s=texture2D(map,vUv,uB).a;vec2 d=(vUv-0.5)*2.0;float blob=(1.0-smoothstep(0.2,1.0,length(d)))*0.6;gl_FragColor=vec4(0.0,0.0,0.0,mix(s,blob,clamp(uB/6.0,0.0,0.8))*uA);}'});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(hw*2,hl*2).rotateX(-Math.PI/2),mat);m.renderOrder=1;m.frustumCulled=false;m.userData={rt,span:hw*2};return m;}
const _ce=new THREE.Euler();
function contactShadowTick(F,P){const m=G.cshadow;if(!m)return;const gy=S.groundAt(F.pos.x,F.pos.z),agl=F.pos.y-gy-P.gearH*(F.onGround?1:0);
  const span=m.userData.span,k=clamp(1-agl/(span*1.4+20),0,1),day=1-env.night;
  m.visible=k>0.01&&!F.crashed&&G.model.visible;if(!m.visible)return;
  _ce.setFromQuaternion(F.q,'YXZ');m.position.set(F.pos.x,gy+0.22,F.pos.z);m.rotation.set(0,_ce.y,0);
  m.material.uniforms.uA.value=Math.pow(k,1.3)*(0.42+0.18*env.night)*(P.heli?0.9:1);m.material.uniforms.uB.value=clamp(agl/span*7,0,6);}

// ---------- Bodennähe beim Landen: Balken, Trend, Zeit bis zum Aufsetzen, Abfang-Hinweis ----------
function groundCue(F,P,agl,dt){const el=$('gnd');if(!el)return;if(G.tdbUntil!=null&&G.t>G.tdbUntil){G.tdbUntil=null;$('tdb').classList.remove('on');}const range=P.heli?25:P.cls==='small'?30:50,vs=F.vel.y,down=P.fixedGear||P.heli||F.gearPos>0.5;
  const C=G.gc||(G.gc={on:el.classList.contains('on'),fl:$('flare').classList.contains('on')?1:0,last:0});
  const show=!F.onGround&&!F.crashed&&agl<range*1.25&&agl>-1&&down&&vs<1.5&&(F.airTime||0)>3;
  if(show!==C.on){C.on=show;el.classList.toggle('on',show);}
  if(!show){if(C.fl){C.fl=0;$('flare').classList.remove('on');}return;}
  const k=clamp(agl/range,0,1),sink=Math.max(0,-vs),lim=P.ldgSink||2.5,cls=sink>lim?'red':sink>lim*0.7?'amber':'';
  if(cls!==C.cls){el.classList.remove('red','amber');if(cls)el.classList.add(cls);C.cls=cls;}
  $('gplane').style.bottom=(k*100)+'%';const k3=clamp((agl+vs*3)/range,0,1);const lo=Math.min(k,k3),hi=Math.max(k,k3);setSty('gtrend','bottom',(lo*100)+'%');setSty('gtrend','height',((hi-lo)*100)+'%');
  setTxt('gval',(save.settings.units==='metric'?Math.max(0,Math.round(agl)):Math.max(0,Math.round(agl*3.281)))+(save.settings.units==='metric'?' m':' ft'));
  setTxt('gtime',sink>0.3?`Boden in ${Math.max(0,agl/sink).toFixed(1)} s`:'hält Höhe');
  // Abfangen: knapp über dem Boden noch zu schnell sinkend
  const fh=P.heli?3:P.cls==='small'?5:P.cls==='regional'?8:11,need=agl<fh&&sink>lim*0.75&&!P.heli;
  if(need&&!C.fl){C.fl=1;$('flare').classList.add('on');if(G.t-C.last>6){C.last=G.t;audio.click&&audio.click();}}else if(!need&&C.fl&&(agl>fh*1.6||sink<lim*0.5)){C.fl=0;$('flare').classList.remove('on');}}

// ---------- Simulation ----------
function step(dt){
  const F=G.F;G.t+=dt;
  if(G.t>=G.ghN&&!F.crashed&&G.gh.length<28000){G.ghN+=0.25;const q=F.q;G.gh.push(Math.round(F.pos.x*10)/10,Math.round(F.pos.y*10)/10,Math.round(F.pos.z*10)/10,Math.round(q.x*1e3)/1e3,Math.round(q.y*1e3)/1e3,Math.round(q.z*1e3)/1e3,Math.round(q.w*1e3)/1e3);}
  if(G.ghost){const d=G.ghost.d,n=d.length/7,f=Math.min(n-1.001,G.t/0.25),i=Math.floor(f),u=f-i,a=i*7,b=a+7,m=G.ghost.m;m.visible=G.t/0.25<n-1;
    m.position.set(d[a]+(d[b]-d[a])*u,d[a+1]+(d[b+1]-d[a+1])*u,d[a+2]+(d[b+2]-d[a+2])*u);_gq1.set(d[a+3],d[a+4],d[a+5],d[a+6]).normalize();_gq2.set(d[b+3],d[b+4],d[b+5],d[b+6]).normalize();m.quaternion.slerpQuaternions(_gq1,_gq2,u);}
  const inv=save.settings.invert?-1:1;
  const ctl={pitch:((K.has('ArrowDown')?1:0)-(K.has('ArrowUp')?1:0))*inv,roll:((K.has('ArrowLeft')||K.has('KeyA'))?1:0)-((K.has('ArrowRight')||K.has('KeyD'))?1:0),yaw:(K.has('KeyQ')?1:0)-(K.has('KeyE')?1:0)};
  const gp=pad.connected&&state!=='map';let gpYawL=false,gpYawR=false,thrUp=K.has('KeyW')?1:0,thrDn=K.has('KeyS')?1:0;
  if(gp){const sp=parseFloat(save.settings.padSensS||1),cv=v=>Math.sign(v)*Math.pow(Math.abs(v),1.5)*sp;
    if(Math.abs(pad.ly)>Math.abs(ctl.pitch))ctl.pitch=clamp(cv(pad.ly),-1,1)*inv;if(Math.abs(pad.lx)>Math.abs(ctl.roll))ctl.roll=clamp(-cv(pad.lx),-1,1);
    gpYawL=pad.down.has(BTN.L1);gpYawR=pad.down.has(BTN.R1);if(gpYawL||gpYawR)ctl.yaw=(gpYawL?1:0)-(gpYawR?1:0);
    thrUp=Math.max(thrUp,pad.r2>0.06?pad.r2:0);thrDn=Math.max(thrDn,pad.l2>0.06?pad.l2:0);
    if(G.cam!==2&&(Math.abs(pad.rx)>0||Math.abs(pad.ry)>0)){G.look.x-=pad.rx*dt*2.2;G.look.y=clamp(G.look.y+pad.ry*dt*1.6,-1.2,1.3);lastDrag=performance.now();}}
  if(TOUCH.on){if(Math.abs(TOUCH.y)>Math.abs(ctl.pitch))ctl.pitch=TOUCH.y*inv;if(Math.abs(TOUCH.x)>Math.abs(ctl.roll))ctl.roll=-TOUCH.x;if(TOUCH.yaw)ctl.yaw=TOUCH.yaw;}
  if(G.ap){
    if(Math.abs(ctl.pitch)>0.15||Math.abs(ctl.roll)>0.15){G.ap=null;toast('Autopilot AUS (Steuereingabe)');}
    else{const A=G.ap,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),hdg=((-e.y/DEG)%360+360)%360;
      if(thrUp)A.spd+=dt*6*thrUp;if(thrDn)A.spd=Math.max(stallSpeed(F)*1.3,A.spd-dt*6*thrDn);
      if(K.has('KeyQ')||gpYawL){A.hdg=(A.hdg-dt*15+360)%360;A.nav=false;}if(K.has('KeyE')||gpYawR){A.hdg=(A.hdg+dt*15)%360;A.nav=false;}
      if(A.nav&&G.wp)A.hdg=wpBrg(F);
      if(A.max)A.spd=apMaxSpd(F,F.P);A.ff=0;
      if(G.appr&&G.apprG){const g=G.apprG,pts=G.appr.pts,la=pts[Math.min(pts.length-1,g.bi+Math.ceil(Math.max(600,G.appr.R*0.7)/40))];A.hdg=((Math.atan2(la.x-F.pos.x,-(la.z-F.pos.z))/DEG)+360)%360;
        const pa=pts[Math.min(pts.length-1,g.bi+8)],pb=pts[g.bi];A.alt=g.p.y;A.ff=Math.atan2(pa.y-pb.y,Math.max(1,pa.s-pb.s));
        if(g.phase!=='route')A.spd=Math.min(A.spd,F.P.Vref*(g.phase==='final'?1.3:1.45));
        else if(G.appr.iTOD>=0&&g.bi>=G.appr.iTOD)A.spd=Math.min(A.spd,Math.max(F.P.Vref*1.6,apMaxSpd(F,F.P)*0.82));
        if(g.phase==='final'&&F.pos.y-S.groundAt(F.pos.x,F.pos.z)<110){G.ap=null;toast('Autopilot AUS – jetzt von Hand landen',3500);}}
      const err=((A.hdg-hdg+540)%360)-180,mb=Math.min(25,F.P.maxBank||30)*DEG,want=clamp(-err*DEG*1.4,-mb,mb);
      ctl.roll=clamp((want-(F.bank||0))/(8*DEG),-1,1)*0.7;ctl.yaw=0;
      F.gammaT=clamp((A.ff||0)+clamp((A.alt-F.pos.y)*0.0016,-2.5*DEG,2.5*DEG),-5*DEG,5*DEG);
      F.thr=clamp(F.thr+clamp((A.spd-F.vel.length())*0.03,-1,1)*dt*0.5,0,1);}
  }
  if(!G.ap&&thrUp)F.thr=Math.min(1,F.thr+dt*0.6*thrUp);
  if(!G.ap&&thrDn)F.thr=Math.max(0,F.thr-dt*0.6*thrDn);
  F.brake=K.has('KeyB')||(gp&&pad.down.has(BTN.X));
  // Wind & Turbulenz
  {const agl0=F.pos.y-S.groundAt(F.pos.x,F.pos.z);WF.wind=wx.update(dt,agl0);wx.kick(F,dt);if(G.therm){G.lift=thermalLift(F.pos.x,F.pos.y,F.pos.z,agl0);WF.wind.y+=G.lift;}}
  const wasGround=F.onGround;
  if(G.push)pushTick(F,dt);else if(F.P.heli){ctl.coll=thrUp-thrDn;const n=Math.ceil(dt/(1/120));for(let i=0;i<n;i++)stepHeli(F,ctl,dt/n,WF);}else{const n=Math.ceil(dt/(1/120));for(let i=0;i<n;i++)stepFlight(F,ctl,dt/n,WF);}
  // Kisten
  for(const b of G.boxes){if(b.landed){b.t+=dt;if(b.t>12)b.g.visible=false;continue;}b.t+=dt;crateStep(b.g.position,b.v,b.t,dt);const chute=b.t>0.9;b.ch.visible=b.lines.visible=chute;
    const gh=S.groundAt(b.g.position.x,b.g.position.z);if(b.g.position.y<=gh+0.7){b.landed=true;b.t=0;b.g.position.y=gh+0.7;b.ch.visible=b.lines.visible=false;
      const o=G.obj[G.oi];if(o&&o.type==='drop'){const d=Math.hypot(b.g.position.x-o.x,b.g.position.z-o.z);if(d<o.r){if(d<10)award('treffer');toast(`Treffer bei ${o.name}! ${Math.round(d)} m vom Ziel`);audio.chime();o.ringMesh.material.color.set(0x3ddc6a);G.oi++;refreshRings();}else toast(`Daneben – ${Math.round(d)} m vom Ziel`);}}}
  const o=G.obj[G.oi];
  if(o&&o.type==='drop'&&G.crates===0&&G.boxes.every(b=>b.landed)&&!G.done)return finish(false,'Keine Kisten mehr an Bord.');
  // Ereignisse
  for(const ev of F.events){
    if(ev.type==='liftoff'&&!G.liftMsg){G.liftMsg=true;toast(F.P.fixedGear?'Abgehoben! Klappen einfahren mit V':'Abgehoben! Fahrwerk einfahren mit G');}
    if(ev.type==='liftoff')atc.event('liftoff');
    if(ev.type==='touchdown'){pad.rumble(Math.min(1,0.25+ev.sink*0.18),0.5,180+ev.sink*60);atc.event('touchdown',{ap:ev.rw||WF.airportZone(F.pos.x,F.pos.z)});if(G.mission&&G.mission.comfort&&ev.sink>2.2)G.comfort-=Math.min(30,(ev.sink-2.2)*15);audio.touch(ev.sink);if(ev.heli){const gr=heliGrade(ev);G.lastTouch=gr;toast(`Landung ${gr.letter} · Sinkrate ${ev.sink.toFixed(1)} m/s`,2600);}else if(ev.rw){const gr=gradeLanding(ev,F);G.lastTouch=gr;G.tdLetter=gr.letter;}}
    if(ev.type==='touchdown'&&!ev.water)touchFx(F,ev);
    if(ev.type==='touchdown'&&ev.water){audio.splash(1.5);G.waterTouch=ev.sink;}
    if(ev.type==='touchdown'){const so=G.obj[G.oi];if(so&&so.type==='spot'&&(ev.rw===so.ap)){const al=toLocal(so.ap,ev.x,ev.z).along,d=Math.abs(al-(-so.ap.len/2+so.tgt));(G.spots=G.spots||[]).push(d);G.oi++;audio.chime();toast(`Ziellandung ${so.k}/${so.n}: ${d.toFixed(1)} m neben der Linie${so.k<so.n?' – Vollgas und durchstarten!':''}`,3200);}}
    if(ev.type==='outlanding'){audio.touch(ev.sink||1);toast('Aussenlandung geglückt!',3000);}
    if(ev.type==='crash'){audio.crash();pad.rumble(1,1,900);boom(F.pos);G.model.visible=false;{const g=G;setTimeout(()=>{if(G===g&&!g.done&&state!=='replay')finish(false,ev.reason);},2600);}}
  }
  F.events.length=0;
  if(F.crashed)return;
  if(attr&&!G.lesson){const c=attr.collect(F.pos);if(c){save.edelweiss=c.ids.filter(i=>i<EWZ);save.edelweissBO=c.ids.filter(i=>i>=EWZ&&i<EWC).map(i=>i-EWZ);save.edelweissCH=c.ids.filter(i=>i>=EWC).map(i=>i-EWC);persist();audio.chime();pad.rumble(0.2,0.6,200);toast(`Goldenes Edelweiss «${c.name}» gefunden! ${c.count} / ${c.total}`,3500);if(c.count>=10)award('sammler');if(c.count>=c.total)award('edel');}
    const ha=attr.hit(F.pos);if(ha){F.crashed=true;audio.crash();pad.rumble(1,1,900);boom(F.pos);G.model.visible=false;const g=G;setTimeout(()=>{if(G===g&&!g.done)finish(false,'Zusammenstoss mit '+ha+'!');},2600);return;}}
  {const hitAI=traffic&&traffic.hit(F);if(hitAI){F.crashed=true;audio.crash();pad.rumble(1,1,900);boom(F.pos);G.model.visible=false;{const g=G;setTimeout(()=>{if(G===g&&!g.done)finish(false,'Zusammenstoss mit '+hitAI.cs+'!');},2600);}return;}}
  atc.update(dt,atcCtx());
  if(F.onGround&&F.vel.length()<1&&!G.stopMsg&&G.t>5){G.stopMsg=true;atc.event('stopped');}else if(!F.onGround)G.stopMsg=false;
  if(G.mission&&G.mission.comfort&&!F.onGround){const bank=Math.abs(F.bank||0)/DEG,vs=F.vel.y;let d=0;if(bank>32)d+=(bank-32)*0.12;if(vs<-9)d+=(-9-vs)*0.25;if(vs>12)d+=(vs-12)*0.2;
    const e2=new THREE.Euler().setFromQuaternion(F.q,'YXZ');if(Math.abs(e2.x/DEG)>18)d+=(Math.abs(e2.x/DEG)-18)*0.2;const dv=(F.vel.y-(G.lvy??F.vel.y))/dt;G.lvy=F.vel.y;if(Math.abs(dv)>5)d+=(Math.abs(dv)-5)*0.08;
    if(d>0){G.comfort=Math.max(0,G.comfort-d*dt);if(d>1.5&&G.t-(G.cMsg||0)>8){G.cMsg=G.t;toast('Die Passagiere werden unruhig …',1800);}}}
  G.recT+=dt;if(G.recT>=0.1&&G.rec.length<9000){G.recT=0;G.rec.push([F.pos.x,F.pos.y,F.pos.z,F.q.x,F.q.y,F.q.z,F.q.w,F.flapPos,F.gearPos,F.eng,F.onGround?F.vel.length():0,F.ail,F.elev,F.rud]);}
  if(G.lesson&&!G.done){const r=tutorTick(G.lesson,G.tut,tutCtx(F),dt);if(r.stepDone&&!r.done){audio.chime();toast('✓ Gut gemacht!',1600);}if(r.done){audio.chime();return finishLesson();}}
  if(G.P.glider){F.thr=0;F.eng=0;if(!F.onGround&&G.t-(G.varT||0)>0.45){G.varT=G.t;audio.vario(F.vel.y);}}
  emergTick(F);stage3Tick(F,dt);calloutTick(F,dt);if(F.P.heli)regaTick(F,dt);
  // Ziele
  if(o){
    if(o.type==='ring'){const d=Math.hypot(F.pos.x-o.x,F.pos.y-o.y,F.pos.z-o.z);if(d<o.r+5){audio.chime();ringPop(o);G.oi++;refreshRings();const left=G.obj.slice(G.oi).filter(x=>x.type==='ring').length;toast(left?`Ring geschafft – noch ${left}`:'Alle Ringe geschafft!');}}
    else if(o.type==='taxi'&&F.onGround&&Math.hypot(F.pos.x-o.x,F.pos.z-o.z)<o.r){G.oi++;audio.chime();toast('Rollhalt erreicht – auf die Piste rollen, ausrichten und starten (T: Startfreigabe).',4500);if(G.taxiDots)G.taxiDots.visible=false;}
    else if(o.type==='wland'&&F.water&&F.vel.length()<3&&Math.hypot(F.pos.x-o.x,F.pos.z-o.z)<o.r){G.oi++;audio.chime();toast('Wasserlandung geglückt!',2500);}
    else if(o.type==='land'&&F.onGround&&F.vel.length()<2.5){const z=WF.airportZone(F.pos.x,F.pos.z);
      if(z===o.ap&&G.lastTouch&&G.lastTouch.ap===o.ap)G.oi++;else if(z&&z!==o.ap&&G.t-(G.wrongT||0)>8){G.wrongT=G.t;toast(`Falscher Flugplatz – Ziel ist ${o.ap.name}`);}}
    if(G.oi>=G.obj.length&&G.obj.length&&G.mission)finish(true);
  }
  if(G.t%2<dt)G.trail.push([F.pos.x,F.pos.z]);
}
function boom(p){const m=new THREE.Mesh(new THREE.SphereGeometry(6,20,14),new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:1,toneMapped:false}));m.position.copy(p);scene.add(m);G.dyn.push(m);
  const sm=new THREE.Mesh(new THREE.SphereGeometry(6,16,10),new THREE.MeshStandardMaterial({color:0x2a2a2a,transparent:true,opacity:0.8,depthWrite:false}));sm.position.copy(p);scene.add(sm);G.dyn.push(sm);G.fx.push({m,sm,t:0});}

// ---------- Kamera ----------
function updateCam(dt){
  const F=G.F,P=G.P,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');
  if(performance.now()-lastDrag>2500&&!drag&&G.cam!==1){G.look.x*=Math.exp(-dt*1.2);G.look.y*=Math.exp(-dt*1.2);}
  G.cockpit.visible=G.cam===1&&!F.crashed;
  if(G.cam===1&&!F.crashed){
    const body=G.model.children[0];const p=G.model.userData.parts.eye.clone().add(body.position).applyQuaternion(F.q).add(F.pos);
    cam.position.copy(p);cam.quaternion.copy(F.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(clamp(G.look.y*-1,-1.2,1.2)*0.8-0.06,G.look.x,0,'YXZ')));
    cam.near=0.2;cam.fov=68;cam.updateProjectionMatrix();applyShake(dt);return;}
  cam.near=1;
  if(G.cam===2){
    const v=F.vel.length();
    if(!G.flyby||G.flyby.distanceTo(F.pos)>Math.max(700,v*9)||G.camSnap){
      const dir=v>3?F.vel.clone().normalize():new THREE.Vector3(0,0,-1).applyQuaternion(F.q);const side=new THREE.Vector3(-dir.z,0,dir.x).normalize();
      G.flyby=F.pos.clone().addScaledVector(dir,Math.max(150,v*5)).addScaledVector(side,P.wingTip*3+15).add(new THREE.Vector3(0,P.wingTip*0.6+4,0));
      const gh=S.groundAt(G.flyby.x,G.flyby.z)+3;if(G.flyby.y<gh)G.flyby.y=gh;
      if(!rpClear(G.flyby,F.pos)){G.flyby.addScaledVector(side,-2*(P.wingTip*3+15));G.flyby.y=Math.max(G.flyby.y,S.groundAt(G.flyby.x,G.flyby.z)+3);if(!rpClear(G.flyby,F.pos))G.flyby.y+=25;}G.camSnap=false;}
    cam.position.copy(G.flyby);cam.up.set(0,1,0);cam.lookAt(F.pos);const d=cam.position.distanceTo(F.pos);cam.fov=clamp(2*Math.atan(P.wingTip*3.2/d)/DEG,8,60);cam.updateProjectionMatrix();return;}
  const far=G.cam===3;const dist=P.camDist*(far?2.6:1)*G.zoom;
  // weich nachgeführte Kamera: Gier- und Nickwinkel mit leichter Verzögerung
  const k=1-Math.exp(-dt*(F.onGround?6:3.2));if(G.camSnap||G.cYaw===undefined){G.cYaw=e.y;G.cPit=e.x;}
  let dy=e.y-G.cYaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));G.cYaw+=dy*k;G.cPit+=(e.x-G.cPit)*k;
  const yaw=G.cYaw+G.look.x,pc=0.16+G.look.y*0.9+(F.onGround?0:G.cPit*0.35);
  const target=F.pos.clone().add(new THREE.Vector3(0,P.camH*0.25,0));
  const d=new THREE.Vector3(Math.sin(yaw)*Math.cos(pc),Math.sin(pc),Math.cos(yaw)*Math.cos(pc)).multiplyScalar(dist);
  const want=target.clone().add(d);const gh=S.groundAt(want.x,want.z)+2;if(want.y<gh)want.y=gh;
  if(G.camSnap){G.camPos.copy(want);G.camSnap=false;}else G.camPos.lerp(want,1-Math.exp(-dt*9));
  cam.position.copy(G.camPos);cam.up.set(0,1,0);cam.lookAt(target);const fv=(far?50:60)+clamp((F.vel.length()-40)/120,0,1)*6;cam.fov+=(fv-cam.fov)*Math.min(1,dt*2);cam.updateProjectionMatrix();applyShake(dt);
}
// Kino-Hintergrund im Menü: langsame Kamerafahrten über Postkarten-Ansichten mit Überblendung
const MSH={i:-1,t0:0,list:null};
function menuShots(){const pk=n=>PEAKS.find(p=>p.name===n),lk=n=>LAKES.find(l=>l.name===n),L=[];
  const sh=(a,b,la,lb,hour,dur,wx)=>{const fix=v=>{const g=Math.max(S.groundAt(v[0],v[2]),0);return[v[0],Math.max(v[1],g+90),v[2]];};
    const m=[(a[0]+b[0])/2,Math.max(a[1],b[1]),(a[2]+b[2])/2];const gm=S.groundAt(m[0],m[2])+90;if(gm>a[1]){a[1]=Math.max(a[1],gm);b[1]=Math.max(b[1],gm);}
    L.push({a:fix(a),b:fix(b),la,lb:lb||la,hour,dur:dur||15,wx:wx||'fair'});};
  const O=(ar,v)=>{const p=oldXZ(ar,v[0],v[2]);return[p.x,v[1],p.z];},Z=v=>O('zs',v),B=v=>O('bo',v);
  {const pil=pk('Pilatus'),vw=lk('Vierwaldstättersee'),zs=lk('Zürichsee'),ur=pk('Uri-Rotstock');
    L.push({apron:true,hour:20.0,dur:14});
    if(pil&&vw){const y=vw.level+150;sh(Z([-3400,y,19200]),Z([-5400,y+50,20100]),[pil.x,pil.h-450,pil.z],null,10.2,16);}
    if(vw)sh(Z([7300,vw.level+520,20600]),Z([7900,vw.level+600,22300]),Z([9600,1350,36000]),null,17.6,16);
    if(zs)sh(Z([6900,zs.level+420,-11800]),Z([5900,zs.level+400,-13600]),Z([3154,430,-19659]),null,18.9,15);}
  {const mo=pk('Mönch'),ei=pk('Eiger'),ju=pk('Jungfrau'),th=lk('Thunersee'),br=lk('Brienzersee');
    if(mo&&ei)sh(B([2600,2500,-5200]),B([4000,2560,-4700]),[ei.x-400,ei.h-700,ei.z+600],[mo.x,mo.h-600,mo.z],18.3,16);
    if(th&&ei)sh([th.cx-6500,th.level+260,th.cz-3200],[th.cx-4600,th.level+280,th.cz-2300],[ei.x,ei.h-900,ei.z],null,19.7,16);
    if(ju)sh(B([1500,1750,-2600]),B([1900,1800,-1300]),[ju.x,ju.h-800,ju.z],null,16.4,15);
    if(br)sh(B([13600,br.level+800,-18200]),B([12100,br.level+820,-17200]),B([-1300,700,-9557]),null,11.0,15);}
  const out=L.filter(Boolean);if(!out.length)out.push({apron:true,hour:19.9,dur:14});return out;}
function menuCam(t){
  const on=!!(showroomOn()&&SHOW.m);if(SHOW.m)SHOW.m.visible=on;
  if(on!==SHOW.on){SHOW.on=on;if(on)env.setTime(16.3,'fair');else MSH.i=-1;if(!on)cam.clearViewOffset();}
  if(on){const c=SHOW.c,r=SHOW.r,a=t*0.11+0.5,d=Math.max(13,r*2.1);cam.near=0.5;cam.fov=40;setMFade(0);
    const x=c.x+Math.cos(a)*d,z=c.z+Math.sin(a)*d;cam.position.set(x,Math.max(c.y+r*0.32,S.groundAt(x,z)+1.8),z);cam.lookAt(c.x,c.y-r*0.05,c.z);
    const W=innerWidth,H=innerHeight,off=W>900?Math.min(260,W*0.19):0;cam.setViewOffset(W,H,-off,0,W,H);cam.updateProjectionMatrix();return;}
  if(!MSH.list)MSH.list=menuShots();const Ls=MSH.list;
  let fresh=false;if(MSH.i<0||t-MSH.t0>Ls[MSH.i].dur){MSH.i=(MSH.i+1)%Ls.length;MSH.t0=t;fresh=true;env.setTime(Ls[MSH.i].hour,Ls[MSH.i].wx||'fair');}
  const sh=Ls[MSH.i],el=t-MSH.t0;setMFade(Ls.length>1?Math.max(0,1-el/1.1,(el-(sh.dur-1.1))/1.1):0);
  const W=innerWidth,H=innerHeight,off=W>900?Math.min(230,W*0.17):0;
  if(sh.apron){if(!ZS){const A=MAIN_AP,p=fromLocal(A,-A.len*0.18+el*1.2,A.side*(A.flatW-25)),l=fromLocal(A,A.len*0.35,-A.side*600);cam.near=1;cam.fov=50;
      cam.position.set(p.x,A.elev+9+Math.sin(t*0.03)*1.5,p.z);cam.lookAt(l.x,A.elev+160,l.z);}
    else{const A=AP.ZRH16,p=fromLocal(A,1260-el*1.4,-585+el*0.5),l=fromLocal(A,1010,-735);cam.near=1;cam.fov=46;
      cam.position.set(p.x,A.elev+8+Math.sin(t*0.03)*1.5,p.z);cam.lookAt(l.x,A.elev+9,l.z);}}
  else{const u=el/sh.dur,e=u*u*(3-2*u)*0.6+u*0.4,lp=(a,b)=>a+(b-a)*e;cam.near=2;cam.fov=48;
    cam.position.set(lp(sh.a[0],sh.b[0]),lp(sh.a[1],sh.b[1]),lp(sh.a[2],sh.b[2]));cam.lookAt(lp(sh.la[0],sh.lb[0]),lp(sh.la[1],sh.lb[1]),lp(sh.la[2],sh.lb[2]));}
  cam.setViewOffset(W,H,-off,0,W,H);cam.updateProjectionMatrix();
  if(fresh&&world)world.updateTrees(cam.position,true);}
function setMFade(v){const f=$('mfade');if(f){const o=String(Math.round(clamp(v,0,1)*100)/100);if(f.style.opacity!==o)f.style.opacity=o;}}

// ---------- HUD ----------
let toastT;function toast(t,ms){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),ms||2400);}
const fmtD=d=>d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m';
function updateHUD(dt){
  const F=G.F,P=G.P,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');const V=F.ias??F.vel.length();
  const ground=S.groundAt(F.pos.x,F.pos.z),agl=F.pos.y-(F.gearPos>0.9?P.gearH:P.bellyH)-ground;
  const hdg=((-e.y/DEG)%360+360)%360,trk=V>3?((Math.atan2(F.vel.x,-F.vel.z)/DEG)+360)%360:hdg;
  let drift=(trk-hdg+540)%360-180;
  const units={metric:save.settings.units==='metric'};
  G.prevV=G.prevV??V;const trend=(V-G.prevV)/Math.max(dt,1e-3);G.prevV=V;G.trend=(G.trend||0)*0.92+trend*0.08;
  const spdW=speedWarn(F,P,V);
  hud.drawPFD({ground0:F.onGround,units,pitch:e.x,bank:e.z,speed:V,vs0:stallSpeed(F),vr:P.Vr,alt:F.pos.y-P.gearH*(F.onGround?1:0),ground,agl:F.onGround?0:agl,vspeed:F.vel.y,heading:hdg,track:trk,
    gamma:V>3?Math.asin(clamp(F.vel.y/V,-1,1)):e.x,drift:drift*DEG,assist:F.assist,prot:F.prot,stall:F.stalled||(V>5&&!F.onGround&&V<stallSpeed(F)*1.03),wpBrg:G.wp?wpBrg(F):null,trend:G.trend,overspeed:spdW&&spdW.k!=='zone',spdLbl:spdW?spdW.lbl:'',spdAmber:spdW&&spdW.k==='zone'});
  groundCue(F,P,agl,dt);contactShadowTick(F,P);
  if(G.cam===1)updateCockpit(F);
  // Systeme
  const eng=F.eng;
  setTxt('thrLbl',P.prop?(P.id==='alpina'?'DREHZAHL':'DREHMOMENT'):'N1');
  setTxt('thrVal',P.id==='alpina'?Math.round(700+eng*1950)+' U/min':Math.round(P.prop?eng*100:22+eng*76)+' %');
  setSty('thrBar','width',(F.thr*100)+'%');setSty('thrBar2','width',(eng*100)+'%');
  setTxt('flapVal',P.flapNames[F.flaps]);setSty('flapBar','width',(F.flapPos*100)+'%');
  const gl=$('gearLights');const gp=F.gearPos;gl.className='gear '+(P.fixedGear?'fixed':gp>0.98?'down':gp<0.02?'up':'transit');
  setTxt('gearTxt',P.fixedGear?'FEST':gp>0.98?'AUSGEFAHREN':gp<0.02?'EINGEFAHREN':'IN BEWEGUNG');
  if(!G.apAsk&&!$('apAsk').classList.contains('hidden'))$('apAsk').classList.add('hidden');
  $('brkInd').classList.toggle('on',F.brake);$('splInd').classList.toggle('on',!!F.spoiler);$('astInd').classList.toggle('on',F.assist);$('apInd').classList.toggle('on',!!G.ap);setTxt('apInd',G.ap?`AP ${G.ap.nav&&G.wp?'▸ZIEL ':''}${String(Math.round(G.ap.hdg)).padStart(3,'0')}° · ${Math.round(units.metric?G.ap.alt:G.ap.alt*3.281)} · ${Math.round(units.metric?G.ap.spd*3.6:G.ap.spd*1.944)}${G.ap.max?' MAX':''}`:'AUTOPILOT');
  setTxt('crateInd',G.crates>0?`KISTEN ${G.crates}`:'');setSty('crateInd','display',G.crates>0?'':'none');
  const s=Math.floor(G.t);setTxt('timer',`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
  // Ziel
  const o=G.obj[G.oi];let title,txt,dist='';
  if(G.appr&&G.apprG&&!G.lesson&&(!G.mission||!o||o.type==='land')){const g=G.apprG;title=`ANFLUG PISTE ${G.appr.rwy} · ${G.appr.name.toUpperCase()}`;txt=(g.lines.slice(0,2).join(' · ')||'Folge der violetten Bahn')+(G.ap?' · Autopilot fliegt den Anflug':'');dist=fmtD(g.toGo);}
  else if(!G.mission&&G.wp&&!G.lesson){const dd=Math.hypot(F.pos.x-G.wp.x,F.pos.z-G.wp.z),eta=dd/Math.max(20,Math.hypot(F.vel.x,F.vel.z));title='EIGENES ZIEL · '+(G.wp.name||'Kartenpunkt').toUpperCase();txt=`Kurs ${String(Math.round(wpBrg(F))).padStart(3,'0')}° · ca. ${Math.max(1,Math.round(eta/60))} min · Folge der türkisen Linie${G.ap?' · Autopilot fliegt hin':' · Autopilot (U) fliegt hin'}`;dist=fmtD(dd);}
  else if(!G.mission){title='FREIER FLUG';txt=`Erkunde die ganze Schweiz – von Genf bis ins Engadin · Goldene Edelweiss: ${ewIds().length} / ${attr?attr.edelweissTotal:72} · Karte (M): Ziel antippen`;}
  else if(!o){title='GESCHAFFT';txt='';}
  else{const same=G.obj.filter(x=>x.type===o.type),k=same.indexOf(o)+1;
    if(o.type==='ring'){title=o.final?`ENDANFLUG ${k}/${same.length}`:`RING ${k} / ${same.length}`;txt=o.final?'Blaue Ringe markieren den Gleitpfad zur Piste.':o.name?`Sehenswürdigkeit: ${o.name} – flieg durch den Ring.`:'Fliege durch den gelben Ring.';}
    else if(o.type==='scoop'){title=`WASSER SCHÖPFEN · ${o.name.toUpperCase()}`;txt=`Fahrwerk ein, auf dem See aufsetzen und mit Schub übers Wasser gleiten · ${Math.round(Math.min(1,(G.scoopT||0)/3)*100)} %`;}
    else if(o.type==='fire'){title=`FEUER · ${o.name.toUpperCase()}`;txt=G.tank?'Tief anfliegen (unter 150 m über Grund) und mit Leertaste / ▼ abwerfen.':'Tank leer – zuerst Wasser schöpfen.';}
    else if(o.type==='wland'){title=`WASSERLANDUNG · ${o.name.toUpperCase()}`;txt='Fahrwerk EINGEFAHREN lassen, sanft auf dem See aufsetzen und ausgleiten.';}
    else if(o.type==='taxi'){title=G.atGate||G.push?'PUSHBACK':'ROLLEN ZUR PISTE 34';txt=G.atGate?'Taste J bzw. ◀ drücken – der Schlepper stösst dich zurück.':G.push?'Der Schlepper stösst dich zurück …':'Bremse lösen (B), wenig Schub, den grünen Lichtern folgen. Lenken mit A/D bzw. Stick.';}
    else if(o.type==='hland'){title=(o.kind==='pad'?'LANDEN · ':'EINSATZORT · ')+o.name.toUpperCase();txt=G.F.onGround&&G.hw?`${o.kind==='pad'?'Patient wird übergeben':'Patient wird versorgt und eingeladen'} … ${Math.round(Math.min(1,G.hw/o.wait)*100)} %`:o.kind==='pad'?'Auf dem H landen: langsam anfliegen, schweben, sanft absetzen.':'Beim weissen Kreuz landen (Hang flach genug, sanft aufsetzen).';}
    else if(o.type==='hover'){title='SEILWINDE · '+o.name.toUpperCase();txt=`Über dem Boot schweben – tiefer als ${o.h} m, ruhig halten`+(G.hw?` … ${Math.round(Math.min(1,G.hw/o.wait)*100)} %`:'');}
    else if(o.type==='spot'){title=`ZIELLANDUNG ${o.k} / ${o.n}`;txt='Möglichst genau auf der weiss-orangen Linie aufsetzen, dann durchstarten.'+(G.spots&&G.spots.length?` · bisher Ø ${(G.spots.reduce((a,b)=>a+b,0)/G.spots.length).toFixed(1)} m`:'');}
    else if(o.type==='drop'){title=`ABWURF: ${o.name}`;txt='Leertaste: Kiste am Fallschirm abwerfen. Der weisse Kreis zeigt den Landepunkt.';}
    else{title=`LANDUNG IN ${o.ap.name.toUpperCase()}`;txt='Aufsetzen und bis zum Stillstand bremsen (B).';}
    dist=fmtD(Math.hypot(F.pos.x-o.x,F.pos.z-o.z));}
  // Gleitpfad
  let glide='';const glc=computeGlide(F);if(glc)glide=glc.html;
  if(G.lesson){const L=G.lesson,S=L.steps[G.tut.k];if(S){title=`LEKTION ${LESSONS.indexOf(L)+1} · ${L.name.toUpperCase()}`;txt=S.t;dist=`Schritt ${G.tut.k+1}/${L.steps.length}`;
    if(!(S.land&&glc)&&S.info){let inf='';try{if(G.tut.c)inf=S.info(G.tut.c);}catch(e){}glide=inf?`<b class="ok">▸ ${inf}</b>`:'';}}}
  if(G.mission&&G.mission.comfort)txt+=` · Komfort ${Math.round(G.comfort)} %`;
  if(G.race){title='⏱ '+fmtT(G.t)+' · '+title;}
  if(G.ghost&&G.mission)txt+=` · Rekord ${fmtT(G.ghost.t)}`;
  if(G.P.glider&&!F.onGround)txt+=` · Vario ${F.vel.y>=0?'+':''}${F.vel.y.toFixed(1)} m/s`;
  if(G.P.amphib)txt+=` · Tank ${G.tank?'voll':'leer'}`;
  {const w=wx.cur;if(w&&w.spd>0.8){const um=save.settings.units==='metric';setSty('windInd','display','');const rel=Math.round((w.dir-hdg)/3)*3*DEG;
    setHTML('windInd',`<i style="transform:rotate(${rel+Math.PI}rad)">➤</i><b>${String(Math.round(w.dir/10)*10||360).padStart(3,'0')}° · ${um?Math.round(w.spd*3.6)+' km/h':Math.round(w.spd*1.944)+' kt'}</b>`);}else setSty('windInd','display','none');}
  setTxt('objtitle',title);setTxt('objtext',txt);setTxt('objdist',dist);setHTML('glide',glide);setSty('glide','display',glide?'':'none');
  // Warnungen
  let w='';const vs=stallSpeed(F);
  if(!F.onGround&&(F.stalled||(V<vs*1.04&&V>5)))w='ÜBERZOGEN – NASE RUNTER, SCHUB!';
  else if(!F.onGround&&agl<180&&F.vel.y<-Math.max(6,agl/7))w='BODEN – HOCHZIEHEN!';
  else if(!F.onGround&&!F.gear&&agl<300&&(F.flaps>=2||V<P.Vref*1.25))w='FAHRWERK AUSFAHREN (G)';
  else if(F.flapPos>0.05&&V>P.Vr*(P.prop?2.1:2.3))w='KLAPPEN – ZU SCHNELL';
  else if(F.tailStrike&&V>10)w='HECK BERÜHRT – NASE RUNTER';
  else if(Math.abs(F.pos.x)>HALF-2500||Math.abs(F.pos.z)>HALF-2500)w='GRENZE DES FLUGGEBIETS – UMKEHREN';
  setTxt('warn',w);$('warn').classList.toggle('show',!!w);
  // Marker
  const mk=$('marker');
  if(o&&!F.crashed){const tp=new THREE.Vector3(o.x,o.type==='drop'?o.y+25:o.y,o.z);if(o.type==='land'){const sd=1;tp.y=o.ap.elev+5;}
    const v=tp.clone().project(cam),Wd=innerWidth,Hd=innerHeight;let x=(v.x*0.5+0.5)*Wd,y=(-v.y*0.5+0.5)*Hd;const behind=v.z>1;if(behind){x=Wd-x;y=Hd-y;}
    const m=80,off=behind||x<m||x>Wd-m||y<m||y>Hd-m;
    if(off){const cx=Wd/2,cy=Hd/2;let dx=x-cx,dy=y-cy;if(Math.abs(dx)<1&&Math.abs(dy)<1)dy=1;const k=Math.min((cx-m)/Math.max(Math.abs(dx),1e-6),(cy-m)/Math.max(Math.abs(dy),1e-6));x=cx+dx*k;y=cy+dy*k;mk.querySelector('.arr').style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;}
    mk.classList.toggle('off',off);mk.style.display='block';mk.style.transform=`translate(${x}px,${y}px)`;setTxt('mdist',fmtD(F.pos.distanceTo(tp)));}
  else mk.style.display='none';
  G.miniT=(G.miniT||0)+1;if(G.miniT%2===0||G.cam===1)hud.drawMini(world.mapCanvas,{gold:attr&&!G.lesson?attr.dots():[],traffic:traffic?traffic.dots():[],half:HALF,x:F.pos.x,z:F.pos.z,heading:hdg,range:P.heli?5000:P.prop?(P.id==='titlis'?10000:7000):P.mass>150000?16000:12000,wp:G.wp,appr:G.appr,path:G.path},G.obj,G.oi,AIRPORTS);
  if(G.wp)G.wp.lbl=(G.wp.name||'Eigenes Ziel')+' · '+fmtD(Math.hypot(F.pos.x-G.wp.x,F.pos.z-G.wp.z));
  apprTick(F);wpHud(F,cam);
  if(state==='map'){if(MV.cur){const p=poiNear(MV.cur.x,MV.cur.z,26/mapXf().k);MV.cur.lbl=(p?p.name+' · ':'')+fmtD(Math.hypot(F.pos.x-(p?p.x:MV.cur.x),F.pos.z-(p?p.z:MV.cur.z)))+(runwayAt(MV.cur.x,MV.cur.z,Math.max(350,24/mapXf().k))?(MV.padCur?'  ✕ Anflug':'  · Klick: Landeanflug wählen'):MV.padCur?'  ✕ setzen':'');}
    hud.drawMap($('mapc'),world.mapCanvas,{half:HALF,x:F.pos.x,z:F.pos.z,heading:hdg,view:MV,wp:G.wp,cur:MV.cur,path:G.path},G.obj,G.oi,AIRPORTS,TOWNS,G.trail,{lakes:LAKES,peaks:PEAKS,gold:attr?attr.dots():[],traffic:traffic?traffic.dots():[],appr:G.appr});}
}
function computeGlide(F){const P=F.P;if(P.heli||P.glider&&!G.obj.some(o=>o.type==='land'))return null;const la=G.obj.find((x,i)=>i>=G.oi&&x.type==='land')?.ap||(G.lesson?nearestAP(F.pos,G.lesson.ap):!G.mission?nearestAP(F.pos):null);
  if(!la||F.onGround)return null;const l=toLocal(la,F.pos.x,F.pos.z);const fw=new THREE.Vector3(0,0,-1).applyQuaternion(F.q);const sd=(fw.x*la.sin-fw.z*la.cos)>=0?1:-1;
  const d=(-sd*la.len/2-l.along)*sd;const aim=la.len>=2400?400:la.len>=1200?250:150;
  if(!(d>-aim&&d<9000&&Math.abs(l.across)<2000))return null;const sl=la.small?0.06:0.0524;const ideal=la.elev+15+(d+aim*0.6)*sl;const dev=F.pos.y-P.gearH-ideal;const ok=Math.abs(dev)<12+d*0.006;
  const txt=ok?'Gleitpfad ✓':dev>0?`${Math.round(dev)} m zu hoch`:`${Math.round(-dev)} m zu tief`;
  return{ok,dev,d,across:l.across,txt,html:`Piste ${sd>0?la.rwyA:la.rwyB} · ${fmtD(Math.max(0,d))} · `+(ok?'<b class="ok">Gleitpfad ✓</b>':dev>0?`<b class="hi">${txt}</b>`:`<b class="lo">${txt}</b>`)+(Math.abs(l.across)>40?` · ${l.across>0?'links halten':'rechts halten'}`:'')};}
function tutCtx(F){const P=F.P,V=F.vel.length(),e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),hdg=((-e.y/DEG)%360+360)%360;const A=AP[G.lesson.ap]||AP[G.lesson.ap+'16'];
  return{F,P,G,V,hdg,bank:F.bank||0,vs:F.vel.y,agl:F.pos.y-P.gearH-S.groundAt(F.pos.x,F.pos.z),vst:stallSpeed(F),glide:computeGlide(F),distAP:A?Math.hypot(F.pos.x-A.x,F.pos.z-A.z):0};}
function nearestAP(p,prefer){if(prefer&&AP[prefer]){const A0=AP[prefer];const cand=AIRPORTS.filter(A=>A.icao===A0.icao);let b=null,bd=1e9;for(const A of cand){const l=toLocal(A,p.x,p.z);const d=Math.abs(l.across);if(d<bd){bd=d;b=A;}}return b;}let b=null,bd=1e9;for(const A of AIRPORTS){const d=Math.hypot(p.x-A.x,p.z-A.z);if(d<bd){bd=d;b=A;}}return bd<16000?b:null;}

// ---------- Menüs ----------
function starsHtml(n){let s='';for(let i=0;i<3;i++)s+=`<i class="${i<n?'on':''}">★</i>`;return`<span class="stars">${s}</span>`;}
const totalStars=()=>Object.values(save.stars).reduce((a,b)=>a+b,0);
const rankName=n=>n>=16?'Flugkapitän':n>=11?'Erster Offizier':n>=6?'Linienpilot in Ausbildung':n>=2?'Privatpilot':'Flugschüler';
const hourName=h=>h>=21.5||h<5.5?'Nacht':h>=19?'Abend':h>=16?'Nachmittag':h>=11?'Mittag':'Morgen';
const fmtH=h=>`${Math.floor(h)}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;
function showMenu(){
  state='menu';cleanup();env.setTime(20.0,'fair');world.setWinter(false);SHOW.on=false;
  ['hud','brief','result','pause','mapov'].forEach(id=>$(id).classList.add('hidden'));$('menu').classList.remove('hidden');
  const n=totalStars();$('rank').innerHTML=`<b>${rankName(n)}</b><span>${n} / ${ALL_MISSIONS.length*3} Sterne</span>`;
  $('mlist').innerHTML=MISSIONS.map((m,i)=>`<div class="mis" data-id="${m.id}"><div class="num">${i+1}</div><div class="mi"><b>${m.name}</b><span>${PLANES[m.plane].name} · ${hourName(m.hour)} · ${m.air?'Luftstart':m.start[2]?'Anflug '+AP[m.start[0]].name:AP[m.start[0]].name}</span></div><div class="mr">${starsHtml(save.stars[m.id]||0)}${save.grades[m.id]?`<em>${save.grades[m.id]}</em>`:''}</div></div>`).join('');
  $('mlist').querySelectorAll('.mis').forEach(el=>el.onclick=()=>{audio.init();showBrief(el.dataset.id);});
  $('llist').innerHTML=LESSONS.map((L,i)=>`<div class="mis" data-id="${L.id}"><div class="num">${L.exam?'★':i+1}</div><div class="mi"><b>${L.name}</b><span>${PLANES[L.plane].name} · ${L.steps.length} Schritte · ${AP[L.ap].name}</span></div><div class="mr">${save.lessons[L.id]?`<em>${save.lessons[L.id]}</em>`:''}</div></div>`).join('');
  $('llist').querySelectorAll('.mis').forEach(el=>el.onclick=()=>{audio.init();showLessonBrief(el.dataset.id);});
  renderFree();renderSettings();ewInfo();renderCareer();
}
function showBrief(x){const m=typeof x==='string'?MISSIONS.find(q=>q.id===x):x,P=PLANES[m.plane],job=m.contract;
  const stTxt=m.air?'In der Luft':m.start[2]?'Im Anflug auf '+AP[m.start[0]].name:AP[m.start[0]].name+' · Piste '+(m.start[1]?AP[m.start[0]].rwyB:AP[m.start[0]].rwyA);
  const last=job?`<div><span>${job.daily?'Belohnung':'Lohn (Note B)'}</span><b>${fmtCHF(job.pay)}${job.daily?' + Abzeichen':''}</b></div>`
    :`<div><span>Bestwert</span><b>${save.grades[m.id]||'–'} ${starsHtml(save.stars[m.id]||0)}${career.C.best[m.id]?' · '+fmtT(career.C.best[m.id]):''}</b></div>`;
  $('brief').innerHTML=`<div class="panel brief"><div class="eyebrow">${job?(job.daily?'TAGESAUFGABE':'AUFTRAG'):'MISSION '+(MISSIONS.indexOf(m)+1)}</div><h2>${m.name}</h2><p>${m.brief}</p>
  <div class="facts"><div class="fpl" data-id="${m.plane}">${thumbImg(m.plane,'xs')}<div><span>Flugzeug</span><b>${P.name}${job&&job.daily&&!career.owns(m.plane)?' · Probeflug':''}</b></div></div><div><span>Start</span><b>${stTxt}</b></div><div><span>Uhrzeit</span><b>${fmtH(m.hour)}</b></div>${last}</div>
  <canvas id="bMap" width="760" height="270"></canvas><div class="tip"><b>Tipp:</b> ${m.tip}${!job&&career.C.ghost!==false&&career.ghostGet(m.id)?' <br><b>Geisterflug:</b> Dein Rekordflug fliegt als blaues Geisterflugzeug mit.':''}</div><div class="btnrow"><button id="bGo">Abflug</button><button class="ghost" id="bBack">Zurück</button></div></div>`;
  try{briefMap(m);}catch(e){console.warn('briefMap',e);$('bMap').remove();}
  $('brief').classList.remove('hidden');$('bGo').onclick=()=>startFlight(m.dyn?{dyn:m}:{mission:m.id});$('bBack').onclick=()=>$('brief').classList.add('hidden');}
function trackMap(){const cv=$('rMap');if(!cv)return;const tr=G.trail.concat([[G.F.pos.x,G.F.pos.z]]);if(tr.length<3){cv.remove();return;}
  const pts=tr.concat(G.obj.map(o=>[o.x,o.z]));let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const[x,z]of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
  const ex=Math.max(1800,(x1-x0)/2*1.25),ez=Math.max(900,(z1-z0)/2*1.3),zm=clamp(Math.min(HALF/ex,HALF*cv.height/(cv.width*ez)),0.6,10);
  const e=new THREE.Euler().setFromQuaternion(G.F.q,'YXZ');
  hud.drawMap(cv,world.mapCanvas,{half:HALF,x:G.F.pos.x,z:G.F.pos.z,from:tr[0],heading:((-e.y/DEG)%360+360)%360,view:{z:zm,cx:(x0+x1)/2,cz:(z0+z1)/2}},G.obj,0,AIRPORTS,TOWNS,tr,{lakes:LAKES,peaks:PEAKS,gold:[],traffic:[]});}
function missionStart(m){if(m.air){const p=toXZ(m.air.lat,m.air.lon);return{x:p.x,z:p.z,hdg:m.air.hdg};}
  const [id,rev,mAir]=m.start,A=AP[id],s=rev?-1:1,hdg=((A.a/DEG-(rev?180:0))%360+360)%360;const p=mAir?fromLocal(A,-s*(A.len/2+mAir.dist),0):fromLocal(A,-s*(A.len/2-60),0);return{x:p.x,z:p.z,hdg};}
function briefMap(m){const cv=$('bMap'),P0=PLANES[m.plane],objs=buildObjectives(m,S,{vref:P0.heli?0:P0.Vref}),st=missionStart(m),pts=[[st.x,st.z],...objs.map(o=>[o.x,o.z])];
  let path=null;if(!P0.heli&&objs.some(o=>o.type==='ring')){const gr=!m.air&&!(m.start&&m.start[2]),y=S.groundAt(st.x,st.z)+(gr?0:400);path=objPath(objs,{x:st.x,y,z:st.z,hx:Math.sin(st.hdg*DEG),hz:-Math.cos(st.hdg*DEG),ground:gr,jet:!P0.prop,r:turnRadius(P0)});}
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const[x,z]of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
  const ex=Math.max(2200,(x1-x0)/2*1.3),ez=Math.max(1200,(z1-z0)/2*1.35),zm=clamp(Math.min(HALF/ex,HALF*cv.height/(cv.width*ez)),0.6,9);
  hud.drawMap(cv,world.mapCanvas,{half:HALF,x:st.x,z:st.z,heading:st.hdg,view:{z:zm,cx:(x0+x1)/2,cz:(z0+z1)/2},lastLbl:true,path},objs,0,AIRPORTS,TOWNS,[],{lakes:LAKES,peaks:PEAKS,gold:[],traffic:[]});}
// ---------- Karriere-Menü ----------
let CSUB='cMis',HSEL=null,DJ=null;const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function getDaily(){const k=todayKey();if(!DJ||DJ.daily!==k){DJ=dailyJob(S,k);if(DJ)DJ.mis=jobMission(DJ,'daily');}return DJ;}
function openCareer(sub){document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('sel',x.dataset.t==='tCareer'));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('hidden',t.id!=='tCareer'));setSub(sub);}
function setSub(sub){CSUB=sub;document.querySelectorAll('#cTabs button').forEach(b=>b.classList.toggle('sel',b.dataset.s===sub));document.querySelectorAll('#tCareer .sub').forEach(d=>d.classList.toggle('hidden',d.id!==sub));
  if(sub==='cHang')renderHangar();if(sub==='cRec')renderRecords();if(sub==='cBad')renderBadges();if(sub==='cJobs')renderJobs();}
document.querySelectorAll('#cTabs button').forEach(b=>b.onclick=()=>{audio.init();setSub(b.dataset.s);});
function renderCareer(){const C=career.C;career.refill(S);
  $('cHead').innerHTML=`<div class="money"><small>Kontostand</small><b>${fmtCHF(C.money)}</b></div><div class="cstat"><span>${Object.keys(C.badges).length} / ${BADGES.length} Abzeichen</span><span>${C.owned.length} / ${ORDER.length} Flugzeuge</span></div>`;
  const dj=getDaily(),dn=dj&&C.daily[dj.daily];const d=new Date();
  $('daily').innerHTML=dj?`<div class="dcard ${dn?'done':''}" id="dCard"><div class="dl"><small>TAGESAUFGABE · ${d.getDate()}.${d.getMonth()+1}.</small><b>${esc(dj.title)}</b><span>${PLANES[dj.plane].name} · ${hourName(dj.hour)} · ${dn?'erfüllt ✓':"CHF 5'000 + Abzeichen"}</span></div><button class="small" id="dGo">${dn?'Nochmal':'Los'}</button></div>`:'';
  if(dj)$('dGo').onclick=()=>{audio.init();showBrief(dj.mis);};
  setSub(CSUB);}
function renderJobs(){const C=career.C;const ic={arr:'🛬',dep:'🛫',rund:'📸',flug:'✈︎'};
  $('cJobs').innerHTML=`<p class="hint">Aufträge mit deinen eigenen Flugzeugen. Der Lohn hängt von Note, Komfort und Funk ab. Ein Unfall kostet Reparatur.</p>`+
    career.jobs().map(j=>`<div class="mis job ${j.locked?'locked':''}" data-n="${j.n}"><div class="jth" data-id="${j.plane}">${thumbImg(j.plane,'xs')}<i>${j.locked?'🔒':ic[j.kind]||'✈︎'}</i></div><div class="mi"><b>${esc(j.title)}</b><span>${PLANES[j.plane].name}${j.km?' · '+j.km+' km':''} · ${hourName(j.hour)}${j.pax?' · Passagiere':' · Fracht'}</span></div><div class="mr"><em>${fmtCHF(j.pay)}</em>${j.locked?`<small>Flugzeug kostet ${fmtCHF(PRICE[j.plane])}</small>`:''}</div></div>`).join('')+
    `<div class="btnrow"><button class="ghost small" id="jNew">Neue Aufträge</button></div>`;
  $('cJobs').querySelectorAll('.job').forEach(el=>el.onclick=()=>{audio.init();const j=career.jobs().find(x=>x.n==el.dataset.n);if(!j)return;if(j.locked){toast(`Dafür brauchst du den ${PLANES[j.plane].name} – im Hangar kaufen.`,3000);return;}showBrief(jobMission(j));});
  $('jNew').onclick=()=>{career.refill(S,true);renderJobs();toast('Neue Aufträge sind da.');};}
function renderBadges(){const C=career.C;
  $('cBad').innerHTML=`<div class="bgrid">${BADGES.map(([id,n,dsc,ico])=>`<div class="badge ${C.badges[id]?'on':''}"><div class="bm">${ico}</div><b>${n}</b><span>${dsc}</span></div>`).join('')}</div>`;}
function renderHangar(){const C=career.C;HSEL=HSEL||save.free.plane||'alpina';const id=HSEL,P=PLANES[id],own=career.owns(id);
  let det='';
  if(!own){const can=C.money>=PRICE[id];det=`<div class="hbuy"><b>${P.name}</b><span>${P.type}</span><p>${P.desc}</p><button id="hBuy" ${can?'':'disabled'}>Kaufen für ${fmtCHF(PRICE[id])}</button>${can?'':`<small>Es fehlen noch ${fmtCHF(PRICE[id]-C.money)} – erledige Aufträge und Missionen.</small>`}</div>`;}
  else{const L=livSpec(id,C.liv[id]),named=!['alpina','saentis'].includes(id);
    const sw=(k,v)=>LIV_COL.map(c=>`<button class="sw ${v===c?'sel':''}" data-k="${k}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    det=`<h4>Lackierung · Vorlage</h4><div class="chips">${LIV_TPL.map(([k,n])=>`<button class="chip ${L.tpl===k?'sel':''}" data-k="tpl" data-v="${k}">${n}</button>`).join('')}</div>
      <h4>Hauptfarbe</h4><div class="sws">${sw('c1',L.c1)}</div><h4>Akzentfarbe</h4><div class="sws">${sw('c2',L.c2)}</div>
      <h4>Rumpf</h4><div class="chips">${LIV_BASE.map(([c,n])=>`<button class="chip ${L.base===c?'sel':''}" data-k="base" data-v="${c}"><i class="dot" style="background:${c}"></i>${n}</button>`).join('')}</div>
      ${named?`<h4>Schriftzug</h4><input type="text" id="lvN" maxlength="16" value="${esc(L.name)}" placeholder="z. B. LUIS AIRLINES">`:''}
      <div class="btnrow"><button class="ghost small" id="lvAll">Auf alle Flugzeuge übertragen</button><button class="ghost small" id="lvReset">Standard</button></div>`;}
  $('cHang').innerHTML=`<div class="hgrid">${ORDER.map(k=>{const o=career.owns(k);return`<div class="pc hp ${k===id?'sel':''} ${o?'own':''}" data-id="${k}">${thumbImg(k,'sm')}<b>${PLANES[k].name}</b><span>${o?'✓ im Hangar':fmtCHF(PRICE[k])}</span></div>`;}).join('')}</div><div id="hDet">${det}</div>`;
  $('cHang').querySelectorAll('.hp').forEach(el=>el.onclick=()=>{HSEL=el.dataset.id;renderHangar();});
  if($('hBuy'))$('hBuy').onclick=()=>{if(career.buy(id)){audio.chime();toast(`${P.name} gehört jetzt dir! Gestalte die Lackierung.`,3500);checkBadges();career.refill(S);renderCareer();}};
  const setL=(k,v)=>{C.liv[id]={...livSpec(id,C.liv[id]),[k]:v};persist();renderHangar();};
  $('cHang').querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>setL(el.dataset.k,el.dataset.v));
  if($('lvN')){$('lvN').onchange=e=>setL('name',e.target.value.toUpperCase());}
  if($('lvAll'))$('lvAll').onclick=()=>{const L=livSpec(id,C.liv[id]);for(const k of C.owned){const o={...livSpec(k,C.liv[k]),tpl:L.tpl,c1:L.c1,c2:L.c2,base:L.base};if(!['alpina','saentis'].includes(k)&&!['alpina','saentis'].includes(id))o.name=L.name;C.liv[k]=o;}persist();toast('Lackierung auf die ganze Flotte übertragen.');};
  if($('lvReset'))$('lvReset').onclick=()=>{delete C.liv[id];persist();renderHangar();};
  $('cHead').querySelector('b').textContent=fmtCHF(C.money);
  showroomSet(id);}
function shareObj(){const C=career.C;return{n:C.name||'Pilot',s:save.stars,t:C.best,e:(save.edelweiss||[]).length,b:Object.keys(C.badges).length};}
function renderRecords(){const C=career.C,fr=C.friends[0]||null,code=encodeShare(shareObj());
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
const thumbKey=id=>id+'|'+JSON.stringify(myLivery(id)||{});
function thumbImg(id,cls){const u=THUMB[thumbKey(id)];if(!u&&!TH.q.includes(id))TH.q.push(id);return`<div class="pimg ${cls||''}">${u?`<img src="${u}" alt="">`:'<i class="ld"></i>'}</div>`;}
function thumbTick(){if(!TH.q.length||state!=='menu')return;const id=TH.q.shift(),key=thumbKey(id);if(THUMB[key]){thumbFill(id);return;}
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
function showroomSet(id){const spec=myLivery(id),key=id+'|'+JSON.stringify(spec||{});if(SHOW.key===key&&SHOW.m)return;
  if(SHOW.m)scene.remove(SHOW.m);SHOW.key=key;const m=buildModel(id,{livery:spec});const A=ZS?AP.ZRH16:MAIN_AP,p=fromLocal(A,SPOT[0],SPOT[1]);
  m.position.set(p.x,A.elev+PLANES[id].gearH,p.z);m.rotation.y=-A.a+2.3;m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m);SHOW.r=b.getSize(new THREE.Vector3()).length()/2;SHOW.c=b.getCenter(new THREE.Vector3());
  animateModel(m,{flapPos:0,gearPos:1,rpm:0,groundSpeed:0,ail:0,elev:0,rud:0,night:0},0,0.016);scene.add(m);SHOW.m=m;}
const SPOT=ZS?[1720,-560]:[-MAIN_AP.len*0.3,MAIN_AP.side*110];
function showroomOn(){return state==='menu'&&CSUB==='cHang'&&!$('menu').classList.contains('hidden')&&!$('tCareer').classList.contains('hidden')&&$('brief').classList.contains('hidden');}
function renderFree(){
  const f=save.free;
  $('fArea').innerHTML=`<button class="chip sel" disabled>Ganze Karte<small>Zürich · Luzern · Bern · Berner Oberland · Wallis – alles verbunden</small></button>`;
  $('fPlanes').innerHTML=Object.values(PLANES).map(p=>`<div class="pc ${f.plane===p.id?'sel':''}" data-id="${p.id}">${thumbImg(p.id)}<b>${p.name}</b><span>${p.type}</span><small>${p.desc}</small></div>`).join('');
  $('fPlanes').querySelectorAll('.pc').forEach(el=>el.onclick=()=>{f.plane=el.dataset.id;persist();renderFree();});
  const cur=AP[f.ap];
  {const P=PLANES[f.plane];$('fSum').textContent=`${P?P.name:''} · ${cur?cur.name:''} · ${f.air?'in der Luft':'auf der Piste'}`;}
  $('fAP').innerHTML=ICAOS.map(I=>`<button class="chip ${cur.icao===I.icao?'sel':''}" data-i="${I.icao}">${I.name}<small>${I.icao} · ${Math.max(...I.rwys.map(r=>r.len))} m</small></button>`).join('');
  $('fAP').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.ap=ICAOS.find(I=>I.icao===el.dataset.i).rwys[0].id;f.rev=false;persist();renderFree();});
  const rw=ICAOS.find(I=>I.icao===cur.icao).rwys;
  $('fRwy').innerHTML=rw.flatMap(A=>[false,true].map(r=>`<button class="chip ${f.ap===A.id&&f.rev===r?'sel':''}" data-id="${A.id}" data-r="${r}">Piste ${r?A.rwyB:A.rwyA}</button>`)).join('')+'<br>'+
    [false,true].map(a=>`<button class="chip ${f.air===a?'sel':''}" data-a="${a}">${a?'Im Anflug (Luft)':'Auf der Piste'}</button>`).join('');
  $('fRwy').querySelectorAll('[data-r]').forEach(el=>el.onclick=()=>{f.ap=el.dataset.id;f.rev=el.dataset.r==='true';persist();renderFree();});
  $('fRwy').querySelectorAll('[data-a]').forEach(el=>el.onclick=()=>{f.air=el.dataset.a==='true';f.gate=false;persist();renderFree();});
  if(cur.icao==='LSZH'&&PLANES[f.plane].cls==='jet'){$('fRwy').insertAdjacentHTML('beforeend',`<button class="chip ${f.gate?'sel':''}" id="fGate">Am Gate (mit Pushback)<small>Rollen zur Piste 34</small></button>`);$('fGate').onclick=()=>{f.gate=!f.gate;if(f.gate){f.air=false;f.ap='ZRH16';f.rev=true;}persist();renderFree();};}else f.gate=false;
  $('fTime').innerHTML=[[7.2,'Morgen'],[12.5,'Mittag'],[17,'Nachmittag'],[20.1,'Abendrot'],[22.8,'Nacht']].map(([h,n])=>`<button class="chip ${Math.abs(f.hour-h)<0.01?'sel':''}" data-h="${h}">${n}<small>${fmtH(h)}</small></button>`).join('');
  $('fTime').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.hour=+el.dataset.h;persist();renderFree();});
  $('fWx').innerHTML=[['clear','Klar'],['fair','Schönwetterwolken'],['cloudy','Bewölkt'],['rain','Regen'],['storm','Gewitter'],['snow','Schneefall'],['fog','Nebelmeer'],['foehn','Föhn (klar)']].map(([k,n])=>`<button class="chip ${f.weather===k?'sel':''}" data-w="${k}">${n}</button>`).join('');
  $('fWx').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.weather=el.dataset.w;f.live=null;if(f.weather==='foehn'&&f.wind!=='foehn')f.wind='foehn';persist();renderFree();});
  $('fLive').innerHTML=`<button class="chip ${f.live?'sel':''}" id="fLiveB">☁ Echtes Wetter ${ZS?'Zürich':'Interlaken'} laden<small>${f.live?esc(f.live):'aktuelles Wetter, Wind und Uhrzeit'}</small></button>`;$('fLiveB').onclick=liveWeather;
  f.season=f.season||'summer';$('fSeason').innerHTML=[['summer','Sommer'],['winter','Winter (Schnee)']].map(([k,n])=>`<button class="chip ${f.season===k?'sel':''}" data-s="${k}">${n}</button>`).join('');
  $('fSeason').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.season=el.dataset.s;persist();renderFree();});
  f.wind=f.wind||'light';$('fWind').innerHTML=[['calm','Windstill'],['light','Leicht'],['mid','Mässig'],['strong','Stark, böig'],['foehn','Föhnsturm']].map(([k,n])=>`<button class="chip ${f.wind===k?'sel':''}" data-k="${k}">${n}</button>`).join('');
  $('fWind').querySelectorAll('.chip').forEach(el=>el.onclick=()=>{f.wind=el.dataset.k;persist();renderFree();});
}
function ewInfo(){const n=ewIds().length;$('ewInfo').innerHTML=`<b>Goldene Edelweiss: ${n} / ${attr?attr.edelweissTotal:72}</b> – versteckt bei Wahrzeichen, auf Gipfeln und tief über Seen: von Genf und dem Matterhorn über Zürich, Luzern und die Jungfrau bis nach St. Moritz und Lugano. Flieg im freien Flug hindurch und sammle alle! Dazu: Kunstflugstaffel, Zeppelin über Zürich, Heissluftballone, Gleitschirme, Seilbahnen und nachts Feuerwerk.`;}
$('fGo').onclick=()=>{audio.init();startFlight({...save.free});};
function renderSettings(){const st=save.settings;
  const opt=(id,vals,key)=>{$(id).innerHTML=vals.map(([v,n])=>`<button class="chip ${st[key]===v?'sel':''}" data-v="${v}">${n}</button>`).join('');$(id).querySelectorAll('.chip').forEach(el=>el.onclick=()=>{let v=el.dataset.v;if(v==='true')v=true;if(v==='false')v=false;st[key]=v;persist();renderSettings();if(key==='quality')$('qHint').style.display='';});};
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
  $('sVol').value=st.vol;$('sVol').oninput=e=>{st.vol=+e.target.value;audio.setVolume(st.vol);persist();};}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('sel',x===b));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('hidden',t.id!==b.dataset.t));audio.init();});
$('qReload').onclick=()=>{try{location.reload();}catch(e){}};
function togglePause(){if(state==='fly'){state='pause';renderPause();$('pause').classList.remove('hidden');nav.clear();try{speechSynthesis.pause();}catch(e){}}else if(state==='pause'){state='fly';$('pause').classList.add('hidden');nav.clear();try{speechSynthesis.resume();}catch(e){}}}
function toggleMap(){if(state==='fly'){state='map';$('mapov').classList.remove('hidden');MV.cur=null;if(!G.mapSeen){G.mapSeen=true;mapFit();}else if(MV.z>1)mapCenter();mapHint();}else if(state==='map'){state='fly';$('mapov').classList.add('hidden');MV.drag=null;}}
// ---------- Interaktive Karte: eigenes Ziel, Zoom, Verschieben ----------
const MV={z:1,cx:0,cz:0,cur:null,drag:null,padCur:false};
const mapXf=()=>hud.mapXf($('mapc').width,HALF,MV);
function mapClamp(){const h=HALF/MV.z;MV.cx=clamp(MV.cx,-HALF+h,HALF-h);MV.cz=clamp(MV.cz,-HALF+h,HALF-h);}
function mapZoom(f,px,py){const S=$('mapc').width;if(px==null){px=py=S/2;}const w=mapXf().inv(px,py);MV.z=clamp(MV.z*f,1,8);const k=mapXf().k;MV.cx=w.x-(px-S/2)/k;MV.cz=w.z-(py-S/2)/k;mapClamp();}
// beim ersten Öffnen: Flugzeug, restliche Ziele und eigenes Ziel ins Bild
function mapFit(){const F=G.F,pts=[[F.pos.x,F.pos.z],...G.obj.slice(G.oi).map(o=>[o.x,o.z])];if(G.wp)pts.push([G.wp.x,G.wp.z]);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const[x,z]of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
  const ext=Math.max(4000,(x1-x0)/2*1.35,(z1-z0)/2*1.35);MV.z=clamp(HALF/ext,1,4);MV.cx=(x0+x1)/2;MV.cz=(z0+z1)/2;mapClamp();}
function mapCenter(){if(!G)return;if(MV.z<2.2)MV.z=2.5;MV.cx=G.F.pos.x;MV.cz=G.F.pos.z;mapClamp();}
function mapHint(){$('mapHint').innerHTML=TOUCH.on&&!pad.connected?'<b>Tippen</b> Ziel setzen · <b>Zwei Finger</b> zoomen · <b>Ziehen</b> verschieben · <b>✕</b> schliessen':pad.connected?'<b>Stick</b> Cursor · <b>✕</b> Ziel setzen · <b>□</b> löschen · <b>R1/L1</b> Zoom · <b>R-Stick</b> verschieben · <b>△</b> zum Flugzeug · <b>○</b> schliessen':'<b>Klick</b> Ziel setzen · <b>Rechtsklick/Entf</b> löschen · <b>Mausrad/+−</b> Zoom · <b>Ziehen</b> verschieben · <b>M</b> schliessen';}
function poiNear(x,z,rad){let best=null,bd=rad;const tryP=(n,px,pz)=>{const d=Math.hypot(px-x,pz-z);if(d<bd){bd=d;best={name:n,x:px,z:pz};}};
  const seen={};for(const A of AIRPORTS){if(seen[A.icao])continue;seen[A.icao]=1;tryP(A.name,A.x,A.z);}
  for(const P of PEAKS)tryP(P.name,P.x,P.z);for(const T of TOWNS)tryP(T.name,T.x,T.z);for(const L of LAKES)tryP(L.name,L.cx,L.cz);
  if(G&&G.obj)G.obj.forEach((o,i)=>{if(i>=G.oi&&o.name)tryP(o.name,o.x,o.z);});return best;}
function setWp(x,z){if(!G)return;const p=poiNear(x,z,26/mapXf().k);const h=HALF-1500;G.wp=p?{x:p.x,z:p.z,name:p.name}:{x:clamp(x,-h,h),z:clamp(z,-h,h),name:null};
  G.wpDone=false;if(G.ap){G.ap.nav=true;G.ap.alt=Math.max(G.ap.alt,routeSafeAlt(G.F.pos,G.wp));}audio.click();pad.rumble(0.1,0.3,80);toast(`Ziel gesetzt: ${G.wp.name||'Kartenpunkt'} – folge der türkisen Linie`,2600);}
function clearWp(){if(!G||!G.wp)return;G.wp=null;if(G.ap)G.ap.nav=false;audio.click();toast('Eigenes Ziel gelöscht',1500);}
// ---------- Anflugplaner: Piste auf der Karte antippen → Anflug wählen ----------
function apprMenu(x,z,cx,cy){if(!G||G.lesson)return false;const A=runwayAt(x,z,Math.max(350,24/mapXf().k));if(!A)return false;
  const opts=approachOptions(A.icao),box=$('mapPop');
  box.innerHTML=`<b>${esc(A.name)} (${A.icao})</b>`+opts.map((o,i)=>`<button data-i="${i}" class="${o.safe?'':'warn'}">✈ Landeanflug Piste ${o.rwy}<small>${o.safe?'Kurs '+String(Math.round(((Math.atan2((o.rev?-1:1)*o.A.sin,(o.rev?-1:1)*o.A.cos)/DEG)+360)%360)).padStart(3,'0')+'°':'nicht empfohlen – Gelände'}</small></button>`).join('')+`<button data-i="wp" class="ghost">📍 Nur als Ziel setzen</button><button data-i="x" class="ghost">Abbrechen</button>`;
  const r=$('mapc').getBoundingClientRect();box.style.left=Math.min(cx+12,r.width-250)+'px';box.style.top=Math.min(cy-10,r.height-60-opts.length*52)+'px';box.classList.remove('hidden');
  box.querySelectorAll('button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();box.classList.add('hidden');const k=b.dataset.i;if(k==='x')return;if(k==='wp'){setWp(x,z);return;}setAppr(opts[+k]);});
  return true;}
function apprAuto(x,z){if(!G||G.lesson)return false;const A=runwayAt(x,z,Math.max(350,24/mapXf().k));if(!A)return false;const F=G.F;
  // Gamepad: die geländesichere Richtung mit der kürzesten Kurve
  const opts=approachOptions(A.icao).filter(o=>o.safe);if(!opts.length)return false;let best=opts[0],bd=1e9;
  for(const o of opts){const s=o.rev?-1:1,hx=s*o.A.sin,hz=-s*o.A.cos,d=Math.acos(clamp((F.vel.x*hx+F.vel.z*hz)/Math.max(1,Math.hypot(F.vel.x,F.vel.z)),-1,1));if(d<bd){bd=d;best=o;}}
  setAppr(best);return true;}
function setAppr(o){if(!G)return;G.apprOpt=o;G.appr=planApproach(G.F,G.P,o,S);G.apprT=G.t;G.wp=null;buildApprRibbon();if(G.ap)G.ap.nav=true;audio.click();
  const pl=G.appr,tod=pl.iTOD>=0?` · Sinkflug in ${(pl.pts[pl.iTOD].s/1000).toFixed(1)} km`:'';toast(`Anflug Piste ${pl.rwy} ${pl.name}: ${(pl.L/1000).toFixed(1)} km${tod} – folge der violetten Bahn`,4500);}
function clearAppr(){if(!G||!G.appr)return;G.appr=null;G.apprG=null;if(G.apprRib){scene.remove(G.apprRib);G.apprRib.geometry.dispose();G.apprRib=null;}}
// goldenes Band mit Pfeilen entlang der Flugbahn durch die Ringe; bereits durchflogene Abschnitte verschwinden (uOi)
const PATH_U={uOi:{value:0}};
function buildPathRibbon(){const pts=G.path,pos=[],idx=[],al=[],ac=[],lg=[],fin=[],W=G.P.prop?14:22;
  for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*W/2,nz=dx/l*W/2,p=pts[i];
    const f=G.obj[p.leg]&&(G.obj[p.leg].final||G.obj[p.leg].type==='land')?1:0;
    pos.push(p.x+nx,p.y,p.z+nz,p.x-nx,p.y,p.z-nz);al.push(p.s,p.s);ac.push(-1,1);lg.push(p.leg,p.leg);fin.push(f,f);}
  for(let k=0;k<pts.length-1;k++){if(pts[k].brk)continue;const a=k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
  g.setAttribute('al',new THREE.Float32BufferAttribute(al,1));g.setAttribute('ac',new THREE.Float32BufferAttribute(ac,1));g.setAttribute('lg',new THREE.Float32BufferAttribute(lg,1));g.setAttribute('fin',new THREE.Float32BufferAttribute(fin,1));
  {const cl=[];fin.forEach(f=>cl.push(...(f?[0.03,0.55,1.0]:[1.0,0.45,0.04])));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));}
  const mat=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false,fog:true,toneMapped:false});
  mat.onBeforeCompile=sh=>{sh.uniforms.uOi=PATH_U.uOi;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float al;attribute float ac;attribute float lg;attribute float fin;varying float vAl;varying float vAc;varying float vLg;varying float vFin;varying vec3 vWp;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvAl=al;vAc=ac;vLg=lg;vFin=fin;vWp=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uOi;varying float vAl;varying float vAc;varying float vLg;varying float vFin;varying vec3 vWp;')
      .replace('#include <opaque_fragment>',`if(vLg<uOi-0.5)discard;
 float dc=length(vWp-cameraPosition);
 // Pfeile (Spitze in Flugrichtung) alle 90 m, dazwischen dünne Randlinien
 float ch=fract((vAl+abs(vAc)*42.0)/90.0);float arrow=smoothstep(0.0,0.04,ch)*(1.0-smoothstep(0.22,0.27,ch));float edge=smoothstep(0.78,0.9,abs(vAc));
 float a=max(arrow,edge*0.85)*smoothstep(70.0,380.0,dc);if(a<0.02)discard;
 diffuseColor.a*=a;
#include <opaque_fragment>`);};
  const m=new THREE.Mesh(g,mat);m.frustumCulled=false;m.renderOrder=3;PATH_U.uOi.value=0;
  scene.add(m);G.pathRib=m;G.dyn.push(m);}
// violettes Band in der Luft entlang der geplanten Bahn (Sollhöhe)
function buildApprRibbon(){if(G.apprRib){scene.remove(G.apprRib);G.apprRib.geometry.dispose();}const pts=G.appr.pts,pos=[],idx=[],al=[],W=G.P.prop?16:26;
  for(let i=0;i<pts.length;i+=2){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*W/2,nz=dx/l*W/2,p=pts[i];
    pos.push(p.x+nx,p.y,p.z+nz,p.x-nx,p.y,p.z-nz);const t=(i/pts.length);al.push(t,t);}
  for(let k=0;k<pos.length/6-1;k++){const a=k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
  g.setAttribute('al',new THREE.Float32BufferAttribute(al.map((t,k)=>pts[Math.min(pts.length-1,(k>>1)*2)].s),1));
  // nahe der Kamera ausblenden, gestrichelt alle 120 m (wirkt wie Leitlinien in der Luft)
  const mat=new THREE.MeshBasicMaterial({color:0xd65cff,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false,fog:true});
  mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float al;varying float vAl;varying vec3 vWp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvAl=al;vWp=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vAl;varying vec3 vWp;').replace('#include <opaque_fragment>','float dc=length(vWp-cameraPosition);diffuseColor.a*=smoothstep(60.0,320.0,dc)*(0.35+0.65*step(0.45,fract(vAl/120.0)));\n#include <opaque_fragment>');};
  const m=new THREE.Mesh(g,mat);m.frustumCulled=false;m.renderOrder=3;
  scene.add(m);G.apprRib=m;G.dyn.push(m);}
function apprTick(F){if(!G.appr)return;G.apprG=approachGuide(G.appr,F,G.P);const g=G.apprG;
  // weit weg von der Bahn: neu berechnen (höchstens alle 12 s)
  if(g.phase!=='final'&&Math.hypot(g.p.x-F.pos.x,g.p.z-F.pos.z)>1800&&G.t-G.apprT>12){G.appr=planApproach(F,G.P,G.apprOpt,S);G.apprT=G.t;buildApprRibbon();toast('Anflug neu berechnet',2000);G.apprG=approachGuide(G.appr,F,G.P);}
  if(F.onGround&&g.phase==='final'){clearAppr();toast('Gelandet – Anflug beendet',2200);}}
// Geschwindigkeitsgrenzen: Höchstgeschwindigkeit, Klappen, Tempolimit im Flugplatz-Nahbereich – mit Erklärung beim ersten Überschreiten
const VMO={alpina:94,saentis:136,segler:69,titlis:158,foehn:167,feuer:125,rega:89,l320:247,l330:239,l340:267,l350:247,l380:233,l32n:247,l747:260};
function speedWarn(F,P,V){if(F.onGround||!G||G.lesson&&G.lesson.noWarn)return null;const u=save.settings.units==='metric',f=v=>u?`${Math.round(v*3.6/10)*10} km/h`:`${Math.round(v*1.944/5)*5} kt`;
  const vmo=VMO[P.id]||P.Vr*3,n=(P.flapNames||[]).length,k=F.flaps|0,vfe=k>0&&n>1?P.Vref*(1.75-0.45*k/(n-1)):Infinity,z=atc.zone;let w=null;
  if(V>vmo)w={k:'vmo',lbl:'MAX '+f(vmo).replace(' km/h','').replace(' kt',''),msg:`Tempo rot = zu schnell! Die Höchstgeschwindigkeit der ${P.name} ist ${f(vmo)}. Schub reduzieren (S), Nase etwas hoch oder Luftbremse (B).`};
  else if(V>vfe&&!P.heli)w={k:'vfe',lbl:'KLAPPEN',msg:`Tempo rot = zu schnell für Klappen ${P.flapNames[k]}: höchstens ${f(vfe)}. Klappen einfahren (F) oder langsamer werden.`};
  else if(z&&V>z.limit)w={k:'zone',lbl:'LIMIT '+f(z.limit).replace(' km/h','').replace(' kt',''),msg:''};
  if(w&&w.msg){G.spdMsg=G.spdMsg||{};const t=G.t;if(!(G.spdMsg[w.k]>t-25)){G.spdMsg[w.k]=t;toast(w.msg,6000);}}
  return w;}
// Autopilot einschalten: erst wählen, ob das Tempo gehalten oder auf Höchstgeschwindigkeit beschleunigt wird
function apAskOpen(){const F=G.F,u=save.settings.units==='metric',f=v=>u?`${Math.round(v*3.6/10)*10} km/h`:`${Math.round(v*1.944/5)*5} kt`;G.apAsk=true;
  $('apAsk').innerHTML=`<b>Autopilot</b><button data-m="0"><kbd>1</kbd> Tempo halten <small>${f(F.vel.length())}</small></button><button data-m="1"><kbd>2</kbd> Höchstgeschwindigkeit <small>${f(apMaxSpd(F,G.P))}</small></button><span>Esc: abbrechen · Controller: ◀ Tempo halten, ▶ Höchstgeschwindigkeit</span>`;
  $('apAsk').classList.remove('hidden');$('apAsk').querySelectorAll('button').forEach(b=>b.onclick=()=>apEngage(b.dataset.m==='1'));audio.click();}
function apAskClose(){G.apAsk=false;$('apAsk').classList.add('hidden');}
function apMaxSpd(F,P){const vmo=VMO[P.id]||P.Vr*3,z=atc.zone;let v=vmo*0.92;if(z&&z.limit)v=Math.min(v,z.limit*0.97);return Math.max(v,P.Vref*1.4);}
function apEngage(max){apAskClose();const F=G.F;if(G.ap||F.onGround)return;const e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');
  G.ap={hdg:((-e.y/DEG)%360+360)%360,alt:Math.max(F.pos.y,S.groundAt(F.pos.x,F.pos.z)+150),spd:max?apMaxSpd(F,G.P):F.vel.length(),max,nav:!!G.wp};if(G.wp)G.ap.alt=Math.max(G.ap.alt,routeSafeAlt(F.pos,G.wp));F.assist=true;
  const sp=max?' · beschleunigt auf Höchstgeschwindigkeit':' · hält das Tempo';
  toast(G.appr?`Autopilot EIN – fliegt den Anflug auf Piste ${G.appr.rwy}${sp} (Landung von Hand)`:G.wp?`Autopilot EIN – fliegt zum Ziel ${G.wp.name||''} (${Math.round(G.ap.alt)} m)${sp}`:`Autopilot EIN – hält Kurs und Höhe${sp}`,3200);}
function wpBrg(F){return((Math.atan2(G.wp.x-F.pos.x,-(G.wp.z-F.pos.z))/DEG)+360)%360;}
// höchstes Gelände entlang der Strecke + Reserve (für den Autopiloten)
function routeSafeAlt(p,w){let m=0;for(let i=0;i<=40;i++){const u=i/40,x=p.x+(w.x-p.x)*u,z=p.z+(w.z-p.z)*u;for(const o of [-500,0,500])m=Math.max(m,S.groundAt(x+o,z),S.groundAt(x,z+o));}return Math.min(m+350,5200);}
function mapPad(dt){if(!G)return;const S0=$('mapc').width,T=mapXf();
  if(Math.abs(pad.lx)>0||Math.abs(pad.ly)>0){if(!MV.cur||!MV.padCur)MV.cur={x:G.F.pos.x,z:G.F.pos.z};MV.padCur=true;const sp=Math.pow(Math.hypot(pad.lx,pad.ly),1.6)*520/T.k*dt,a=Math.atan2(pad.ly,pad.lx);MV.cur.x+=Math.cos(a)*sp;MV.cur.z+=Math.sin(a)*sp;
    const h=HALF-200;MV.cur.x=clamp(MV.cur.x,-h,h);MV.cur.z=clamp(MV.cur.z,-h,h);
    const px=T.X(MV.cur.x),py=T.Y(MV.cur.z),m=70;if(MV.z>1&&(px<m||px>S0-m||py<m||py>S0-m)){MV.cx+=(px<m?-1:px>S0-m?1:0)*300/T.k*dt;MV.cz+=(py<m?-1:py>S0-m?1:0)*300/T.k*dt;mapClamp();}}
  if(Math.abs(pad.rx)>0||Math.abs(pad.ry)>0){MV.cx+=pad.rx*600/T.k*dt;MV.cz+=pad.ry*600/T.k*dt;mapClamp();}
  if(pad.r2>0.1||pad.l2>0.1)mapZoom(1+(pad.r2-pad.l2)*dt*2);}
$('mini').addEventListener('click',()=>{if(state==='fly')toggleMap();});$('mini').title='Grosse Karte öffnen (M)';
{const mc=$('mapc'),mpos=e=>{const r=mc.getBoundingClientRect();return[(e.clientX-r.left)/r.width*mc.width,(e.clientY-r.top)/r.height*mc.height];};
  const PT=new Map();mc.addEventListener('pointerdown',e=>{PT.set(e.pointerId,[e.clientX,e.clientY]);if(PT.size===2){const[a,b]=[...PT.values()];MV.pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:MV.z};MV.drag=null;return;}},true);
  mc.addEventListener('pointerup',e=>{PT.delete(e.pointerId);if(PT.size<2)MV.pinch=null;},true);mc.addEventListener('pointercancel',e=>{PT.delete(e.pointerId);MV.pinch=null;});
  mc.addEventListener('pointerdown',e=>{if(e.button!==0||state!=='map'||MV.pinch)return;MV.drag={x:e.clientX,y:e.clientY,cx:MV.cx,cz:MV.cz,moved:false};try{mc.setPointerCapture(e.pointerId);}catch(_){}});
  mc.addEventListener('pointermove',e=>{if(state!=='map')return;if(PT.has(e.pointerId))PT.set(e.pointerId,[e.clientX,e.clientY]);if(MV.pinch&&PT.size===2){const[a,b]=[...PT.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=mc.getBoundingClientRect(),sc=mc.width/r.width;const mx=((a[0]+b[0])/2-r.left)*sc,my=((a[1]+b[1])/2-r.top)*sc;mapZoom(clamp(MV.pinch.z*d/MV.pinch.d,1,8)/MV.z,mx,my);return;}const[px,py]=mpos(e),T=mapXf();
    if(MV.drag){const dx=e.clientX-MV.drag.x,dy=e.clientY-MV.drag.y;if(Math.hypot(dx,dy)>6)MV.drag.moved=true;if(MV.drag.moved&&MV.z>1){const r=mc.getBoundingClientRect(),sc=mc.width/r.width;MV.cx=MV.drag.cx-dx*sc/T.k;MV.cz=MV.drag.cz-dy*sc/T.k;mapClamp();}}
    if(e.pointerType==='mouse'){MV.cur=T.inv(px,py);MV.padCur=false;}});
  mc.addEventListener('pointerup',e=>{if(state==='map'&&MV.drag&&!MV.drag.moved&&!MV.pinch){const[px,py]=mpos(e),w=mapXf().inv(px,py),r=mc.getBoundingClientRect();if(!apprMenu(w.x,w.z,e.clientX-r.left,e.clientY-r.top))setWp(w.x,w.z);}MV.drag=null;});
  mc.addEventListener('pointerleave',()=>{if(!MV.padCur)MV.cur=null;});
  mc.addEventListener('contextmenu',e=>{e.preventDefault();clearWp();clearAppr();});
  mc.addEventListener('wheel',e=>{e.preventDefault();if(state!=='map')return;const[px,py]=mpos(e);mapZoom(e.deltaY<0?1.25:0.8,px,py);},{passive:false});
  $('mapZin').onclick=()=>mapZoom(1.5);$('mapZout').onclick=()=>mapZoom(1/1.5);$('mapCtr').onclick=()=>mapCenter();$('mapClr').onclick=()=>{clearWp();clearAppr();};$('mapClose').onclick=()=>{if(state==='map')toggleMap();};}
function wpHud(F,cam){const el=$('wpmk'),info=$('wpInfo');if(!G.wp||F.crashed||G.lesson){el.style.display='none';info.style.display='none';return;}
  const dd=Math.hypot(F.pos.x-G.wp.x,F.pos.z-G.wp.z);
  if(dd<(G.P.heli?250:G.P.mass>60000?1500:700)&&!G.wpDone){G.wpDone=true;audio.chime();pad.rumble(0.2,0.5,180);toast(`Ziel erreicht: ${G.wp.name||'Kartenpunkt'} ✓`,3000);G.wp=null;if(G.ap)G.ap.nav=false;el.style.display='none';info.style.display='none';return;}
  const gy=Math.max(S.groundAt(G.wp.x,G.wp.z),0)+60,v=new THREE.Vector3(G.wp.x,gy,G.wp.z).project(cam),Wd=innerWidth,Hd=innerHeight;let x=(v.x*0.5+0.5)*Wd,y=(-v.y*0.5+0.5)*Hd;const behind=v.z>1;if(behind){x=Wd-x;y=Hd-y;}
  const m=90,off=behind||x<m||x>Wd-m||y<m||y>Hd-m;
  if(off){const cx=Wd/2,cy=Hd/2;let dx=x-cx,dy=y-cy;if(Math.abs(dx)<1&&Math.abs(dy)<1)dy=1;const k=Math.min((cx-m)/Math.max(Math.abs(dx),1e-6),(cy-m)/Math.max(Math.abs(dy),1e-6));x=cx+dx*k;y=cy+dy*k;el.querySelector('.arr').style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;}
  el.classList.toggle('off',off);el.style.display=state==='map'?'none':'block';el.style.transform=`translate(${x}px,${y}px)`;setTxt('wpdist',fmtD(dd));
  if(G.mission){info.style.display='';setHTML('wpInfo',`<i></i>${esc(G.wp.name||'Eigenes Ziel')} · ${fmtD(dd)} · ${String(Math.round(wpBrg(F))).padStart(3,'0')}°`);}else info.style.display='none';}

$('pResume').onclick=togglePause;$('pDesk').onclick=toDesktop;$('mDesk').onclick=toDesktop;$('pMap').onclick=()=>{togglePause();toggleMap();};
$('pVol').oninput=e=>{save.settings.vol=parseFloat(e.target.value);audio.setVolume(save.settings.vol);persist();};
const PADK={thrUp:'R2',thrDn:'L2',pUp:'L-Stick ↓',pDn:'L-Stick ↑',rL:'L-Stick ←',rR:'L-Stick →',yL:'L1',yR:'R1',fDn:'□',fUp:'△',gear:'○',brk:'✕',drop:'▼',cam:'R3',map:'▲ / Touchpad',pause:'Options',assist:'▶',ap:'◀',radio:'L3 / Create',photo:'–',push:'–'};
function renderPause(){if(!G)return;const o=G.obj[G.oi];$('pEye').textContent='PAUSE · '+(G.lesson?'LEKTION':G.mission?(G.mission.contract?'AUFTRAG':'MISSION'):'FREIER FLUG');
  const s=Math.floor(G.t),tt=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  $('pStat').innerHTML=`<b>${esc(G.lesson?G.lesson.name:G.mission?G.mission.name:'Freier Flug · '+G.P.name)}</b><span>Flugzeit ${tt}${G.obj.length?` · Ziel ${Math.min(G.oi+1,G.obj.length)} von ${G.obj.length}`:''}${G.wp?' · Eigenes Ziel: '+esc(G.wp.name||'Kartenpunkt'):''}</span>`;
  $('pAssist').innerHTML=[['1','An'],['0','Aus']].map(([v,n])=>`<button class="chip ${(G.F.assist?'1':'0')===v?'sel':''}" data-v="${v}">${n}</button>`).join('');
  $('pAssist').querySelectorAll('button').forEach(b=>b.onclick=()=>{G.F.assist=b.dataset.v==='1';save.settings.assist=G.F.assist;persist();renderPause();});
  $('pVol').value=save.settings.vol??0.7;
  const k=save.settings.keys||{},gp=pad.connected,skip=gp?['photo','push']:[];
  $('pKeys').innerHTML=(gp?'<p class="hint">Controller</p>':'')+'<div class="kgrid">'+ACTS.filter(a=>!skip.includes(a[0])&&!(a[0]==='drop'&&!G.crates&&!G.P.amphib)&&!(a[0]==='push'&&!G.atGate)).map(([a,n,d])=>`<span>${n}</span><kbd>${gp?PADK[a]:keyName(k[a]||d)}</kbd>`).join('')+'</div>';}
$('pPhoto').onclick=()=>togglePhoto();$('pReplay').onclick=startReplay;$('pRestart').onclick=()=>startFlight(G.cfg);$('pMenu').onclick=showMenu;
function finish(ok,reason){
  if(!G||G.done)return;G.done=true;state='result';$('hud').classList.add('hidden');$('mapov').classList.add('hidden');atc.stop();
  const m=G.mission,job=m&&m.contract,t=Math.floor(G.t),ts=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;let h;const earn=[];
  const rp=G.rec.length>30?'<button class="ghost" id="rReplay">Wiederholung</button>':'';
  const atcLine=atc.c&&atc.c.enabled!==false?`<span>Funk</span><div class="b"><div style="width:${atc.score()}%"></div></div><span class="sub">${atc.pen.length?atc.pen.join(', '):'vorbildlich'}</span>`:'';
  const earnHtml=()=>earn.length?`<div class="earn">${earn.map(([l,v])=>`<div><span>${l}</span><b class="${v<0?'neg':''}">${v>0?'+ ':''}${fmtCHF(v)}</b></div>`).join('')}<div class="tot"><span>Kontostand</span><b>${fmtCHF(career.C.money)}</b></div></div>`:'';
  if(ok){let st,letter,parts='',sub='';const ord='SABCD';
    if(m.race){const lim=m.race;st=G.t<=lim[0]?3:G.t<=lim[1]?2:1;letter=st===3?'S':st===2?'A':'B';sub=`Zeit ${ts} · ★★★ unter ${fmtT(lim[0])} · ★★ unter ${fmtT(lim[1])}`;
      parts=`<span>Zeit</span><div class="b"><div style="width:${clamp(100*lim[0]/G.t,5,100)}%"></div></div><span class="sub">${ts}</span>`;}
    else if(m.contest&&G.spots&&G.spots.length){const avg=G.spots.reduce((a,b)=>a+b,0)/G.spots.length;letter=avg<6?'S':avg<12?'A':avg<25?'B':avg<50?'C':'D';st=avg<12?3:avg<25?2:1;sub=`Ø ${avg.toFixed(1)} m neben der Linie`;
      parts=G.spots.map((d,i)=>`<span>Landung ${i+1}</span><div class="b"><div style="width:${clamp(100-d*2,4,100)}%"></div></div><span class="sub">${d.toFixed(1)} m</span>`).join('');}
    else if(!G.lastTouch&&G.waterTouch!=null){const sk=G.waterTouch;letter=sk<1?'S':sk<1.6?'A':sk<2.4?'B':sk<3.2?'C':'D';st=letter==='S'||letter==='A'?3:letter==='D'?1:2;sub=`Flugzeit ${ts}`;
      parts=`<span>Sinkrate</span><div class="b"><div style="width:${clamp(100-sk*25,5,100)}%"></div></div><span class="sub">${sk.toFixed(1)} m/s auf dem Wasser</span>`;}
    else if(G.lastTouch){const gr=G.lastTouch;letter=gr.letter;st=letter==='S'||letter==='A'?3:letter==='D'?1:2;
      parts=gr.parts.map(p=>`<span>${p[0]}</span><div class="b"><div style="width:${p[1]/25*100}%"></div></div><span class="sub">${p[2]}</span>`).join('');sub=`Flugzeit ${ts}`;}
    else{const c=G.comfort;letter=c>=95?'S':c>=85?'A':c>=65?'B':c>=45?'C':'D';st=letter==='S'||letter==='A'?3:letter==='D'?1:2;sub=`Flugzeit ${ts}`;}
    if(m.comfort){const c=Math.round(G.comfort);parts+=`<span>Komfort</span><div class="b"><div style="width:${c}%"></div></div><span class="sub">${c} % zufriedene Passagiere</span>`;st=Math.min(st,c>=85?3:c>=65?2:1);}
    if(atcLine){parts+=atcLine;if(atc.pen.length)st=Math.max(1,st-1);}
    let rec=false;
    if(!m.dyn){const old=save.stars[m.id]||0;rec=st>old;save.stars[m.id]=Math.max(old,st);if(!save.grades[m.id]||ord.indexOf(letter)<ord.indexOf(save.grades[m.id]))save.grades[m.id]=letter;
      const base=2500+MISSIONS.indexOf(m)*700;if(st>old)earn.push([`Neue Sterne (${old} → ${st})`,Math.round(base*(st-old)/3/50)*50]);else earn.push(['Wiederholungsflug',Math.round(base*0.15*st/3/50)*50]);
      const bt=career.C.best[m.id];if(!bt||G.t<bt){career.C.best[m.id]=Math.round(G.t*10)/10;career.ghostSet(m.id,G.t,G.gh);sub+=bt?` · neue Bestzeit (−${(bt-G.t).toFixed(1)} s)`:' · erste Bestzeit gesetzt';}
      else sub+=` · Bestzeit ${fmtT(bt)}`;}
    else if(job.daily){if(career.C.daily[job.daily])earn.push(['Tagesaufgabe (heute schon erfüllt)',0]);else{career.C.daily[job.daily]=1;earn.push(['Tagesaufgabe erfüllt',5000]);}}
    else{const gf={S:1.3,A:1.15,B:1,C:0.8,D:0.5}[letter]||1;earn.push([`Lohn · Note ${letter}`,Math.round(job.pay*gf/50)*50]);
      if(m.comfort){const c=Math.round(G.comfort);if(c<70)earn.push([`Komfortabzug (${c} %)`,-Math.round(job.pay*(70-c)/100/50)*50]);}
      if(atc.pen.length)earn.push(['Busse der Flugsicherung',-Math.round(job.pay*0.1*atc.pen.length/50)*50]);
      career.jobDone(job.n);career.refill(S);}
    career.add(earn.reduce((a,e)=>a+e[1],0));persist();
    checkBadges({ok:true,m,letter,st});
    const next=!m.dyn&&MISSIONS[MISSIONS.indexOf(m)+1];
    h=`<div class="reshead"><div><div class="eyebrow">${job?(job.daily?'TAGESAUFGABE ERFÜLLT':'AUFTRAG ERLEDIGT'):'MISSION ERFÜLLT'}</div><h2>${m.name}</h2><div class="sub">${sub}${rec?' · neuer Bestwert':''}</div>${starsHtml(st)}</div><div class="grade">${letter}</div></div>
      <div class="res">${parts}</div><canvas id="rMap" width="760" height="220"></canvas>${earnHtml()}
      <div class="btnrow">${next?'<button id="rNext">Nächste Mission</button>':''}${job&&!job.daily?'<button id="rJobs">Zu den Aufträgen</button>':'<button class="ghost" id="rAgain">Nochmal</button>'}${rp}<button class="ghost" id="rMenu">Menü</button></div>`;
    $('resbody').innerHTML=h;if(next)$('rNext').onclick=()=>showBrief(next.id);
  }else{
    if(job&&!job.daily&&G.F.crashed){const fee=Math.max(500,Math.round((PRICE[job.plane]||0)*0.02/50)*50);earn.push(['Reparatur des Flugzeugs',-fee]);career.add(-fee);}
    h=`<div class="eyebrow red">${job?'AUFTRAG GESCHEITERT':m?'MISSION GESCHEITERT':'FLUG BEENDET'}</div><h2>${m?m.name:G.lesson?G.lesson.name:'Freier Flug'}</h2><p class="big">${reason}</p><canvas id="rMap" width="760" height="220"></canvas>${earnHtml()}
    <div class="tip"><b>Tipp:</b> Im Endanflug Klappen setzen (F / Quadrat), Schub reduzieren und mit der Nase leicht unter dem Horizont sinken. Kurz vor dem Aufsetzen sanft ↓ ziehen. Zu schnell? Luftbremse (B / Kreuz).</div>
    <div class="btnrow"><button id="rAgain">Nochmal</button>${rp}<button class="ghost" id="rMenu">Menü</button></div>`;$('resbody').innerHTML=h;}
  try{trackMap();}catch(e){const c=$('rMap');if(c)c.remove();}
  if($('rAgain'))$('rAgain').onclick=()=>startFlight(G.cfg);if($('rJobs'))$('rJobs').onclick=()=>{showMenu();openCareer('cJobs');};
  $('rMenu').onclick=showMenu;if($('rReplay'))$('rReplay').onclick=startReplay;$('result').classList.remove('hidden');nav.clear();
}
// ---------- Tastenbelegung ----------
const ACTS=[['thrUp','Schub mehr','KeyW'],['thrDn','Schub weniger','KeyS'],['pUp','Nase hoch (ziehen)','ArrowDown'],['pDn','Nase runter','ArrowUp'],['rL','Kurve links','KeyA'],['rR','Kurve rechts','KeyD'],
  ['yL','Seitenruder links','KeyQ'],['yR','Seitenruder rechts','KeyE'],['fDn','Klappen aus','KeyF'],['fUp','Klappen ein','KeyV'],['gear','Fahrwerk','KeyG'],['brk','Bremse / Luftbremse','KeyB'],
  ['drop','Abwurf','Space'],['cam','Kamera','KeyC'],['map','Karte','KeyM'],['pause','Pause','KeyP'],['assist','Flughilfe','KeyH'],['ap','Autopilot','KeyU'],['radio','Funk','KeyT'],['photo','Fotomodus','KeyK'],['push','Pushback','KeyJ']];
let REMAP={},REC=null;
function buildRemap(){REMAP={};const k=save.settings.keys||{};for(const [a,,d] of ACTS){const p=k[a];if(p&&p!==d&&REMAP[d]===undefined)REMAP[d]='None';}for(const [a,,d] of ACTS){const p=k[a];if(p&&p!==d)REMAP[p]=d;}}
const keyName=c=>!c?'–':c.startsWith('Key')?c.slice(3):c.startsWith('Digit')?c.slice(5):({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'Leertaste',ShiftLeft:'Shift',ShiftRight:'Shift rechts',ControlLeft:'Ctrl',Enter:'Enter',Backspace:'⌫',Tab:'Tab'}[c]||c);
function renderKeys(){const k=save.settings.keys||{};$('kMap').innerHTML=ACTS.map(([a,n,d])=>`<span>${n}</span><button class="chip kb ${REC===a?'sel':''}" data-a="${a}">${REC===a?'Taste drücken …':keyName(k[a]||d)}</button>`).join('');
  $('kMap').querySelectorAll('.kb').forEach(b=>b.onclick=()=>{REC=b.dataset.a;renderKeys();});}
function recordKey(code){const a=REC;REC=null;if(code!=='Escape'){const k=save.settings.keys=save.settings.keys||{};const def=Object.fromEntries(ACTS.map(x=>[x[0],x[2]]));
  const other=ACTS.find(([b,,d])=>b!==a&&(k[b]||d)===code);if(other)k[other[0]]=k[a]||def[a];k[a]=code;persist();buildRemap();toast(`${ACTS.find(x=>x[0]===a)[1]}: ${keyName(code)}${other?' (getauscht mit «'+other[1]+'»)':''}`,2600);}renderKeys();}
$('kReset').onclick=()=>{save.settings.keys={};persist();buildRemap();renderKeys();toast('Standard-Tastenbelegung wiederhergestellt');};
buildRemap();renderKeys();
// ---------- Vibration ----------
{const r0=pad.rumble;pad.rumble=(a,b,ms)=>{const k=parseFloat(save.settings.vib??1);if(k>0)r0(a*k,b*k,ms);};}
// ---------- Touch-Steuerung ----------
const TOUCH={on:false,x:0,y:0,yaw:0};
const isTouchDev=()=>{try{return matchMedia('(pointer: coarse)').matches||'ontouchstart' in window;}catch(e){return false;}};
function touchActive(){const t=save.settings.touch||'auto';return t==='on'||(t==='auto'&&isTouchDev());}
function touchSync(){const on=touchActive()&&state==='fly';TOUCH.on=on;$('touch').classList.toggle('hidden',!on);document.body.classList.toggle('touchui',touchActive());}
{const st=$('tStick'),kn=$('tKnob');let id=null;const mv=e=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;let dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}
    TOUCH.x=dx;TOUCH.y=dy;kn.style.transform=`translate(${dx*R*0.6}px,${dy*R*0.6}px)`;};
  st.addEventListener('pointerdown',e=>{id=e.pointerId;st.setPointerCapture(id);mv(e);});st.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e);});
  const up=e=>{if(e.pointerId!==id)return;id=null;TOUCH.x=TOUCH.y=0;kn.style.transform='';};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  const th=$('tThr');let tid=null;const tv=e=>{const r=th.getBoundingClientRect(),v=clamp(1-(e.clientY-r.top)/r.height,0,1);if(G&&G.F){G.F.thr=v;}$('tThrFill').style.height=(v*100)+'%';};
  th.addEventListener('pointerdown',e=>{tid=e.pointerId;th.setPointerCapture(tid);tv(e);});th.addEventListener('pointermove',e=>{if(e.pointerId===tid)tv(e);});th.addEventListener('pointerup',()=>tid=null);
  document.querySelectorAll('#tBtns button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();audio.init();const c=b.dataset.k;if(b.dataset.hold)K.add(c);else keyAction(c);});
    b.addEventListener('pointerup',()=>{if(b.dataset.hold)K.delete(b.dataset.k);});b.addEventListener('pointerleave',()=>{if(b.dataset.hold)K.delete(b.dataset.k);});});
  document.querySelectorAll('#tRud button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();TOUCH.yaw=+b.dataset.y;});const u=()=>TOUCH.yaw=0;b.addEventListener('pointerup',u);b.addEventListener('pointerleave',u);});}
// ---------- Fotomodus ----------
const PH={yaw:0,pit:0.25,dist:30,filt:0,hud:true,prev:'fly',drag:null};
const PFILT=[['Normal','none'],['Warm','sepia(0.25) saturate(1.3) contrast(1.05)'],['Kino','contrast(1.18) saturate(0.82) brightness(0.96)'],['Schwarzweiss','grayscale(1) contrast(1.18)'],['Retro','sepia(0.6) contrast(1.08) brightness(1.04)'],['Lebhaft','saturate(1.65) contrast(1.08)']];
function togglePhoto(){
  if(state!=='photo'){PH.prev=state;state='photo';try{speechSynthesis.pause();}catch(e){}
    G.model.position.copy(G.F.pos);G.model.quaternion.copy(G.F.q);
    const F=G.F,off=cam.position.clone().sub(G.model.position);PH.dist=clamp(off.length(),G.P.camDist*0.6,300);PH.yaw=Math.atan2(off.x,off.z);PH.pit=Math.asin(clamp(off.y/Math.max(1,off.length()),-0.3,1.4));
    ['hud','pause','mapov'].forEach(id=>$(id).classList.add('hidden'));$('photo').classList.remove('hidden');photoUI();if(G.cockpit)G.cockpit.visible=false;G.model.visible=!G.F.crashed;}
  else{state=PH.prev==='pause'?'pause':'fly';$('photo').classList.add('hidden');$('c').style.filter='';try{speechSynthesis.resume();}catch(e){}
    if(state==='pause')$('pause').classList.remove('hidden');else $('hud').classList.remove('hidden');G.camSnap=true;}}
function photoUI(){$('phFilt').textContent=PFILT[PH.filt][0];$('c').style.filter=PFILT[PH.filt][1]==='none'?'':PFILT[PH.filt][1];$('photo').classList.toggle('nohint',!PH.hud);}
function photoKey(code){if(!$('phOv').classList.contains('hidden')){if(code==='Escape'||code==='Enter'||code==='Space')$('phOv').classList.add('hidden');return;}if(code==='Escape'||code==='KeyK'||code==='KeyP')togglePhoto();else if(code==='Enter'||code==='Space')snapPhoto();else if(code==='KeyF'){PH.filt=(PH.filt+1)%PFILT.length;photoUI();}else if(code==='KeyH'){PH.hud=!PH.hud;photoUI();}}
function photoTick(dt){const t=G.model.position,k=dt*1.4;
  if(K.has('ArrowLeft')||K.has('KeyA'))PH.yaw+=k;if(K.has('ArrowRight')||K.has('KeyD'))PH.yaw-=k;if(K.has('ArrowUp'))PH.pit=Math.min(1.45,PH.pit+k*0.7);if(K.has('ArrowDown'))PH.pit=Math.max(-0.35,PH.pit-k*0.7);
  if(K.has('KeyW'))PH.dist=Math.max(4,PH.dist*(1-dt*1.2));if(K.has('KeyS'))PH.dist=Math.min(600,PH.dist*(1+dt*1.2));
  const cp=Math.cos(PH.pit);cam.position.set(t.x+Math.sin(PH.yaw)*cp*PH.dist,t.y+Math.sin(PH.pit)*PH.dist,t.z+Math.cos(PH.yaw)*cp*PH.dist);const gh=S.groundAt(cam.position.x,cam.position.z)+1.5;if(cam.position.y<gh)cam.position.y=gh;
  cam.up.set(0,1,0);cam.lookAt(t);cam.fov=45;cam.near=0.5;cam.updateProjectionMatrix();}
function snapPhoto(){try{if(composer&&!window.__noComp)composer.render();else renderer.render(scene,cam);const src=renderer.domElement,c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');
    const f=PFILT[PH.filt][1];if(f!=='none')x.filter=f;x.drawImage(src,0,0);x.filter='none';
    x.font=`700 ${Math.round(c.height*0.022)}px Inter,Arial`;x.fillStyle='rgba(255,255,255,0.85)';x.textAlign='right';x.fillText('SWISS SKY · '+G.P.name,c.width-c.height*0.03,c.height*0.965);
    const url=c.toDataURL('image/jpeg',0.92),d=new Date(),fn=`alpenflug-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}.jpg`;
    PH.url=url;PH.fn=fn;PH.blob=null;c.toBlob(b=>{PH.blob=b;},'image/jpeg',0.92);$('phImg').src=url;$('phOv').classList.remove('hidden');audio.click();
    const fl=$('phFlash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');}catch(e){toast('Foto konnte nicht erstellt werden.',2500);}}
$('phClose').onclick=()=>$('phOv').classList.add('hidden');
let DLNS=null;async function getDL(){if(DLNS)return DLNS;try{if(window.claude&&window.claude.use)DLNS=await window.claude.use('downloads');}catch(e){}return DLNS;}
$('phDl').onclick=async()=>{const d=await getDL();
  if(d){try{const data=PH.blob||await (await fetch(PH.url)).blob();await d.save({filename:PH.fn,data});toast('Foto gespeichert 📷',2500);}catch(e){if(e&&e.code==='declined')return;if(e&&e.code==='rate_limited'){toast('Bitte einen Moment warten …',2000);return;}toast('Speichern hier nicht möglich – Bild mit Rechtsklick bzw. lange drücken sichern.',3500);}return;}
  try{const a=document.createElement('a');a.href=PH.url;a.download=PH.fn;document.body.appendChild(a);a.click();a.remove();}catch(e){toast('Bild mit Rechtsklick bzw. lange drücken sichern.',3000);}};
{const cv=$('c');cv.addEventListener('pointerdown',e=>{if(state==='photo'){PH.drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);}});
  cv.addEventListener('pointermove',e=>{if(state==='photo'&&PH.drag){PH.yaw-=(e.clientX-PH.drag[0])*0.006;PH.pit=clamp(PH.pit+(e.clientY-PH.drag[1])*0.005,-0.35,1.45);PH.drag=[e.clientX,e.clientY];}});
  cv.addEventListener('pointerup',()=>{PH.drag=null;});cv.addEventListener('wheel',e=>{if(state==='photo'){e.preventDefault();PH.dist=clamp(PH.dist*(1+Math.sign(e.deltaY)*0.1),4,600);}},{passive:false});}
// ---------- Callouts & Kabinenansagen ----------
function pickVoice(lang){try{const vs=speechSynthesis.getVoices();return vs.find(v=>v.lang===lang)||vs.find(v=>v.lang&&v.lang.replace('_','-').startsWith(lang.slice(0,2)))||null;}catch(e){return null;}}
function say(text,lang,rate,pitch){if(save.settings.callouts===false)return;try{const u=new SpeechSynthesisUtterance(text),v=pickVoice(lang);if(v)u.voice=v;u.lang=lang;u.rate=rate||1;u.pitch=pitch||1;u.volume=Math.min(1,(save.settings.vol??0.7)+0.25);speechSynthesis.speak(u);}catch(e){}}
const CO_H=[2500,1000,500,100,50,40,30,20,10],CO_T={2500:'twenty five hundred',1000:'one thousand',500:'five hundred',100:'one hundred',50:'fifty',40:'forty',30:'thirty',20:'twenty',10:'ten'};
function airlineName(){const n=(livSpec(G.P.id,myLivery(G.P.id)).name||'LUIS AIRLINES').toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());return n;}
function calloutTick(F,dt){
  if(save.settings.callouts===false||F.crashed||G.done)return;const P=F.P,big=(P.cls==='jet'||P.cls==='regional')&&!P.amphib,agl=F.pos.y-S.groundAt(F.pos.x,F.pos.z)-P.gearH,ft=agl*3.281,vs=F.vel.y;
  const C=G.co||(G.co={arm:new Set(CO_H.filter(h=>ft>h+200)),w:{},cab:{}});
  if(!F.onGround){for(const h of CO_H){if(ft>h+250)C.arm.add(h);else if(C.arm.has(h)&&ft<=h&&vs<-0.3&&big&&F.gearPos>0.5){C.arm.delete(h);say(h===10&&P.cls==='jet'&&F.thr>0.12?'retard':CO_T[h],'en-US',1.3,0.85);break;}}
    // kleine Flugzeuge: Höhenansagen auf Deutsch in Metern
    if(!big&&!P.heli&&(P.fixedGear||F.gearPos>0.5)){const SM=C.sm||(C.sm={arm:new Set()}),HS=[30,20,10,5],TX={30:'dreissig',20:'zwanzig',10:'zehn',5:'fünf'};
      for(const h of HS){if(agl>h+15)SM.arm.add(h);else if(SM.arm.has(h)&&agl<=h&&vs<-0.4){SM.arm.delete(h);say(TX[h],'de-CH',1.25,1.0);break;}}}
    const warn=(k,txt,cond)=>{if(cond&&G.t-(C.w[k]||-99)>5){C.w[k]=G.t;say(txt,'en-US',1.2,0.8);}};
    const bk=Math.abs(F.bank||0)/DEG;warn('bank','bank angle, bank angle',bk>(P.cls==='jet'?37:47));
    if(big){warn('sink','sink rate',agl>40&&agl<760&&vs<-10.5);warn('pull','pull up, pull up',agl>20&&agl<320&&vs<-17);
      warn('gear','too low, gear',!P.fixedGear&&F.gearPos<0.5&&agl<150&&agl>15&&vs<-1&&F.vel.length()<P.Vref*1.35&&!G.gearStuck);}}
  // Kabinenansagen (Passagierflugzeuge)
  if(!big||(G.mission&&G.mission.contract&&!G.mission.contract.pax))return;const K=C.cab,ann=(k,txt)=>{if(K[k])return;K[k]=1;audio.dingdong();setTimeout(()=>say(txt,'de-CH',1.02,1),1300);};
  if(F.onGround&&G.t>3&&!G.lastTouch)ann('w',`Grüezi mitenand und herzlich willkommen an Bord von ${airlineName()}. Hier spricht Ihr Kapitän. Bitte schnallen Sie sich an – wir starten in Kürze. Wir wünschen Ihnen einen angenehmen Flug.`);
  if(!F.onGround&&(F.airTime>100||agl>1500)&&vs<4&&!K.a)ann('c','Meine Damen und Herren, das Anschnallzeichen ist erloschen. Geniessen Sie die Aussicht auf die Schweizer Alpen und die Seen.');
  const o=G.obj[G.oi];if(!F.onGround&&((o&&o.final)||(F.gearPos>0.5&&agl<700&&vs<-1&&F.airTime>30)))ann('a','Kabinenbesatzung, bitte Plätze für die Landung einnehmen.');
  if(F.onGround&&G.lastTouch&&F.vel.length()<22){const ap=G.lastTouch.ap||nearestAP(F.pos);ann('l',`Meine Damen und Herren, willkommen in ${ap&&ap.name?ap.name:'der Schweiz'}. Bitte bleiben Sie angeschnallt, bis das Flugzeug zum Stillstand gekommen ist. Merci vielmal und uf Wiederluege!`);}
}
// ---------- Echtes Wetter (Open-Meteo) ----------
async function liveWeather(){const f=save.free;toast('Wetter wird geladen …',1500);
  try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${ZS?47.38:46.69}&longitude=${ZS?8.54:7.86}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day&timezone=Europe%2FZurich`;
    const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),6000);const r=await fetch(u,{signal:ctl.signal});clearTimeout(tm);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json(),c=j.current;
    const code=c.weather_code,T=c.temperature_2m,cc=c.cloud_cover;
    const w=code>=95?'storm':(code>=71&&code<=77)||code===85||code===86?'snow':(code>=51&&code<=67)||(code>=80&&code<=82)?'rain':code===45||code===48?'fog':cc>80?'cloudy':cc>25?'fair':'clear';
    const spd=c.wind_speed_10m/3.6,gust=Math.max(0,c.wind_gusts_10m/3.6-spd);
    const tt=new Date(c.time);const hour=tt.getHours()+tt.getMinutes()/60;
    f.weather=w;f.wind={spd,gust:gust*0.7,turb:Math.min(0.9,0.1+gust/14),dir:c.wind_direction_10m};f.hour=hour;f.season=(w==='snow'||(T<2&&[11,12,1,2,3].includes(tt.getMonth()+1)))?'winter':'summer';
    const wn={storm:'Gewitter',snow:'Schneefall',rain:'Regen',fog:'Nebel',cloudy:'bewölkt',fair:'leicht bewölkt',clear:'klar'}[w];
    f.live=`${fmtH(hour)} · ${Math.round(T)} °C · ${wn} · Wind ${Math.round(c.wind_direction_10m/10)*10}° ${Math.round(c.wind_speed_10m)} km/h`;persist();renderFree();toast('Echtes Wetter übernommen: '+f.live,3500);}
  catch(e){toast('Wetterdienst nicht erreichbar – bitte später nochmal versuchen.',3500);}}
// ---------- Rega ----------
function heliGrade(ev){const sk=ev.sink,hs=ev.hs||0,v=sk+hs*0.35,letter=v<0.6?'S':v<1.0?'A':v<1.6?'B':v<2.4?'C':'D';
  return{letter,ap:ev.rw||WF.airportZone(ev.x,ev.z),parts:[['Sinkrate',clamp(25-sk*8,2,25),`${sk.toFixed(1)} m/s`],['Drift',clamp(25-hs*5,2,25),`${hs.toFixed(1)} m/s über Grund`],['Hang',clamp(25-(ev.slope||0)*80,2,25),`${Math.round(Math.atan(ev.slope||0)/DEG)}° Neigung`]]};}
function regaSetup(o){
  if(o.type==='hland'&&o.kind==='site'){const g=new THREE.Group();g.position.set(o.x,o.y,o.z);
    const N=50,sp=new Float32Array(N*3);for(let i=0;i<N;i++){sp[i*3]=(Math.random()-0.5)*6;sp[i*3+1]=Math.random()*140;sp[i*3+2]=(Math.random()-0.5)*6;}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));const sm=new THREE.Points(sg,new THREE.PointsMaterial({map:smokeTex,color:0xff7a1a,size:26,transparent:true,opacity:0.7,depthWrite:false}));sm.frustumCulled=false;sm.position.set(18,0,6);g.add(sm);o.sm=sm;
    const cr=new THREE.MeshBasicMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-4});for(const r of [Math.PI/4,-Math.PI/4]){const geo=new THREE.PlaneGeometry(8,1.2,8,1).rotateX(-Math.PI/2).rotateY(r),pa=geo.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,S.groundAt(o.x+pa.getX(i),o.z+pa.getZ(i))-o.y+0.12);g.add(new THREE.Mesh(geo,cr));}
    const jm=new THREE.MeshStandardMaterial({color:0xd7263d,roughness:0.6}),sk=new THREE.MeshStandardMaterial({color:0xe0b896});
    const p1=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,1.1,4,8),jm);p1.position.set(14,1,4);g.add(p1);const h1=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),sk);h1.position.set(14,1.95,4);g.add(h1);
    const p2=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,1.1,4,8),new THREE.MeshStandardMaterial({color:0x1d4ed8}));p2.rotation.z=Math.PI/2;p2.position.set(16,0.35,5);g.add(p2);
    g.add(makeGlow([18,2,6],[1,0.45,0.1],[10]));scene.add(g);G.dyn.push(g);o.mesh=g;}
  if(o.type==='hland'&&o.kind==='pad'){const g=new THREE.Group();g.position.set(o.x,o.y+0.15,o.z);const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
    x.fillStyle='#2b2f36';x.beginPath();x.arc(128,128,126,0,7);x.fill();x.strokeStyle='#ffd23f';x.lineWidth=10;x.beginPath();x.arc(128,128,112,0,7);x.stroke();x.fillStyle='#ffffff';x.font='900 150px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('H',128,136);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const pad=new THREE.Mesh(new THREE.CircleGeometry(12,40).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:t,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-2}));g.add(pad);
    const pos=[],col=[],sz=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2;pos.push(Math.cos(a)*12.5,0.4,Math.sin(a)*12.5);col.push(0.2,1,0.4);sz.push(1.4);}g.add(makeGlow(pos,col,sz));
    const ws=new THREE.Mesh(new THREE.ConeGeometry(0.5,2.4,10,1,true).rotateZ(Math.PI/2),new THREE.MeshStandardMaterial({color:0xff7a1a,side:THREE.DoubleSide}));ws.position.set(16,5,0);g.add(ws);const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,5,6),M_POLE);pole.position.set(17.2,2.5,0);g.add(pole);
    scene.add(g);G.dyn.push(g);o.mesh=g;}
  if(o.type==='hover'){const g=new THREE.Group();g.position.set(o.x,o.y,o.z);const hull=new THREE.Mesh(new THREE.BoxGeometry(2.4,1,7.5),new THREE.MeshStandardMaterial({color:0xf2f2f0,roughness:0.5}));hull.position.y=0.3;g.add(hull);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,9,6),M_POLE);mast.position.set(0,5,-0.5);mast.rotation.z=0.35;g.add(mast);
    const sail=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,7.5,0),new THREE.Vector3(0,0,3.2)]),new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide}));sail.position.set(0.6,1.4,-0.5);sail.rotation.z=0.35;g.add(sail);
    const pp=new THREE.Mesh(new THREE.CapsuleGeometry(0.25,1,4,8),new THREE.MeshStandardMaterial({color:0xff7a1a}));pp.position.set(0,1.5,2.4);g.add(pp);g.add(makeGlow([0,3,2.4],[1,0.4,0.1],[9]));
    scene.add(g);G.dyn.push(g);o.mesh=g;}}
const M_POLE=new THREE.MeshStandardMaterial({color:0xd0d4d8,roughness:0.4,metalness:0.6});
function regaTick(F,dt){const o=G.obj[G.oi];if(!o)return;
  for(const q of G.obj){if(q.sm){const a=q.sm.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]+=dt*(6+i%5);a[i]+=dt*((WF.wind?WF.wind.x:0)*0.5);a[i+2]+=dt*((WF.wind?WF.wind.z:0)*0.5);if(a[i+1]>160){a[i+1]=0;a[i]=(Math.random()-0.5)*5;a[i+2]=(Math.random()-0.5)*5;}}q.sm.geometry.attributes.position.needsUpdate=true;}}
  const d=Math.hypot(F.pos.x-o.x,F.pos.z-o.z);
  if(o.type==='hland'){if(F.onGround&&d<o.r){G.hw=(G.hw||0)+dt;if(G.hw>=o.wait){G.hw=0;G.oi++;audio.chime();pad.rumble(0.2,0.4,200);toast(o.kind==='pad'?'Patient übergeben – Einsatz erfolgreich!':'Patient versorgt und an Bord – jetzt ab ins Spital!',3500);}}else if(!F.onGround)G.hw=0;}
  if(o.type==='hover'){const agl=F.pos.y-F.P.gearH-o.y;if(!F.onGround&&d<o.r&&agl<o.h&&F.vel.length()<4){G.hw=(G.hw||0)+dt;if(G.hw>=o.wait){G.hw=0;G.oi++;audio.chime();toast('Person mit der Seilwinde geborgen – ab ins Unispital!',3500);}}else G.hw=Math.max(0,(G.hw||0)-dt*0.5);}}
// ---------- Gate, Pushback, Rollen ----------
function setupGate(){const F=G.F;G.tug=new THREE.Group();const tb=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.3,5.2),new THREE.MeshStandardMaterial({color:0xf2c200,roughness:0.5}));tb.position.y=0.95;G.tug.add(tb);
  const cb=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.0,1.6),new THREE.MeshStandardMaterial({color:0x22262c,roughness:0.3,metalness:0.4}));cb.position.set(0,2.0,1.4);G.tug.add(cb);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,4),new THREE.MeshStandardMaterial({color:0x444}));bar.position.set(0,0.6,-4.3);G.tug.add(bar);
  scene.add(G.tug);G.dyn.push(G.tug);placeTug();
  const o=G.obj.find(q=>q.type==='taxi');if(o){const A=AP.ZRH16,pts=[];const l0=toLocal(A,F.pos.x,F.pos.z);G.taxiPlan={A,l0,o};}}
function noseDist(){const b=new THREE.Box3().setFromObject(G.model);return Math.max(8,-(b.min.z-G.model.position.z));}
function placeTug(){if(!G.tug)return;const F=G.F,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),fx=-Math.sin(e.y),fz=-Math.cos(e.y),d=(G.noseD||(G.noseD=G.F.P.camDist*0.45))+6.5;
  G.tug.position.set(F.pos.x+fx*d,S.groundAt(F.pos.x+fx*d,F.pos.z+fz*d),F.pos.z+fz*d);G.tug.rotation.y=e.y+Math.PI;}
function startPushback(){if(G.push)return;G.atGate=false;const F=G.F,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),o=G.obj.find(q=>q.type==='taxi');
  let dir=1;if(o){const back=[Math.sin(e.y)*45,Math.cos(e.y)*45],p=[F.pos.x+back[0],F.pos.z+back[1]],to=[o.x-p[0],o.z-p[1]];const nose=a=>[-Math.sin(e.y+a),-Math.cos(e.y+a)];const d1=nose(Math.PI/2),d2=nose(-Math.PI/2);dir=(d1[0]*to[0]+d1[1]*to[1])>(d2[0]*to[0]+d2[1]*to[1])?1:-1;}
  G.push={ph:0,rem:45,ang:0,dir,yaw:e.y};audio.click();atc.c&&toast('Pushback läuft …',2500);}
function pushTick(F,dt){const p=G.push,v=2.4;F.vel.set(0,0,0);F.thr=0;
  if(p.ph===0){const d=Math.min(dt*v,p.rem);F.pos.x+=Math.sin(p.yaw)*d;F.pos.z+=Math.cos(p.yaw)*d;p.rem-=d;if(p.rem<=0)p.ph=1;}
  else if(p.ph===1){const w=v/30*dt;p.yaw+=p.dir*w;p.ang+=w;F.pos.x+=Math.sin(p.yaw)*v*dt;F.pos.z+=Math.cos(p.yaw)*v*dt;if(p.ang>=Math.PI/2)p.ph=2,p.t=0;}
  else{p.t+=dt;if(p.t>2){G.push=null;if(G.tug)G.tug.visible=false;F.brake=false;toast('Pushback beendet – Schub geben und den grünen Rolllichtern zur Piste 34 folgen.',5000);buildTaxiDots();audio.chime();}}
  F.q.setFromEuler(new THREE.Euler(0,p.yaw,0,'YXZ'));F.pos.y=S.heightAt(F.pos.x,F.pos.z)+F.P.gearH;placeTug();}
function buildTaxiDots(){const o=G.obj.find(q=>q.type==='taxi');if(!o)return;const F=G.F,A=AP.ZRH16,l0=toLocal(A,F.pos.x,F.pos.z),lh=toLocal(A,o.x,o.z),corner=fromLocal(A,lh.along,l0.across);
  const segs=[[F.pos.x,F.pos.z,corner.x,corner.z],[corner.x,corner.z,o.x,o.z]],pos=[],col=[],sz=[];
  for(const [ax,az,bx,bz] of segs){const L=Math.hypot(bx-ax,bz-az),n=Math.ceil(L/12);for(let k=0;k<=n;k++){const x=ax+(bx-ax)*k/n,z=az+(bz-az)*k/n;pos.push(x,S.heightAt(x,z)+0.3,z);col.push(0.15,1,0.35);sz.push(1.1);}}
  const d=makeGlow(pos,col,sz);scene.add(d);G.dyn.push(d);G.taxiDots=d;}
// ---------- Gewitter ----------
const boltMat=new THREE.MeshBasicMaterial({color:0xe8f0ff,toneMapped:false,transparent:true,opacity:1});
function lightning(dt){G.ltT-=dt;if(G.bolt){G.bolt.t+=dt;G.bolt.m.visible=G.bolt.t<0.09||(G.bolt.t>0.16&&G.bolt.t<0.24);if(G.bolt.t>0.4){scene.remove(G.bolt.m);G.bolt.m.geometry.dispose();G.bolt=null;}}
  if(G.ltT>0)return;G.ltT=5+Math.random()*9;const F=G.F,a=Math.random()*Math.PI*2,d=1500+Math.random()*7000,x=F.pos.x+Math.cos(a)*d,z=F.pos.z+Math.sin(a)*d,gy=S.groundAt(x,z),top=Math.max(gy+900,1900);
  const pts=[];let px=x,pz=z;for(let y=top;y>gy;y-=60+Math.random()*80){pts.push(new THREE.Vector3(px,y,pz));px+=(Math.random()-0.5)*90;pz+=(Math.random()-0.5)*90;}pts.push(new THREE.Vector3(px,gy,pz));
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),pts.length*3,2.2+d/2500,5,false);const m=new THREE.Mesh(geo,boltMat);scene.add(m);G.dyn.push(m);G.bolt={m,t:0};
  env.flash(1-d/10000);audio.thunder(d);if(d<3500)pad.rumble(0.3,0.5,300);}
// ---------- Etappe 3: Notfälle, Löschflüge, Thermik ----------
const THERMALS=[[46.957,8.268,290,3.4,2650],[46.973,8.243,300,3.8,2800],[46.988,8.300,250,2.8,2350],[46.93,8.335,270,3.1,2500],[46.946,8.292,230,2.6,2250],
  [47.056,8.482,290,3.1,2450],[47.0,8.392,240,2.6,2050],[47.03,8.668,280,3.3,2550],[47.35,8.487,240,2.3,1650],[47.12,8.3,260,2.4,1750],
  [47.3,8.22,250,2.2,1600],[47.21,8.62,260,2.6,1900],[47.155,8.74,280,3.0,2300],[47.43,8.3,230,2.1,1500],[46.97,8.6,270,3.2,2500],[47.08,8.17,250,2.4,1800]];
let THERM=[];
const THERMALS_BO=[[46.645,7.66,280,3.4,3000],[46.694,7.55,260,3.0,2700],[46.70,7.80,250,2.8,2300],[46.613,7.95,280,3.3,2900],[46.66,8.05,280,3.5,3100],[46.56,7.87,270,3.2,3300],[46.787,8.05,260,3.1,2800],[46.62,7.70,250,2.6,2500],[46.75,7.75,230,2.4,2000],[46.60,8.12,290,3.6,3500],[46.50,7.70,270,3.2,3200],[46.85,7.60,220,2.2,1700]];
const smokeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.5,'rgba(255,255,255,0.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;})();
function setupStage3(mission,P){
  G.therm=!!((mission&&mission.thermals)||(!mission&&P.glider));G.tank=0;G.scoopT=0;G.spots=[];G.waterTouch=null;G.emOn=false;G.gearStuck=false;G.deadProp=null;hideEmerg();
  if(G.therm){THERM=[...THERMALS,...THERMALS_BO].map(([la,lo,r,w,top])=>{const p=toXZ(la,lo);return{x:p.x,z:p.z,r,w,top};});
    const cm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,emissive:0x8899aa,emissiveIntensity:0.12});const sg=new THREE.SphereGeometry(1,14,10);
    for(const T of THERM){const g=new THREE.Group();for(let i=0;i<9;i++){const m=new THREE.Mesh(sg,cm);const a=i/9*Math.PI*2,rr=i?T.r*0.9:0;m.position.set(Math.cos(a)*rr,(i?0:T.r*0.25)+Math.random()*60,Math.sin(a)*rr);m.scale.set(T.r*(0.75+Math.random()*0.4),T.r*0.45,T.r*(0.75+Math.random()*0.4));g.add(m);}
      g.position.set(T.x,T.top+120,T.z);scene.add(g);G.dyn.push(g);}}
  for(const o of G.obj){
    if(o.type==='hland'||o.type==='hover')regaSetup(o);
    if(o.type==='fire'){const g=new THREE.Group();g.position.set(o.x,o.y,o.z);const pos=[],col=[],sz=[];for(let i=0;i<70;i++){const a=Math.random()*7,r=Math.random()*o.r*0.85;pos.push(Math.cos(a)*r,3+Math.random()*16,Math.sin(a)*r);const k=Math.random();col.push(1,0.22+k*0.5,0.04);sz.push(22+Math.random()*34);}
      const fl=makeGlow(pos,col,sz);g.add(fl);const N=70,sp=new Float32Array(N*3);for(let i=0;i<N;i++){sp[i*3]=(Math.random()-0.5)*50;sp[i*3+1]=Math.random()*700;sp[i*3+2]=(Math.random()-0.5)*50;}
      const sgeo=new THREE.BufferGeometry();sgeo.setAttribute('position',new THREE.BufferAttribute(sp,3));const smat=new THREE.PointsMaterial({map:smokeTex,color:0x4a4644,size:110,transparent:true,opacity:0.55,depthWrite:false,sizeAttenuation:true});
      const sm=new THREE.Points(sgeo,smat);sm.frustumCulled=false;g.add(sm);const tg=new THREE.Mesh(new THREE.RingGeometry(o.r-6,o.r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff3b2f,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false}));tg.position.y=3;g.add(tg);
      scene.add(g);G.dyn.push(g);o.mesh=g;o.fl=fl;o.sm=sm;o.tg=tg;}
    if(o.type==='wland'){const g=new THREE.Group();const bm=new THREE.MeshStandardMaterial({color:0xff7a1a,roughness:0.5});for(let i=0;i<10;i++){const a=i/10*Math.PI*2,b=new THREE.Mesh(new THREE.SphereGeometry(1.4,12,8),bm);b.position.set(Math.cos(a)*220,0.6,Math.sin(a)*220);g.add(b);}
      g.add(makeGlow([0,8,0],[1,0.5,0.1],[16]));g.position.set(o.x,o.y,o.z);scene.add(g);G.dyn.push(g);o.mesh=g;}
    if(o.type==='spot'&&!G.obj.some(q=>q.type==='spot'&&q!==o&&q.mesh)){const A=o.ap,g=new THREE.Group(),p=fromLocal(A,-A.len/2+o.tgt,0);
      const bar=new THREE.Mesh(new THREE.PlaneGeometry(A.w*0.95,3).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff}));bar.position.y=0.12;g.add(bar);
      for(const k of [-1,1]){const b=new THREE.Mesh(new THREE.PlaneGeometry(A.w*0.95,1.2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff7a1a}));b.position.set(0,0.13,k*2.6);g.add(b);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.4,12),new THREE.MeshStandardMaterial({color:0xff7a1a}));cone.position.set(k*(A.w/2+4),0.7,0);g.add(cone);}
      g.position.set(p.x,A.elev+0.02,p.z);g.rotation.y=-A.a;scene.add(g);G.dyn.push(g);o.mesh=g;}
  }
}
function thermalLift(x,y,z,agl){let w=0;for(const T of THERM){const d2=((x-T.x)**2+(z-T.z)**2)/(T.r*T.r);if(d2>12)continue;const d=Math.sqrt(d2);
  let v=T.w*Math.exp(-d2)-0.8*Math.exp(-((d-1.9)**2)*1.5);if(y>T.top-300)v*=Math.max(0,(T.top-y)/300);v*=Math.min(1,Math.max(0,(agl-25)/120));w+=v;}return w;}
function showEmerg(t,x){const el=$('emerg');el.innerHTML=`<b>⚠ ${t}</b><span>${x}</span>`;el.classList.add('on');}
function hideEmerg(){const el=$('emerg');if(el)el.classList.remove('on');}
function emergTick(F){const E=G.mission&&G.mission.emerg;if(!E||G.emOn||F.crashed)return;const go=E.at!=null?G.t>=E.at:E.ring!=null?G.oi>=E.ring:false;if(!go)return;G.emOn=true;let t='',x='';
  if(E.type==='engine'){F.thrMul=0;F.thr=0;G.deadProp=0;t='MOTORAUSFALL';x='Kein Schub mehr! Rund 145 km/h halten und nach Hausen am Albis gleiten.';}
  if(E.type==='engine2'){F.thrMul=0.5;F.asym=-1;G.deadProp=0;t='TRIEBWERK 2 AUSGEFALLEN';x='Mit dem Seitenruder (Q bzw. L1) gegen das Gieren halten, Vollgas, flache Kurven.';}
  if(E.type==='gear'){G.gearStuck=true;G.pump=0;F.gear=false;t='HYDRAULIKFEHLER';x='Fahrwerk klemmt – Taste G bzw. ○ sechsmal drücken (Handpumpe).';}
  audio.alarm();pad.rumble(0.6,0.8,600);showEmerg(t,x);setTimeout(()=>{if(G&&G.emOn&&E.type!=='gear')hideEmerg();},14000);}
function stage3Tick(F,dt){
  const o=G.obj[G.oi];
  if(o&&o.type==='scoop'&&!F.crashed){const inZone=Math.hypot(F.pos.x-o.x,F.pos.z-o.z)<o.r,lk=S.isLake(F.pos.x,F.pos.z),skim=lk&&(F.water||F.pos.y-S.waterLevel(F.pos.x,F.pos.z)<(F.P.waterH||1)+5);
    if(inZone&&skim&&F.vel.length()>F.P.Vref*0.6){if(F.gearPos>0.1&&F.water){}else{G.scoopT+=dt;if(G.t-(G.splT||0)>0.45){G.splT=G.t;audio.splash(0.6);spray(F,8);}}
      if(G.scoopT>=3){G.tank=1;G.scoopT=0;G.oi++;refreshRings();audio.chime();pad.rumble(0.3,0.4,250);toast('Tank voll – 6000 Liter Wasser an Bord! Jetzt abheben.',2800);}}}
  for(const q of G.obj){if(q.type!=='fire'||!q.mesh)continue;const a=q.sm.geometry.attributes.position,arr=a.array;const steam=q.out?(G.t-q.outT):0;
    for(let i=0;i<arr.length;i+=3){arr[i+1]+=dt*(14+i%7);arr[i]+=dt*((WF.wind?WF.wind.x:0)*0.6+Math.sin(i+G.t*0.3)*2);arr[i+2]+=dt*((WF.wind?WF.wind.z:0)*0.6);if(arr[i+1]>720){arr[i+1]=0;arr[i]=(Math.random()-0.5)*50;arr[i+2]=(Math.random()-0.5)*50;}}
    a.needsUpdate=true;if(q.out){q.sm.material.opacity=Math.max(0,0.45-steam*0.04);if(q.sm.material.opacity<=0)q.sm.visible=false;}else q.fl.scale.setScalar(1+0.1*Math.sin(G.t*11+q.x));}
  if(G.fxw){const W=G.fxw;W.t+=dt;const a=W.p.geometry.attributes.position,arr=a.array;for(let i=0;i<arr.length;i+=3){W.v[i+1]-=9.81*dt*0.8;arr[i]+=W.v[i]*dt;arr[i+1]+=W.v[i+1]*dt;arr[i+2]+=W.v[i+2]*dt;const gh=S.groundAt(arr[i],arr[i+2]);if(arr[i+1]<gh)arr[i+1]=gh;}
    a.needsUpdate=true;W.p.material.opacity=Math.max(0,0.8-W.t*0.12);if(W.t>7){scene.remove(W.p);G.fxw=null;}}
}
function spray(F,n){/* kleine Gischt am Rumpf */const p=F.pos;for(let i=0;i<n;i++){}}
function dropWater(){const F=G.F;if(F.onGround){toast('Am Boden nicht möglich');return;}if(!G.tank){toast('Tank leer – zuerst auf dem See Wasser schöpfen.',2400);return;}
  G.tank=0;audio.splash(2.5);pad.rumble(0.5,0.6,400);
  const N=520,pos=new Float32Array(N*3),v=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=F.pos.x+(Math.random()-0.5)*3;pos[i*3+1]=F.pos.y-2-Math.random()*2;pos[i*3+2]=F.pos.z+(Math.random()-0.5)*3;
    const d=i/N;v[i*3]=F.vel.x*(0.92-d*0.5)+(Math.random()-0.5)*6;v[i*3+1]=F.vel.y*0.5-Math.random()*3;v[i*3+2]=F.vel.z*(0.92-d*0.5)+(Math.random()-0.5)*6;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const p=new THREE.Points(g,new THREE.PointsMaterial({map:smokeTex,color:0xdff2ff,size:9,transparent:true,opacity:0.8,depthWrite:false}));p.frustumCulled=false;scene.add(p);
  if(G.fxw)scene.remove(G.fxw.p);G.fxw={p,v,t:0};G.dyn.push(p);
  const agl=F.pos.y-S.groundAt(F.pos.x,F.pos.z),tf=Math.sqrt(2*Math.max(5,agl)/9.81),ix=F.pos.x+F.vel.x*tf*0.75,iz=F.pos.z+F.vel.z*tf*0.75;
  const o=G.obj[G.oi];if(!o||o.type!=='fire'){toast('Wasser abgeworfen.');return;}
  const d=Math.hypot(ix-o.x,iz-o.z);
  if(agl>170){toast('Zu hoch – das Wasser zerstäubt, bevor es ankommt. Höchstens 150 m über Grund!',3200);return;}
  if(d<o.r){G.oi++;refreshRings();const g2=G;setTimeout(()=>{if(G!==g2)return;o.out=true;o.outT=G.t;o.fl.visible=false;o.tg.material.color.set(0x3ddc6a);o.sm.material.color.set(0xd8dde2);audio.chime();toast(`Volltreffer! Das Feuer am ${o.name} ist gelöscht.`,3000);if(d<20)award('treffer');},tf*900);}
  else toast(`Daneben – ${Math.round(d)} m vom Feuer. Wieder Wasser schöpfen!`,2800),G.oi=Math.max(0,G.obj.lastIndexOf(G.obj.slice(0,G.oi).filter(q=>q.type==='scoop').pop()));refreshRings();}
// ---------- Geisterflugzeug ----------
const _gq1=new THREE.Quaternion(),_gq2=new THREE.Quaternion(),GHM=new THREE.MeshBasicMaterial({color:0x9fdcff,transparent:true,opacity:0.32,depthWrite:false});
function makeGhost(id){const m=buildModel(id);m.traverse(o=>{if(o.isMesh){o.material=GHM;o.castShadow=false;o.receiveShadow=false;}else if(o.isPoints||o.isSprite)o.visible=false;});m.visible=false;return m;}
// ---------- Abzeichen ----------
const badgeQ=[];let badgeBusy=false;
function showBadge(b){badgeQ.push(b);if(!badgeBusy)nextBadge();}
function nextBadge(){const b=badgeQ.shift();if(!b){badgeBusy=false;return;}badgeBusy=true;const el=$('badgePop');
  el.innerHTML=`<div class="bm">${b[3]}</div><div class="bt"><small>ABZEICHEN ERHALTEN</small><b>${b[1]}</b><span>${b[2]}</span></div>`;el.classList.add('show');audio.chime();pad.rumble(0.2,0.5,180);
  setTimeout(()=>{el.classList.remove('show');setTimeout(nextBadge,500);},3400);}
function award(id){const b=career.award(id);if(b)showBadge(b);}
function checkBadges(r){
  if(r&&r.ok){award('erster');const lt=G.lastTouch;if(lt&&r.letter==='S')award('butter');if(lt&&env.night>0.6)award('nacht');
    if(r.m.id==='m14')award('nebel');if(r.m.id==='m13')award('foehn');if(r.m.race&&r.st===3)award('renn');if(r.m.comfort&&G.comfort>=95)award('pax');
    if(atc.c&&atc.c.enabled!==false&&!atc.pen.length&&career.stat('noPen')>=5)award('funk');
    if(G.P.id==='l380'&&lt)award('gross');if(r.m.id==='m18')award('loesch');if(['m25','m26','m27'].every(id=>save.stars[id]))award('rega');if(r.m.id==='m21')award('segel');if(['m15','m16','m17'].every(id=>save.stars[id]))award('notfall');if(r.m.contest&&G.spots&&G.spots.length&&G.spots.reduce((a,b)=>a+b,0)/G.spots.length<10)award('ziel');const j=r.m.contract;if(j&&j.daily)award('tages');if(j&&!j.daily&&career.C.done>=10)award('auftrag');}
  if(totalStars()>=30)award('kapitaen');if(career.C.earned>=1e6)award('unter');if(ORDER.every(id=>career.owns(id)))award('flotte');}
const fmtT=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function atcCtx(){const F=G.F,A=G.startAP;return{F,metric:save.settings.units==='metric',wind:{...wx.cur,gustTxt:wx.cfg.gust>3},traffic,startRwy:A?(G.startRev?A.rwyB:A.rwyA):'',startRwyObj:A,pad:pad.connected,agl:F.pos.y-S.groundAt(F.pos.x,F.pos.z)-F.P.gearH};}
// ---------- Wiederholung ----------
const RP={t:0,mode:0,camT:0,next:false,anchor:new THREE.Vector3(),speed:1};
function startReplay(){if(!G||G.rec.length<10)return;state='replay';RP.t=0;RP.mode=0;RP.camT=0;RP.next=false;RP.prevState=G.done?'result':'pause';
  ['result','pause','hud','mapov'].forEach(id=>$(id).classList.add('hidden'));$('replay').classList.remove('hidden');G.model.visible=true;G.cockpit.visible=false;atc.stop();}
function endReplay(){if(state!=='replay')return;$('replay').classList.add('hidden');const F=G.F;G.model.position.copy(F.pos);G.model.quaternion.copy(F.q);G.model.visible=!F.crashed;
  if(RP.prevState==='result'){state='result';$('result').classList.remove('hidden');}else{state='pause';$('pause').classList.remove('hidden');}nav.clear();}
const CAMN=['Verfolger','Vorbeiflug','Boden','Flügel','Tower'];
const _rc=new THREE.Raycaster();
// freie Sicht? Gelände entlang der Linie abtasten und Häuser per Strahl prüfen
function rpClear(a,b){const d=a.distanceTo(b);for(let i=1;i<12;i++){const u=i/12,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,y=a.y+(b.y-a.y)*u;if(S.groundAt(x,z)>y-0.5)return false;}
  if(world&&world.blockers){try{_rc.set(a,b.clone().sub(a).normalize());_rc.far=d-5;if(_rc.intersectObjects(world.blockers,false).length)return false;_rc.set(b,a.clone().sub(b).normalize());_rc.far=d-0.5;if(_rc.intersectObjects(world.blockers,false).length)return false;}catch(e){}}return true;}
function replayTick(dt){const R=G.rec,dur=(R.length-1)*0.1;RP.t+=dt*RP.speed;if(RP.t>=dur){endReplay();return;}
  const f=RP.t/0.1,i=Math.floor(f),u=f-i,a=R[i],b=R[Math.min(R.length-1,i+1)];
  const p=new THREE.Vector3(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u),q=new THREE.Quaternion(a[3],a[4],a[5],a[6]).slerp(new THREE.Quaternion(b[3],b[4],b[5],b[6]),u);
  G.model.position.copy(p);G.model.quaternion.copy(q);animateModel(G.model,{flapPos:a[7],gearPos:a[8],rpm:0.2+0.8*a[9],groundSpeed:a[10],ail:a[11],elev:a[12],rud:a[13],landingLight:env.night>0.2&&a[8]>0.5,night:env.night},T,dt);
  RP.camT-=dt;const vel=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).multiplyScalar(10);const sp=vel.length(),dir=sp>1?vel.clone().normalize():new THREE.Vector3(0,0,-1).applyQuaternion(q);
  if(RP.camT<=0||RP.next){RP.next=false;RP.mode=(RP.mode+1+(RP.camT>0?0:Math.floor(Math.random()*2)))%5;RP.camT=5+Math.random()*3;
    const side=new THREE.Vector3(-dir.z,0,dir.x).normalize(),P=G.P;
    if(RP.mode===1)RP.anchor.copy(p).addScaledVector(dir,Math.max(120,sp*4)).addScaledVector(side,P.wingTip*3+12).add(new THREE.Vector3(0,P.wingTip*0.5+3,0));
    if(RP.mode===2){// Bodenkamera: Standort ohne Haus oder Hügel in der Sichtlinie suchen
      const s0=Math.random()<0.5?-1:1,ahead=Math.max(200,sp*5),pass=p.clone().addScaledVector(dir,ahead);let ok=false;
      for(const [sg,lat,h] of [[s0,1,1.8],[-s0,1,1.8],[s0,1.8,1.8],[-s0,1.8,1.8],[s0,1,9],[-s0,1,9]]){RP.anchor.copy(p).addScaledVector(dir,ahead).addScaledVector(side,sg*lat*(40+P.wingTip*2));RP.anchor.y=S.groundAt(RP.anchor.x,RP.anchor.z)+h;
        if(rpClear(RP.anchor,p)&&rpClear(RP.anchor,pass)){ok=true;break;}}
      if(!ok){RP.mode=0;}}
    if(RP.mode===4){let best=null,bd=1e9;for(const A of AIRPORTS){const d=Math.hypot(A.x-p.x,A.z-p.z);if(d<bd){bd=d;best=A;}}const tp=bd<6000?fromLocal(best,best.len*0.2,best.side*420):{x:p.x+side.x*600,z:p.z+side.z*600};
      RP.anchor.set(tp.x,(bd<6000?best.elev+55:S.groundAt(tp.x,tp.z)+40),tp.z);}
    $('rpCam').textContent=CAMN[RP.mode];}
  const P=G.P;cam.up.set(0,1,0);let fov=55;
  if(RP.mode===0){const want=p.clone().addScaledVector(dir,-P.camDist*1.3).add(new THREE.Vector3(0,P.camH*0.6+P.camDist*0.18,0));const gh=S.groundAt(want.x,want.z)+2;if(want.y<gh)want.y=gh;cam.position.lerp(want,1-Math.exp(-dt*4));cam.lookAt(p);}
  else if(RP.mode===3){const off=new THREE.Vector3(P.wingTip*0.75,P.camH*0.25,P.camDist*0.05).applyQuaternion(q);cam.position.copy(p).add(off);cam.lookAt(p.clone().addScaledVector(dir,-P.camDist*0.2).add(new THREE.Vector3(0,P.camH*0.2,0)));cam.up.set(0,1,0).applyQuaternion(q);fov=68;}
  else{cam.position.copy(RP.anchor);cam.lookAt(p);const d=cam.position.distanceTo(p);fov=clamp(2*Math.atan(P.wingTip*(RP.mode===4?4:3.2)/d)/DEG,6,60);}
  cam.fov=fov;cam.near=0.5;cam.updateProjectionMatrix();$('rpBar').style.width=(RP.t/dur*100)+'%';
}

function finishLesson(){
  const L=G.lesson,i=LESSONS.indexOf(L),gr=G.lastTouch&&L.steps.some(s=>s.land)?G.lastTouch:null;
  if(L.exam&&gr&&gr.letter==='D'){G.done=false;return finish(false,`Landung mit Note D – für die Prüfung braucht es mindestens C. Versuch es nochmal!`);}
  G.done=true;state='result';$('hud').classList.add('hidden');$('mapov').classList.add('hidden');
  award('erster');if(L.exam)award('schein');
  const val=gr?gr.letter:'✓',ord='SABCD✓';const old=save.lessons[L.id];if(!old||ord.indexOf(val)<ord.indexOf(old))save.lessons[L.id]=val;persist();
  const next=LESSONS[i+1];
  $('resbody').innerHTML=`<div class="reshead"><div><div class="eyebrow">${L.exam?'PRÜFUNG BESTANDEN':'LEKTION ABGESCHLOSSEN'}</div><h2>${L.name}</h2><div class="sub">${L.exam?'Herzlichen Glückwunsch – du hast die Flugschule abgeschlossen! Weiter geht es in der Karriere.':next?'Nächste Lektion: '+next.name:'Alle Lektionen geschafft!'}</div></div><div class="grade">${val}</div></div>
    ${gr?`<div class="res">${gr.parts.map(p=>`<span>${p[0]}</span><div class="b"><div style="width:${p[1]/25*100}%"></div></div><span class="sub">${p[2]}</span>`).join('')}</div>`:''}
    <div class="btnrow">${next?'<button id="rNext">Nächste Lektion</button>':''}<button class="ghost" id="rAgain">Nochmal</button><button class="ghost" id="rMenu">Menü</button></div>`;
  if(next)$('rNext').onclick=()=>showLessonBrief(next.id);
  $('rAgain').onclick=()=>startFlight(G.cfg);$('rMenu').onclick=showMenu;$('result').classList.remove('hidden');
}
function showLessonBrief(id){const L=LESSONS.find(x=>x.id===id),P=PLANES[L.plane],A=AP[L.ap];
  $('brief').innerHTML=`<div class="panel brief"><div class="eyebrow">FLUGSCHULE · LEKTION ${LESSONS.indexOf(L)+1}</div><h2>${L.name}</h2><p>${L.brief}</p>
  <div class="facts"><div class="fpl" data-id="${L.plane}">${thumbImg(L.plane,'xs')}<div><span>Flugzeug</span><b>${P.name}</b></div></div><div><span>Ort</span><b>${A.name}${L.air?' · in der Luft':' · Piste '+(L.rev?A.rwyB:A.rwyA)}</b></div><div><span>Schritte</span><b>${L.steps.length}</b></div><div><span>Ergebnis</span><b>${save.lessons[L.id]||'–'}</b></div></div>
  <div class="tip"><b>So geht's:</b> Der Fluglehrer zeigt oben jeweils den nächsten Schritt. Sobald du ihn erfüllt hast, kommt automatisch der nächste.</div><div class="btnrow"><button id="bGo">Los geht's</button><button class="ghost" id="bBack">Zurück</button></div></div>`;
  $('brief').classList.remove('hidden');$('bGo').onclick=()=>startFlight({lesson:id});$('bBack').onclick=()=>$('brief').classList.add('hidden');}

// ---------- Automatische Grafikanpassung ----------
const perf={acc:0,n:0,lvl:0,hold:3,told:false};
function perfTick(raw){
  if(perf.hold>0){perf.hold-=Math.min(raw,0.5);perf.acc=0;perf.n=0;return;}
  perf.acc+=raw;perf.n++;if(perf.acc<2.5)return;
  const fps=perf.n/perf.acc;perf.acc=0;perf.n=0;
  if(fps>=32)return;
  const X=world&&world.extras;let did=false,want=fps<12?3:fps<22?2:1,done=0;
  while(done<want&&perf.lvl<8){did=false;perf.lvl++;
    if(perf.lvl===1&&X&&X.disableReflect&&X.reflector&&X.reflector.visible){X.disableReflect();did=true;}
    else if(perf.lvl===2&&composer){composer=null;did=true;}
    else if(perf.lvl>=3&&perf.lvl<=5&&renderer.getPixelRatio()>1){renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-0.25));resize();did=true;}
    else if(perf.lvl===6&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);});did=true;}
    else if(perf.lvl===7&&renderer.getPixelRatio()>0.75&&fps<20){renderer.setPixelRatio(0.75);resize();did=true;}
    if(did)done++;}
  if(done){perf.hold=1.5;if(!perf.told&&state!=='menu'){perf.told=true;toast('Grafik automatisch angepasst, damit es flüssig läuft',3500);}}
}

// ---------- Controller ----------
const PADFLY={[BTN.O]:'KeyG',[BTN.SQ]:'KeyF',[BTN.TRI]:'KeyV',[BTN.UP]:'KeyM',[BTN.DOWN]:'Space',[BTN.LEFT]:'KeyU',[BTN.RIGHT]:'KeyH',[BTN.R3]:'KeyC',[BTN.L3]:'KeyT',[BTN.CREATE]:'KeyT',[BTN.PAD]:'KeyM',[BTN.OPTIONS]:'KeyP'};
function padTick(dt){pad.poll(dt);if(!pad.connected)return;if(state==='photo'){PH.yaw-=pad.rx*dt*1.6+pad.lx*dt*1.6;PH.pit=clamp(PH.pit+(pad.ry+pad.ly)*dt*1.2,-0.35,1.45);PH.dist=clamp(PH.dist*(1+(pad.l2-pad.r2)*dt*1.5),4,600);}
  if(state!=='fly'&&state!=='replay'&&state!=='load'&&state!=='photo'&&state!=='map')nav.sync();
  if(state==='map')mapPad(dt);
  const E=pad.edges.slice();if(pad.stickDir!=null&&state!=='fly'&&state!=='replay'&&state!=='map')E.push(pad.stickDir);
  for(const b of E){
    if(state==='fly'){const c=PADFLY[b];if(c){audio.init();keyAction(c);}continue;}
    if(state==='map'){if(b===BTN.O||b===BTN.UP||b===BTN.PAD||b===BTN.OPTIONS)toggleMap();else if(b===BTN.X){if(MV.cur&&!apprAuto(MV.cur.x,MV.cur.z))setWp(MV.cur.x,MV.cur.z);}else if(b===BTN.SQ){clearWp();clearAppr();}else if(b===BTN.TRI)mapCenter();else if(b===BTN.R1)mapZoom(1.5);else if(b===BTN.L1)mapZoom(1/1.5);continue;}
    if(state==='photo'){if(!$('phOv').classList.contains('hidden')){if(b===BTN.X||b===BTN.O)$('phOv').classList.add('hidden');continue;}if(b===BTN.X)photoKey('Enter');else if(b===BTN.O||b===BTN.OPTIONS)photoKey('Escape');else if(b===BTN.SQ)photoKey('KeyF');else if(b===BTN.TRI)photoKey('KeyH');continue;}
    if(state==='replay'){if(b===BTN.X||b===BTN.R3)RP.next=true;else if(b===BTN.O||b===BTN.OPTIONS)endReplay();else if(b===BTN.R1)RP.speed=RP.speed>=4?1:RP.speed*2;continue;}
    if(state==='load')continue;
    audio.init();nav.sync();
    if(b===BTN.UP)nav.move('u');else if(b===BTN.DOWN)nav.move('d');else if(b===BTN.LEFT)nav.move('l');else if(b===BTN.RIGHT)nav.move('r');
    else if(b===BTN.X)nav.press();
    else if(b===BTN.L1)nav.tab(-1);else if(b===BTN.R1)nav.tab(1);
    else if(b===BTN.O){if(!$('brief').classList.contains('hidden')){$('brief').classList.add('hidden');nav.clear();}else if(state==='pause')togglePause();}
    else if(b===BTN.OPTIONS&&state==='pause')togglePause();
  }
}

// ---------- Hauptschleife ----------
let last=performance.now(),T=0,fpsA=0;
function loop(now){
  requestAnimationFrame(loop);const raw=(now-last)/1000;const dt=Math.min(0.05,raw);last=now;T+=dt;
  if(!env)return;
  if(deskOn){perf.hold=2;return;}
  perfTick(raw);padTick(dt);thumbTick();if((T*4|0)!==TOUCH.tk){TOUCH.tk=T*4|0;touchSync();}if(TOUCH.on&&G&&G.F){const f=$('tThrFill');if(f)f.style.height=(G.F.thr*100)+'%';}if(groundT&&state!=='pause'&&state!=='photo')groundT.update(dt,cam.position,env.night>0.35);
  if(G&&state==='photo'){photoTick(dt);env.update(G.model.position,cam,P_shadow(G.P));audio.update({silent:true});}
  else if(G&&state==='replay'){replayTick(dt);wx.updateRain(dt,cam);env.update(G.model.position,cam,P_shadow(G.P));audio.update({silent:true});}
  else if(G&&(state==='fly'||state==='map'||state==='result'||state==='pause')){
    const F=G.F;
    if(state==='fly'||state==='map'){step(dt);if(env.weather==='storm')lightning(dt);}
    G.model.position.copy(F.pos);G.model.quaternion.copy(F.q);
    const Vg=F.onGround?F.vel.length():0;
    animateModel(G.model,{flapPos:F.flapPos,ail:F.ail,elev:F.elev,rud:F.rud,gearPos:F.gearPos,rpm:F.crashed?0:F.P.heli?F.rotor:0.2+0.8*F.eng,groundSpeed:Vg,landingLight:env.night>0.2&&F.gearPos>0.5,night:env.night},T,state==='fly'||state==='map'?dt:0);
    if(G.deadProp!=null){const pr=G.model.userData.parts.props[G.deadProp];if(pr){pr.bl.visible=true;pr.disc.visible=false;pr.g.rotation.z+=(state==='fly'?dt:0)*(F.onGround?0:1.2);}}
    const pl=G.model.userData.parts.lights;if(pl){pl.u.uScale.value=glowU.uScale.value;pl.u.uFogD.value=glowU.uFogD.value;pl.u.uI.value=0.6+1.6*env.night;}
    puffTick(state==='fly'||state==='map'?dt:0);vaporTick(state==='fly'||state==='map'?dt:0);
    for(const f of G.fx){f.t+=dt;f.m.scale.setScalar(1+f.t*9);f.m.material.opacity=Math.max(0,1-f.t*0.8);f.sm.scale.setScalar(1+f.t*6);f.sm.position.y+=dt*6;f.sm.material.opacity=Math.max(0,0.8-f.t*0.12);}
    // Abwurf-Vorhersage
    const o=G.obj[G.oi];if(o&&o.type==='drop'&&!F.onGround&&G.crates>0){const p=F.pos.clone().add(new THREE.Vector3(0,-F.P.bellyH-1.5,0)),v=F.vel.clone();let t=0;for(let i=0;i<400;i++){crateStep(p,v,t,0.1);t+=0.1;const gh=S.groundAt(p.x,p.z);if(p.y<=gh+0.5){p.y=gh+1.5;break;}}G.pred.position.copy(p);G.pred.visible=true;}else G.pred.visible=false;
    G.obj.forEach((x,i)=>{if(x.type==='ring'&&x.mesh&&i===G.oi)x.mesh.rotation.z+=dt*0.5;});ringFx(state==='fly'?dt:0);
    updateCam(dt);wx.updateRain(dt,cam);
    if(F.stalled&&!F.onGround&&state==='fly'&&(T%0.6)<dt)pad.rumble(0.15,0.35,120);
    if(state!=='result')updateHUD(dt);{const n=Math.round(env.night*10)/10;if(G.hudN!==n){G.hudN=n;$('hud').style.filter=n>0.05?`brightness(${(1-0.22*n).toFixed(2)})`:'';}}
    env.update(F.pos,cam,P_shadow(G.P));flareTick();
    audio.update({silent:state!=='fly'&&state!=='map'||F.crashed,kind:G.P.heli?'heli':G.P.glider?'none':G.P.prop?(G.P.id==='alpina'?'piston':'turboprop'):'jet',rpm:G.P.heli?F.rotor*(0.6+0.4*F.eng):0.25+0.75*F.eng,speed:F.vel.length(),inside:G.cam===1,stall:F.stalled&&!F.onGround});
  }else if(state==='menu'){if(FLARE)FLARE.visible=false;menuCam(T);env.update(cam.position.clone().add(new THREE.Vector3(0,-60,0)),cam,120);audio.update({silent:true});}
  if(traffic&&state!=='load')traffic.update(state==='pause'?0:dt,G&&state!=='menu'?G.F:null,T,env.night,{s:glowU.uScale.value,f:glowU.uFogD.value});
  if(attr&&state!=='load')attr.update(state==='pause'?0:dt,T,cam,env.night,glowU.uScale.value,wx.wind);
  world.updateTrees(cam.position);
  airports.update(G&&G.cam!==1?G.F.pos:cam.position,T,glowU.uScale.value,glowU.uFogD.value);
  cityU.uI.value=env.night*1.25;cityU.uScale.value=glowU.uScale.value;cityU.uFogD.value=glowU.uFogD.value;
  world.waterTex.offset.x=T*0.006;world.waterTex.offset.y=T*0.004;
  nightU.value=env.night;airports.setNight(env.night);world.water.material.envMapIntensity=1.15*(1-0.8*env.night);const X=world.extras;if(X){if(X.updateWater)X.updateWater(cam,T,env);X.updateBoats(dt,T);}
  if(window.__camHold){const h=window.__camHold;cam.position.set(h[0],h[1],h[2]);cam.up.set(0,1,0);cam.lookAt(h[3],h[4],h[5]);cam.fov=h[6]||50;cam.near=1;cam.updateProjectionMatrix();}
  if(composer&&!window.__noComp){bloom.strength=0.22+0.5*env.night;composer.render();}else renderer.render(scene,cam);
}
const P_shadow=P=>P.shadow;
boot().then(()=>requestAnimationFrame(loop)).catch(e=>{console.error(e);$('lstep').textContent='Fehler: '+e.message;});
window.__af={animateModel,AIRLINER,get attr(){return attr;},buildObjectives,AIRPORTS,fromLocal,get airports(){return airports;},apprTest:(icao,i)=>{setAppr(approachOptions(icao)[i]);return G.appr;},apprMenu,mapXf,get groundT(){return groundT;},MSH,THUMB,TH,thumbTick,setWp,clearWp,MV,mapZoom,mapCenter,__jm:jobMission,career,showMenu,setSub,renderCareer,openCareer,getDaily,showBrief,finish,award,toXZ,get S(){return S;},MISSIONS,get traffic(){return traffic;},atc,keyAction,startReplay,get env(){return env;},renderer,get world(){return world;},get composer(){return composer;},set noComp(v){window.__noComp=v;},buildModel,PLANES,THREE,get G(){return G;},startFlight,K,get state(){return state;},MISSIONS,cam,scene,simAP:(sec)=>{for(let t=0;t<sec;t+=1/30){const F=G.F;K.clear();const A=G.obj.find(o=>o.type==='land')?.ap||(G.lesson&&AP[G.lesson.ap]);if(!A)break;const l=toLocal(A,F.pos.x,F.pos.z);const sgn0=(F.vel.x*A.sin-F.vel.z*A.cos)>=0?1:-1;const d=(-sgn0*A.len/2-l.along)*sgn0;const ideal=A.elev+F.P.gearH+Math.max(0,d+150)*0.0524;const agl=F.pos.y-F.P.gearH-S.heightAt(F.pos.x,F.pos.z);
  const wantVs=F.onGround?0:agl>6?clamp((ideal-F.pos.y)*0.15-0.0524*F.vel.length(),-6,2):-0.5;const vs=F.vel.y;if(!F.onGround){if(vs<wantVs-0.3)K.add('ArrowDown');else if(vs>wantVs+0.3)K.add('ArrowUp');}
  {const sgn=(F.vel.x*A.sin-F.vel.z*A.cos)>=0?1:-1;const ac=l.across*sgn;const vlat=(F.vel.x*A.cos+F.vel.z*A.sin)*sgn;const want=clamp(-ac*0.05,-25,25);const err=want-vlat;const bk=(F.bank||0)/DEG;const wb=clamp(-err*3,-20,20);if(F.onGround){if(ac>2)K.add('KeyA');else if(ac<-2)K.add('KeyD');}else if(bk<wb-3)K.add('KeyA');else if(bk>wb+3)K.add('KeyD');}const V=F.vel.length();if(!F.onGround){if(V<F.P.Vref*1.05)K.add('KeyW');else if(V>F.P.Vref*1.15)K.add('KeyS');}else{K.add('KeyS');K.add('KeyB');}
  step(1/30);if(G.done||F.crashed)break;}K.clear();const F=G.F;return{v:F.vel.length(),y:F.pos.y,gnd:F.onGround,done:G.done,crashed:F.crashed,lt:G.lastTouch&&G.lastTouch.letter,oi:G.oi,n:G.obj.length};},
  sim:(sec,keys=[])=>{keys.forEach(k=>K.add(k));for(let t=0;t<sec;t+=1/30){step(1/30);if(!G||G.F.crashed)break;}keys.forEach(k=>K.delete(k));updateCam(1);updateCam(1);const F=G.F;return{v:F.vel.length(),y:F.pos.y,gnd:F.onGround,bank:F.bank,crashed:F.crashed};}};
