// Echte Gebäude aus swissBUILDINGS3D 3.0 (Quelle: swisstopo) für ausgewählte Städte
// Datei: data/buildings.txt (Base64 einer gzip-Datei, weil der Artifact-Server keine .gz ausliefert) – pro 1-km-Kachel Gebäude-Köpfe, Positions-Deltas (Byte-Ebenen) und Index-Codes
import * as THREE from 'three';
import {ORU,ORTHO_GLSL_HEAD,inAirportArea} from './ortho.js';
import {BUILDINGS} from './swissdata.js';
import {nightU} from './gfx.js';
import {toXZ} from './worldgen.js';
// Wahrzeichen: Gebäude im Umkreis bekommen ein eigenes Aussehen (Art 2 = Sandstein mit Kupfer- oder Schieferdach, 6 = roter Sandstein mit bunten Ziegeln)
// tint < 128 → grünes Kupferdach, sonst dunkles Dach; nachts werden Kirchen und Wahrzeichen angestrahlt
const LANDMARKS=[
  {n:'Bundeshaus',lat:46.94680,lon:7.44425,r:55,hMin:30,ty:2,tint:30},
  {n:'Zytglogge',lat:46.94797,lon:7.44781,r:9,hMin:25,ty:2,tint:230},
  {n:'Basler Münster',lat:47.55642,lon:7.59231,r:45,hMin:20,ty:6,tint:60},
  {n:'Kathedrale St. Gallen',lat:47.42335,lon:9.37730,r:45,hMin:20,ty:2,tint:30},
  {n:'Cathédrale Saint-Pierre',lat:46.20100,lon:6.14848,r:40,hMin:40,ty:2,tint:30}].map(L=>({...L,...toXZ(L.lat,L.lon)}));

export async function loadRealCity(){
  let u8;
  if(BUILDINGS.startsWith('data:')){const b64=BUILDINGS.slice(BUILDINGS.indexOf(',')+1),bin=atob(b64);u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);}
  else{const r=await fetch(BUILDINGS);if(!r.ok)throw new Error('Gebäudedaten fehlen ('+r.status+')');
    if(BUILDINGS.endsWith('.txt')){const bin=atob((await r.text()).trim());u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);}
    else u8=new Uint8Array(await r.arrayBuffer());}
  if(u8[0]===0x1f&&u8[1]===0x8b){
    if(typeof DecompressionStream==='undefined')throw new Error('Browser kann gzip nicht entpacken');
    u8=new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());}
  if(String.fromCharCode(u8[0],u8[1],u8[2],u8[3])!=='SSB2')throw new Error('Gebäudedaten: falsches Format');
  const hl=u8[4]|(u8[5]<<8)|(u8[6]<<16)|(u8[7]<<24);
  const H=JSON.parse(new TextDecoder().decode(u8.subarray(8,8+hl)));
  return {H,data:u8,base:8+hl};
}

// Abdeckung: Vierecke (Kachelgrenzen) – dort werden keine generierten Häuser gebaut
export function coverTest(RC){
  if(!RC)return ()=>false;
  const Q=RC.H.cover.map(c=>{const p=[[c[0],c[1]],[c[2],c[3]],[c[4],c[5]],[c[6],c[7]]];
    const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);return {p,x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)};});
  return (x,z)=>{for(const q of Q){if(x<q.x0||x>q.x1||z<q.z0||z>q.z1)continue;let s=0,ok=true;
    for(let i=0;i<4;i++){const a=q.p[i],b=q.p[(i+1)&3],c=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);if(c===0)continue;const sg=c>0?1:-1;if(!s)s=sg;else if(sg!==s){ok=false;break;}}
    if(ok)return true;}return false;};
}

function cityMaterial(){
  const m=new THREE.MeshStandardMaterial({roughness:0.86,metalness:0.0,side:THREE.DoubleSide,flatShading:true});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uNight=nightU;Object.assign(sh.uniforms,ORU);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aInfo;varying vec2 vInfo;varying vec3 vWP;')
      .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvInfo=aInfo;vWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform float uNight;varying vec2 vInfo;varying vec3 vWP;float winLit;float winMask;float farLit;float glassM;float metA;float cool;float flood;
${ORTHO_GLSL_HEAD}
float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}`)
      .replace('#include <map_fragment>',`#include <map_fragment>
