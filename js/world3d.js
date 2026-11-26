// 3D-Welt: Gelände (echte Höhendaten), Satellitenbild, Seen, Wälder, Orte
import {LOWMEM} from './device.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildExtras,windowShader} from './gfx.js';
import {loadRealCity,coverTest,buildRealCity} from './realcity.js';
import {makeSimplex,fbm,hash2,clamp,sstep,mulberry} from './noise.js';
import {WORLD,HALF,G,N1,CELL,AIRPORTS,FLATS,TOWNS,ROADS,RIVERS,LAKES,BORDER,toLocal} from './worldgen.js';
import {ORU,ORTHO_GLSL_HEAD,ORTHO_GLSL_BODY,inOrtho,orthoTree} from './ortho.js';

const tick=()=>new Promise(r=>setTimeout(r,0));
const SF=makeSimplex(71),SV=makeSimplex(97);

export async function buildWorld(scene,H,LK,S,Q,progress){
  const W={uWin:{value:0},uSun:{value:new THREE.Vector3(0.3,0.8,0.3)}};
  progress(0.01,'Echte Gebäude von swisstopo werden geladen');await tick();
  let RC=null;try{RC=await loadRealCity();}catch(e){console.warn('Echte Gebäude nicht geladen:',e.message);}
  const inReal=coverTest(RC);W.inReal=inReal;W.inRealAp=coverTest(RC,true);W.inOrtho=inOrtho;
  const RWS=AIRPORTS.filter(a=>inOrtho(a.x,a.z,-2000)).map(a=>({x:a.x,z:a.z,dx:Math.sin(a.a),dz:-Math.cos(a.a),h:a.len/2}));
  const rwNear=(x,z,d)=>RWS.some(r=>{const px=x-r.x,pz=z-r.z,t=Math.max(-r.h,Math.min(r.h,px*r.dx+pz*r.dz));return Math.hypot(px-t*r.dx,pz-t*r.dz)<d;});
  // ---------- Hilfsgitter ----------
  const SL=new Float32Array(N1*N1),FO=new Float32Array(N1*N1),VA=new Float32Array(N1*N1),TW=new Float32Array(N1*N1);
  for(let j=0;j<N1;j++){const z=-HALF+j*CELL;
    for(let i=0;i<N1;i++){const x=-HALF+i*CELL,k=j*N1+i;
      const hx=H[j*N1+Math.min(G,i+1)]-H[j*N1+Math.max(0,i-1)],hz=H[Math.min(G,j+1)*N1+i]-H[Math.max(0,j-1)*N1+i];
      SL[k]=Math.hypot(hx,hz)/(2*CELL);
      FO[k]=fbm(SF,x/2600,z/2600,4)+0.35*fbm(SF,x/750+9,z/750,2);
      VA[k]=fbm(SV,x/6000,z/6000,3);
    }
    if(j%128===0){progress(0.02+0.08*j/N1,'Landschaft wird analysiert');await tick();}
  }
  for(const T of TOWNS){const R=T.r*1.35,i0=Math.max(0,Math.floor((T.x-R+HALF)/CELL)),i1=Math.min(G,Math.ceil((T.x+R+HALF)/CELL)),j0=Math.max(0,Math.floor((T.z-R+HALF)/CELL)),j1=Math.min(G,Math.ceil((T.z+R+HALF)/CELL));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=-HALF+i*CELL,z=-HALF+j*CELL,d=Math.hypot(x-T.x,z-T.z)/T.r;if(d<1.35){const k=j*N1+i;TW[k]=Math.max(TW[k],1-d+0.3*SV(x/350,z/350));}}}
  const isWater=k=>LK[k]&&H[k]<LAKES[LK[k]-1].level;
  const airportNear=(x,z,m)=>{for(const A of FLATS){const l=toLocal(A,x,z);if(Math.abs(l.across)<A.flatW+m&&Math.abs(l.along)<A.flatL+m)return A;}return null;};
  function sample(arr,x,z){let gx=(x+HALF)/CELL,gz=(z+HALF)/CELL;gx=clamp(gx,0,G-1e-4);gz=clamp(gz,0,G-1e-4);const i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,k=j*N1+i;
    return arr[k]*(1-fx)*(1-fz)+arr[k+1]*fx*(1-fz)+arr[k+N1]*(1-fx)*fz+arr[k+N1+1]*fx*fz;}
  function forestThr(h,sl){return 0.3+(h<650?0.06:0)+(h>1750?(h-1750)/200:0)-Math.min(sl,0.7)*0.45;}
  function isForest(x,z,jit){
    if(S.isLake(x,z))return 0;const h=S.heightAt(x,z);const sl=sample(SL,x,z);
    if(sl>1.05||h>2050||(sl>0.75&&h>1500))return 0;if(sample(TW,x,z)>0.03)return 0;
    const f=sample(FO,x,z)+jit-forestThr(h,sl);return f>0?(h>900?2:1):0;
  }
  W.isForest=isForest;

  // ---------- Satellitenbild + Klassenkarte ----------
  const T=Q.tex,px=WORLD/T;
  const cv=document.createElement('canvas');cv.width=cv.height=T;const ctx=cv.getContext('2d');
  const img=ctx.createImageData(T,T),D=img.data;
  for(let j=0;j<T;j++){
    const z=-HALF+(j+0.5)*px,gz=(z+HALF)/CELL,j0=Math.min(G-1,gz|0),fz=gz-j0;
    for(let i=0;i<T;i++){
      const x=-HALF+(i+0.5)*px,gx=(x+HALF)/CELL,i0=Math.min(G-1,gx|0),fx=gx-i0,k=j0*N1+i0;
      const w00=(1-fx)*(1-fz),w10=fx*(1-fz),w01=(1-fx)*fz,w11=fx*fz;
      const h=H[k]*w00+H[k+1]*w10+H[k+N1]*w01+H[k+N1+1]*w11;
      const sl=SL[k]*w00+SL[k+1]*w10+SL[k+N1]*w01+SL[k+N1+1]*w11;
      const va=VA[k]*w00+VA[k+1]*w10+VA[k+N1]*w01+VA[k+N1+1]*w11;
      const kk=(fx<0.5?0:1)+(fz<0.5?0:N1)+k,lid=LK[kk];
      const hn=hash2(i,j),hn2=hash2(i>>1,j>>1);
      let r,g,b;
      if(lid&&h<LAKES[lid-1].level){const t=clamp((LAKES[lid-1].level-h)/50,0,1);r=58-30*t;g=86-34*t;b=88-26*t;}
      else{
        const fo=FO[k]*w00+FO[k+1]*w10+FO[k+N1]*w01+FO[k+N1+1]*w11;
        const tw=TW[k]*w00+TW[k+1]*w10+TW[k+N1]*w01+TW[k+N1+1]*w11;
        const snow=2450+va*300+hn*50-(sl<0.5?150:0);
        if(h>snow&&sl<1.4){const s=0.88+0.12*hn;r=236*s;g=240*s;b=248*s;}
        else if(sl>1.0||h>2150+va*220||(sl>0.72&&h>1450)){const t=hn2*0.5+0.25+va*0.35;r=110+42*t;g=104+38*t;b=94+34*t;if(sl<0.7){r+=14;g+=12;b+=6;}if(h>snow-200&&hn>0.6){r=214;g=218;b=226;}}
        else if(tw>0.02+hn*0.3){const q=hash2(i>>1,j>>1);
          if(q<0.32){r=150;g=92;b=72;}else if(q<0.55){r=124;g=122;b=124;}else if(q<0.7){r=90;g=108;b=62;}else{r=150;g=144;b=136;}
          const s=0.85+0.3*hn;r*=s;g*=s;b*=s;}
        else if(fo+(hn-0.5)*0.05-forestThr(h,sl)>0){const s=0.72+0.5*hn*hn2;if(h>900){r=30*s;g=47*s;b=30*s;}else{r=42*s;g=62*s;b=32*s;}}
        else if(h>1650){const s=0.9+0.2*hn;r=126*s;g=130*s;b=80*s;}
        else if(sl<0.16&&h<1150){const s=0.95+0.1*hn;r=112*s;g=126*s;b=64*s;}
        else{const s=0.9+0.2*hn;r=98*s;g=122*s;b=60*s;}
        const m=0.9+0.2*(va*0.5+0.5);r*=m;g*=m;b*=m;
      }
      const o=(j*T+i)*4;D[o]=r;D[o+1]=g;D[o+2]=b;D[o+3]=255;
    }
    if(j%256===0){progress(0.1+0.4*j/T,'Satellitenbild wird gemalt');await tick();}
  }
  ctx.putImageData(img,0,0);
  const W2P=(x)=>(x+HALF)/px;
  ctx.lineCap='round';ctx.lineJoin='round';
  const stroke=(c,pts)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(W2P(p[0]),W2P(p[1])):c.moveTo(W2P(p[0]),W2P(p[1])));c.stroke();};
  for(const R of RIVERS){ctx.strokeStyle='rgb(46,74,80)';ctx.lineWidth=Math.max(1.4,R.w/px);stroke(ctx,R.pts);}
  {const rs=Math.max(0.55,21.5/px);for(const R of ROADS){ctx.strokeStyle='rgba(72,70,68,0.92)';ctx.lineWidth=(R.w*0.7+0.6)*rs;stroke(ctx,R.pts);ctx.strokeStyle='rgba(152,148,142,0.9)';ctx.lineWidth=R.w*0.35*rs;stroke(ctx,R.pts);}}
  for(const A of AIRPORTS){ctx.save();ctx.translate(W2P(A.x),W2P(A.z));ctx.rotate(A.a);ctx.fillStyle='rgb(100,124,64)';ctx.fillRect(-A.flatW*0.85/px,-A.flatL*0.97/px,A.flatW*1.7/px,A.flatL*1.94/px);ctx.restore();}
  progress(0.52,'Textur wird hochgeladen');await tick();
  const sat=new THREE.CanvasTexture(cv);sat.colorSpace=THREE.SRGBColorSpace;sat.anisotropy=Q.aniso;sat.minFilter=THREE.LinearMipmapLinearFilter;
  // Klassenkarte (Felder, Wald, Siedlung)
  const cls=new Uint8Array(N1*N1*4);
  for(let j=0;j<N1;j++)for(let i=0;i<N1;i++){const k=j*N1+i,x=-HALF+i*CELL,z=-HALF+j*CELL,o=((G-j)*N1+i)*4,h=H[k],sl=SL[k];
    const wat=isWater(k),town=TW[k]>0.05,fo=!wat&&!town&&FO[k]-forestThr(h,sl)>0&&sl<=1.0&&h<2050;
    cls[o]=(!wat&&!town&&!fo&&sl<0.16&&h<1150&&!airportNear(x,z,-40))?255:0;cls[o+1]=fo?255:0;cls[o+2]=town?Math.min(255,40+TW[k]*200):0;cls[o+3]=town&&inReal(x,z)?0:255;}
  const clsTex=new THREE.DataTexture(cls,N1,N1,THREE.RGBAFormat);clsTex.magFilter=THREE.LinearFilter;clsTex.minFilter=THREE.LinearFilter;clsTex.needsUpdate=true;
  // Kartenbild
  const MW=T>=4096?4096:T>=2048?2048:1024,ls=MW/1024;const mc=document.createElement('canvas');mc.width=mc.height=MW;{const m=mc.getContext('2d');m.imageSmoothingQuality='high';m.drawImage(cv,0,0,MW,MW);
    // Reliefschattierung (Licht aus Nordwesten) für eine plastische Karte
    {const hc=document.createElement('canvas');hc.width=hc.height=N1;const hx=hc.getContext('2d'),id=hx.createImageData(N1,N1),L=[-0.55,0.68,-0.48],ll=Math.hypot(...L),fl=L[1]/ll;
      for(let j=0;j<N1;j++)for(let i=0;i<N1;i++){const hl=H[j*N1+Math.max(0,i-1)],hr=H[j*N1+Math.min(N1-1,i+1)],hu=H[Math.max(0,j-1)*N1+i],hd=H[Math.min(N1-1,j+1)*N1+i];
        const dx=(hr-hl)/(2*CELL)*1.6,dz=(hd-hu)/(2*CELL)*1.6,nl=Math.hypot(dx,1,dz),sh=(-dx*L[0]+L[1]-dz*L[2])/nl/ll,v=Math.max(0,Math.min(255,128+190*(sh-fl))),o=(j*N1+i)*4;
        id.data[o]=id.data[o+1]=id.data[o+2]=v;id.data[o+3]=255;}
      hx.putImageData(id,0,0);m.save();m.globalCompositeOperation='soft-light';m.globalAlpha=0.85;m.drawImage(hc,0,0,MW,MW);m.restore();}const k=MW/WORLD,P=v=>(v+HALF)*k;m.lineCap=m.lineJoin='round';
    const st=(pts)=>{m.beginPath();pts.forEach((p,i)=>i?m.lineTo(P(p[0]),P(p[1])):m.moveTo(P(p[0]),P(p[1])));m.stroke();};
    for(const R of RIVERS){m.strokeStyle='rgb(70,120,150)';m.lineWidth=1.8*ls;st(R.pts);}
    for(const R of ROADS){m.strokeStyle='rgba(240,228,205,0.8)';m.lineWidth=(R.w>2?1.8:1.1)*ls;st(R.pts);}
    // Landesgrenze: Ausland abgedunkelt und entsättigt, Grenze als rote Linie mit weissem Saum
    if(BORDER.length){const ring=(r)=>{for(let i=0;i<r.length;i+=2)i?m.lineTo(P(r[i]),P(r[i+1])):m.moveTo(P(r[i]),P(r[i+1]));m.closePath();};
      m.save();m.beginPath();m.rect(0,0,MW,MW);BORDER.forEach(ring);m.clip('evenodd');m.globalCompositeOperation='saturation';m.fillStyle='hsl(0,0%,50%)';m.globalAlpha=0.55;m.fillRect(0,0,MW,MW);
      m.globalCompositeOperation='source-over';m.globalAlpha=1;m.fillStyle='rgba(18,26,40,0.32)';m.fillRect(0,0,MW,MW);m.restore();
      m.beginPath();BORDER.forEach(ring);m.strokeStyle='rgba(255,255,255,0.8)';m.lineWidth=1.7*ls;m.stroke();m.strokeStyle='#d8232a';m.lineWidth=0.85*ls;m.stroke();}}
  W.mapCanvas=mc;

  // ---------- Gelände-Mesh ----------
  const tmat=new THREE.MeshStandardMaterial({map:sat,roughness:0.97,metalness:0,envMapIntensity:0.55});
  tmat.onBeforeCompile=sh=>{
    sh.uniforms.clsMap={value:clsTex};sh.uniforms.uWin=W.uWin;sh.uniforms.uSun=W.uSun;Object.assign(sh.uniforms,ORU);
    // Geomorphing: jede Ecke gleitet mit der Entfernung auf die Höhe der nächstgröberen Stufe (aM.x) – beim Stufenwechsel springt nichts
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;attribute vec2 aM;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n{float dd=distance(cameraPosition,transformed);transformed.y=mix(transformed.y,aM.x,smoothstep(aM.y*0.55,aM.y,dd));}')
      .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;vWN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D clsMap;uniform float uWin;uniform vec3 uSun;varying vec3 vWP;varying vec3 vWN;
${ORTHO_GLSL_HEAD}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm3(vec2 p){return vn(p)*0.62+vn(p*2.7+7.1)*0.38;}
vec3 fieldCol(float id){vec3 c=id<0.22?vec3(0.38,0.48,0.23):id<0.4?vec3(0.42,0.52,0.25):id<0.52?vec3(0.35,0.45,0.21):id<0.62?vec3(0.47,0.53,0.28):id<0.72?vec3(0.58,0.56,0.33):id<0.8?vec3(0.64,0.6,0.39):id<0.88?vec3(0.5,0.42,0.3):vec3(0.45,0.5,0.27);return pow(c,vec3(2.2));}
float detH(vec2 p){return vn(p*0.07)+vn(p*0.31)*0.35;}`)
    .replace('#include <map_fragment>',`#include <map_fragment>
float dCam=length(vWP-cameraPosition);float near=1.0-smoothstep(500.0,7000.0,dCam);float mpp=length(fwidth(vWP.xz));
{vec4 cl=texture2D(clsMap,vMapUv);
 float n=fbm3(vWP.xz*0.05);float n2=fbm3(vWP.xz*0.6);
 float m=vn(vWP.xz*0.0012)*0.5+vn(vWP.xz*0.004)*0.5;
 vec3 base=diffuseColor.rgb*mix(1.0,0.78+0.44*n,near)*mix(1.0,0.88+0.24*n2,1.0-smoothstep(150.0,1500.0,dCam))*(0.93+0.14*m);
 // Berggebiet: über ~1300 m und an steilen Hängen keine Äcker mehr, sondern Alpweiden; in Bergtälern ab ~800 m nur Wiesen (keine Getreidefarben)
 float slF=1.0-vWN.y,alpF=smoothstep(1150.0,1450.0,vWP.y+(n-0.5)*220.0),mtnF=smoothstep(700.0,950.0,vWP.y),fW=cl.r*(1.0-max(alpF,smoothstep(0.09,0.17,slF)));
 if(cl.r>0.01){vec3 mw=pow(mix(mix(vec3(0.40,0.49,0.24),vec3(0.50,0.53,0.30),vn(vWP.xz*0.006)),vec3(0.50,0.47,0.31),smoothstep(0.55,0.85,vn(vWP.xz*0.0025))*0.7),vec3(2.2))*(0.76+0.48*fbm3(vWP.xz*0.018))*(0.9+0.2*n2);
  base=mix(base,mw,cl.r*max(alpF,smoothstep(0.09,0.17,slF))*0.55);}
 if(fW>0.01){float ang=floor(vn(vWP.xz*0.00011)*4.0)*0.42;float ca=cos(ang),sa=sin(ang);vec2 q=vec2(ca*vWP.x+sa*vWP.z,-sa*vWP.x+ca*vWP.z);
  vec2 cs=vec2(175.0,96.0);float ix=floor(q.x/cs.x);float off=h21(vec2(ix,7.0))*cs.y;vec2 cell=vec2(ix,floor((q.y+off)/cs.y));vec2 f=vec2(fract(q.x/cs.x),fract((q.y+off)/cs.y));
  float id=h21(cell+3.1);id=mix(id,id*0.6,mtnF);vec3 pc=fieldCol(id)*(0.84+0.3*vn(vWP.xz*0.03))*(0.92+0.16*n2);
  // Bewirtschaftungsspuren je Feld: Mähstreifen (Wiese), Saatreihen (Getreide), Furchen (Acker); Richtung pro Feld zufällig
  {float dirR=h21(cell+11.7);float u=dirR<0.5?q.y:q.x;
   if(id<0.62){float per=7.0;float a=1.0-smoothstep(per*0.25,per*0.5,mpp);pc*=1.0+0.07*a*sign(sin(u*6.2832/per))*smoothstep(0.0,0.3,abs(sin(u*6.2832/per)));}
   else if(id<0.8){float per=0.9;float a=1.0-smoothstep(per*0.3,per*0.7,mpp);pc*=mix(1.0,0.86+0.2*abs(sin(u*3.1416/per)),a);pc*=1.0+0.06*(1.0-smoothstep(5.0,40.0,mpp))*(vn(q*0.05)-0.5);}
   else if(id<0.88){float per=1.4;float a=1.0-smoothstep(per*0.3,per*0.7,mpp);pc*=mix(1.0,0.78+0.3*smoothstep(0.2,0.8,abs(sin(u*3.1416/per))),a);}}
  float ed=min(min(f.x,1.0-f.x)*cs.x,min(f.y,1.0-f.y)*cs.y);float hedge=1.0-smoothstep(1.0,1.0+max(mpp,1.5)*1.6,ed);
  pc=mix(pc,pow(vec3(0.3,0.36,0.2),vec3(2.2)),hedge*0.6);
  // Feldwege (Kies) entlang mancher Feldränder
  if(h21(cell+9.3)<0.3){float tw=f.y*cs.y;float tr=(1.0-smoothstep(2.4,2.4+max(mpp,0.5),tw))*smoothstep(0.4,0.4+max(mpp,0.5),tw);pc=mix(pc,pow(vec3(0.62,0.58,0.5),vec3(2.2))*(0.9+0.2*n2),tr*(1.0-smoothstep(6.0,22.0,mpp)));}
  float aa=1.0-smoothstep(25.0,90.0,mpp);base=mix(base,mix(base,pc,aa*0.75),fW);}
 if(cl.g>0.01){float c=vn(vWP.xz*0.11)*vn(vWP.xz*0.33+3.0);float c2=vn(vWP.xz*0.9);base*=mix(1.0,(0.5+1.05*c)*(0.85+0.3*c2),cl.g*(1.0-smoothstep(1500.0,9000.0,dCam)));}
 if(cl.b>0.01){// Siedlung: verzogenes, gedrehtes Strassennetz; Parzellen meist Gärten, im Zentrum mehr Plätze/Asphalt
  float ta=floor(vn(vWP.xz*0.00013+3.0)*5.0)*0.37;float tc=cos(ta),ts=sin(ta);vec2 w=vec2(vn(vWP.xz*0.004),vn(vWP.xz*0.004+9.0))*10.0;
  vec2 tq=vec2(tc*vWP.x+ts*vWP.z,-ts*vWP.x+tc*vWP.z)+w;vec2 bs=vec2(74.0,58.0);vec2 bi=floor(tq/bs),bf=fract(tq/bs)*bs;
  float dx=min(bf.x,bs.x-bf.x),dy=min(bf.y,bs.y-bf.y);float eX=step(0.25,h21(bi+vec2(0.3,1.7))),eY=step(0.2,h21(bi+vec2(5.1,0.2)));
  float aw=max(mpp,0.6);float stX=(1.0-smoothstep(2.8,2.8+aw,dx))*eX,stY=(1.0-smoothstep(2.8,2.8+aw,dy))*eY;float street=max(stX,stY);float rl=1.0-cl.a;street*=1.0-rl;
  float r=h21(bi+0.5);float dense=smoothstep(0.45,0.95,cl.b);
  vec3 garden=pow(vec3(0.4,0.52,0.28),vec3(2.2))*(0.85+0.3*vn(vWP.xz*0.12));
  float tb=smoothstep(0.55,0.75,vn(vWP.xz*0.09+r*7.0));garden=mix(garden,pow(vec3(0.2,0.3,0.15),vec3(2.2)),tb*0.7);
  vec3 paved=pow(mix(vec3(0.55,0.54,0.51),vec3(0.62,0.6,0.56),h21(bi+2.2)),vec3(2.2))*(0.92+0.16*vn(vWP.xz*0.3));
  vec3 blk=mix(garden,paved,step(r,0.07+0.55*dense));
  blk=mix(blk,mix(garden,paved*0.92,smoothstep(0.38,0.62,vn(vWP.xz*0.012+4.0)*0.7+0.25*dense+0.15*vn(vWP.xz*0.05))),rl);
  vec3 uc=mix(blk,pow(vec3(0.33,0.33,0.34),vec3(2.2)),street*(1.0-smoothstep(4.0,14.0,mpp)));uc*=0.94+0.12*n2;
  vec3 far=mix(base,pow(vec3(0.52,0.52,0.48),vec3(2.2)),0.35+0.4*dense);
  base=mix(base,mix(uc,far,smoothstep(1500.0,7000.0,dCam)),smoothstep(0.02,0.3,cl.b)*0.85);}
 float slope=1.0-vWN.y;
 float rock=smoothstep(0.16,0.3,slope+(n-0.5)*0.12)*smoothstep(650.0,1100.0,vWP.y);
 // Fels: Gesteinsschichten (Bänderung), Farbwechsel Kalk/Gneis, dunkle Klüfte; Geröllhalden am Hangfuss
 float geo=vn(vWP.xz*0.00035);vec3 rc0=mix(vec3(0.5,0.49,0.46),vec3(0.4,0.38,0.36),smoothstep(0.35,0.65,geo));
 float bAA=1.0-smoothstep(6.0,22.0,mpp);float band=1.0+bAA*(0.14*sin(vWP.y*0.11+vn(vWP.xz*0.004)*9.0)+0.07*sin(vWP.y*0.37+n*5.0)-0.04);
 float crack=smoothstep(0.62,0.8,vn(vec2(vWP.x*0.7+vWP.z*0.7,vWP.y*2.2)*0.06));
 vec3 rcol=pow(rc0,vec3(2.2))*(0.7+0.5*vn(vec2(vWP.x+vWP.z,vWP.y*3.0)*0.08))*(0.85+0.3*n2)*band*(1.0-0.45*crack*near);
 base=mix(base,rcol,rock*0.85);
 {float scree=smoothstep(0.1,0.16,slope)*(1.0-smoothstep(0.24,0.32,slope))*smoothstep(1500.0,1900.0,vWP.y)*smoothstep(0.45,0.6,vn(vWP.xz*0.003));
  vec3 sc=pow(vec3(0.58,0.56,0.52),vec3(2.2))*(0.75+0.5*h21(floor(vWP.xz*0.7)))*(0.9+0.2*n);base=mix(base,sc,scree*0.7*(1.0-0.5*smoothstep(3.0,12.0,mpp)));}
 // Nordhänge halten den Schnee länger: Schneegrenze dort bis 300 m tiefer, Südhänge etwas höher
 float asp=clamp(-vWN.z/max(0.05,length(vWN.xz))*smoothstep(0.08,0.25,slope),-1.0,1.0);float sl0=mix(2250.0,330.0,uWin)-(1.0-uWin)*(asp>0.0?300.0*asp:120.0*asp);float snow=smoothstep(sl0,sl0+(uWin>0.5?120.0:300.0),vWP.y+(n-0.5)*260.0)*(1.0-smoothstep(0.22+0.3*uWin,0.37+0.42*uWin,slope+(n2-0.5)*0.08));
 snow*=1.0-(1.0-uWin)*0.55*smoothstep(0.62,0.8,n)*smoothstep(0.16,0.3,slope);
 snow*=1.0-0.45*uWin*cl.b;
 if(uWin>0.5)snow*=mix(0.62+0.3*n,1.0,smoothstep(700.0,1100.0,vWP.y))*(1.0-0.35*cl.g);
 base=mix(base,vec3(0.82,0.86,0.92)*(0.9+0.12*n2)*(1.0-0.16*smoothstep(0.08,0.38,slope))*(1.0-0.14*uWin*(1.0-smoothstep(600.0,1200.0,vWP.y))),snow);
 // Gletscher: flache Firn-/Eisflächen hoch oben leicht bläulich, mit Spaltenmustern
 {float gl=snow*smoothstep(2350.0,2700.0,vWP.y)*(1.0-smoothstep(0.12,0.22,slope))*(1.0-uWin*0.6);
  float crev=smoothstep(0.82,0.95,abs(sin(dot(vWP.xz,vec2(0.21,0.13))+vn(vWP.xz*0.02)*9.0)))*smoothstep(0.06,0.12,slope)*smoothstep(0.45,0.7,vn(vWP.xz*0.006));
  base=mix(base,base*vec3(0.88,0.96,1.05)*(1.0-0.18*crev*(1.0-smoothstep(500.0,1800.0,dCam))*(1.0-smoothstep(2.0,6.0,mpp))),gl);}
 // Relief betonen: Hänge zur Sonne heller, abgewandte dunkler (stärker im Schnee)
 {float ndl=clamp(dot(normalize(vWN),normalize(uSun)),0.0,1.0)*smoothstep(-0.05,0.25,uSun.y);base*=mix(mix(0.8,0.62,snow),1.04,ndl);}
 diffuseColor.rgb=base;}
${ORTHO_GLSL_BODY}`)
    .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{float e=1.2;float s=(1.0-smoothstep(300.0,2500.0,dCam))*0.55*(1.0-oM*0.85);if(s>0.01){vec2 p=vWP.xz;float h0=detH(p),hx=detH(p+vec2(e,0.0)),hz=detH(p+vec2(0.0,e));
 vec3 dW=vec3(-(hx-h0)/e,0.0,-(hz-h0)/e)*6.0;normal=normalize(normal+(viewMatrix*vec4(dW,0.0)).xyz*s);}}
// Grat- und Rinnenrelief in Fels/Schnee: zerklüftete Berge auch aus der Ferne (nur Schattierung, keine Geometrie)
{float sl2=1.0-vWN.y;float k=smoothstep(0.1,0.22,sl2)*smoothstep(1100.0,1600.0,vWP.y)*(1.0-smoothstep(14000.0,30000.0,dCam))*(1.0-smoothstep(40.0,120.0,mpp));
 if(k>0.01){vec2 p=vWP.xz;float e=6.0;
  #define RG(p) (1.0-abs(vn((p)*0.0055)*2.0-1.0))*0.7+(1.0-abs(vn((p)*0.017+4.0)*2.0-1.0))*0.3
  float h0=RG(p),hx=RG(p+vec2(e,0.0)),hz=RG(p+vec2(0.0,e));
  vec3 dW=vec3(-(hx-h0)/e,0.0,-(hz-h0)/e)*55.0;normal=normalize(normal+(viewMatrix*vec4(dW,0.0)).xyz*k*0.9);}}`);
  };
  // Kacheln mit Detailstufen: nah fein, weit grob; Schürzen verdecken Spalten zwischen den Stufen
  const CHN=128,NC=G/CHN,IDX={},GC=new Map(),terrain=new THREE.Group();scene.add(terrain);W.terrain=terrain;
  // Stufe s gilt bis LODT[s] m (danach 2s); die Ecken sind dort schon ganz auf die gröbere Stufe geglitten
  const LODD=LOWMEM?[[1,4500],[2,11000],[4,26000]]:[[1,6000],[2,14000],[4,32000]],LODT=Object.fromEntries(LODD);
  function idxFor(s){if(IDX[s])return IDX[s];const n=CHN/s,v=n+1,ix=[];
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*v+i,b=a+1,c=a+v,d=c+1;ix.push(a,c,b,b,c,d);}
    const E=[[],[],[],[]];for(let k=0;k<v;k++){E[0].push(k);E[1].push(k*v+n);E[2].push(n*v+k);E[3].push(k*v);}
    E.forEach((e,ei)=>{for(let k=0;k<n;k++){const v0=e[k],v1=e[k+1],s0=v*v+ei*v+k,s1=s0+1;ix.push(v0,s0,v1,v1,s0,s1,v0,v1,s0,v1,s1,s0);}});
    return IDX[s]=new THREE.Uint32BufferAttribute(ix,1);}
  function buildChunk(ci,cj,s){const key=ci+','+cj+','+s;let g=GC.get(key);if(g){GC.delete(key);GC.set(key,g);return g;}
    const n=CHN/s,v=n+1,NV=v*v+4*v,pos=new Float32Array(NV*3),nor=new Float32Array(NV*3),uv=new Float32Array(NV*2),am=new Float32Array(NV*2),gi0=ci*CHN,gj0=cj*CHN;
    // Höhe der nächstgröberen Stufe (Schritt 2s) an dieser Ecke – wie deren Dreiecke sie interpolieren (Diagonale b–c)
    const Hg=(gi,gj)=>H[Math.min(G,Math.max(0,gj))*N1+Math.min(G,Math.max(0,gi))],tM=(LODT[s]||1e9);
    const hC=(gi,gj)=>{if(s>=8)return Hg(gi,gj);const oi=((gi-gi0)/s)&1,oj=((gj-gj0)/s)&1;
      if(!oi&&!oj)return Hg(gi,gj);if(oi&&!oj)return (Hg(gi-s,gj)+Hg(gi+s,gj))/2;if(!oi&&oj)return (Hg(gi,gj-s)+Hg(gi,gj+s))/2;return (Hg(gi+s,gj-s)+Hg(gi-s,gj+s))/2;};
    const put=(o,gi,gj,dy)=>{am[o*2]=hC(gi,gj)-dy;am[o*2+1]=tM;const k=gj*N1+gi,hl=H[gi>0?k-1:k],hr=H[gi<G?k+1:k],hu=H[gj>0?k-N1:k],hd=H[gj<G?k+N1:k];
      const nx=-(hr-hl)/(2*CELL),nz=-(hd-hu)/(2*CELL),l=Math.hypot(nx,1,nz);
      pos[o*3]=-HALF+gi*CELL;pos[o*3+1]=H[k]-dy;pos[o*3+2]=-HALF+gj*CELL;nor[o*3]=nx/l;nor[o*3+1]=1/l;nor[o*3+2]=nz/l;uv[o*2]=gi/G;uv[o*2+1]=1-gj/G;};
    for(let j=0;j<v;j++)for(let i=0;i<v;i++)put(j*v+i,gi0+i*s,gj0+j*s,0);
    const D=25+35*s;for(let k=0;k<v;k++){put(v*v+k,gi0+k*s,gj0,D);put(v*v+v+k,gi0+n*s,gj0+k*s,D);put(v*v+2*v+k,gi0+k*s,gj0+n*s,D);put(v*v+3*v+k,gi0,gj0+k*s,D);}
    g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('aM',new THREE.BufferAttribute(am,2));
    g.setIndex(idxFor(s));g.computeBoundingSphere();g.computeBoundingBox();GC.set(key,g);
    // Zwischenspeicher begrenzen (nur ungenutzte Kacheln verwerfen)
    if(GC.size>110){for(const [k2,g2] of GC){if(GC.size<=90)break;if(!CK.some(c=>c.mesh.geometry===g2)){GC.delete(k2);g2.dispose();}}}
    return g;}
  const CK=[];
  for(let cj=0;cj<NC;cj++)for(let ci=0;ci<NC;ci++){const m=new THREE.Mesh(buildChunk(ci,cj,8),tmat);m.receiveShadow=true;m.matrixAutoUpdate=false;terrain.add(m);
    let hm=-1e9;for(let j=cj*CHN;j<=(cj+1)*CHN;j+=4)for(let i=ci*CHN;i<=(ci+1)*CHN;i+=4)hm=Math.max(hm,H[j*N1+i]);
    CK.push({ci,cj,s:8,mesh:m,cx:-HALF+(ci+0.5)*CHN*CELL,cz:-HALF+(cj+0.5)*CHN*CELL,hw:CHN*CELL/2,hm});}
  const wantS=(c,p,cur)=>{const dx=Math.max(0,Math.abs(p.x-c.cx)-c.hw),dz=Math.max(0,Math.abs(p.z-c.cz)-c.hw),dy=Math.max(0,p.y-c.hm),d=Math.hypot(dx,dz,dy);
    for(const [s,t] of LODD)if(d<(s<cur?t:t*1.12))return s;return 8;};
  W.updateTerrain=(p,force)=>{const todo=[];for(const c of CK){const s=wantS(c,p,c.s);if(s!==c.s)todo.push([s<c.s?(Math.log2(c.s/s)+2):0.5,c,s]);}
    if(!todo.length)return;todo.sort((a,b)=>b[0]-a[0]);const n=force?todo.length:Math.min(todo.length,3);
    for(let k=0;k<n;k++){const [,c,s]=todo[k];c.mesh.geometry=buildChunk(c.ci,c.cj,s);c.s=s;}};
  progress(0.58,'Seen werden gefüllt');await tick();

  // ---------- Seen ----------
  const wn=document.createElement('canvas');wn.width=wn.height=256;{const c=wn.getContext('2d'),id=c.createImageData(256,256),wr=mulberry(31),WV=[];
    // kachelbare Wellen in vielen Richtungen (ganzzahlige Wellenvektoren), Amplitude fällt mit der Frequenz
    while(WV.length<44){const a=Math.round((wr()-0.5)*30),b=Math.round((wr()-0.5)*30),k=Math.hypot(a,b);if(k<1.5)continue;WV.push([a,b,0.9/Math.pow(k,1.15)*(0.6+wr()*0.8),wr()*6.283]);}
    const hf=new Float32Array(256*256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let v=0;for(const [a,b,amp,ph] of WV)v+=amp*Math.sin(2*Math.PI*(a*x+b*y)/256+ph);hf[y*256+x]=v;}
    const H2=(x,y)=>hf[((y+256)%256)*256+((x+256)%256)];
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=H2(x+1,y)-H2(x-1,y),dy=H2(x,y+1)-H2(x,y-1);const n=new THREE.Vector3(-dx*2.2,-dy*2.2,1).normalize();const o=(y*256+x)*4;id.data[o]=(n.x*0.5+0.5)*255;id.data[o+1]=(n.y*0.5+0.5)*255;id.data[o+2]=(n.z*0.5+0.5)*255;id.data[o+3]=255;}c.putImageData(id,0,0);}
  const wnt=new THREE.CanvasTexture(wn);wnt.wrapS=wnt.wrapT=THREE.RepeatWrapping;
  const wp=[],wuv=[],wi=[],wd=[];
  for(let j=0;j<G;j++)for(let i=0;i<G;i++){const k=j*N1+i;const id=LK[k]||LK[k+1]||LK[k+N1]||LK[k+N1+1];if(!id)continue;
    const lv=LAKES[id-1].level+0.05,x0=-HALF+i*CELL,z0=-HALF+j*CELL,n=wp.length/3;
    wp.push(x0,lv,z0,x0+CELL,lv,z0,x0,lv,z0+CELL,x0+CELL,lv,z0+CELL);for(const [a,b] of [[x0,z0],[x0+CELL,z0],[x0,z0+CELL],[x0+CELL,z0+CELL]])wuv.push(a/65,b/65);
    for(const kk of [k,k+1,k+N1,k+N1+1])wd.push(lv-H[kk]);
    wi.push(n,n+2,n+1,n+1,n+2,n+3);}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(wuv,2));wg.setIndex(wi);wg.computeVertexNormals();
  wg.setAttribute('aD',new THREE.Float32BufferAttribute(wd,1));
  // Seefarbe nach Tiefe: türkis im Flachwasser, dunkel in der Tiefe, weicher Uferrand
  const wmat=new THREE.MeshStandardMaterial({color:0x15363f,roughness:0.06,metalness:0.05,normalMap:wnt,normalScale:new THREE.Vector2(0.28,0.28),envMapIntensity:1.15,transparent:true,opacity:0.94});
  wmat.onBeforeCompile=sh=>{sh.vertexShader='attribute float aD;varying float vD;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvD=aD;');
    sh.fragmentShader='varying float vD;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 {float sh=1.0-smoothstep(0.0,14.0,vD);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.07,0.2,0.19),sh*0.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.22,0.32,0.27),(1.0-smoothstep(0.0,3.0,vD))*0.6);
  diffuseColor.a*=smoothstep(-1.0,1.6,vD);}`);};
  const water=new THREE.Mesh(wg,wmat);
  scene.add(water);W.water=water;W.waterTex=wnt;

  // ---------- Häuser ----------
  progress(0.62,'Städte und Dörfer werden gebaut');await tick();
  const rnd=mulberry(5);const houses=[],towers=[],churches=[];
  function okSpot(x,z){if(S.isLake(x,z)||S.lakeId(x,z))return false;if(inOrtho(x,z,-200))return false;if(sample(SL,x,z)>0.32)return false;if(airportNear(x,z,200))return false;if(inReal(x,z))return false;return true;}
  for(const Tn of TOWNS){
    const n=Math.round(Tn.r*Tn.r/(Tn.city?1500:2400)*Q.house*(Tn.name==='Zürich'?2.2:Tn.city?1.3:1));const ang=rnd()*Math.PI;
    for(let i=0;i<n;i++){const rr=Math.sqrt(rnd())*Tn.r*1.0,a=rnd()*Math.PI*2,x=Tn.x+Math.cos(a)*rr,z=Tn.z+Math.sin(a)*rr;
      if(!okSpot(x,z)||sample(TW,x,z)<0.06)continue;
      if(Tn.city&&rr<Tn.r*0.38&&rnd()<0.22)towers.push({x,z,a:ang+(rnd()<0.5?Math.PI/2:0),w:16+rnd()*20,d:18+rnd()*26,h:12+rnd()*rnd()*(Tn.name==='Zürich'?60:35)});
      else{const hy=S.heightAt(x,z),ch=hy>820&&rnd()<Math.min(0.85,(hy-820)/300);houses.push({x,z,a:ang+(rnd()<0.3?Math.PI/2:0),w:8+rnd()*9,d:10+rnd()*10,h:ch?5+rnd()*3:5+rnd()*6,ch});}}
    // Kirche(n): Schiff mit Satteldach, Turm mit Spitzhelm – die Wahrzeichen jedes Dorfs
    const nc=Tn.name==='Zürich'?6:Tn.city?3:1;
    for(let c=0;c<nc;c++){let x=Tn.x,z=Tn.z;for(let t=0;t<14;t++){const rr=(c?0.25+rnd()*0.4:rnd()*0.12)*Tn.r,a=rnd()*6.283;x=Tn.x+Math.cos(a)*rr;z=Tn.z+Math.sin(a)*rr;if(okSpot(x,z))break;}
      if(!okSpot(x,z))continue;const a=rnd()*Math.PI,big=Tn.city?1.35:1,w=(10+rnd()*3)*big,d=(22+rnd()*8)*big,th=(24+rnd()*10)*big*(Tn.name==='Zürich'?1.4:1),tw=5.5*big;
      houses.push({x,z,a,w,d,h:9*big,wc:0xf1eee6,rc:rnd()<0.5?0x7a3426:0x4b4b50});
      const tx=x+Math.sin(a)*(d/2+tw*0.4),tz=z+Math.cos(a)*(d/2+tw*0.4);churches.push({x:tx,z:tz,a,tw,th,sp:tw*(2+rnd()*0.8),sc:[0x5c7a66,0x3e3f44,0x7a3426,0x5c7a66][(rnd()*4)|0]});}
  }
  for(let i=0,NF=Math.round(Q.farms*Math.min(4,Math.pow(WORLD/88000,2)));i<NF;i++){const x=(rnd()-0.5)*(WORLD-8000),z=(rnd()-0.5)*(WORLD-8000);const h=S.heightAt(x,z);if(h>1400||!okSpot(x,z)||isForest(x,z,0)||sample(TW,x,z)>0.02)continue;
    const a=rnd()*Math.PI;houses.push({x,z,a,w:11,d:15,h:7});houses.push({x:x+Math.cos(a)*24,z:z+Math.sin(a)*24,a,w:15,d:26,h:8});}
  const wallG=new THREE.BoxGeometry(1,1,1);wallG.translate(0,0.5,0);
  const roofG=new THREE.BufferGeometry();{const v=[-0.55,0,-0.55, 0.55,0,-0.55, 0,0.5,-0.55, -0.55,0,0.55, 0.55,0,0.55, 0,0.5,0.55];
    const idx=[0,2,1, 3,4,5, 0,3,5, 0,5,2, 1,2,5, 1,5,4, 0,1,4, 0,4,3];roofG.setAttribute('position',new THREE.Float32BufferAttribute(v,3));roofG.setIndex(idx);}
  const roofGeo=roofG.toNonIndexed();roofGeo.computeVertexNormals();
  // Häuser in Kartenzellen (je eine Instanz-Gruppe), damit weit entfernte Zellen gar nicht erst gezeichnet werden
  const HC=Math.max(1,Math.round(WORLD/21000)),hcOf=(x,z)=>Math.min(HC-1,Math.max(0,Math.floor((z+HALF)/WORLD*HC)))*HC+Math.min(HC-1,Math.max(0,Math.floor((x+HALF)/WORLD*HC)));
  const cellH=Array.from({length:HC*HC},()=>({h:[],t:[]}));houses.forEach((hs,i)=>cellH[hcOf(hs.x,hs.z)].h.push(i));towers.forEach((t,k)=>cellH[hcOf(t.x,t.z)].t.push(k));
  const wallMat=windowShader(new THREE.MeshStandardMaterial({roughness:0.9})),roofMat=new THREE.MeshStandardMaterial({roughness:0.8,side:THREE.DoubleSide});
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),p=new THREE.Vector3(),col=new THREE.Color(),UP=new THREE.Vector3(0,1,0);
  const WALLS=[0xe9e2d4,0xf2ece0,0xd9cdb6,0xe6dccb,0xcfc6b8,0xf4f1ea,0xefe1b8,0xead2c4,0xdfe5e0,0xf6f4ee],ROOFS=[0x8c3b2a,0x7a3426,0x5a4a44,0x9a4a32,0x4b4b50,0x6e3a2c,0x8a4b35];
  const CHW=[0x9a6a42,0x8a5c38,0xa8784c,0x7e5634],CHR=[0x6b6660,0x5d5853,0x76706a,0x7a3c2c];
  const lightsPos=[],HCELLS=[],wallMs=[],roofMs=[];
  houses.forEach((hs,i)=>{if(i%2===0)lightsPos.push(hs.x+3,S.heightAt(hs.x,hs.z)+2.4,hs.z+3);});
  cellH.forEach((c,ci)=>{if(!c.h.length&&!c.t.length)return;
    const wallM=new THREE.InstancedMesh(wallG,wallMat,c.h.length+c.t.length),roofM=new THREE.InstancedMesh(roofGeo,roofMat,Math.max(1,c.h.length));roofM.count=c.h.length;
    c.h.forEach((i,n)=>{const hs=houses[i],y=S.heightAt(hs.x,hs.z)-0.6;q.setFromAxisAngle(UP,hs.a);
      m4.compose(p.set(hs.x,y,hs.z),q,sc.set(hs.w,hs.h+0.6,hs.d));wallM.setMatrixAt(n,m4);wallM.setColorAt(n,col.set(hs.wc??(hs.ch?CHW[i%4]:WALLS[(i*7)%WALLS.length])));
      m4.compose(p.set(hs.x,y+hs.h+0.6,hs.z),q,sc.set(hs.w*(hs.ch?1.12:1),hs.w*(hs.ch?0.5:hs.wc?1.0:0.9),hs.d*(hs.ch?1.1:1)));roofM.setMatrixAt(n,m4);roofM.setColorAt(n,col.set(hs.rc??(hs.ch?CHR[(i*3)%4]:ROOFS[(i*13)%ROOFS.length])));});
    c.t.forEach((k,m)=>{const t=towers[k],n=c.h.length+m,y=S.heightAt(t.x,t.z)-1;q.setFromAxisAngle(UP,t.a);m4.compose(p.set(t.x,y,t.z),q,sc.set(t.w,t.h,t.d));wallM.setMatrixAt(n,m4);
      wallM.setColorAt(n,col.setHSL(0.07+((k*13)%5)/100,0.12,0.45+((k*37)%25)/100));for(let f=6;f<t.h;f+=9)lightsPos.push(t.x+t.w*0.5,y+f,t.z);});
    wallM.castShadow=true;wallM.computeBoundingSphere();roofM.computeBoundingSphere();scene.add(wallM,roofM);wallMs.push(wallM);roofMs.push(roofM);
    const cx=-HALF+((ci%HC)+0.5)*WORLD/HC,cz=-HALF+(Math.floor(ci/HC)+0.5)*WORLD/HC;HCELLS.push({cx,cz,hw:WORLD/HC/2,ms:[wallM,roofM]});});
  if(churches.length){const spG=new THREE.ConeGeometry(Math.SQRT1_2,1,4,1).rotateY(Math.PI/4).translate(0,0.5,0);
    const twM=new THREE.InstancedMesh(wallG,new THREE.MeshStandardMaterial({roughness:0.85}),churches.length),spM=new THREE.InstancedMesh(spG,new THREE.MeshStandardMaterial({roughness:0.6,metalness:0.2}),churches.length);
    churches.forEach((c,n)=>{const y=S.heightAt(c.x,c.z)-0.8;q.setFromAxisAngle(UP,c.a);m4.compose(p.set(c.x,y,c.z),q,sc.set(c.tw,c.th+0.8,c.tw));twM.setMatrixAt(n,m4);twM.setColorAt(n,col.set(0xeeebe3));
      m4.compose(p.set(c.x,y+c.th+0.8,c.z),q,sc.set(c.tw*1.04,c.sp,c.tw*1.04));spM.setMatrixAt(n,m4);spM.setColorAt(n,col.set(c.sc));lightsPos.push(c.x,y+c.th*0.7,c.z);});
    twM.castShadow=spM.castShadow=true;twM.computeBoundingSphere();spM.computeBoundingSphere();scene.add(twM,spM);wallMs.push(twM);roofMs.push(spM);W.churches=churches;}
  // Zellen weiter als ~30 km ausblenden (Häuser wären dort kleiner als ein Pixel)
  W.updateHouses=(cp)=>{for(const c of HCELLS){const dx=Math.max(0,Math.abs(cp.x-c.cx)-c.hw),dz=Math.max(0,Math.abs(cp.z-c.cz)-c.hw),v=Math.hypot(dx,dz)<30000+Math.max(0,cp.y-1500)*4;for(const m of c.ms)m.visible=v;}};
  for(const R of ROADS){for(let i=0;i<R.pts.length-1;i++){const [x0,z0]=R.pts[i],[x1,z1]=R.pts[i+1];const n=Math.floor(Math.hypot(x1-x0,z1-z0)/100);
    for(let k=0;k<n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n;if(S.isLake(x,z))continue;if(sample(TW,x,z)>0.02||rnd()<0.05)lightsPos.push(x,S.heightAt(x,z)+7,z);}}}
  // Echte Gebäude (swissBUILDINGS3D) in Zürich, Genf, Basel, Bern, Lugano, St. Gallen, Zofingen/Strengelbach
  let real=null;if(RC){progress(0.66,'Echte Gebäude werden aufgebaut');await tick();try{real=buildRealCity(scene,RC,S,lightsPos);W.realCount=real.count;}catch(e){console.warn('Echte Gebäude:',e);}}
  {const uh=W.updateHouses;W.updateHouses=cp=>{uh(cp);if(real)real.update(cp);};}
  W.cityLights=lightsPos;

  // ---------- Bäume (dynamisch um die Kamera) ----------
  const NI=g=>{const n=g.index?g.toNonIndexed():g;n.deleteAttribute('uv');return n;};
  const con=mergeGeometries([new THREE.ConeGeometry(2.6,7,7).translate(0,6,0),new THREE.ConeGeometry(1.9,5.5,7).translate(0,9.4,0),new THREE.CylinderGeometry(0.22,0.32,3,5).translate(0,1.5,0)].map(NI));
  const dec=mergeGeometries([new THREE.IcosahedronGeometry(3.4,0).scale(1,0.85,1).translate(0,6,0),new THREE.CylinderGeometry(0.28,0.38,3.5,5).translate(0,1.7,0)].map(NI));
  const tmatT=new THREE.MeshLambertMaterial({color:0xffffff});
  tmatT.onBeforeCompile=sh=>{sh.uniforms.uWin=W.uWin;sh.fragmentShader='uniform float uWin;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.82,0.86,0.9),uWin*0.5);');};
  const CAP=Q.trees;
  // Zwei Sätze (sichtbar / im Aufbau), damit das Nachladen nicht ruckelt
  const SETS=[0,1].map(()=>[new THREE.InstancedMesh(con,tmatT,CAP),new THREE.InstancedMesh(dec,tmatT,CAP)]);let cur=0;
  SETS.forEach((st,si)=>st.forEach(t=>{t.count=0;t.frustumCulled=false;t.instanceMatrix.setUsage(THREE.DynamicDrawUsage);t.setColorAt(0,col.set(0x335522));t.instanceColor.setUsage(THREE.DynamicDrawUsage);t.visible=si===0;scene.add(t);}));
  const trees=SETS[0];W.heavy=[...SETS[0],...SETS[1],...wallMs,...roofMs,...(real?real.meshes:[])];W.blockers=[...wallMs,...roofMs];
  const SP=Q.treeSpacing,RAD=Q.treeRadius;
  let gen=null,center=new THREE.Vector2(1e9,1e9);
  function* treeGen(cx,cz){
    const out=[[],[]];
    const i0=Math.floor((cx-RAD)/SP),i1=Math.floor((cx+RAD)/SP),j0=Math.floor((cz-RAD)/SP),j1=Math.floor((cz+RAD)/SP);
    for(let j=j0;j<=j1;j++){
      for(let i=i0;i<=i1;i++){
        const x=(i+hash2(i,j*3+1))*SP,z=(j+hash2(i*5+2,j))*SP;const dx=x-cx,dz=z-cz;if(dx*dx+dz*dz>RAD*RAD||Math.abs(x)>HALF||Math.abs(z)>HALF)continue;
        const hv=hash2(i+11,j-7);
        if(inOrtho(x,z,-150)){if(rwNear(x,z,750)){if((i+j)%40===0)yield;continue;}const ot=orthoTree(x,z);if(ot){const hz=hash2(i*3-1,j*7+5),kd=ot===2||hv<0.4?0:1;if(out[kd].length<CAP*5)out[kd].push(x,S.heightAt(x,z)-0.3,z,0.8+hz*0.45,hv);}if((i+j)%40===0)yield;continue;}
        const t=isForest(x,z,(hv-0.5)*0.08);
        if(!t){// offenes Land: Hochstamm-Obstgärten in Reihen, Einzelbäume auf Feldern, Gartenbäume in Dörfern
          if(dx*dx+dz*dz>RAD*RAD*0.55)continue;const hz=hash2(i*3-1,j*7+5);
          const orch=SV(x/480,z/480)>0.56&&SV(x/2600+7,z/2600)>-0.1,lone=hz<0.016,gard=hz<0.16;if(!orch&&!lone&&!gard)continue;
          if(S.isLake(x,z)||airportNear(x,z,60))continue;const tw=sample(TW,x,z);if(gard&&!orch&&!lone&&(tw<0.06||tw>0.75))continue;if(tw>0.75)continue;
          const sl=sample(SL,x,z);if(sl>0.3)continue;const h=S.heightAt(x,z);if(h>1250)continue;if(out[1].length>=CAP*5)continue;
          if(orch){const ox=(i+0.5)*SP+(hv-0.5)*3,oz=(j+0.5)*SP+(hz-0.5)*3;out[1].push(ox,S.heightAt(ox,oz)-0.3,oz,0.55+hz*0.2,hv);}
          else out[1].push(x,h-0.3,z,lone?1.05+hz*20:0.6+hv*0.35,hv);
          continue;}
        if(airportNear(x,z,30))continue;
        const kind=t===2?(hv<0.85?0:1):(hv<0.35?0:1);if(out[kind].length>=CAP*5)continue;
        out[kind].push(x,S.heightAt(x,z)-0.3,z,0.75+hash2(i-3,j+9)*0.75,hv);
      }
      if((j-j0)%3===0)yield;
    }
    return out;
  }
  // Bäume schrittweise in den unsichtbaren Satz schreiben, dann umschalten
  let fill=null;
  function* fillGen(out){const st=SETS[1-cur],CH=2500;
    for(let k=0;k<2;k++){const a=out[k],M=st[k];let n=0;const tot=a.length/5;
      for(let o=0;o<a.length;o+=5){const s2=a[o+3];q.setFromAxisAngle(UP,a[o+4]*6.28);m4.compose(p.set(a[o],a[o+1],a[o+2]),q,sc.set(s2,s2*(0.85+a[o+4]*0.4),s2));M.setMatrixAt(n,m4);
        if(k===0)col.setRGB(0.12+a[o+4]*0.05,0.2+a[o+4]*0.07,0.11);else col.setRGB(0.16+a[o+4]*0.09,0.25+a[o+4]*0.09,0.1+a[o+4]*0.03);M.setColorAt(n,col);n++;
        if(n%CH===0||n===tot){const s0=(Math.ceil(n/CH)-1)*CH;M.instanceMatrix.addUpdateRange(s0*16,(n-s0)*16);M.instanceColor.addUpdateRange(s0*3,(n-s0)*3);M.instanceMatrix.needsUpdate=true;M.instanceColor.needsUpdate=true;M.count=Math.max(M.count,0);if(n<tot)yield;}}
      M.count=n;}
    yield 'swap';}
  function swap(){SETS[cur].forEach(t=>t.visible=false);cur=1-cur;SETS[cur].forEach(t=>t.visible=true);SETS[1-cur].forEach(t=>t.count=0);}
  W.updateTrees=(camPos,force)=>{W.updateTerrain(camPos,force);W.updateHouses(camPos);
    if(force&&(fill||gen)){fill=null;gen=null;SETS[1-cur].forEach(t=>t.count=0);}
    if(fill){const r=fill.next();if(r.done||r.value==='swap'){swap();fill=null;}return;}
    if(gen){const r=gen.next();if(r.done){fill=fillGen(r.value);gen=null;}return;}
    if(force||Math.hypot(camPos.x-center.x,camPos.z-center.y)>RAD*0.3){center.set(camPos.x,camPos.z);gen=treeGen(camPos.x,camPos.z);
      if(force){let r;do{r=gen.next();}while(!r.done);gen=null;const f=fillGen(r.value);let x;do{x=f.next();}while(!x.done&&x.value!=='swap');swap();}}
  };
  progress(0.68,'Wälder werden gepflanzt');await tick();
  W.LK=LK;W.extras=buildExtras(scene,S,Q,W,airportNear);
  W.setWinter=on=>{W.uWin.value=on?1:0;};
  return W;
}
