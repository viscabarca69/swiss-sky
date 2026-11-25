// KI-Verkehr: Linienverkehr an allen grossen Flughäfen (Zürich, Genf, Basel, Bern, Lugano, Sion, Altenrhein),
// Platzrunden der Kleinflugzeuge an kleinen Flugplätzen, Segelflieger in der Thermik, Rega-Flüge und
// Reiseflugverkehr in 9–11 km Höhe mit Kondensstreifen. Alles wird nur in der Nähe des Spielers erzeugt.
import * as THREE from 'three';
import {APM,AIRPORTS,fromLocal,toLocal} from './worldgen.js';
const DEG=Math.PI/180;
const ZRH_TYPES=['l320','l32n','l330','l350','l340','l346','l32n','l380','l747'];
// Plätze mit Linienverkehr: Landungen (Piste, Richtung) und Starts (Piste, Richtung, Anteil); bevorzugte Richtung wie im Alltag
const HUBS=[
  {icao:'LSZH',c:'ZRH16',arr:[['ZRH14',1]],dep:[['ZRH16',1,0.65],['ZRH10',-1,0.35]],types:ZRH_TYPES,arrT:[85,60],depT:[70,50],cs:'LUIS'},
  {icao:'LSGG',c:'GVA',arr:[['GVA',-1]],dep:[['GVA',-1]],types:['l32n','l320','l330','l32n','l350','l320'],arrT:[120,70],depT:[115,70],cs:'LUIS'},
  {icao:'LFSB',c:'BSL',arr:[['BSL',1]],dep:[['BSL',1]],types:['l32n','l320','foehn','l32n'],arrT:[150,90],depT:[140,90],cs:'LUIS'},
  {icao:'LSZB',c:'BRN',arr:[['BRN',1]],dep:[['BRN',1]],types:['foehn','titlis','l32n'],arrT:[220,120],depT:[200,120],cs:'LUIS'},
  {icao:'LSZA',c:'LUG',arr:[['LUG',1]],dep:[['LUG',-1]],types:['foehn','titlis'],arrT:[260,140],depT:[240,140],cs:'LUIS'},
  {icao:'LSGS',c:'SIO',arr:[['SIO',-1]],dep:[['SIO',-1]],types:['foehn','titlis','l32n'],arrT:[260,140],depT:[240,140],cs:'LUIS'},
  {icao:'LSZR',c:'ACH',arr:[['ACH',-1]],dep:[['ACH',-1]],types:['foehn','titlis'],arrT:[260,140],depT:[240,140],cs:'LUIS'}];