vec3 nW=normalize(cross(dFdx(vWP),dFdy(vWP)));if(dot(nW,cameraPosition-vWP)<0.0)nW=-nW;
float t=vInfo.x/255.0;float k=vInfo.y;winLit=0.0;winMask=0.0;farLit=0.0;glassM=0.0;metA=0.0;cool=0.0;flood=0.0;
vec3 c;
if(abs(nW.y)<0.4&&k>15.5){
  // Flughafengebäude: Glasfassaden, Metallpaneele, Fensterbänder
  float sub=floor((k-16.0)/48.0),hb=k-16.0-sub*48.0;float hA=vWP.y-(380.0+vInfo.x);
  float u=abs(nW.x)>abs(nW.z)?vWP.z:vWP.x;float vr=hh(floor(vWP.xz/40.0));
  float top=step(hb-1.1,hA);cool=1.0;
  if(sub<0.5){
    vec2 g=vec2(u/1.5,hA/4.2);vec2 f=fract(g);float aa=fwidth(g.x)+fwidth(g.y);float fade=1.0-smoothstep(0.15,0.6,aa);
    float fr=max(1.0-step(0.035,f.x)*step(f.x,0.965),1.0-step(0.12,f.y)*step(f.y,0.985));
    fr=max(mix(0.2,fr,fade),top);if(hA<0.4)fr=1.0;
    vec3 gc=mix(vec3(0.30,0.36,0.41),vec3(0.35,0.40,0.43),vr);
    c=mix(gc,vec3(0.72,0.74,0.76),fr);glassM=1.0-fr;
    winMask=glassM;winLit=glassM*fade*step(0.42,hh(floor(g)+vec2(t*13.0,vr)))*0.7;farLit=(1.0-fade)*0.07;
  }else if(sub<1.5){
    float rb=u/0.55;float rs=1.0-smoothstep(0.1,0.5,fwidth(rb));
    c=vec3(0.86,0.87,0.88)-0.03*vr;c*=1.0-0.07*rs*smoothstep(0.3,0.5,abs(fract(rb)-0.5));
    c*=1.0-0.10*rs*(1.0-step(0.025,fract(hA/3.2)));
    float cb=step(hb-4.6,hA)*step(hA,hb-2.6);vec2 g=vec2(u/2.0,0.0);float fade=1.0-smoothstep(0.15,0.6,fwidth(g.x));
    float win=cb*step(0.06,fract(g.x))*fade;c=mix(c,vec3(0.30,0.36,0.41),win);glassM=win;winMask=win;winLit=win*0.25;
    if(top>0.5)c=vec3(0.66,0.68,0.70);if(hA<0.9)c=vec3(0.50,0.50,0.49);metA=0.25;
  }else if(sub<2.5){
    vec2 g=vec2(u/1.35,hA/3.7);vec2 f=fract(g);float aa=fwidth(g.x)+fwidth(g.y);float fade=1.0-smoothstep(0.15,0.6,aa);
    float win=step(0.27,f.y)*step(f.y,0.84)*step(0.06,f.x);if(hA<4.2)win=step(0.35,hA)*step(hA,3.7)*step(0.04,f.x);
    win*=1.0-top;float w2=win*fade;
    c=vec3(0.86,0.87,0.88)-0.05*vr;c=mix(c,vec3(0.30,0.36,0.41),w2);c=mix(c,vec3(0.45,0.51,0.56),(1.0-fade)*0.5*(1.0-top));glassM=(1.0-fade)*0.45*(1.0-top);
    glassM=max(glassM,w2);winMask=w2;winLit=w2*step(0.5,hh(floor(g)+vec2(t*7.0,vr)));farLit=(1.0-fade)*0.07;
  }else{
    float rb=u/0.5;float rs=1.0-smoothstep(0.1,0.5,fwidth(rb));
    c=mix(vec3(0.80,0.81,0.82),vec3(0.72,0.73,0.72),vr)*(1.0-0.06*rs*smoothstep(0.3,0.5,abs(fract(rb)-0.5)));
    if(hA<0.5)c*=0.7;if(top>0.5)c*=0.85;metA=0.2;
  }
}else if(abs(nW.y)<0.4){
  vec3 w0=vec3(0.86,0.83,0.77),w1=vec3(0.82,0.76,0.66),w2=vec3(0.90,0.89,0.86),w3=vec3(0.76,0.73,0.69),w4=vec3(0.88,0.80,0.64);
  c=t<0.25?w0:t<0.45?w1:t<0.65?w2:t<0.85?w3:w4;
  if(k>0.5&&k<1.5)c=mix(vec3(0.55,0.62,0.68),vec3(0.78,0.78,0.76),step(0.5,t));
  else if(k>1.5&&k<2.5)c=vec3(0.80,0.76,0.68);
  else if(k>2.5&&k<3.5)c=vec3(0.78,0.78,0.77);
  else if(k>3.5&&k<4.5)c=vec3(0.86,0.90,0.90);
  else if(k>5.5&&k<6.5)c=vec3(0.60,0.33,0.27)*(0.92+0.08*hh(floor(vWP.xz*0.5)+floor(vWP.y)));
  else if(k>4.5)c=vec3(0.62,0.60,0.56);
  // Kirchen und Wahrzeichen: nachts von unten angestrahlt
  if((k>1.5&&k<2.5)||(k>5.5&&k<6.5))flood=0.5;
  if(k<1.5||(k>1.5&&k<2.5)){
    float u=abs(nW.x)>abs(nW.z)?vWP.z:vWP.x;float tall=step(0.5,k)*step(k,1.5);
    float fh=tall>0.5?3.4:2.9,cw=tall>0.5?2.4:3.3;vec2 g=vec2(u/cw,(vWP.y-0.8)/fh);vec2 f=fract(g);vec2 id=floor(g);
    float aa=fwidth(g.x)+fwidth(g.y);float fade=1.0-smoothstep(0.12,0.45,aa);
    float inW=step(0.22,f.x)*step(f.x,tall>0.5?0.9:0.72)*step(0.3,f.y)*step(f.y,0.85);
    winMask=inW*fade*(k>1.5?0.4:1.0);farLit=(1.0-fade)*step(0.62,hh(floor(vWP.xz/5.0)+floor(vWP.y/3.0)*3.1+t))*0.16*(k>1.5?0.3:1.0);
    float r=hh(id+vec2(t*91.0,t*37.0));winLit=winMask*step(0.55,r)*(0.6+0.4*hh(id*1.7+t));
    c=mix(c,vec3(0.10,0.12,0.14)+vec3(0.10,0.14,0.18)*tall,winMask*0.7);c=mix(c,c*0.86,(1.0-fade)*(k<0.5?1.0:0.0));}
}else if(nW.y>0.94){
  c=mix(vec3(0.50,0.50,0.49),vec3(0.62,0.61,0.58),fract(t*7.0));
  if(t>0.86&&k<0.5)c=vec3(0.36,0.45,0.30);
  if(k>2.5&&k<3.5)c=vec3(0.70,0.70,0.69);
}else{
  vec3 r0=vec3(0.62,0.30,0.21),r1=vec3(0.54,0.25,0.18),r2=vec3(0.42,0.38,0.36),r3=vec3(0.66,0.38,0.25),r4=vec3(0.37,0.36,0.35);
  c=t<0.3?r0:t<0.5?r1:t<0.68?r3:t<0.85?r2:r4;
  if(k>1.5&&k<2.5)c=t<0.5?vec3(0.32,0.52,0.43):vec3(0.30,0.29,0.30);
  if(k>0.5&&k<1.5)c=vec3(0.42,0.43,0.44);
  // Basler Münster: bunt glasierte Ziegel im Rautenmuster
  if(k>5.5&&k<6.5){vec2 q=floor(vec2(vWP.x+vWP.z,vWP.x-vWP.z)/2.6);float h3=fract((q.x+q.y*2.0)/3.0);c=h3<0.3?vec3(0.52,0.24,0.17):h3<0.62?vec3(0.66,0.55,0.26):vec3(0.27,0.36,0.29);}
}
diffuseColor.rgb*=pow(c,vec3(2.2));
// Dächer im Luftbild-Gebiet: echte Dachfarbe aus dem Luftbild
if(nW.y>0.4){vec4 o4=orthoAt(vWP.xz);if(o4.a>0.0)diffuseColor.rgb=mix(diffuseColor.rgb,o4.rgb*0.82,o4.a*(nW.y>0.94?0.95:0.85));}`)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=mix(vec3(1.0,0.74,0.44),vec3(0.82,0.9,1.0),cool)*(winLit*1.5+farLit)*uNight+diffuseColor.rgb*vec3(1.0,0.86,0.62)*flood*uNight;')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.15,winMask);roughnessFactor=mix(roughnessFactor,0.05,glassM);if(metA>0.0)roughnessFactor=min(roughnessFactor,0.5);')
      .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=max(metalnessFactor,max(glassM*0.92,metA));');
  };
  return m;
}

// Gebäude-Meshes pro Kachel aufbauen; Häuser auf die Spiel-Geländehöhe setzen
export function buildRealCity(scene,RC,S,lights){
  const {H,data,base}=RC,sc=H.sc,mat=cityMaterial(),meshes=[];let nb=0;
  for(const C of H.chunks){
    let o=base+C.o;const NB=C.nb,NV=C.nv,NI=C.ni;
    const bh=new DataView(data.buffer,data.byteOffset+o,NB*6);o+=NB*6;
    const pl=k=>data.subarray(o+k*NV,o+(k+1)*NV);const lo=[pl(0),pl(1),pl(2)],hi=[pl(3),pl(4),pl(5)];o+=6*NV;
    const clo=data.subarray(o,o+NI),chi=data.subarray(o+NI,o+2*NI);
    const pos=new Float32Array(NV*3),info=new Uint8Array(NV*2),idx=NV>65535?new Uint32Array(NI):new Uint16Array(NI);
    const acc=[0,0,0];let v=0,ii=0;
    for(let b=0;b<NB;b++){
      const nv=bh.getUint16(b*6,true),nt=bh.getUint16(b*6+2,true),tint=bh.getUint8(b*6+4),ty=bh.getUint8(b*6+5);
      let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;const v0=v;
      for(let j=0;j<nv;j++,v++){for(let c=0;c<3;c++){const d=(lo[c][v]|(hi[c][v]<<8))<<16>>16;acc[c]=(acc[c]+d)<<16>>16;}
        const x=acc[0]/sc,y=acc[1]/sc,z=acc[2]/sc;pos[v*3]=x;pos[v*3+1]=y;pos[v*3+2]=z;info[v*2]=tint;info[v*2+1]=ty;
        if(x<x0)x0=x;if(x>x1)x1=x;if(z<z0)z0=z;if(z>z1)z1=z;if(y<y0)y0=y;if(y>y1)y1=y;}
      // Boden: tiefster Punkt des Spielgeländes unter dem Grundriss (kein Schweben am Hang)
      const gx=C.cx,gz=C.cz;let g=Infinity;
      for(const [px,pz] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1],[(x0+x1)/2,(z0+z1)/2]])g=Math.min(g,S.heightAt(gx+px,gz+pz));
      g-=0.4;for(let j=v0;j<v;j++)pos[j*3+1]+=g;
      // Flughafen Zürich: Gebäudeart aus Form/Höhe – k = 16 + Art*48 + Höhe (Art 0 Glas-Terminal/Dock, 1 Hangar, 2 Büro mit Fensterbändern, 3 Nebengebäude); tint = Bodenhöhe-380 m
      if(inAirportArea(gx+(x0+x1)/2,gz+(z0+z1)/2)){const w=x1-x0,d=z1-z0,hb=y1-y0,asp=Math.max(w,d)/Math.max(1,Math.min(w,d)),ar=w*d;
        const sub=hb<7.5?3:asp>3.2?0:(ar>3500&&hb>13)?1:hb>17?0:2,at=16+sub*48+Math.min(47,Math.round(hb)),gt=Math.max(0,Math.min(255,Math.round(g+y0-380)));
        for(let j=v0;j<v;j++){info[j*2]=gt;info[j*2+1]=at;}}
      {const wx=gx+(x0+x1)/2,wz=gz+(z0+z1)/2;for(const L of LANDMARKS)if(Math.abs(wx-L.x)<L.r&&Math.abs(wz-L.z)<L.r&&Math.hypot(wx-L.x,wz-L.z)<L.r&&y1-y0>=L.hMin){for(let j=v0;j<v;j++){info[j*2]=L.tint;info[j*2+1]=L.ty;}}}
      if(lights&&(nb%3===0)&&nv>14)lights.push(gx+(x0+x1)/2,g+3,gz+(z0+z1)/2);
      let hw=0;for(let j=0;j<nt*3;j++,ii++){const code=clo[ii]|(chi[ii]<<8);let l;if(code===0)l=hw++;else l=hw-code;idx[ii]=v0+l;}
      nb++;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aInfo',new THREE.BufferAttribute(info,2));
    geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();
    const m=new THREE.Mesh(geo,mat);m.position.set(C.cx,0,C.cz);m.castShadow=true;m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();
    scene.add(m);meshes.push({m,cx:C.cx,cz:C.cz});}
  // Kacheln weiter als ~25 km ausblenden
  const update=cp=>{for(const c of meshes){const d=Math.hypot(cp.x-c.cx,cp.z-c.cz);c.m.visible=d<25000+Math.max(0,cp.y-1500)*4;}};
  return {meshes:meshes.map(c=>c.m),update,count:nb};
}
