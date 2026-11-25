// Wind, Böen, Turbulenz und Regen
import * as THREE from 'three';
const DEG=Math.PI/180;
export const WIND_PRESETS={calm:{spd:0,gust:0,turb:0},light:{spd:4,gust:1.5,turb:0.15},mid:{spd:8,gust:4,turb:0.35},strong:{spd:13,gust:7,turb:0.6},foehn:{spd:16,gust:10,turb:0.9},storm:{spd:9,gust:9,turb:0.95}};
export function createWeather(scene){
  const Wx={wind:new THREE.Vector3(),cfg:{dir:240,spd:0,gust:0,turb:0},rain:0,t:0,cur:{dir:240,spd:0}};
  const ph=[Math.random()*9,Math.random()*9,Math.random()*9,Math.random()*9,Math.random()*9];
  // Regen
  const N=5000,B=70,pos=new Float32Array(N*6),seed=new Float32Array(N*3);
  for(let i=0;i<N;i++){seed[i*3]=(Math.random()-0.5)*2*B;seed[i*3+1]=Math.random()*2*B-B*0.6;seed[i*3+2]=(Math.random()-0.5)*2*B;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb8c6d4,transparent:true,opacity:0.32,depthWrite:false,fog:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  let lastCam=null;const off=new Float32Array(N*3);
  Wx.set=(cfg,rainAmt,snow)=>{Wx.cfg={dir:cfg.dir??240,spd:cfg.spd||0,gust:cfg.gust||0,turb:cfg.turb||0};Wx.rain=rainAmt||0;Wx.snow=!!snow;rain.visible=Wx.rain>0;rain.material.color.set(Wx.snow?0xffffff:0xb8c6d4);rain.material.opacity=Wx.snow?0.85:0.18+0.22*Wx.rain;lastCam=null;};
  // Wind am Ort (agl: Höhe über Grund) – mit Böen und Grenzschicht
  // Bergwind aus dem Gelände (alle 0,3 s neu): Lee-Rotor und Abwind hinter Graten, Hangaufwind auf der Luvseite,
  // Talwind am Nachmittag (warme Luft strömt talaufwärts), Föhn verstärkt alles
  Wx.mtn={lee:0,lift:0,vx:0,vz:0,t:0,txt:''};
  Wx.terrain=(dt,pos,S,hour)=>{const M=Wx.mtn;M.t-=dt;if(M.t>0)return;M.t=0.3;const c=Wx.cfg,d=c.dir*DEG,sp=c.spd;
    const ux=Math.sin(d),uz=-Math.cos(d);// Richtung, aus der der Wind kommt
    const g0=S.heightAt(pos.x,pos.z);let lee=0,lift=0;
    if(sp>3.5){let ridge=-1e9,rd=0;for(const r of [500,1000,1600,2400,3200]){const h=S.heightAt(pos.x+ux*r,pos.z+uz*r);if(h>ridge){ridge=h;rd=r;}}
      const over=ridge-g0,below=ridge+350-pos.y;
      if(over>250&&below>0)lee=Math.min(1,(over-250)/600)*Math.min(1,below/350)*Math.min(1,1.6-rd/3200)*Math.min(1.5,sp/10);
      // Luv: Gelände steigt in Windrichtung an → Hangaufwind
      const hd=S.heightAt(pos.x-ux*700,pos.z-uz*700);const rise=hd-g0,agl=pos.y-g0;
      if(rise>120&&agl<rise+400)lift=Math.min(3.5,(rise/700)*sp*0.9)*Math.max(0,1-Math.max(0,agl-rise)/400);}
    M.lee=lee;M.lift=lift;
    // Talwind: 11–18 Uhr in Bergtälern, talaufwärts (zum höheren Gelände), bis 600 m über Grund
    const day=hour==null?0:Math.max(0,Math.sin((hour-10.5)/8*Math.PI));let vx=0,vz=0;
    if(day>0&&g0>350){const e=S.heightAt(pos.x+1500,pos.z),w=S.heightAt(pos.x-1500,pos.z),n=S.heightAt(pos.x,pos.z-1500),so=S.heightAt(pos.x,pos.z+1500);
      const relief=Math.max(e,w,n,so)-g0;if(relief>300){const gx=(e-w),gz=(so-n),gl=Math.hypot(gx,gz)||1,k=3.5*day*Math.min(1,relief/900)*Math.max(0,1-(pos.y-g0)/600);vx=gx/gl*k;vz=gz/gl*k;}}
    M.vx=vx;M.vz=vz;M.txt=lee>0.35?'Lee-Turbulenz':lift>1.2?'Hangaufwind':Math.hypot(vx,vz)>1.5?'Talwind':'';};
  Wx.update=(dt,agl)=>{Wx.t+=dt;const t=Wx.t,c=Wx.cfg;
    const gu=c.gust*(0.55*Math.max(0,Math.sin(t*0.53+ph[0]))+0.3*Math.sin(t*1.37+ph[1])+0.15*Math.sin(t*3.1+ph[2]));
    const dirv=c.dir+(c.turb*14)*Math.sin(t*0.23+ph[3]);const bl=agl==null?1:Math.min(1,0.55+0.45*Math.max(0,agl)/300);
    const sp=Math.max(0,(c.spd+gu))*bl;const d=dirv*DEG;
    const M=Wx.mtn,le=M.lee,fo=c.spd>=14?1.5:1;
    // im Lee: Abwind bis 4 m/s mit kräftigen Wirbeln; Föhn macht die Böen härter
    const leeV=le*(-2.2*fo+1.8*Math.sin(t*1.7+ph[2])*Math.sin(t*0.6))*Math.min(1,c.spd/8),leeH=le*c.spd*0.45*fo*Math.sin(t*1.3+ph[0]);
    Wx.wind.set(-Math.sin(d)*sp+M.vx+leeH*Math.cos(d),c.turb*1.6*Math.sin(t*0.9+ph[4])*Math.sin(t*2.3)+leeV+M.lift,Math.cos(d)*sp+M.vz+leeH*Math.sin(d));
    Wx.cur={dir:(dirv+360)%360,spd:sp,base:c.spd*bl};return Wx.wind;};
  // Turbulenz-Stösse auf die Drehraten
  Wx.kick=(F,dt)=>{const k=Wx.cfg.turb+Wx.mtn.lee*(Wx.cfg.spd>=14?1.6:1.1);if(!k||F.onGround)return;const s=Math.min(1,F.vel.length()/60);
    F.w.x+=(Math.random()-0.5)*k*0.9*dt*s+Math.sin(Wx.t*2.7+ph[1])*k*0.25*dt;F.w.z+=(Math.random()-0.5)*k*1.4*dt*s+Math.sin(Wx.t*1.9+ph[2])*k*0.4*dt;};
  Wx.updateRain=(dt,cam)=>{if(!rain.visible)return;const cp=cam.position;let cv=new THREE.Vector3();if(lastCam&&dt>0)cv.copy(cp).sub(lastCam).divideScalar(dt);lastCam=cp.clone();
    const fall=new THREE.Vector3(Wx.wind.x,Wx.snow?-1.7:-11,Wx.wind.z),rel=fall.clone().sub(cv),sl=Wx.snow?Math.min(0.012,0.12/Math.max(rel.length(),1)):Math.min(0.06,3/Math.max(rel.length(),1));
    for(let i=0;i<N;i++){let x=seed[i*3]+off[i*3],y=seed[i*3+1]+off[i*3+1],z=seed[i*3+2]+off[i*3+2];
      off[i*3]+=rel.x*dt;off[i*3+1]+=rel.y*dt;off[i*3+2]+=rel.z*dt;
      x=((x+rel.x*dt+B)%(2*B)+2*B)%(2*B)-B;y=((y+rel.y*dt+B)%(2*B)+2*B)%(2*B)-B;z=((z+rel.z*dt+B)%(2*B)+2*B)%(2*B)-B;
      off[i*3]=x-seed[i*3];off[i*3+1]=y-seed[i*3+1];off[i*3+2]=z-seed[i*3+2];
      const o=i*6;pos[o]=cp.x+x;pos[o+1]=cp.y+y;pos[o+2]=cp.z+z;pos[o+3]=cp.x+x-rel.x*sl;pos[o+4]=cp.y+y-rel.y*sl;pos[o+5]=cp.z+z-rel.z*sl;}
    g.attributes.position.needsUpdate=true;};
  return Wx;
}
