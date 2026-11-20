// Helikopter-Flugphysik (Rega H-145): Kollektiv, zyklische Steuerung, Heckrotor, Bodeneffekt, Kufenlandung
import * as THREE from 'three';
const DEG=Math.PI/180,G=9.81;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const _e=new THREE.Euler(0,0,0,'YXZ'),_up=new THREE.Vector3(),_f=new THREE.Vector3(),_r=new THREE.Vector3(),_F=new THREE.Vector3(),_va=new THREE.Vector3(),_q=new THREE.Quaternion(),_ax=new THREE.Vector3();

export function createHeli(P,pos,heading,opt={}){
  const F={P,pos:pos.clone(),vel:new THREE.Vector3(),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,heading,0,'YXZ')),w:new THREE.Vector3(),
    thr:opt.air?0.5:0,eng:opt.air?0.6:0,rotor:opt.air?1:0,flaps:0,flapPos:0,gear:true,gearPos:1,brake:false,spoiler:false,onGround:!opt.air,assist:opt.assist!==false,
    alpha:0,beta:0,stalled:false,airTime:opt.air?10:0,groundTime:0,ail:0,elev:0,rud:0,crashed:false,events:[],bank:0,ias:0,heli:true,tailStrike:false};
  if(opt.air){F.vel.set(0,0,-(opt.speed||25)).applyQuaternion(F.q);}
  return F;
}
function crash(F,reason){F.crashed=true;F.events.push({type:'crash',reason});}

