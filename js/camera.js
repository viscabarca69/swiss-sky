// Kamera: Verfolger-, Cockpit-, Aussen- und Wiederholungskamera, Menü-Kamerafahrten mit Überblendung
// Ausgelagert aus main.js. Gemeinsamer Zustand kommt über ctx (Getter).
import * as THREE from 'three';
import {AIRLINER} from './aircraft.js';
import {LAKES,MAIN_AP,PEAKS,fromLocal,oldXZ} from './worldgen.js';
export function createCamera(ctx){
function updateCam(dt){const {G,S,cam,drag,lastDrag,applyShake,rpClear,$,DEG,clamp}=ctx;
  const F=G.F,P=G.P,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');
  if(performance.now()-lastDrag>2500&&!drag&&G.cam!==1){G.look.x*=Math.exp(-dt*1.2);G.look.y*=Math.exp(-dt*1.2);}
  G.cockpit.visible=G.cam===1&&!F.crashed;{const ck=G.cam===1&&!F.crashed&&!!AIRLINER[P.id];if(ck!==G.ckHud){G.ckHud=ck;$('hud').classList.toggle('ck',ck);}}
  if(G.cam===1&&!F.crashed){
    const body=G.model.children[0];const p=G.model.userData.parts.eye.clone().add(body.position).applyQuaternion(F.q).add(F.pos);
    cam.position.copy(p);cam.quaternion.copy(F.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(clamp(G.look.y*-1,-1.2,1.2)*0.8-(AIRLINER[P.id]?0.13:0.06),G.look.x,0,'YXZ')));
    cam.near=0.05;cam.fov=68;cam.updateProjectionMatrix();applyShake(dt);return;}
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
function menuShots(){const {S,wx}=ctx;const pk=n=>PEAKS.find(p=>p.name===n),lk=n=>LAKES.find(l=>l.name===n),L=[];
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
function menuCam(t){const {S,AP,cam,SHOW,showroomOn,ZS,env,world}=ctx;
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
    else{const A=AP.ZRH16,p=fromLocal(A,1600-el*1.2,-380+el*0.3),l=fromLocal(A,1150,-720);cam.near=1;cam.fov=46;// freies Vorfeld mit Blick über Rollweg und Piste (nicht mehr auf eine Terminalwand)
      cam.position.set(p.x,A.elev+16+Math.sin(t*0.03)*1.5,p.z);cam.lookAt(l.x,A.elev+12,l.z);}}
  else{const u=el/sh.dur,e=u*u*(3-2*u)*0.6+u*0.4,lp=(a,b)=>a+(b-a)*e;cam.near=2;cam.fov=48;
    cam.position.set(lp(sh.a[0],sh.b[0]),lp(sh.a[1],sh.b[1]),lp(sh.a[2],sh.b[2]));cam.lookAt(lp(sh.la[0],sh.lb[0]),lp(sh.la[1],sh.lb[1]),lp(sh.la[2],sh.lb[2]));}
  cam.setViewOffset(W,H,-off,0,W,H);cam.updateProjectionMatrix();
  if(fresh&&world)world.updateTrees(cam.position,true);}
function setMFade(v){const {$,clamp}=ctx;const f=$('mfade');if(f){const o=String(Math.round(clamp(v,0,1)*100)/100);if(f.style.opacity!==o)f.style.opacity=o;}}
return {updateCam,menuShots,menuCam,setMFade,MSH};}
