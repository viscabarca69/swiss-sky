// Strassenverkehr und SBB-Züge
import {RAILS_EXT} from './rails_ext.js';
import * as THREE from 'three';
import {ROADS,toXZ,AREA_ID,AIRPORTS,toLocal} from './worldgen.js';
import {inAirportArea} from './ortho.js';
import {makeGlow} from './env.js';
import {smoothPts} from './gfx.js';

// Bahnstrecken (ungefähr nach den echten Linien)
export const RAILS=[
  [[47.378,8.540],[47.364,8.531],[47.34,8.535],[47.31,8.553],[47.295,8.565],[47.27,8.57],[47.24,8.56],[47.196,8.530],[47.173,8.515],[47.18,8.47],[47.142,8.432],[47.11,8.39],[47.08,8.34],[47.05,8.31]],
  [[47.378,8.540],[47.395,8.545],[47.411,8.544],[47.43,8.555],[47.45,8.562]],
  [[47.05,8.31],[47.02,8.3],[46.985,8.31],[46.97,8.3],[46.955,8.28],[46.93,8.26],[46.896,8.245]],
  [[47.378,8.540],[47.39,8.49],[47.403,8.40],[47.43,8.36],[47.476,8.307],[47.48,8.25],[47.48,8.21]],
  [[47.173,8.515],[47.14,8.52],[47.1,8.52],[47.075,8.525],[47.05,8.55]],
  [[47.05,8.31],[47.08,8.27],[47.12,8.2],[47.17,8.11]]];

export const RAILS_BO=[
  [[46.948,7.44],[46.93,7.47],[46.89,7.53],[46.873,7.561],[46.83,7.59],[46.80,7.615],[46.758,7.628],[46.72,7.65],[46.686,7.679],[46.676,7.70],[46.664,7.735],[46.655,7.772],[46.660,7.808],[46.672,7.835],[46.683,7.853],[46.690,7.869]],
  [[46.690,7.869],[46.665,7.866],[46.64,7.88],[46.615,7.90],[46.593,7.909]],
  [[46.665,7.866],[46.655,7.92],[46.64,7.97],[46.630,8.01],[46.624,8.036]],
  [[46.690,7.869],[46.697,7.886],[46.707,7.910],[46.718,7.931],[46.728,7.948],[46.737,7.962],[46.745,7.99],[46.751,8.015],[46.754,8.035],[46.758,8.10],[46.727,8.187]],
  [[46.686,7.679],[46.65,7.665],[46.62,7.655],[46.588,7.648],[46.55,7.655],[46.51,7.665]],
  [[46.36,8.12],[46.316,7.988],[46.293,7.881],[46.305,7.80],[46.30,7.70],[46.29,7.58]],
  [[46.727,8.187],[46.757,8.14],[46.786,8.16],[46.833,8.181],[46.896,8.246]]];
// Verbindungen der grossen Karte: Mittelland, Jurasüdfuss, Entlebuch, Wallis
export const RAILS_CH=[
  [[47.403,8.40],[47.40,8.33],[47.39,8.25],[47.388,8.176],[47.39,8.10],[47.391,8.051],[47.37,7.98],[47.352,7.907]],
  [[47.352,7.907],[47.30,7.86],[47.27,7.80],[47.214,7.790],[47.19,7.72],[47.15,7.66],[47.10,7.63],[47.06,7.62],[47.0,7.55],[46.97,7.48],[46.948,7.44]],
  [[46.948,7.44],[46.93,7.40],[46.90,7.33],[46.86,7.26],[46.82,7.20],[46.803,7.151]],
  [[47.133,7.243],[47.17,7.32],[47.19,7.39],[47.205,7.54],[47.23,7.62],[47.27,7.72],[47.31,7.82],[47.352,7.907]],
  [[46.948,7.44],[47.0,7.40],[47.05,7.33],[47.10,7.28],[47.133,7.243]],
  [[47.05,8.31],[47.04,8.20],[47.06,8.08],[46.99,8.06],[46.951,8.02],[46.915,7.93],[46.92,7.85],[46.94,7.787],[46.93,7.70],[46.935,7.60],[46.948,7.44]],
  [[46.29,7.58],[46.26,7.45],[46.233,7.36],[46.21,7.27]],
  [[47.352,7.907],[47.40,7.85],[47.45,7.76],[47.484,7.734],[47.53,7.62],[47.547,7.59]]];
