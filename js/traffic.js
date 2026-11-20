// KI-Verkehr am Flughafen Zürich: Landungen auf 14, Starts auf 16 und 28
import * as THREE from 'three';
import {APM,fromLocal,toLocal} from './worldgen.js';
const DEG=Math.PI/180,UP=new THREE.Vector3(0,1,0);
const TYPES=['l320','l320','l330','l350','l340','l320','l380'];
export function createTraffic(scene,S,buildModel,animateModel,PLANES){
  const T={list:[],pool:{},timer:{arr:8,dep:30},on:true,n:0};
  const Z=APM.ZRH16;
  if(!Z||!APM.ZRH14||!APM.ZRH10)return{on:false,list:[],prewarm(){},reset(){},update(){},hit(){return null},dots(){return[]},busy(){return null}};
  function getModel(id){const p=T.pool[id]||(T.pool[id]=[]);let m=p.pop();if(!m){m=buildModel(id,{landingLight:true});}m.visible=true;scene.add(m);return m;}
  function free(a){scene.remove(a.m);a.m.visible=false;(T.pool[a.id]=T.pool[a.id]||[]).push(a.m);}
  const yawOf=(A,sd)=>-A.a+(sd<0?Math.PI:0);
  function spawnArr(){const A=APM.ZRH14,sd=1,id=TYPES[(T.n++)%TYPES.length],P=PLANES[id];
    const d=14000;const p=fromLocal(A,-sd*(A.len/2+d),0);
    const a={kind:'arr',id,P,A,sd,m:getModel(id),s:-d,v:P.Vref*1.25,y:A.elev+P.gearH+15+(d+300)*Math.tan(3*DEG),pitch:2*DEG,gear:1,flap:1,phase:'final',t:0,cs:'LUIS '+(100+Math.floor(Math.random()*899))};
    a.pos=new THREE.Vector3(p.x,a.y,p.z);T.list.push(a);}
  function spawnDep(A,sd){const id=TYPES[(T.n++)%TYPES.length],P=PLANES[id];
    const a={kind:'dep',id,P,A,sd,m:getModel(id),s:-(A.len/2-80),v:0,y:A.elev+P.gearH,pitch:0,gear:1,flap:1/3,phase:'roll',t:0,cs:'LUIS '+(100+Math.floor(Math.random()*899))};
    a.pos=new THREE.Vector3();T.list.push(a);}
  // Ist die Piste für den Spieler frei? (Text für den Tower oder null)
  T.busy=(Ap,R,mode)=>{if(!T.on||!Ap||Ap.icao!=='LSZH')return null;
    for(const a of T.list){if(a.A.id!==(R&&R.id))continue;
      if(a.kind==='dep')continue;
      if(a.kind==='arr'&&a.phase==='final'&&a.s>-6000)return'Verkehr im kurzen Endanflug';
      if(a.kind==='arr'&&(a.phase==='flare'||a.phase==='rollout'))return'Verkehr auf der Piste';
      }
    for(const a of T.list)if(a.kind==='dep'&&a.phase==='roll')return'Verkehr startet gerade';
    return null;};
  function playerOn(A,F){if(!F)return false;const l=toLocal(A,F.pos.x,F.pos.z);return Math.abs(l.across)<120&&Math.abs(l.along)<A.len/2+9000&&F.pos.y-A.elev<700;}
  T.prewarm=()=>{for(const id of [...new Set(TYPES)]){const m=buildModel(id,{landingLight:true});m.visible=false;(T.pool[id]=T.pool[id]||[]).push(m);}};
  T.reset=()=>{for(const a of T.list)free(a);T.list.length=0;T.timer={arr:6+Math.random()*10,dep:25+Math.random()*20};};
  T.update=(dt,F,t,night,glow)=>{
    const near=!F||Math.hypot(F.pos.x-Z.x,F.pos.z-Z.z)<45000;
    if(!T.on||!near){if(T.list.length)T.reset();return;}
    T.timer.arr-=dt;T.timer.dep-=dt;
    if(T.timer.arr<=0){T.timer.arr=85+Math.random()*60;if(T.list.filter(a=>a.kind==='arr').length<2&&!playerOn(APM.ZRH14,F))spawnArr();}
    if(T.timer.dep<=0){T.timer.dep=70+Math.random()*50;const A=Math.random()<0.65?APM.ZRH16:APM.ZRH10,sd=A===APM.ZRH10?-1:1;
      const pOnGround=F&&F.onGround&&Math.hypot(F.pos.x-Z.x,F.pos.z-Z.z)<4500;
      if(!T.list.some(a=>a.kind==='dep')&&!playerOn(A,F)&&!pOnGround)spawnDep(A,sd);else T.timer.dep=12;}
    for(let i=T.list.length-1;i>=0;i--){const a=T.list[i],P=a.P,A=a.A;a.t+=dt;
      if(a.kind==='arr'){
        const tdz=-A.len/2+380;
        if(a.phase==='final'){a.v+=((P.Vref*1.08)-a.v)*dt*0.2;a.s+=a.v*dt;const dist=tdz-a.s;a.y=A.elev+P.gearH+Math.max(0,dist)*Math.tan(3*DEG);a.pitch=2.5*DEG;a.flap=Math.min(1,a.flap+dt*0.1);
          if(F&&playerOn(A,F)&&F.onGround&&dist<5000){a.phase='goaround';}
          if(dist<180){a.phase='flare';}}
        else if(a.phase==='flare'){a.s+=a.v*dt;a.v-=dt*1.2;const dist=tdz-a.s;a.y=Math.max(A.elev+P.gearH,a.y-dt*(0.9+Math.max(0,dist)*0.004));a.pitch+=(5*DEG-a.pitch)*dt*1.5;if(a.y<=A.elev+P.gearH+0.05&&a.s>tdz-100){a.phase='rollout';}}
        else if(a.phase==='rollout'){a.y=A.elev+P.gearH;a.pitch=Math.max(0,a.pitch-dt*2*DEG);a.v=Math.max(14,a.v-dt*2.4);a.s+=a.v*dt;if(a.v<=14.5&&a.s>0)a.phase='exit';if(a.s>A.len/2-200)a.phase='exit';}
        else if(a.phase==='exit'){a.s+=a.v*dt;a.off=(a.off||0)+a.v*dt*0.7;a.yawOff=Math.min(55*DEG,(a.yawOff||0)+dt*0.5);if(a.off>120){free(a);T.list.splice(i,1);continue;}}
        else if(a.phase==='goaround'){a.v=Math.min(P.Vref*1.6,a.v+dt*2);a.s+=a.v*dt;a.y+=a.v*Math.sin(6*DEG)*dt;a.pitch=9*DEG;a.gear=Math.max(0,a.gear-dt/6);if(a.t>200||a.y>A.elev+1800){free(a);T.list.splice(i,1);continue;}}
      }else{
        if(a.phase==='roll'){if(F&&playerOn(A,F)&&a.t<3){free(a);T.list.splice(i,1);continue;}
          a.v+=dt*(a.P.cls==='jet'?2.1:2.6);a.s+=a.v*dt;if(a.v>P.Vr*1.05){a.pitch=Math.min(8*DEG,a.pitch+dt*2.5*DEG);if(a.pitch>6*DEG)a.phase='climb';}}
        else{a.v=Math.min(P.Vr*1.7,a.v+dt*1.2);a.s+=a.v*Math.cos(7*DEG)*dt;a.y+=a.v*Math.sin(7*DEG)*dt;a.pitch=9*DEG;if(a.t>12)a.gear=Math.max(0,a.gear-dt/7);a.flap=Math.max(0,a.flap-dt/25);
          if(a.s>A.len/2+16000){free(a);T.list.splice(i,1);continue;}}
        if(a.phase==='roll')a.y=A.elev+P.gearH;}
      const p=fromLocal(A,a.sd*a.s,a.sd*(a.off||0));a.pos.set(p.x,a.y,p.z);
      a.m.position.copy(a.pos);a.m.rotation.set(0,0,0);a.m.rotation.order='YXZ';a.m.rotation.y=yawOf(A,a.sd)-(a.yawOff||0)*a.sd;a.m.rotation.x=a.pitch;
      animateModel(a.m,{flapPos:a.flap,gearPos:a.gear,rpm:0.6,groundSpeed:(a.phase==='roll'||a.phase==='rollout'||a.phase==='exit')?a.v:0,landingLight:night>0.2,night},t,dt);
      const pl=a.m.userData.parts.lights;if(pl&&glow){pl.u.uScale.value=glow.s;pl.u.uFogD.value=glow.f;pl.u.uI.value=0.6+1.6*night;}
      a.hdg=((-a.m.rotation.y/DEG)%360+360)%360;a.span=(P.wingTip||20)*2;}
  };
  // Kollision mit dem Spieler
  T.hit=F=>{for(const a of T.list){const r=Math.max(12,a.span*0.42);if(a.pos.distanceTo(F.pos)<r)return a;}return null;};
  T.dots=()=>T.list.map(a=>({x:a.pos.x,z:a.pos.z,hdg:a.hdg}));
  return T;
}
