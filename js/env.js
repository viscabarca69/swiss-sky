// Himmel, Sonne, Nebel, Wolken, Sterne, Leuchtpunkte
import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {mulberry,sstep,clamp} from './noise.js';

export const glowU={uI:{value:1},uScale:{value:500},uFogD:{value:0.00003}};
const glowVS=`attribute vec3 gcol;attribute float gsize;uniform float uScale;uniform float uFogD;varying vec3 vC;varying float vF;
void main(){vC=gcol;vec4 mv=modelViewMatrix*vec4(position,1.0);float d=-mv.z;gl_PointSize=clamp(gsize*uScale/max(d,1.0),2.2,90.0);vF=exp(-uFogD*uFogD*d*d*0.45);gl_Position=projectionMatrix*mv;}`;
const glowFS=`uniform float uI;varying vec3 vC;varying float vF;
void main(){vec2 c=gl_PointCoord-0.5;float r2=dot(c,c)*4.0;float a=exp(-r2*5.0)*0.8+exp(-r2*40.0)*1.6;if(a<0.01)discard;gl_FragColor=vec4(vC*a*uI*vF,1.0);}`;
export function makeGlow(pos,col,size,uniforms){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('gcol',new THREE.Float32BufferAttribute(col,3));g.setAttribute('gsize',new THREE.Float32BufferAttribute(size,1));
  const m=new THREE.ShaderMaterial({uniforms:uniforms||glowU,vertexShader:glowVS,fragmentShader:glowFS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=5;return p;
}

function cloudTex(seed){
  // Cumulus: Blumenkohl-Silhouette aus Ballen, flache Unterseite, von oben beleuchtet
  const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),r=mulberry(seed),P=[];
  const base=178,n=30;
  for(let i=0;i<n;i++){const dx=(r()-0.5)*2,px=128+dx*92,e=1-dx*dx,rad=16+r()*16+30*e*r(),py=base-rad*0.55-r()*e*92;P.push([px,py,rad]);}
  P.sort((a,b)=>b[1]-a[1]);
  for(const[px,py,rad]of P){const g=x.createRadialGradient(px,py,0,px,py,rad);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.62,'rgba(255,255,255,0.93)');g.addColorStop(0.86,'rgba(255,255,255,0.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,rad,0,7);x.fill();}
  // flache, weich auslaufende Unterseite
  x.globalCompositeOperation='destination-out';{const g=x.createLinearGradient(0,base-6,0,base+22);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=g;x.fillRect(0,base-6,S,S);}
  // Schattierung: oben hell, unten grau, Relief pro Ballen
  x.globalCompositeOperation='source-atop';
  {const g=x.createLinearGradient(0,60,0,base+8);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.55,'rgba(200,208,222,0.32)');g.addColorStop(1,'rgba(118,128,148,0.78)');x.fillStyle=g;x.fillRect(0,0,S,S);}
  for(const[px,py,rad]of P){const g=x.createRadialGradient(px+rad*0.25,py+rad*0.35,rad*0.2,px+rad*0.25,py+rad*0.35,rad*1.05);g.addColorStop(0,'rgba(150,160,178,0.16)');g.addColorStop(1,'rgba(150,160,178,0)');x.fillStyle=g;x.fillRect(px-rad*1.5,py-rad*1.5,rad*3,rad*3);
    const h=x.createRadialGradient(px-rad*0.3,py-rad*0.4,0,px-rad*0.3,py-rad*0.4,rad*0.8);h.addColorStop(0,'rgba(255,255,252,0.42)');h.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=h;x.fillRect(px-rad*1.5,py-rad*1.5,rad*3,rad*3);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

export function createEnv(renderer,scene,Q){
  const E={};
  const sky=new Sky();sky.scale.setScalar(150000);scene.add(sky);
  const U=sky.material.uniforms;U.turbidity.value=4.5;U.rayleigh.value=1.35;U.mieCoefficient.value=0.004;U.mieDirectionalG.value=0.82;
  const envScene=new THREE.Scene(),sky2=new Sky();sky2.material=sky.material;sky2.scale.setScalar(900);envScene.add(sky2);
  const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null;
  const sun=new THREE.DirectionalLight(0xffffff,3);scene.add(sun,sun.target);
  if(Q.shadows){sun.castShadow=true;const big=renderer.capabilities.maxTextureSize>=16384&&!/Mobi|Android|iPhone|iPad/.test(navigator.userAgent);sun.shadow.mapSize.set(big?4096:2048,big?4096:2048);// schärfere Schatten auf dem Desktop
    const c=sun.shadow.camera;c.left=c.bottom=-80;c.right=c.top=80;c.near=1;c.far=4000;sun.shadow.bias=-0.0003;sun.shadow.normalBias=0.4;}
  const moon=new THREE.DirectionalLight(0x8fa8d8,0);moon.position.set(3000,6000,-2000);scene.add(moon);
  const hemi=new THREE.HemisphereLight(0xbcd4ff,0x4b5a3a,0.6);scene.add(hemi);
  scene.fog=new THREE.FogExp2(0xbfd3e6,0.00003);
  E.sun=sun;E.sunDir=new THREE.Vector3(0,1,0);E.night=0;
  // Sterne
  {const r=mulberry(4),n=3500,p=new Float32Array(n*3),c=new Float32Array(n*3),s=new Float32Array(n);
    for(let i=0;i<n;i++){const u=r()*2*Math.PI,v=Math.acos(r()*0.98);p[i*3]=Math.sin(v)*Math.cos(u)*60000;p[i*3+1]=Math.cos(v)*60000;p[i*3+2]=Math.sin(v)*Math.sin(u)*60000;const b=0.3+r()*r()*1.2;c[i*3]=b;c[i*3+1]=b;c[i*3+2]=b*1.1;s[i]=1;}
    E.starU={uI:{value:0},uScale:{value:0},uFogD:{value:0}};E.stars=makeGlow(p,c,s,E.starU);E.stars.material.fog=false;scene.add(E.stars);}
  // Wolken
  const ctex=[1,2,3,4,5,6].map(cloudTex);
  // Alle Wolken in EINEM Draw-Call: instanzierte Billboards mit Textur-Atlas (3×2), von hinten nach vorne sortiert
  const atlas=(()=>{const c=document.createElement('canvas');c.width=768;c.height=512;const x=c.getContext('2d');ctex.forEach((t,i)=>x.drawImage(t.image,(i%3)*256,Math.floor(i/3)*256));
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const CU={uCC:{value:new THREE.Color(1,1,1)},uCU:{value:new THREE.Color(0.8,0.8,0.8)},uCam:{value:new THREE.Vector3()},uP:{value:150000}};
  const cmat=new THREE.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:false,fog:true});
  cmat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,CU);
    sh.vertexShader='uniform vec3 uCam;uniform float uP;attribute vec3 aOff;attribute vec2 aScl;attribute vec2 aTile;attribute float aLo;varying float vLo;\n'+sh.vertexShader
      .replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=(uv+aTile)*vec2(1.0/3.0,0.5);vLo=aLo;')
      .replace('#include <project_vertex>','vec3 wo=aOff;wo.xz=uCam.xz+mod(aOff.xz-uCam.xz+0.5*uP,uP)-0.5*uP;vec4 mvPosition=modelViewMatrix*vec4(wo,1.0);mvPosition.xy+=position.xy*aScl;gl_Position=projectionMatrix*mvPosition;');
    sh.fragmentShader='uniform vec3 uCC;uniform vec3 uCU;varying float vLo;\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( mix(uCC,uCU,vLo), opacity );');};
  cmat.customProgramCacheKey=()=>'cloudsInst';
  const CL={n:0,off:null,scl:null,tile:null,lo:null,mesh:null,last:new THREE.Vector3(1e9,0,0),t:0};
  const cloudGroup=new THREE.Group();scene.add(cloudGroup);
  // Nebelmeer
  const fogT=(()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),r=mulberry(77);x.fillStyle='#ffffff';x.fillRect(0,0,512,512);
    for(let i=0;i<400;i++){const px=r()*512,py=r()*512,rad=20+r()*70,g=x.createRadialGradient(px,py,0,px,py,rad);const v=200+r()*40|0;g.addColorStop(0,`rgba(${v},${v+4},${v+10},0.35)`);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(60,60);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const fogSheet=new THREE.Mesh(new THREE.PlaneGeometry(180000,180000).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:fogT,color:0xffffff,emissive:0x9a9ea6,transparent:true,opacity:0.96,depthWrite:false,side:THREE.DoubleSide}));
  fogSheet.position.y=980;fogSheet.visible=false;fogSheet.renderOrder=2;scene.add(fogSheet);E.fogSheet=fogSheet;
  function buildClouds(weather,seed){
    cloudGroup.clear();if(CL.mesh){CL.mesh.geometry.dispose();CL.mesh=null;}const r=mulberry(seed||9);const L=[];
    // Wolkenfeld mit fester Kachelgrösse, das im Shader um die Kamera herum wiederholt wird (grosse Karte: nicht 50'000 Wolken)
    const PW=Math.min(Q.world||40000,150000);CU.uP.value=PW;const sc=(PW/40000)**2*0.6;const n=Math.round(({clear:6,cloudy:75,rain:95,fog:10,foehn:5,snow:90,storm:70}[weather]??32)*sc);
    const base=weather==='cloudy'?1700:weather==='rain'||weather==='snow'?1300:weather==='storm'?1250:weather==='fog'?1500:2300,tall=weather==='storm'?2600:0;
    for(let k=0;k<n;k++){const cx=(r()-0.5)*PW,cz=(r()-0.5)*PW,cy=base+r()*900;const m=8+Math.floor(r()*10);const scl=0.7+r()*0.9;
      for(let i=0;i<m;i++){const ti=(k+i)%3+(i<m*0.35?3:0);let sz=(380+r()*520)*scl;
        const lo=i<m*0.35;const px=cx+(r()-0.5)*1500*scl,py=cy+(lo?-r()*80:r()*(260*scl+tall)),pz=cz+(r()-0.5)*1000*scl;if(tall&&!lo)sz*=1.5;L.push([px,py,pz,sz*1.5,sz,ti%3,1-Math.floor(ti/3),lo?1:0]);}}
    const N=L.length;CL.n=N;CL.src=L;if(!N)return;
    const g=new THREE.InstancedBufferGeometry();const q=new THREE.PlaneGeometry(1,1);g.index=q.index;g.setAttribute('position',q.attributes.position);g.setAttribute('uv',q.attributes.uv);g.setAttribute('normal',q.attributes.normal);
    CL.off=new THREE.InstancedBufferAttribute(new Float32Array(N*3),3);CL.scl=new THREE.InstancedBufferAttribute(new Float32Array(N*2),2);CL.tile=new THREE.InstancedBufferAttribute(new Float32Array(N*2),2);CL.lo=new THREE.InstancedBufferAttribute(new Float32Array(N),1);
    for(const a of [CL.off,CL.scl,CL.tile,CL.lo])a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOff',CL.off);g.setAttribute('aScl',CL.scl);g.setAttribute('aTile',CL.tile);g.setAttribute('aLo',CL.lo);g.instanceCount=N;
    const mesh=new THREE.Mesh(g,cmat);mesh.frustumCulled=false;mesh.renderOrder=1;cloudGroup.add(mesh);CL.mesh=mesh;CL.last.set(1e9,0,0);CL.ord=new Uint32Array(N).map((_,i)=>i);CL.d=new Float32Array(N);sortClouds(new THREE.Vector3());
  }
  function sortClouds(cp){const L=CL.src,n=CL.n,d=CL.d,o=CL.ord,P=CU.uP.value,wr=v=>v-Math.floor(v/P+0.5)*P;CU.uCam.value.copy(cp);for(let i=0;i<n;i++){const c=L[i];const dx=wr(c[0]-cp.x),dy=c[1]-cp.y,dz=wr(c[2]-cp.z);d[i]=dx*dx+dy*dy+dz*dz;}
    o.sort((a,b)=>d[b]-d[a]);const A=CL.off.array,B=CL.scl.array,T=CL.tile.array,Lo=CL.lo.array;
    for(let k=0;k<n;k++){const c=L[o[k]];A[k*3]=c[0];A[k*3+1]=c[1];A[k*3+2]=c[2];B[k*2]=c[3];B[k*2+1]=c[4];T[k*2]=c[5];T[k*2+1]=c[6];Lo[k]=c[7];}
    for(const a of [CL.off,CL.scl,CL.tile,CL.lo])a.needsUpdate=true;CL.last.copy(cp);}
  E.setTime=(hour,weather)=>{
    const el=Math.sin(Math.PI*(hour-6)/14.5)*62,az=(90+180*(hour-6)/14.5)*Math.PI/180,er=el*Math.PI/180;
    const d=new THREE.Vector3(Math.sin(az)*Math.cos(er),Math.sin(er),-Math.cos(az)*Math.cos(er));E.sunDir.copy(d);E.elev=el;
    U.sunPosition.value.copy(d);if(E.onSun)E.onSun(d,el);
    const st=weather==='storm',sn=weather==='snow',cl=weather==='cloudy'||weather==='rain'||weather==='fog'||st||sn,wet=weather==='rain'||st,fog=weather==='fog',fo=weather==='foehn';E.weather=weather;fogSheet.visible=fog;
    U.turbidity.value=wet?12:fog?3:fo?2.2:cl?9:4.5;U.rayleigh.value=el<8?2.2:1.35;
    const night=1-sstep(-7,2,el);E.night=night;fogSheet.material.emissive.setRGB(0.55,0.57,0.6).multiplyScalar(1-night);
    const sunI=3.4*sstep(-2,10,el)*(st?0.14:sn?0.32:wet?0.28:fog?0.55:cl?0.45:1);
    const warm=sstep(2,30,el);sun.color.setRGB(1,0.55+0.42*warm,0.32+0.6*warm);sun.intensity=sunI;
    moon.intensity=0.35*night;
    const tDay=sstep(4,24,el),tDusk=sstep(-7,4,el);
    const fd=new THREE.Color(0.66,0.76,0.88),fs=new THREE.Color(1.0,0.66,0.46),fn=new THREE.Color(0.018,0.026,0.05);
    const fc=fn.clone().lerp(fs,tDusk).lerp(fd,tDay);if(cl)fc.lerp(new THREE.Color(0.62,0.66,0.7),0.6*tDusk);if(wet)fc.lerp(new THREE.Color(0.42,0.46,0.5),0.6*tDusk);if(fog)fc.lerp(new THREE.Color(0.78,0.8,0.82),0.75*tDusk);if(st)fc.lerp(new THREE.Color(0.24,0.27,0.31),0.8*tDusk);if(sn)fc.lerp(new THREE.Color(0.8,0.83,0.87),0.75*tDusk);
    scene.fog.color.copy(fc);E.fogColor=fc;
    E.fogBase=st?0.00009:sn?0.00012:wet?0.00007:fog?0.00026:fo?0.000011:(cl?0.00004:weather==='clear'?0.000017:0.000024);scene.fog.density=E.fogBase;glowU.uFogD.value=scene.fog.density;
    hemi.color.copy(fc).lerp(new THREE.Color(0.75,0.85,1),0.3);hemi.groundColor.setRGB(0.25,0.27,0.18).multiplyScalar(0.3+0.7*tDusk);
    hemi.intensity=0.12+0.75*tDusk;E.hemiBase=hemi.intensity;
    renderer.toneMappingExposure=0.5+0.22*night+(el<10&&el>-2?0.08:0);
    glowU.uI.value=0.18+1.5*sstep(15,-3,el);
    E.starU.uI.value=night*1.2;
    const cc=new THREE.Color(1,1,1).lerp(new THREE.Color(1,0.8,0.7),1-sstep(3,22,el)).multiplyScalar(0.12+0.88*tDusk),cu=new THREE.Color(0.52,0.57,0.68).multiplyScalar(0.12+0.88*tDusk);
    if(cl)cc.multiplyScalar(st?0.32:sn?0.9:wet?0.55:0.8);
    CU.uCC.value.copy(cc);CU.uCU.value.copy(cc).multiplyScalar(0.8).lerp(cu,0.35);cmat.opacity=cl?0.95:0.9;
    buildClouds(weather,hour|0);
    if(envRT)envRT.dispose();envRT=pmrem.fromScene(envScene,0,1,2000);scene.environment=envRT.texture;
  };
  // Blitz: kurzes Aufhellen des Himmelslichts
  E.flash=k=>{E.fl=Math.max(E.fl||0,k);};
  E.update=(target,camera,size)=>{
    // Himmel und Nebeldecke wandern mit der Kamera (grosse Karte: sonst fehlt am Rand der Himmel)
    sky.position.set(camera.position.x,0,camera.position.z);fogSheet.position.x=Math.round(camera.position.x/3000)*3000;fogSheet.position.z=Math.round(camera.position.z/3000)*3000;
    if(E.fl>0.01){hemi.intensity=E.hemiBase+E.fl*3;E.fl*=0.82;if(E.fl<=0.01)hemi.intensity=E.hemiBase;}
    sun.target.position.copy(target);sun.position.copy(target).addScaledVector(E.sunDir.y>0.02?E.sunDir:new THREE.Vector3(0.3,1,0.2).normalize(),1500);
    if(Q.shadows){const c=sun.shadow.camera;if(c.right!==size){c.left=c.bottom=-size;c.right=c.top=size;c.updateProjectionMatrix();}}
    E.stars.position.copy(camera.position);
    if(CL.mesh&&CL.last.distanceToSquared(camera.position)>250*250)sortClouds(camera.position);
    if(E.fogBase){const a=camera.position.y;if(E.weather==='fog'&&E.fogColor){const k=sstep(900,1250,a);scene.fog.color.copy(E.fogColor).lerp(new THREE.Color(0.72,0.8,0.9).multiplyScalar(0.25+0.75*(1-E.night)),k);}scene.fog.density=E.weather==='fog'?E.fogBase*(1-0.88*sstep(850,1350,a)):E.fogBase*(1.35-0.6*sstep(500,4200,a));glowU.uFogD.value=scene.fog.density;}
    glowU.uScale.value=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));
    E.starU.uScale.value=0;
  };
  return E;
}