// Gleise ohne Knicke: Spline durch die Stützpunkte, dann mehrfach entspannen (grosse Kurvenradien)
function railSmooth(raw){let P=smoothPts(raw,60);for(let it=0;it<40;it++){const Q=P.map(p=>p.slice());for(let i=1;i<P.length-1;i++){Q[i][0]=(P[i-1][0]+2*P[i][0]+P[i+1][0])/4;Q[i][1]=(P[i-1][1]+2*P[i][1]+P[i+1][1])/4;}P=Q;}return P;}
function polyPath(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return{pts,cum,len:cum[cum.length-1]};}
// Position entlang des Pfads (mit Segment-Hinweis für schnelles Fortschreiten)
function at(P,s,hint,out){let i=Math.max(0,Math.min(hint||0,P.pts.length-2));while(i<P.pts.length-2&&P.cum[i+1]<s)i++;while(i>0&&P.cum[i]>s)i--;
  const a=P.pts[i],b=P.pts[i+1],L=P.cum[i+1]-P.cum[i]||1,u=Math.min(1,Math.max(0,(s-P.cum[i])/L));out.x=a[0]+(b[0]-a[0])*u;out.z=a[1]+(b[1]-a[1])*u;out.dx=(b[0]-a[0])/L;out.dz=(b[1]-a[1])/L;out.i=i;out.u=u;return out;}

// Grobe Bahnlinien, die über einen See führen würden, ans Ufer schieben (Punkte alle 80 m, dann glätten)
export function shoreFix(S,raw){const out=[];for(let i=0;i<raw.length-1;i++){const a=raw[i],b=raw[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/80));for(let k=0;k<n;k++){const u=k/n;out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);}}out.push(raw[raw.length-1].slice());
  const wet=p=>S.isLake(p[0],p[1]),lk=out.map(wet);if(!lk.some(Boolean))return raw;
  // jede zusammenhängende Strecke über Wasser geschlossen auf die nähere Uferseite verschieben
  for(let i=0;i<out.length;){if(!lk[i]){i++;continue;}let j=i;while(j<out.length&&lk[j])j++;
    const a=out[Math.max(0,i-1)],b=out[Math.min(out.length-1,j)],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L;
    let best=null;for(const sg of [1,-1]){let tot=0;const ds=[];for(let k=i;k<j;k++){let d=40;while(d<=4000&&S.isLake(out[k][0]+nx*d*sg,out[k][1]+nz*d*sg))d+=40;if(d>4000){tot=Infinity;break;}ds.push(d);tot+=d;}if(!best||tot<best.tot)best={sg,tot,ds};}
    if(best&&best.tot<Infinity)for(let k=i;k<j;k++){const d=best.ds[k-i]+90;out[k][0]+=nx*d*best.sg;out[k][1]+=nz*d*best.sg;}
    i=j;}
  for(let it=0;it<6;it++)for(let i=1;i<out.length-1;i++){const q=[(out[i-1][0]+out[i][0]*2+out[i+1][0])/4,(out[i-1][1]+out[i][1]*2+out[i+1][1])/4];
    if(!wet(q)&&!wet([(q[0]+out[i-1][0])/2,(q[1]+out[i-1][1])/2])&&!wet([(q[0]+out[i+1][0])/2,(q[1]+out[i+1][1])/2])){out[i][0]=q[0];out[i][1]=q[1];}}
  return out;}
