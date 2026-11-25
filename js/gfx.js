// Grafik-Extras: Strassen/Flüsse in 3D, Kirchtürme, Fensterfassaden, Seespiegelung, Boote, Alpenpanorama
import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HALF,WORLD,G,N1,CELL,ROADS,RIVERS,LAKES,TOWNS,FLATS,toLocal} from './worldgen.js';
import {makeSimplex,mulberry,clamp,sstep} from './noise.js';

export const nightU={value:0};

// ---------- Catmull-Rom-Glättung ----------
export function smoothPts(pts,step){
  const out=[];const P=i=>pts[Math.max(0,Math.min(pts.length-1,i))];
  for(let i=0;i<pts.length-1;i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);const n=Math.max(1,Math.ceil(L/step));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  out.push(pts[pts.length-1]);return out;
}
function roadTex(){
  const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');
  x.fillStyle='#4a4a4c';x.fillRect(0,0,64,256);
  for(let i=0;i<900;i++){const v=60+Math.random()*40|0;x.fillStyle=`rgba(${v},${v},${v+2},0.5)`;x.fillRect(Math.random()*64,Math.random()*256,1.5,1.5);}
  x.fillStyle='#e8e8e0';x.fillRect(3,0,2,256);x.fillRect(59,0,2,256);
  x.fillStyle='#f0f0e6';x.fillRect(31,0,2,110);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
// Flussläufe einmalig in die Talsohle legen: quer zur Fliessrichtung den tiefsten Punkt suchen
// (gleicht Ungenauigkeiten der Daten und das grobe Gelände aus – sonst liegen Flüsse am Hang)
export function snapRivers(S){for(const R of RIVERS){if(R.snapped)continue;R.snapped=true;const pts=smoothPts(R.pts,120);
  const off=pts.map(([x,z],i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l;
    let best=0,bh=S.heightAt(x,z)-4;for(let o=-1400;o<=1400;o+=100){const h=S.heightAt(x+nx*o,z+nz*o)+Math.abs(o)*0.004;if(h<bh){bh=h;best=o;}}return[best,nx,nz];});
  const sm=off.map((_,i)=>{let s2=0,n=0;for(let k=Math.max(0,i-3);k<=Math.min(off.length-1,i+3);k++){s2+=off[k][0];n++;}return s2/n;});
  R.pts=pts.map(([x,z],i)=>[Math.round(x+off[i][1]*sm[i]),Math.round(z+off[i][2]*sm[i])]);}}
function ribbon(list,S,widthOf,yOff,skip,water){
  const P=[],UV=[],I=[];
  for(const R of list){let pts=smoothPts(R.pts,30);const w0=widthOf(R);let run=false,v=0;
    // Wasser: fliesst immer bergab (Pegel nie höher als flussaufwärts), liegt am tiefsten Punkt des Querschnitts,
    // und steile Abschnitte (Wildbäche) sind schmal statt als breite Wassertreppe am Hang
    let lev=null;if(water){
      if(S.heightAt(pts[0][0],pts[0][1])<S.heightAt(pts[pts.length-1][0],pts[pts.length-1][1]))pts=pts.slice().reverse();
      lev=[];let m=1e9;for(const [x,z] of pts){m=Math.min(m,S.heightAt(x,z));lev.push(m);}}
    for(let i=0;i<pts.length;i++){const [x,z]=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
      let w=w0;if(water){const j=Math.min(pts.length-1,i+3),k=Math.max(0,i-3),d=Math.hypot(pts[j][0]-pts[k][0],pts[j][1]-pts[k][1])||1,gr=Math.abs(lev[k]-lev[j])/d;w=gr>0.06?Math.min(w0,9):gr>0.03?Math.min(w0,w0*0.5+6):w0;}
      let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const nx=-dz*w/2,nz=dx*w/2;
      if(skip(x,z)||Math.abs(x)>HALF-300||Math.abs(z)>HALF-300){run=false;continue;}
      if(i>0)v+=Math.hypot(x-pts[i-1][0],z-pts[i-1][1]);
      const y=water?Math.min(lev[i],S.heightAt(x+nx,z+nz),S.heightAt(x-nx,z-nz))+yOff:Math.max(S.heightAt(x+nx,z+nz),S.heightAt(x-nx,z-nz),S.heightAt(x,z))+yOff;
      const n=P.length/3;P.push(x+nx,y,z+nz,x-nx,y,z-nz);UV.push(0,v/w/4,1,v/w/4);
      if(run)I.push(n-2,n,n-1,n-1,n,n+1);run=true;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();
  const nr=g.attributes.normal;for(let i=0;i<nr.count;i++)nr.setXYZ(i,0,1,0);return g;
}

export function buildExtras(scene,S,Q,W,airportNear){
  const X={};
  // ---------- Strassen & Flüsse ----------
  const rt=roadTex();
  const rm=new THREE.MeshStandardMaterial({map:rt,roughness:0.85,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  const road=new THREE.Mesh(ribbon(ROADS,S,R=>R.w>2?22:12,0.8,(x,z)=>S.isLake(x,z)||!!airportNear(x,z,0)||(W.inOrtho&&W.inOrtho(x,z,-60))),rm);road.receiveShadow=true;scene.add(road);
  const rvm=new THREE.MeshStandardMaterial({color:0x1d4148,roughness:0.12,metalness:0.1,envMapIntensity:1.0,normalMap:W.waterTex,normalScale:new THREE.Vector2(0.25,0.25),polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const river=new THREE.Mesh(ribbon(RIVERS,S,R=>Math.max(18,R.w),0.9,(x,z)=>S.isLake(x,z)||(W.inOrtho&&W.inOrtho(x,z,-60)),true),rvm);scene.add(river);

  // ---------- Kirchtürme ----------
  const rnd=mulberry(77);const spots=[];
  for(const T of TOWNS){const n=T.city?(T.name==='Zürich'?6:3):1;
    for(let k=0;k<n;k++){for(let tr=0;tr<12;tr++){const a=rnd()*6.28,r=(k===0?0.05:0.35)*T.r*rnd(),x=T.x+Math.cos(a)*r,z=T.z+Math.sin(a)*r;
      if(S.isLake(x,z)||S.lakeId(x,z)||S.slopeAt(x,z)>0.25||airportNear(x,z,150)||(W.inReal&&W.inReal(x,z))||(W.inOrtho&&W.inOrtho(x,z,-100)))continue;spots.push({x,z,h:24+rnd()*22+(T.city?10:0),a:rnd()*3});break;}}}
  {const shaft=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0);const spire=new THREE.ConeGeometry(0.75,1,4).rotateY(Math.PI/4).translate(0,0.5,0);
    const nave=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0);
    const sm=new THREE.InstancedMesh(shaft,new THREE.MeshStandardMaterial({color:0xece6d8,roughness:0.9}),spots.length*2);
    const pm=new THREE.InstancedMesh(spire,new THREE.MeshStandardMaterial({color:0x4f7a68,roughness:0.6,metalness:0.3}),spots.length*2);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),UP=new THREE.Vector3(0,1,0);let i=0,j=0;
    for(const s of spots){const y=S.heightAt(s.x,s.z)-1;q.setFromAxisAngle(UP,s.a);
      m4.compose(new THREE.Vector3(s.x,y,s.z),q,new THREE.Vector3(7,s.h,7));sm.setMatrixAt(i++,m4);
      m4.compose(new THREE.Vector3(s.x,y+s.h,s.z),q,new THREE.Vector3(8.4,s.h*0.55,8.4));pm.setMatrixAt(j++,m4);
      const o=new THREE.Vector3(0,0,-17).applyQuaternion(q);m4.compose(new THREE.Vector3(s.x+o.x,y,s.z+o.z),q,new THREE.Vector3(13,13,26));sm.setMatrixAt(i++,m4);
      m4.compose(new THREE.Vector3(s.x+o.x,y+13,s.z+o.z),q,new THREE.Vector3(12.3,7,24.5));pm.setMatrixAt(j++,m4);}
    sm.count=i;pm.count=j;sm.castShadow=pm.castShadow=true;scene.add(sm,pm);}

  // ---------- Seen: Spiegelung ----------
  X.lakeMeshes=[];X.reflector=null;
  if(Q.reflect){
    const lakeGeo={},bb={};
    {const per={};const LK=W.LK;
      for(let j=0;j<G;j++)for(let i=0;i<G;i++){const k=j*N1+i;const id=LK[k]||LK[k+1]||LK[k+N1]||LK[k+N1+1];if(!id)continue;
        (per[id]=per[id]||[]).push(i,j);}
      for(const id in per){const a=per[id],P=[],I=[];let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
        for(let o=0;o<a.length;o+=2){const x=-HALF+a[o]*CELL,z=-HALF+a[o+1]*CELL,n=P.length/3;P.push(x,0,z,x+CELL,0,z,x,0,z+CELL,x+CELL,0,z+CELL);I.push(n,n+2,n+1,n+1,n+2,n+3);
          x0=Math.min(x0,x);x1=Math.max(x1,x+CELL);z0=Math.min(z0,z);z1=Math.max(z1,z+CELL);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.rotateX(Math.PI/2);lakeGeo[id]=g;bb[id]=[x0,x1,z0,z1,(x1-x0)*(z1-z0)];}}
    const shader={uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{color:{value:new THREE.Color(0x0a2328)},tDiffuse:{value:null},textureMatrix:{value:null},tNormal:{value:W.waterTex},uTime:{value:0},uSun:{value:new THREE.Vector3(0,1,0)},uSunC:{value:new THREE.Color(1,1,1)},uSky:{value:new THREE.Color(0.5,0.6,0.7)}}]),
      vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWP;
#include <fog_pars_vertex>
void main(){vUv=textureMatrix*vec4(position,1.0);vWP=(modelMatrix*vec4(position,1.0)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
      fragmentShader:`uniform vec3 color;uniform sampler2D tDiffuse;uniform sampler2D tNormal;uniform float uTime;uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;varying vec4 vUv;varying vec3 vWP;
#include <fog_pars_fragment>
void main(){vec2 p=vWP.xz;vec3 n1=texture2D(tNormal,p/65.0+vec2(uTime*0.006,uTime*0.004)).xyz*2.0-1.0;vec3 n2=texture2D(tNormal,p/23.0-vec2(uTime*0.011,-uTime*0.007)).xyz*2.0-1.0;
 vec3 n3=texture2D(tNormal,mat2(0.8,-0.6,0.6,0.8)*p/210.0+vec2(uTime*0.002,-uTime*0.003)).xyz*2.0-1.0;vec3 nt=normalize(n1+n2*0.55+n3*0.7);vec3 N=normalize(vec3(nt.x*0.16,1.0,nt.y*0.16));
 vec3 V=normalize(cameraPosition-vWP);float d=length(cameraPosition-vWP);
 vec4 uv=vUv;uv.xy+=nt.xy*0.022*uv.w*(1.0-smoothstep(200.0,6000.0,d))+nt.xy*0.004*uv.w;
 vec3 refl=texture2DProj(tDiffuse,uv).rgb;
 float ndv=max(dot(N,V),0.0);float fr=0.04+0.96*pow(1.0-ndv,5.0);fr=clamp(fr*1.3+0.12,0.0,1.0);
 vec3 col=mix(color,refl,fr);
 vec3 R=reflect(-V,N);float sp=pow(max(dot(R,uSun),0.0),600.0)*6.0+pow(max(dot(R,uSun),0.0),60.0)*0.25;col+=uSunC*sp;
 gl_FragColor=vec4(col,0.97);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`};
    const pr=Math.min(window.devicePixelRatio||1,1.25);
    const ref=new Reflector(lakeGeo[Object.keys(lakeGeo)[0]],{shader,textureWidth:Math.round(innerWidth*pr*0.5),textureHeight:Math.round(innerHeight*pr*0.5),clipBias:0.5,multisample:0});
    ref.material.fog=true;ref.material.transparent=true;
    {const ob=ref.onBeforeRender;ref.onBeforeRender=(r,sc,c,...a)=>{const hide=(W.heavy||[]).filter(o=>o.visible);hide.forEach(o=>o.visible=false);ob.call(ref,r,sc,c,...a);hide.forEach(o=>o.visible=true);};}ref.rotation.x=-Math.PI/2;ref.renderOrder=1;scene.add(ref);X.reflector=ref;
    // pro See eigenes Standard-Mesh, damit der aktuelle See ersetzt werden kann
    W.water.visible=false;const stdM={};
    for(const id in lakeGeo){const g=lakeGeo[id].clone();g.rotateX(-Math.PI/2);const uv=[];const p=g.attributes.position;for(let i=0;i<p.count;i++)uv.push(p.getX(i)/65,p.getZ(i)/65);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
      const m=new THREE.Mesh(g,W.water.material);m.position.y=LAKES[id-1].level+0.05;scene.add(m);stdM[id]=m;}
    let cur=null;
    X.disableReflect=()=>{ref.visible=false;scene.remove(ref);if(cur)stdM[cur].visible=true;X.updateWater=null;};
    X.updateWater=(cam,T,env)=>{
      let best=null,bd=1e18;for(const id in bb){const b=bb[id];const dx=Math.max(b[0]-cam.position.x,0,cam.position.x-b[1]),dz=Math.max(b[2]-cam.position.z,0,cam.position.z-b[3]);const d=Math.hypot(dx,dz)-Math.sqrt(b[4])*0.15;if(d<bd){bd=d;best=id;}}
      if(best!==cur){if(cur)stdM[cur].visible=true;cur=best;stdM[cur].visible=false;ref.geometry=lakeGeo[cur];ref.position.y=LAKES[cur-1].level+0.06;}
      const u=ref.material.uniforms;u.uTime.value=T;if(env){u.uSun.value.copy(env.sunDir);u.uSunC.value.copy(env.sun.color).multiplyScalar(env.sun.intensity/3.4);u.color.value.setRGB(0.012,0.04,0.045).multiplyScalar(0.25+0.75*(1-env.night));}
      ref.visible=cam.position.y-ref.position.y<9000;
    };
  }

  // ---------- Boote ----------
  {const r=mulberry(31),boats=[];
    const PREF=['Thunersee','Brienzersee','Zürichsee','Vierwaldstättersee','Zugersee','Hallwilersee','Sempachersee','Greifensee','Ägerisee','Sarnersee','Baldeggersee','Lauerzersee','Pfäffikersee','Türlersee','Walensee'];
    const lakesIdx=LAKES.map((L,i)=>i+1);
    for(let t=0;t<6000&&boats.length<90;t++){const x=(r()-0.5)*WORLD*0.95,z=(r()-0.5)*WORLD*0.95;const id=S.lakeId(x,z);if(!id||!S.isLake(x,z))continue;
      if(!S.isLake(x+70,z)||!S.isLake(x-70,z)||!S.isLake(x,z+70)||!S.isLake(x,z-70))continue;
      const L=LAKES[id-1];if(PREF.indexOf(L.name)<0&&r()<0.7)continue;
      const kind=r()<0.16?2:r()<0.55?1:0;boats.push({x,z,y:L.level,h:r()*6.28,v:kind===2?6:kind===1?3.5:8+r()*5,kind,id});}
    // Rumpf
    const hull=(L,B,H)=>{const s=new THREE.Shape();s.moveTo(0,-L/2);s.quadraticCurveTo(B/2,-L/4,B/2,L/2);s.lineTo(-B/2,L/2);s.quadraticCurveTo(-B/2,-L/4,0,-L/2);
      return new THREE.ExtrudeGeometry(s,{depth:H,bevelEnabled:false}).rotateX(Math.PI/2).translate(0,H,0);};
    const NI=g=>{const n=g.index?g.toNonIndexed():g;n.deleteAttribute('uv');if(n.attributes.normal)n.deleteAttribute('normal');return n;};
    const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([0,1.2,-1.5, 0,11,-0.6, 0,1.2,2.6],3));
    const geos=[mergeGeometries([hull(7,2.4,1),sail.clone()].map(NI)),mergeGeometries([hull(9,3,1.2),new THREE.BoxGeometry(2.2,1.5,3).translate(0,1.9,0.8)].map(NI)),
      mergeGeometries([hull(48,8.5,2.6),new THREE.BoxGeometry(6.8,2.6,30).translate(0,3.8,2),new THREE.BoxGeometry(5.4,2.2,18).translate(0,6.2,4),new THREE.CylinderGeometry(1,1,4.5,10).translate(0,8.5,4)].map(NI))];
    geos.forEach(g=>g.computeVertexNormals());
    const bm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.5,side:THREE.DoubleSide});
    const meshes=geos.map((g,k)=>{const m=new THREE.InstancedMesh(g,bm,boats.length);m.count=0;m.castShadow=true;scene.add(m);return m;});
    const wakeTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,255,255,0.75)');g.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=g;x.beginPath();x.moveTo(30,0);x.lineTo(34,0);x.lineTo(64,256);x.lineTo(0,256);x.fill();x.globalCompositeOperation='destination-out';x.fillStyle='rgba(0,0,0,0.6)';x.beginPath();x.moveTo(32,10);x.lineTo(54,256);x.lineTo(10,256);x.fill();return new THREE.CanvasTexture(c);})();
    const wake=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0,0,0.5),new THREE.MeshBasicMaterial({map:wakeTex,transparent:true,depthWrite:false,opacity:0.8}),boats.length);scene.add(wake);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),UP=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),sc=new THREE.Vector3(),col=new THREE.Color();
    X.updateBoats=(dt,T)=>{const cnt=[0,0,0];
      for(let i=0;i<boats.length;i++){const b=boats[i];const nx=b.x+Math.sin(b.h)*b.v*dt,nz=b.z-Math.cos(b.h)*b.v*dt;
        const ax=b.x+Math.sin(b.h)*60,az=b.z-Math.cos(b.h)*60;if(S.lakeId(ax,az)!==b.id||!S.isLake(ax,az))b.h+=dt*0.6;else{b.x=nx;b.z=nz;}
        q.setFromAxisAngle(UP,-b.h+Math.PI);const bob=Math.sin(T*1.3+i)*0.08;m4.compose(p.set(b.x,b.y-0.35+bob,b.z),q,sc.set(1,1,1));const M=meshes[b.kind];M.setMatrixAt(cnt[b.kind],m4);
        M.setColorAt(cnt[b.kind],col.set(b.kind===2?0xf4f4f0:(i%3===0?0x1d3557:0xf8f8f4)));cnt[b.kind]++;
        const L=b.kind===2?160:50,Wd=b.kind===2?40:14;m4.compose(p.set(b.x-Math.sin(b.h)*(b.kind===2?22:3),b.y+0.12,b.z+Math.cos(b.h)*(b.kind===2?22:3)),q,sc.set(Wd,1,L));wake.setMatrixAt(i,m4);}
      meshes.forEach((M,k)=>{M.count=cnt[k];M.instanceMatrix.needsUpdate=true;if(M.instanceColor)M.instanceColor.needsUpdate=true;});wake.count=boats.length;wake.instanceMatrix.needsUpdate=true;};
    X.updateBoats(0,0);X.nBoats=boats.length;}

  // ---------- Alpenpanorama ausserhalb der Karte ----------
  {const SN=makeSimplex(123),rid=(x,z,o)=>{let s=0,a=1,f=1,n=0;for(let i=0;i<o;i++){s+=a*(1-Math.abs(SN(x*f,z*f)));n+=a;a*=0.5;f*=2.03;}return s/n;};
    const R=150000,STEP=1500,N=Math.round(2*R/STEP),P=[],C=[],I=[];const edge=(v)=>clamp(v,-HALF+40,HALF-40);
    const snowC=new THREE.Color(0.9,0.92,0.96),rockC=new THREE.Color(0.36,0.35,0.34),grassC=new THREE.Color(0.2,0.27,0.13),forC=new THREE.Color(0.1,0.16,0.08),c=new THREE.Color();
    const ht=(x,z)=>{
      const d=Math.max(Math.abs(x)-HALF,Math.abs(z)-HALF,0);const he=S.heightAt(edge(x),edge(z));if(d<=0)return he-4;
      const s=z/R,e=x/R;
      const alps=sstep(0.25,0.55,s)*(1200+2600*Math.pow(rid(x/16000,z/16000,5),2.2))+sstep(0.15,0.6,e)*sstep(-0.3,0.2,s)*(900+1600*Math.pow(rid(x/14000+5,z/14000,5),2));
      const jura=sstep(0.2,0.5,-e)*sstep(0.35,-0.1,s)*(700+600*Math.pow(rid((x*0.5+z*0.86)/9000,(x*0.86-z*0.5)/30000,3),1.5));
      const sw=sstep(0.3,0.6,-s)*(650+500*rid(x/12000+9,z/12000,4));
      let h=Math.max(alps,jura,sw,480+250*rid(x/9000,z/9000,3));
      const w=sstep(0,9000,d);return he*(1-w)+h*w-4*(1-w);};
    for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const x=-R+i*STEP,z=-R+j*STEP;const h=ht(x,z);P.push(x,h,z);
      const hn=h+300*(SN(x/3000,z/3000));
      if(hn>2500)c.copy(snowC);else if(hn>1900)c.copy(rockC).lerp(snowC,sstep(2200,2500,hn));else if(hn>1200)c.copy(forC).lerp(rockC,sstep(1500,1900,hn));else c.copy(grassC).lerp(forC,0.4+0.4*SN(x/5000,z/5000));
      C.push(c.r,c.g,c.b);}
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x0=-R+i*STEP,z0=-R+j*STEP;if(x0>-HALF+STEP&&x0+STEP<HALF-STEP&&z0>-HALF+STEP&&z0+STEP<HALF-STEP)continue;const a=j*(N+1)+i;I.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();
    const m=new THREE.MeshLambertMaterial({vertexColors:true});
    m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>','#ifdef USE_FOG\nfloat fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth*0.42);gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);\n#endif');};
    const pano=new THREE.Mesh(g,m);scene.add(pano);X.pano=pano;}
  return X;
}