const GA_TYPES=['alpina','saentis','alpina','titlis'];
const CRUISE_TYPES=['l32n','l350','l330','l320','l747','l380','l346'];
const rnd=(a,b)=>a+Math.random()*(b-a);
export function createTraffic(scene,S,buildModel,animateModel,PLANES,HP){
  const T={list:[],pool:{},on:true,n:0,hubs:[],ga:{},timer:{ga:20,gl:15,rega:60,cruise:4}};
  const DUMMY={on:false,list:[],prewarm(){},reset(){},update(){},hit(){return null},dots(){return[]},busy(){return null}};
  for(const H of HUBS){const C=APM[H.c];if(!C)continue;const arr=H.arr.filter(([id])=>APM[id]),dep=H.dep.filter(([id])=>APM[id]);if(!arr.length&&!dep.length)continue;
    T.hubs.push({...H,C,arr,dep,t:{arr:rnd(5,30),dep:rnd(20,60)}});}
  if(!T.hubs.length)return DUMMY;
  function getModel(id,key){const k=key||id,p=T.pool[k]||(T.pool[k]=[]);let m=p.pop();if(!m){m=buildModel(id,{landingLight:true});if(key==='cruise:'+id)addContrail(m,PLANES[id]);}m.visible=true;scene.add(m);return m;}
  function free(a){scene.remove(a.m);a.m.visible=false;(T.pool[a.key||a.id]=T.pool[a.key||a.id]||[]).push(a.m);}
  const yawOf=(A,sd)=>-A.a+(sd<0?Math.PI:0);
  const callsign=p=>p+' '+(100+Math.floor(Math.random()*899));
  // Kondensstreifen: zwei gekreuzte, lange Bänder hinter den Triebwerken, nach hinten ausblendend
  let CTEX=null;
  function addContrail(m,P){if(!CTEX){const c=document.createElement('canvas');c.width=8;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
      // Leinwand unten = vorne am Flugzeug (flipY): kurz einblenden, dann langsam nach hinten auslaufen
      g.addColorStop(1,'rgba(255,255,255,0)');g.addColorStop(0.985,'rgba(255,255,255,0.85)');g.addColorStop(0.65,'rgba(255,255,255,0.55)');g.addColorStop(0,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,8,256);
      CTEX=new THREE.CanvasTexture(c);}
    const mat=new THREE.MeshBasicMaterial({map:CTEX,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,opacity:0.8});
    const len=8000,g=new THREE.PlaneGeometry(55,len);g.rotateX(-Math.PI/2);g.translate(0,0,len/2);
    // Plane: v=0 vorne (am Flugzeug), v=1 hinten
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
    const g2=g.clone();g2.rotateZ(Math.PI/2);
    const grp=new THREE.Group();grp.add(new THREE.Mesh(g,mat),new THREE.Mesh(g2,mat));grp.position.z=(P.wingTip||20)*0.6;grp.renderOrder=2;
    m.children[0].add(grp);m.userData.trail=grp;m.userData.trailMat=mat;}
  // Ist die Piste für den Spieler frei? (Text für den Tower oder null)
  T.busy=(Ap,R,mode)=>{if(!T.on||!Ap)return null;
    for(const a of T.list){if(!a.A||a.A.icao!==Ap.icao)continue;
      if(a.kind==='arr'&&a.A.id===(R&&R.id)){if(a.phase==='final'&&a.s>-6000)return'Verkehr im kurzen Endanflug';if(a.phase==='flare'||a.phase==='rollout')return'Verkehr auf der Piste';}
      if(a.kind==='dep'&&a.phase==='roll')return'Verkehr startet gerade';
      if(a.kind==='ga'&&a.A.id===(R&&R.id)&&a.leg==='final')return'Kleinflugzeug im Endanflug';}
    return null;};
  function playerOn(A,F){if(!F)return false;const l=toLocal(A,F.pos.x,F.pos.z);return Math.abs(l.across)<120&&Math.abs(l.along)<A.len/2+9000&&F.pos.y-A.elev<700;}
  // Geländeprüfung einer Bahn (Punkte mit Höhe): kleinster Abstand über Grund
  function clearance(pts){let m=1e9;for(const p of pts)m=Math.min(m,p.y-S.heightAt(p.x,p.z));return m;}
  const PCACHE=new Map();
  // Endanflug: längste Distanz (14 / 9 / 6 km) mit mindestens 80 m Abstand über Grund auf dem 3°-Gleitpfad
  function arrDist(A,sd){const k='a'+A.id+sd;if(PCACHE.has(k))return PCACHE.get(k);let best=0;
    for(const d of [14000,9000,6000]){let ok=true;for(let s=500;s<=d&&ok;s+=200){const p=fromLocal(A,-sd*(A.len/2+s),0),y=A.elev+(s+300)*Math.tan(3*DEG);
        // nahe der Piste genügt der halbe Gleitpfad als Abstand, weiter draussen mindestens 80 m
        if(y-S.heightAt(p.x,p.z)<Math.min(80,0.5*(y-A.elev)))ok=false;}
      if(ok){best=d;break;}}
    PCACHE.set(k,best);return best;}
  // Steigflug 7°: wie weit ist der Weg frei (höchstens 16 km)
  function depDist(A,sd){const k='d'+A.id+sd;if(PCACHE.has(k))return PCACHE.get(k);let ok=0;
    for(let s=400;s<=16000;s+=200){const p=fromLocal(A,sd*(A.len/2+s),0);const y=A.elev+(s+A.len*0.4)*Math.tan(7*DEG);if(y-S.heightAt(p.x,p.z)<Math.min(70,0.5*(y-A.elev)))break;ok=s;}
    PCACHE.set(k,ok>=5000?ok:0);return PCACHE.get(k);}
  function spawnArr(H,A,sd){const d=arrDist(A,sd);if(!d)return;const id=H.types[(T.n++)%H.types.length],P=PLANES[id];
    const p=fromLocal(A,-sd*(A.len/2+d),0);
    const a={kind:'arr',id,P,A,sd,m:getModel(id),s:-d,v:P.Vref*1.25,y:A.elev+P.gearH+15+(d+300)*Math.tan(3*DEG),pitch:2*DEG,gear:1,flap:1,phase:'final',t:0,cs:callsign(H.cs)};
    a.pos=new THREE.Vector3(p.x,a.y,p.z);T.list.push(a);}
  function spawnDep(H,A,sd){const lim=depDist(A,sd);if(!lim)return;const id=H.types[(T.n++)%H.types.length],P=PLANES[id];
    const a={kind:'dep',id,P,A,sd,m:getModel(id),s:-(A.len/2-80),v:0,y:A.elev+P.gearH,pitch:0,gear:1,flap:1/3,phase:'roll',t:0,lim,cs:callsign(H.cs)};
    a.pos=new THREE.Vector3();T.list.push(a);}
  // ---------- Bahnfolger (Platzrunde, Rega): Punkte mit Höhe und Tempo, gleichmässig abgefahren ----------
  function mkPath(pts,loop){const P3=pts.map(p=>new THREE.Vector3(p.x,p.y,p.z));const cur=new THREE.CatmullRomCurve3(P3,!!loop,'centripetal',0.5);
    const n=Math.max(40,Math.round(cur.getLength()/25)),sp=cur.getSpacedPoints(n),L=cur.getLength();
    // Tempo und Bodenkontakt entlang der Bahn aus den Stützpunkten (nächster Stützpunkt nach Bahnlänge)
    const cum=[0];for(let i=1;i<P3.length;i++)cum.push(cum[i-1]+P3[i].distanceTo(P3[i-1]));const tot=cum[cum.length-1]+(loop?P3[0].distanceTo(P3[P3.length-1]):0);
    const at=(u,key)=>{const d=u*tot;for(let i=0;i<pts.length-1;i++)if(d<=cum[i+1]){const f=(d-cum[i])/((cum[i+1]-cum[i])||1);return pts[i][key]*(1-f)+pts[i+1][key]*f;}
      const l=pts[pts.length-1],f0=pts[0],f=loop?(d-cum[cum.length-1])/((tot-cum[cum.length-1])||1):1;return l[key]*(1-f)+(loop?f0[key]:l[key])*f;};
    return{sp,n,L,at,loop};}
  function pathPose(a,dt){const Pt=a.path,u=a.u,f=u*Pt.n,i=Math.min(Pt.n-1,Math.floor(f)),k=f-i,p0=Pt.sp[i],p1=Pt.sp[Math.min(Pt.n,i+1)];
    a.pos.lerpVectors(p0,p1,k);const dx=p1.x-p0.x,dz=p1.z-p0.z,dy=p1.y-p0.y,h=Math.hypot(dx,dz)||1e-6;
    const yaw=Math.atan2(-dx,-dz);let dy2=yaw-(a.yaw??yaw);dy2=Math.atan2(Math.sin(dy2),Math.cos(dy2));const om=dt>0?dy2/dt:0;a.yaw=yaw;
    const air=Pt.at(u,'g')<0.5;const bankT=air?Math.max(-0.6,Math.min(0.6,Math.atan(a.v*om/9.81))):0;a.bank=(a.bank||0)+(bankT-(a.bank||0))*Math.min(1,dt*2);
    const gam=Math.atan2(dy,h),att=a.kind==='rega'?gam-5*DEG:gam+3*DEG;a.pitch=(a.pitch||0)+(((air?att:Pt.at(u,'rot')||0))-(a.pitch||0))*Math.min(1,dt*2);a.air=air;}
  // Platzrunde: Start, Steigflug, Querabflug, Gegenanflug, Queranflug, Endanflug, Aufsetzen und Durchstarten
  function circuitFor(A,P){const k='c'+A.id+P.id;if(PCACHE.has(k))return PCACHE.get(k);let best=null;
    const hl=A.len/2,y0=A.elev+P.gearH,vr=P.Vr||30,vp=Math.max(vr*1.45,P.Vref*1.5);
    for(const side of [-(A.side||1),A.side||1])for(const sd of [1,-1]){
      const L=(u,w,h,v,g,rot)=>{const p=fromLocal(A,sd*u,sd*side*w);return{x:p.x,z:p.z,y:y0+h,v,g:g?1:0,rot:rot||0};};
      const pts=[L(-hl+90,0,0,P.Vref*1.05,1),L(-hl+260,0,0,vr*0.9,1),L(-hl+380,0,0,vr,1,6*DEG),L(-hl+600,0,14,vr*1.1),L(hl+700,0,170,vr*1.3),L(hl+1500,350,280,vp),
        L(hl+1500,1100,300,vp),L(0,1350,300,vp),L(-hl-1500,1100,300,vp),L(-hl-1800,450,230,vp*0.95),L(-hl-1500,0,150,P.Vref*1.2),L(-hl-700,0,70,P.Vref*1.12),L(-hl-150,0,12,P.Vref*1.05)];
      const c=Math.min(clearance(pts.slice(4,11)),99999);if(c>110&&(!best||c>best.c))best={pts,c};}
    const r=best?mkPath(best.pts,true):null;PCACHE.set(k,r);return r;}
  function spawnGA(A){const id=GA_TYPES[(T.n++)%GA_TYPES.length],P=PLANES[id];const path=circuitFor(A,P);if(!path)return false;
    const a={kind:'ga',id,P,A,m:getModel(id),path,u:Math.random()*0.6+0.2,v:40,t:0,laps:2+Math.floor(Math.random()*3),gear:1,flap:0.3,cs:'HB-'+'KLMOPS'[Math.floor(Math.random()*6)]+String.fromCharCode(65+Math.floor(Math.random()*26))+String.fromCharCode(65+Math.floor(Math.random()*26))};
    a.pos=new THREE.Vector3();pathPose(a,0);T.list.push(a);T.ga[A.id]=a;return true;}
  // Segelflieger: kreisen in der Thermik, steigen und gleiten zur nächsten Wolke
  function spawnGlider(F){if(!PLANES.segler)return;const ang=Math.random()*Math.PI*2,r=rnd(3500,9000),cx=F.pos.x+Math.cos(ang)*r,cz=F.pos.z+Math.sin(ang)*r,g=S.heightAt(cx,cz);
    if(S.isLake&&S.isLake(cx,cz))return;const a={kind:'glider',id:'segler',P:PLANES.segler,m:getModel('segler'),cx,cz,R:rnd(110,170),ph:Math.random()*Math.PI*2,dir:Math.random()<0.5?1:-1,
      base:g+rnd(700,1100),climb:rnd(0.8,2.2),t:0,life:rnd(240,420),cs:'HB-1'+Math.floor(rnd(100,999)),drift:new THREE.Vector2(rnd(-2,2),rnd(-2,2))};
    a.pos=new THREE.Vector3();T.list.push(a);}
  // Rega: Überflug auf ~250 m über Grund an der Spielerin / am Spieler vorbei
  function spawnRega(F){if(!PLANES.rega)return;
    // bevorzugt: Einsatzflug zu einem Spital in der Nähe, Landung auf dem Landeplatz
    const sp=HP&&HP.pads.filter(P=>P.k==='spital'&&Math.hypot(P.x-F.pos.x,P.z-F.pos.z)<18000);
    if(sp&&sp.length){const P=sp[Math.floor(Math.random()*sp.length)],ang=Math.random()*Math.PI*2,L=rnd(9000,14000),dx=Math.cos(ang),dz=Math.sin(ang),pts=[];
      for(let s=L;s>=900;s-=500){const x=P.x+dx*s,z=P.z+dz*s;let h=0;for(const q of [-500,0,500])h=Math.max(h,S.heightAt(x+dx*q,z+dz*q));pts.push({x,z,y:Math.max(h+260,P.y+200),v:68,g:0});}
      const gh=PLANES.rega.gearH;pts.push({x:P.x+dx*450,z:P.z+dz*450,y:P.y+90,v:30,g:0},{x:P.x+dx*120,z:P.z+dz*120,y:P.y+25,v:12,g:0},{x:P.x+dx*25,z:P.z+dz*25,y:P.y+gh+3,v:4,g:0},{x:P.x,z:P.z,y:P.y+gh,v:1,g:1});
      const path=mkPath(pts,false);const a={kind:'rega',id:'rega',P:PLANES.rega,m:getModel('rega'),path,u:0,v:68,t:0,cs:'Rega '+(1+Math.floor(Math.random()*15)),pad:P};a.pos=new THREE.Vector3();pathPose(a,0);T.list.push(a);return;}const ang=Math.random()*Math.PI*2,off=rnd(-3000,3000),L=rnd(14000,20000);
    const dx=Math.cos(ang),dz=Math.sin(ang),ox=F.pos.x-dz*off,oz=F.pos.z+dx*off,pts=[];
    for(let s=-L/2;s<=L/2;s+=500){const x=ox+dx*s,z=oz+dz*s;let h=0;for(const q of [-500,0,500])h=Math.max(h,S.heightAt(x+dx*q,z+dz*q));pts.push({x,z,y:h+260,v:68,g:0});}
    const path=mkPath(pts,false);const a={kind:'rega',id:'rega',P:PLANES.rega,m:getModel('rega'),path,u:0,v:68,t:0,cs:'Rega '+(1+Math.floor(Math.random()*15))};a.pos=new THREE.Vector3();pathPose(a,0);T.list.push(a);}
  // Reiseflug in 9–11 km Höhe mit Kondensstreifen
  function spawnCruise(F){const id=CRUISE_TYPES[(T.n++)%CRUISE_TYPES.length],P=PLANES[id];if(!P)return;const hd=Math.random()*Math.PI*2,off=rnd(-16000,16000),L=70000;
    const dx=Math.sin(hd),dz=-Math.cos(hd),ox=F.pos.x+dz*off,oz=F.pos.z-dx*off;
    const a={kind:'cruise',id,key:'cruise:'+id,P,m:getModel(id,'cruise:'+id),x0:ox-dx*L/2,z0:oz-dz*L/2,dx,dz,s:0,L,y:rnd(9000,11300),v:rnd(225,250),t:0,cs:callsign('LUIS')};
    a.pos=new THREE.Vector3(a.x0,a.y,a.z0);T.list.push(a);}
  T._dbg={arrDist,depDist,circuitFor};
  T.prewarm=()=>{for(const id of [...new Set([...ZRH_TYPES,'alpina','saentis','titlis','foehn','rega','segler'])]){if(!PLANES[id])continue;const m=buildModel(id,{landingLight:true});m.visible=false;(T.pool[id]=T.pool[id]||[]).push(m);}};
  T.reset=()=>{for(const a of T.list)free(a);T.list.length=0;T.ga={};for(const H of T.hubs)H.t={arr:rnd(6,16),dep:rnd(25,45)};T.timer={ga:rnd(5,20),gl:rnd(10,30),rega:rnd(60,150),cruise:rnd(2,10)};};
  function drop(i){free(T.list[i]);T.list.splice(i,1);}
  let MENU_F=null;
  T.update=(dt,F,t,night,glow)=>{
    if(!T.on){if(T.list.length)T.reset();return;}
    // im Menü: Linienverkehr in Zürich als Kulisse
    const menu=!F;if(menu){const Z=T.hubs[0].C;F=MENU_F||(MENU_F={pos:new THREE.Vector3(Z.x,Z.elev+2000,Z.z),onGround:false});}
    const day=night<0.35;
    // Linienverkehr an den Plätzen in Reichweite
    for(const H of T.hubs){const near=Math.hypot(F.pos.x-H.C.x,F.pos.z-H.C.z)<45000;
      if(!near){for(let i=T.list.length-1;i>=0;i--)if(T.list[i].hub===H)drop(i);continue;}
      H.t.arr-=dt;H.t.dep-=dt;
      if(H.t.arr<=0){H.t.arr=H.arrT[0]+Math.random()*H.arrT[1];const [id,sd]=H.arr[0],A=APM[id];
        if(T.list.filter(a=>a.hub===H&&a.kind==='arr').length<2&&!playerOn(A,F)){const n0=T.list.length;spawnArr(H,A,sd);if(T.list.length>n0)T.list[T.list.length-1].hub=H;}}
      if(H.t.dep<=0){H.t.dep=H.depT[0]+Math.random()*H.depT[1];let pick=H.dep[0];if(H.dep.length>1){let r=Math.random();for(const d of H.dep){r-=d[2]||1;if(r<=0){pick=d;break;}}}
        const A=APM[pick[0]],sd=pick[1];const pOnGround=F.onGround&&Math.hypot(F.pos.x-H.C.x,F.pos.z-H.C.z)<4500;
        // nicht starten, wenn ein Anflug auf derselben Piste kurz vor der Landung ist
        const conflict=T.list.some(a=>a.hub===H&&a.kind==='arr'&&a.A.id===A.id&&((a.phase==='final'&&a.s>-5000)||a.phase==='flare'||a.phase==='rollout'));
        if(!T.list.some(a=>a.hub===H&&a.kind==='dep')&&!playerOn(A,F)&&!pOnGround&&!conflict){const n0=T.list.length;spawnDep(H,A,sd);if(T.list.length>n0)T.list[T.list.length-1].hub=H;}else H.t.dep=12;}}
    // Platzrunden an kleinen Flugplätzen in der Nähe (tagsüber)
    T.timer.ga-=dt;T.timer.gl-=dt;T.timer.rega-=dt;T.timer.cruise-=dt;
    if(menu){T.timer.ga=T.timer.gl=T.timer.rega=T.timer.cruise=5;for(let i=T.list.length-1;i>=0;i--)if(!T.list[i].hub)drop(i);}
    if(T.timer.ga<=0){T.timer.ga=rnd(25,60);if(day){const cand=AIRPORTS.filter(A=>(A.wasSmall||['BRN','GRE','ACH','BUO','SMV','LUG'].includes(A.id))&&!T.ga[A.id]&&Math.hypot(F.pos.x-A.x,F.pos.z-A.z)<22000&&!playerOn(A,F));
        if(cand.length&&T.list.filter(a=>a.kind==='ga').length<3){const A=cand[Math.floor(Math.random()*cand.length)];spawnGA(A);}}}
    if(T.timer.gl<=0){T.timer.gl=rnd(40,90);if(day&&T.list.filter(a=>a.kind==='glider').length<2&&F.pos.y<4500)spawnGlider(F);}
    if(T.timer.rega<=0){T.timer.rega=rnd(240,480);if(!T.list.some(a=>a.kind==='rega')&&F.pos.y<5000)spawnRega(F);}
    if(T.timer.cruise<=0){T.timer.cruise=rnd(45,110);if(T.list.filter(a=>a.kind==='cruise').length<3)spawnCruise(F);}
    for(let i=T.list.length-1;i>=0;i--){const a=T.list[i],P=a.P,A=a.A;a.t+=dt;
      if(a.kind==='arr'){
        const tdz=-A.len/2+380;
        if(a.phase==='final'){a.v+=((P.Vref*1.08)-a.v)*dt*0.2;a.s+=a.v*dt;const dist=tdz-a.s;a.y=A.elev+P.gearH+Math.max(0,dist)*Math.tan(3*DEG);a.pitch=2.5*DEG;a.flap=Math.min(1,a.flap+dt*0.1);
          if(playerOn(A,F)&&F.onGround&&dist<5000){a.phase='goaround';}
          if(dist<180){a.phase='flare';}}
        else if(a.phase==='flare'){a.s+=a.v*dt;a.v-=dt*1.2;const dist=tdz-a.s;a.y=Math.max(A.elev+P.gearH,a.y-dt*(0.9+Math.max(0,dist)*0.004));a.pitch+=(5*DEG-a.pitch)*dt*1.5;if(a.y<=A.elev+P.gearH+0.05&&a.s>tdz-100){a.phase='rollout';}}
        else if(a.phase==='rollout'){a.y=A.elev+P.gearH;a.pitch=Math.max(0,a.pitch-dt*2*DEG);a.v=Math.max(14,a.v-dt*2.4);a.s+=a.v*dt;if(a.v<=14.5&&a.s>0)a.phase='exit';if(a.s>A.len/2-200)a.phase='exit';}
        else if(a.phase==='exit'){a.s+=a.v*dt;a.off=(a.off||0)+a.v*dt*0.7;a.yawOff=Math.min(55*DEG,(a.yawOff||0)+dt*0.5);if(a.off>120){drop(i);continue;}}
        else if(a.phase==='goaround'){a.v=Math.min(P.Vref*1.6,a.v+dt*2);a.s+=a.v*dt;a.y+=a.v*Math.sin(6*DEG)*dt;a.pitch=9*DEG;a.gear=Math.max(0,a.gear-dt/6);if(a.t>200||a.y>A.elev+1800){drop(i);continue;}}
      }else if(a.kind==='dep'){
        if(a.phase==='roll'){if(playerOn(A,F)&&a.t<3){drop(i);continue;}
          a.v+=dt*(a.P.cls==='jet'?2.1:2.6);a.s+=a.v*dt;if(a.v>P.Vr*1.05){a.pitch=Math.min(8*DEG,a.pitch+dt*2.5*DEG);if(a.pitch>6*DEG)a.phase='climb';}}
        else{a.v=Math.min(P.Vr*1.7,a.v+dt*1.2);a.s+=a.v*Math.cos(7*DEG)*dt;a.y+=a.v*Math.sin(7*DEG)*dt;a.pitch=9*DEG;if(a.t>12)a.gear=Math.max(0,a.gear-dt/7);a.flap=Math.max(0,a.flap-dt/25);
          if(a.s>A.len/2+a.lim){drop(i);continue;}}
        if(a.phase==='roll')a.y=A.elev+P.gearH;}
      if(a.kind==='arr'||a.kind==='dep'){
        const p=fromLocal(A,a.sd*a.s,a.sd*(a.off||0));a.pos.set(p.x,a.y,p.z);
        a.m.position.copy(a.pos);a.m.rotation.set(0,0,0);a.m.rotation.order='YXZ';a.m.rotation.y=yawOf(A,a.sd)-(a.yawOff||0)*a.sd;a.m.rotation.x=a.pitch;
        animateModel(a.m,{flapPos:a.flap,gearPos:a.gear,rpm:0.6,groundSpeed:(a.phase==='roll'||a.phase==='rollout'||a.phase==='exit')?a.v:0,landingLight:night>0.2,night},t,dt);}
      else if(a.kind==='ga'||a.kind==='rega'){const Pt=a.path,vT=a.kind==='rega'&&!a.pad?68:Pt.at(a.u,'v');a.v+=(vT-a.v)*Math.min(1,dt*0.8);if(a.landT!=null){a.landT+=dt;a.v=0;}
        a.u+=a.v*dt/Pt.L;
        if(a.kind==='ga'){if(a.u>=1)a.u-=1;
          // Platzrunden, solange der Spieler in der Nähe ist; steht der Spieler auf der Piste, macht das Kleinflugzeug Platz
          const far=Math.hypot(F.pos.x-A.x,F.pos.z-A.z)>26000,blocked=playerOn(A,F)&&F.onGround&&(a.u>0.8||a.u<0.05)&&a.pos.distanceTo(F.pos)>1500;
          if(far||blocked){drop(i);delete T.ga[A.id];continue;}
          const g=Pt.at(a.u,'g')>0.5;a.leg=a.u>0.82||a.u<0.02?'final':'circuit';a.gear=1;a.flap=a.leg==='final'||g?0.6:0.2;}
        else if(a.u>=1){if(a.pad){a.u=0.99999;if(a.landT==null)a.landT=0;if(a.landT>40){drop(i);continue;}}else{drop(i);continue;}}
        pathPose(a,dt);if(a.kind==='ga'&&a.air===false)a.pos.y=Math.max(a.pos.y,S.heightAt(a.pos.x,a.pos.z)+P.gearH);
        a.m.position.copy(a.pos);a.m.rotation.order='YXZ';a.m.rotation.set(a.pitch,a.yaw,a.bank);
        animateModel(a.m,{flapPos:a.flap||0,gearPos:a.gear??1,rpm:a.kind==='rega'?(a.landT>8?0.25:0.85):0.7,groundSpeed:a.air?0:a.v,landingLight:night>0.2,night},t,dt);}
      else if(a.kind==='glider'){if(a.t>a.life||Math.hypot(F.pos.x-a.cx,F.pos.z-a.cz)>26000){drop(i);continue;}
        const w=24/a.R;a.ph+=a.dir*w*dt;a.cx+=a.drift.x*dt;a.cz+=a.drift.y*dt;const y=a.base+Math.min(900,a.t*a.climb);
        a.pos.set(a.cx+Math.cos(a.ph)*a.R,y,a.cz+Math.sin(a.ph)*a.R);
        // Flugrichtung tangential zum Kreis
        const tx=-Math.sin(a.ph)*a.dir,tz=Math.cos(a.ph)*a.dir;a.yaw=Math.atan2(-tx,-tz);
        a.m.position.copy(a.pos);a.m.rotation.order='YXZ';a.m.rotation.set(-1*DEG,a.yaw,-a.dir*Math.atan(24*w/9.81));
        a.v=24;animateModel(a.m,{flapPos:0,gearPos:0,rpm:0,groundSpeed:0,night},t,dt);}
      else if(a.kind==='cruise'){a.s+=a.v*dt;if(a.s>a.L){drop(i);continue;}
        a.pos.set(a.x0+a.dx*a.s,a.y,a.z0+a.dz*a.s);a.m.position.copy(a.pos);a.m.rotation.order='YXZ';a.m.rotation.set(0,Math.atan2(-a.dx,-a.dz),0);
        // Kondensstreifen bilden sich erst ein Stück hinter dem Flugzeug und wachsen in den ersten Sekunden
        if(a.m.userData.trail){a.m.userData.trail.scale.z=Math.max(0.01,Math.min(1,a.s/8000));a.m.userData.trailMat.opacity=0.8*Math.max(0,1-night*1.2);}
        animateModel(a.m,{flapPos:0,gearPos:0,rpm:0.8,groundSpeed:0,landingLight:false,night},t,dt);}
      const pl=a.m.userData.parts.lights;if(pl&&glow){pl.u.uScale.value=glow.s;pl.u.uFogD.value=glow.f;pl.u.uI.value=0.6+1.6*night;}
      a.hdg=((-a.m.rotation.y/DEG)%360+360)%360;a.span=(P.wingTip||(P.rotorR||10))*2;}
  };
  // Kollision mit dem Spieler
  T.hit=F=>{for(const a of T.list){const r=Math.max(8,a.span*0.42);if(Math.abs(a.pos.x-F.pos.x)<r+60&&a.pos.distanceTo(F.pos)<r)return a;}return null;};
  T.dots=()=>T.list.filter(a=>a.kind!=='cruise').map(a=>({x:a.pos.x,z:a.pos.z,hdg:a.hdg}));
  return T;
}