export function createGround(scene,S,Q){
  const GR={};const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),sc=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),tmp={};
  // ---------- Autos ----------
  const paths=ROADS.map(R=>({...polyPath(smoothPts(R.pts,30)),mw:R.w>2})).filter(p=>p.len>900);
  const NC=Math.round((Q.house||1)*420),tot=paths.reduce((a,p)=>a+p.len*(p.mw?3:1),0);
  const body=new THREE.BoxGeometry(1.8,1.25,4.4).translate(0,0.75,0),cab=new THREE.BoxGeometry(1.6,0.6,2.3).translate(0,1.65,-0.2);
  const cgeo=mergeBoxes([body,cab]);
  const cars=new THREE.InstancedMesh(cgeo,new THREE.MeshStandardMaterial({roughness:0.35,metalness:0.5}),NC);cars.frustumCulled=false;cars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const C=[];const col=new THREE.Color();
  for(let i=0;i<NC;i++){let x=Math.random()*tot,p=paths[0];for(const P of paths){x-=P.len*(P.mw?3:1);if(x<=0){p=P;break;}}
    const dir=Math.random()<0.5?1:-1,sp=(p.mw?27:15)+Math.random()*(p.mw?8:6);C.push({p,s:Math.random()*p.len,dir,sp,off:(p.mw?3.6:1.9)*dir,h:0});
    const r=Math.random();col.setHSL(r<0.35?0:Math.random(),r<0.35?0:0.25+Math.random()*0.5,r<0.35?0.08+Math.random()*0.8:0.25+Math.random()*0.35);cars.setColorAt(i,col);}
  scene.add(cars);
  const lp=new Float32Array(NC*6),lc=[],ls=[];for(let i=0;i<NC;i++){lc.push(1,0.92,0.75,1,0.08,0.04);ls.push(2.4,1.6);}
  const lights=makeGlow(Array.from(lp),lc,ls);lights.visible=false;scene.add(lights);
  // ---------- Züge ----------
  const RP=(AREA_ID==='ch'?[...RAILS,...RAILS_BO,...RAILS_CH,...RAILS_EXT]:AREA_ID==='bo'?RAILS_BO:RAILS).map(r=>{const raw=shoreFix(S,railSmooth(r.map(([la,lo])=>{const p=toXZ(la,lo);return[p.x,p.z];})));const P=polyPath(raw);
    // auf 20 m abtasten, Höhe geglättet (Tunnel und Brücken ergeben sich von selbst)
    const n=Math.max(2,Math.ceil(P.len/20)),pts=[],hs=[];for(let k=0;k<=n;k++){at(P,P.len*k/n,0,tmp);pts.push([tmp.x,tmp.z]);hs.push(S.groundAt(tmp.x,tmp.z));}
    const hm=hs.map((_,k)=>{let a=0,c=0;for(let j=-12;j<=12;j++){const h=hs[Math.min(n,Math.max(0,k+j))];a+=h;c++;}return Math.min(a/c,hs[k]+14);});
    // Flughafenbahnhöfe liegen unterirdisch (Zürich, Genf): unter Vorfeld und Pisten im Tunnel statt quer über den Asphalt
    const under=(x,z)=>{if(inAirportArea(x,z))return true;for(const A of AIRPORTS){if(A.small||!(A.len>=2500)||A.sin==null)continue;const L=toLocal(A,x,z);if(Math.abs(L.along)<A.len/2+300&&Math.abs(L.across)<500)return true;}return false;};
    for(let k=0;k<=n;k++)if(under(pts[k][0],pts[k][1]))hm[k]=hs[k]-30;
    const Q2=polyPath(pts);Q2.h=hm;return Q2;});
  // Gleise als dunkles Schotterband
  {const pos=[],idx=[];let vi=0;for(const P of RP){for(let k=0;k<P.pts.length;k++){const a=P.pts[Math.max(0,k-1)],b=P.pts[Math.min(P.pts.length-1,k+1)],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1,nx=-dz/L*2.6,nz=dx/L*2.6,y=P.h[k]+0.35;
      pos.push(P.pts[k][0]+nx,y,P.pts[k][1]+nz,P.pts[k][0]-nx,y,P.pts[k][1]-nz);if(k>0)idx.push(vi-2,vi,vi-1,vi-1,vi,vi+1);vi+=2;}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x4a4640,roughness:1,polygonOffset:true,polygonOffsetFactor:-2}));m.receiveShadow=true;scene.add(m);}
  const NCAR=6,TR=[];RP.forEach(P=>{for(let k=0;k<2;k++)TR.push({P,s:Math.max(130,P.len*(k?0.7:0.15)),dir:k?-1:1,sp:30+Math.random()*6,wait:0,hint:0});});
  const NT=TR.length*NCAR;
  const tb=new THREE.BoxGeometry(2.95,3.6,24.6).translate(0,2.15,0),band=new THREE.BoxGeometry(3.0,0.85,23.2).translate(0,2.75,0),roof=new THREE.BoxGeometry(2.6,0.35,24).translate(0,4.05,0);
  const trainM=new THREE.MeshStandardMaterial({color:0xd5101e,roughness:0.4,metalness:0.2}),bandM=new THREE.MeshStandardMaterial({color:0x1b2128,roughness:0.15,metalness:0.6,emissive:0xffc070,emissiveIntensity:0}),roofM=new THREE.MeshStandardMaterial({color:0xb8bcc2,roughness:0.6});
  const tI=new THREE.InstancedMesh(tb,trainM,NT),bI=new THREE.InstancedMesh(band,bandM,NT),rI=new THREE.InstancedMesh(roof,roofM,NT);[tI,bI,rI].forEach(m=>{m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.castShadow=true;scene.add(m);});
  const hl=makeGlow(new Array(TR.length*6).fill(0),TR.flatMap(()=>[1,0.95,0.8,1,0.95,0.8]),TR.flatMap(()=>[4,4]));hl.visible=false;scene.add(hl);
  GR.TR=TR;GR.C=C;
  GR.update=(dt,camPos,night)=>{
    // Autos
    const L=lights.geometry.attributes.position.array;
    for(let i=0;i<NC;i++){const c=C[i];c.s+=c.sp*dt*c.dir;if(c.s>c.p.len)c.s-=c.p.len;if(c.s<0)c.s+=c.p.len;
      at(c.p,c.s,c.h,tmp);c.h=tmp.i;const hx=tmp.dx*c.dir,hz=tmp.dz*c.dir;const px=tmp.x+(-tmp.dz)*c.off,pz=tmp.z+tmp.dx*c.off;
      const y=S.groundAt(px,pz)+0.8;c.x=px;c.y=y;c.z=pz;e.set(0,Math.atan2(-hx,-hz),0);q.setFromEuler(e);v.set(px,y,pz);m4.compose(v,q,sc);cars.setMatrixAt(i,m4);
      if(night){const o=i*6;L[o]=px+hx*2.3;L[o+1]=y+0.7;L[o+2]=pz+hz*2.3;L[o+3]=px-hx*2.3;L[o+4]=y+0.8;L[o+5]=pz-hz*2.3;}}
    cars.instanceMatrix.needsUpdate=true;lights.visible=night;if(night)lights.geometry.attributes.position.needsUpdate=true;
    // Züge
    const H=hl.geometry.attributes.position.array;let n=0;
    TR.forEach((t,ti)=>{const lenT=(NCAR-1)*25;if(t.wait>0)t.wait-=dt;else{t.s+=t.sp*dt*t.dir;if(t.dir>0&&t.s>=t.P.len){t.s=t.P.len-lenT;t.dir=-1;t.wait=25;}else if(t.dir<0&&t.s<=0){t.s=lenT;t.dir=1;t.wait=25;}}
      for(let k=0;k<NCAR;k++){const sk=Math.max(0,Math.min(t.P.len,t.s-t.dir*k*25));at(t.P,sk,t.hint,tmp);if(k===0)t.hint=tmp.i;
        const hy=t.P.h[tmp.i]*(1-tmp.u)+t.P.h[Math.min(t.P.h.length-1,tmp.i+1)]*tmp.u;e.set(0,Math.atan2(-tmp.dx,-tmp.dz),0);q.setFromEuler(e);v.set(tmp.x,hy,tmp.z);m4.compose(v,q,sc);tI.setMatrixAt(n,m4);bI.setMatrixAt(n,m4);rI.setMatrixAt(n,m4);n++;
        if(k===0){const o=ti*6,fx=tmp.dx*t.dir,fz=tmp.dz*t.dir;H[o]=tmp.x+fx*12.5-tmp.dz*1;H[o+1]=hy+1.2;H[o+2]=tmp.z+fz*12.5+tmp.dx*1;H[o+3]=tmp.x+fx*12.5+tmp.dz*1;H[o+4]=hy+1.2;H[o+5]=tmp.z+fz*12.5-tmp.dx*1;}}});
    tI.instanceMatrix.needsUpdate=bI.instanceMatrix.needsUpdate=rI.instanceMatrix.needsUpdate=true;hl.visible=night;if(night)hl.geometry.attributes.position.needsUpdate=true;bandM.emissiveIntensity=night?0.9:0;
  };
  return GR;
}
function mergeBoxes(gs){const pos=[],nor=[],idx=[];let o=0;for(const g of gs){const p=g.attributes.position.array,n=g.attributes.normal.array,ix=g.index.array;for(let i=0;i<p.length;i++){pos.push(p[i]);nor.push(n[i]);}for(const i of ix)idx.push(i+o);o+=p.length/3;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setIndex(idx);return g;}