// ctl: pitch (+ = Nase hoch), roll (+ = links), yaw (+ = links), coll (-1..1, nur mit Flughilfe)
export function stepHeli(F,ctl,dt,W){
  const P=F.P;if(F.crashed)return;
  const sm=Math.min(1,dt*6);F.elev+=(ctl.pitch-F.elev)*sm;F.ail+=(ctl.roll-F.ail)*sm;F.rud+=(ctl.yaw-F.rud)*sm;
  // Rotor hochfahren: beim ersten Anheben des Kollektivs
  if(F.thr>0.05||!F.onGround)F.rotor=Math.min(1,F.rotor+dt*0.35);
  _e.setFromQuaternion(F.q,'YXZ');let pitch=_e.x,yaw=_e.y,roll=_e.z;
  _up.set(0,1,0).applyQuaternion(F.q);_f.set(0,0,-1).applyQuaternion(F.q);_r.set(1,0,0).applyQuaternion(F.q);
  const rho=1.225*Math.exp(-F.pos.y/8500),mass=P.mass,Tmax=2.05*mass*G*Math.pow(rho/1.225,0.6)*F.rotor;
  const gh=W.heightAt(F.pos.x,F.pos.z),lake=W.isLake(F.pos.x,F.pos.z),surf=lake?W.waterLevel(F.pos.x,F.pos.z):gh;
  const h=F.pos.y-P.gearH-surf;
  _va.copy(F.vel);if(W.wind)_va.sub(W.wind);const vh=Math.hypot(_va.x,_va.z);F.ias=_va.length();
  // Bodeneffekt und Translationsauftrieb
  const ge=1+0.14*clamp(1-h/(2*P.rotorR),0,1),tl=1+0.08*clamp((vh-7)/10,0,1)*clamp((40-vh)/15,0,1);
  const cosT=Math.max(0.55,_up.y);
  // Kollektiv: mit Flughilfe = Steig-/Sinkrate (Hebel federt zur Mitte = Höhe halten)
  let T;
  if(F.assist){if(Math.abs(ctl.coll||0)<0.05&&!F.onGround)F.thr+=(0.5-F.thr)*Math.min(1,dt*2.2);
    let vsCmd=(F.thr-0.5)*2*(F.thr>0.5?8:6.5);if(h<25&&vsCmd<0)vsCmd=Math.max(vsCmd,-(0.9+h*0.22));const need=mass*(G+(vsCmd-F.vel.y)*1.3)/cosT;
    T=F.onGround&&F.thr<0.52?F.thr*Tmax*0.9:clamp(need,0,Tmax*ge*tl);if(F.onGround&&F.thr>0.52)T=Math.max(T,mass*G*1.08/cosT);}
  else T=F.thr*Tmax*ge*tl;
  T=Math.min(T,Tmax*ge*tl);F.eng=clamp(0.3+0.7*T/(mass*G*1.6),0,1)*F.rotor;F.thrust=T;
  // Kräfte
  _F.set(0,-mass*G,0).addScaledVector(_up,T);
  const qh=0.5*rho*vh;_F.x-=qh*3.2*_va.x;_F.z-=qh*3.2*_va.z;_F.y-=0.5*rho*Math.abs(_va.y)*_va.y*14+0.5*rho*vh*_va.y*1.5;
  // ---- am Boden ----
  if(F.onGround){F.groundTime+=dt;F.vel.set(0,0,0);F.w.set(0,0,0);
    if(T>mass*G*1.02&&F.rotor>0.95){F.onGround=false;F.airTime=0;F.vel.y=0.4;F.events.push({type:'liftoff'});}
    else{yaw+=F.rud*0.5*dt*F.rotor*0.4;_e.set(0,yaw,0,'YXZ');F.q.setFromEuler(_e);F.pos.y=surf+P.gearH;return;}}
  F.airTime+=dt;
  // ---- Lage regeln (Fly-by-wire mit Flughilfe) ----
  const fwdH=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),rgtH=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const vf=F.vel.dot(fwdH),vr=F.vel.dot(rgtH);let pt,rt;
  if(F.assist){const centered=Math.abs(ctl.pitch)<0.05&&Math.abs(ctl.roll)<0.05;
    pt=ctl.pitch*22*DEG+(centered?clamp(vf*0.035,-0.22,0.22):0);rt=ctl.roll*30*DEG+(centered?clamp(vr*0.05,-0.25,0.25):0);
    pt=clamp(pt,-25*DEG,25*DEG);rt=clamp(rt,-(P.maxBank||35)*DEG,(P.maxBank||35)*DEG);
    F.w.x+=((pt-pitch)*2.8-F.w.x)*Math.min(1,dt*6);F.w.z+=((rt-roll)*2.6-F.w.z)*Math.min(1,dt*6);}
  else{F.w.x+=(ctl.pitch*1.1-F.w.x*0.6)*dt*3;F.w.z+=(ctl.roll*1.4-F.w.z*0.6)*dt*3;}
  // Gieren: Pedale + koordinierte Kurve im Vorwärtsflug + Wetterfahne
  const coord=vh>12?clamp(G*Math.tan(roll)/Math.max(vh,12),-0.6,0.6):0;
  const slip=vh>15?Math.atan2(vr,Math.max(1,Math.abs(vf)))*-0.8:0;
  const yt=ctl.yaw*0.9+coord+slip;F.w.y+=(yt-F.w.y)*Math.min(1,dt*3.5);
  // Winkelgeschwindigkeit (Welt) in Euler-Änderung übertragen
  pitch=clamp(pitch+F.w.x*dt,-40*DEG,40*DEG);roll=clamp(roll+F.w.z*dt,-50*DEG,50*DEG);yaw+=F.w.y*dt;
  _e.set(pitch,yaw,roll,'YXZ');F.q.setFromEuler(_e);F.bank=Math.atan2(_r.y,_up.y);
  F.vel.addScaledVector(_F,dt/mass);
  if(F.vel.length()>P.Vmax){F.vel.multiplyScalar(P.Vmax/F.vel.length());}
  F.pos.addScaledVector(F.vel,dt);
  // ---- Bodenkontakt ----
  const gh2=W.heightAt(F.pos.x,F.pos.z),lake2=W.isLake(F.pos.x,F.pos.z),surf2=lake2?W.waterLevel(F.pos.x,F.pos.z):gh2;
  if(F.pos.y-P.gearH<=surf2){
    const sink=-F.vel.y,hs=Math.hypot(F.vel.x,F.vel.z),tilt=Math.max(Math.abs(pitch),Math.abs(roll))/DEG,sl=W.slopeAt(F.pos.x,F.pos.z);
    if(lake2)return crash(F,'Im See notgewassert – der Helikopter ist gekentert.');
    if(sink>P.ldgSink*1.25)return crash(F,`Zu harte Landung (Sinkrate ${sink.toFixed(1)} m/s).`);
    if(hs>7)return crash(F,'Mit zu viel Fahrt aufgesetzt – der Helikopter ist umgekippt.');
    if(tilt>16)return crash(F,'Die Rotorblätter haben den Boden berührt.');
    if(sl>0.36)return crash(F,'Der Hang ist zu steil – der Helikopter ist abgerutscht.');
    F.onGround=true;F.pos.y=surf2+P.gearH;F.vel.set(0,0,0);F.w.set(0,0,0);_e.set(0,yaw,0,'YXZ');F.q.setFromEuler(_e);
    if(F.airTime>3)F.events.push({type:'touchdown',sink,pitch:0,bank:0,x:F.pos.x,z:F.pos.z,rw:W.runwayAt(F.pos.x,F.pos.z)||W.airportZone(F.pos.x,F.pos.z),heli:true,hs,slope:sl});
  }
  // Rotor im Gelände (Hang seitlich/vorne)
  else{for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=F.pos.x+(_r.x*dx+_f.x*dz)*P.rotorR,z=F.pos.z+(_r.z*dx+_f.z*dz)*P.rotorR;
    if(F.pos.y+0.9>W.heightAt(x,z)&&F.pos.y+0.2<W.heightAt(x,z)&&!W.isLake(x,z))return crash(F,'Der Rotor hat den Hang gestreift.');}}
}