// ---------- Fassaden mit Fenstern (für InstancedMesh-Würfel) ----------
export function windowShader(mat){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uNight=nightU;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vL;varying vec3 vNo;varying vec3 vSz;varying vec2 vSeed;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvSz=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));vSeed=instanceMatrix[3].xz;\n#else\nvSz=vec3(1.0);vSeed=vec2(0.0);\n#endif\nvL=position*vSz;vNo=normal;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uNight;varying vec3 vL;varying vec3 vNo;varying vec3 vSz;varying vec2 vSeed;\nfloat wh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\nfloat winMask;float winLit;')
      .replace('#include <map_fragment>',`#include <map_fragment>
winMask=0.0;winLit=0.0;
if(abs(vNo.y)<0.5){float u=abs(vNo.x)>0.5?vL.z:vL.x;float tall=step(16.0,vSz.y);float fh=tall>0.5?3.3:2.7;float cw=tall>0.5?2.6:3.4;
 vec2 g=vec2(u/cw,(vL.y-0.9)/fh);vec2 f=fract(g);vec2 id=floor(g);
 float aa=fwidth(g.x)+fwidth(g.y);float fade=1.0-smoothstep(0.25,0.9,aa);
 float inW=step(0.2,f.x)*step(f.x,tall>0.5?0.86:0.72)*step(0.28,f.y)*step(f.y,0.86)*step(0.0,vL.y-0.9)*step(vL.y,vSz.y-(tall>0.5?1.0:0.6));
 if(tall<0.5&&vSz.y>9.0)inW*=1.0;winMask=inW*fade;
 float r=wh(id+vSeed*0.37+vNo.xz*3.1);winLit=winMask*step(0.5,r)*(0.6+0.4*wh(id*1.7+vSeed));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.035,0.05,0.07)+vec3(0.06,0.08,0.1)*tall,winMask*0.82);}
else if(vNo.y>0.5&&vSz.y>16.0){diffuseColor.rgb*=0.55;}`)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,0.72,0.42)*winLit*uNight*1.6;')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.12,winMask);');
  };
  return mat;
}
