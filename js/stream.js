// Luftbilder für die ganze Schweiz, live von swisstopo (SWISSIMAGE, WMTS in Web-Mercator).
// Vier mitwandernde Texturringe um die Kamera (0,5 / 2 / 8 / 32 m pro Pixel). Jede Ebene ist «toroidal»:
// eine Weltposition hat immer dieselbe Stelle in der Textur (uv = fract(x / Ausdehnung)). Wandert das Fenster,
// werden nur die neu sichtbaren Streifen geleert und mit Kacheln gefüllt – Teil-Uploads statt ganzer Texturen.
// Ohne Internet oder wenn der Server gesperrt ist (Artefakt), bleibt der generierte Boden.
import * as THREE from 'three';
import {GEO} from './worldgen.js';
import {LOWMEM} from './device.js';
const URL=(z,x,y)=>`https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/${z}/${x}/${y}.jpeg`;
const blank=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1);blank.needsUpdate=true;
// Uniforms für den Geländeshader: Texturen + je Ebene (Mitte x, Mitte z, Ausdehnung, an)
export const STU={stT0:{value:blank},stT1:{value:blank},stT2:{value:blank},stT3:{value:blank},stL:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,0,1,0))}};
export const STREAM_GLSL=`uniform sampler2D stT0,stT1,stT2,stT3;uniform vec4 stL[4];
vec4 stLvl(sampler2D T,vec4 L,vec2 wp){if(L.w<0.01)return vec4(0.0);vec2 d=abs(wp-L.xy);float h=L.z*0.5,ed=min(h-d.x,h-d.y);if(ed<=0.0)return vec4(0.0);
 vec2 u=wp/L.z;vec4 c=textureGrad(T,fract(u),dFdx(u),dFdy(u));c.a*=smoothstep(0.0,L.z*0.07,ed)*L.w;return c;}
// Luftbild aus dem Stream: grobe Ebene zuerst, feinere darüber (wo geladen)
vec4 streamAt(vec2 wp){vec4 r=stLvl(stT3,stL[3],wp);
 vec4 c=stLvl(stT2,stL[2],wp);r.rgb=mix(r.rgb,c.rgb,c.a);r.a=max(r.a,c.a);
 c=stLvl(stT1,stL[1],wp);r.rgb=mix(r.rgb,c.rgb,c.a);r.a=max(r.a,c.a);
 c=stLvl(stT0,stL[0],wp);r.rgb=mix(r.rgb,c.rgb,c.a);r.a=max(r.a,c.a);return r;}`;
// Spiel (x,z) <-> Länge/Breite <-> Web-Mercator-Kachel
const lonOf=x=>GEO.lon0+x/GEO.kx,latOf=z=>GEO.lat0-z/GEO.kz;
const tx=(lon,n)=>(lon+180)/360*n,ty=(lat,n)=>{const r=lat*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n;};
const lonT=(x,n)=>x/n*360-180,latT=(y,n)=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;
export function initStream(renderer,opt={}){
  const S=LOWMEM?1024:2048,aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  // Ausdehnung (m) und Zoomstufe je Ebene; Zoom so, dass eine Kachel etwas feiner ist als die Ebene
  const LV=[[1024,18,1500],[4096,16,7000],[16384,14,1e9],[65536,12,1e9]].map(([E,z,maxAgl],i)=>{const zz=LOWMEM?z-1:z;
    const zeros=new Uint8Array(S*S*4),tex=new THREE.DataTexture(zeros,S,S,THREE.RGBAFormat);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=aniso;tex.needsUpdate=true;
    return{i,E,z:zz,maxAgl,tex,zeros,c:null,tiles:new Map(),on:false,w:0};});
  const st={ok:0,fail:0,dead:false,inflight:0,queue:[],enabled:opt.enabled!==false,onDead:opt.onDead||null,loaded:0,bytes:0};
  const MAXQ=LOWMEM?4:8,px=(L,v)=>v/L.E*S;// Meter -> Texel
  const scratch=document.createElement('canvas'),sx=scratch.getContext('2d');const sTex=new THREE.Texture(scratch);sTex.flipY=false;
  // ein Rechteck (Weltkoordinaten, ganz im Fenster) in die toroidale Textur schreiben; draw(ctx,w,h) zeichnet es
  // Mipmaps nicht nach jeder Kachel, sondern einmal je Durchgang neu rechnen (sonst 2048² pro Kachel)
  const gl=renderer.getContext();
  function ready(L){if(L.init)return;renderer.initTexture(L.tex);L.tex.generateMipmaps=false;L.init=true;}
  function mips(L){if(!L.dirty&&!L.urgent)return;L.dirty=false;L.urgent=false;const p=renderer.properties.get(L.tex);if(!p.__webglTexture)return;
    renderer.state.bindTexture(gl.TEXTURE_2D,p.__webglTexture);gl.generateMipmap(gl.TEXTURE_2D);renderer.state.unbindTexture();}
  function put(L,x0,z0,x1,z1,draw){ready(L);L.dirty=true;const X0=Math.round(px(L,x0)),Z0=Math.round(px(L,z0)),X1=Math.round(px(L,x1)),Z1=Math.round(px(L,z1)),w=X1-X0,h=Z1-Z0;if(w<1||h<1)return;
    const mx=((X0%S)+S)%S,mz=((Z0%S)+S)%S;
    // in bis zu vier Stücke teilen (Rand der Textur)
    const xs=mx+w>S?[[mx,0,S-mx],[0,S-mx,w-(S-mx)]]:[[mx,0,w]],zs=mz+h>S?[[mz,0,S-mz],[0,S-mz,h-(S-mz)]]:[[mz,0,h]];
    for(const [dx,ox,ww] of xs)for(const [dz,oz,hh] of zs){if(ww<1||hh<1)continue;
      if(draw==='clear'){const t=new THREE.DataTexture(L.zeros,ww,hh,THREE.RGBAFormat);renderer.copyTextureToTexture(new THREE.Vector2(dx,dz),t,L.tex);continue;}
      scratch.width=ww;scratch.height=hh;sx.clearRect(0,0,ww,hh);draw(sx,-ox,-oz,w,h);sTex.image=scratch;renderer.copyTextureToTexture(new THREE.Vector2(dx,dz),sTex,L.tex);}}
  // Fenster um die Kamera (auf ein Viertel der Ausdehnung gerastert); neu sichtbare Streifen leeren
  function recenter(L,cx,cz){const g=L.E/4,nx=Math.round(cx/g)*g,nz=Math.round(cz/g)*g;if(L.c&&L.c[0]===nx&&L.c[1]===nz)return false;const h=L.E/2;
    const N=[nx-h,nz-h,nx+h,nz+h];
    if(!L.c||Math.abs(L.c[0]-nx)>=L.E||Math.abs(L.c[1]-nz)>=L.E){put(L,N[0],N[1],N[2],N[3],'clear');L.tiles.clear();}
    else{const O=[L.c[0]-h,L.c[1]-h,L.c[0]+h,L.c[1]+h];
      // Streifen: Teil des neuen Fensters ausserhalb des alten
      if(N[0]<O[0])put(L,N[0],N[1],O[0],N[3],'clear');if(N[2]>O[2])put(L,O[2],N[1],N[2],N[3],'clear');
      const xa=Math.max(N[0],O[0]),xb=Math.min(N[2],O[2]);if(xb>xa){if(N[1]<O[1])put(L,xa,N[1],xb,O[1],'clear');if(N[3]>O[3])put(L,xa,O[3],xb,N[3],'clear');}
      // Kacheln, die in die geleerten Streifen reichen, neu zeichnen
      for(const [k,t] of L.tiles){const inO=t.x0>=O[0]&&t.x1<=O[2]&&t.z0>=O[1]&&t.z1<=O[3];if(!inO)L.tiles.delete(k);}}
    L.c=[nx,nz];L.N=N;L.urgent=true;return true;}
  function want(L,cx,cz){const n=2**L.z,[x0,z0,x1,z1]=L.N;const a=Math.floor(tx(lonOf(x0),n)),b=Math.floor(tx(lonOf(x1),n)),c=Math.floor(ty(latOf(z0),n)),d=Math.floor(ty(latOf(z1),n));
    const list=[];for(let X=a;X<=b;X++)for(let Y=c;Y<=d;Y++){const k=X+'_'+Y;if(L.tiles.has(k))continue;
      const wx0=(lonT(X,n)-GEO.lon0)*GEO.kx,wx1=(lonT(X+1,n)-GEO.lon0)*GEO.kx,wz0=-(latT(Y,n)-GEO.lat0)*GEO.kz,wz1=-(latT(Y+1,n)-GEO.lat0)*GEO.kz;
      list.push({L,k,X,Y,x0:wx0,x1:wx1,z0:wz0,z1:wz1,d:Math.hypot((wx0+wx1)/2-cx,(wz0+wz1)/2-cz)});}
    return list;}
  function draw(t,bm){const L=t.L,[N0,N1,N2,N3]=L.N,ix0=Math.max(t.x0,N0),ix1=Math.min(t.x1,N2),iz0=Math.max(t.z0,N1),iz1=Math.min(t.z1,N3);if(ix1<=ix0||iz1<=iz0)return;
    const W=t.x1-t.x0,H=t.z1-t.z0,s0=(ix0-t.x0)/W*256,s1=(ix1-t.x0)/W*256,r0=(iz0-t.z0)/H*256,r1=(iz1-t.z0)/H*256;
    put(L,ix0,iz0,ix1,iz1,(c,ox,oz,w,h)=>c.drawImage(bm,s0,r0,s1-s0,r1-r0,ox,oz,w,h));
    L.tiles.set(t.k,t);}
  function pump(){while(!st.dead&&st.inflight<MAXQ&&st.queue.length){const t=st.queue.shift(),L=t.L;if(L.tiles.has(t.k)||!L.on)continue;L.tiles.set(t.k,{...t,pending:true});st.inflight++;
      fetch(URL(L.z,t.X,t.Y),{mode:'cors'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob();}).then(b=>{st.bytes+=b.size;return createImageBitmap(b);}).then(bm=>{st.ok++;st.loaded++;
          const cur=L.tiles.get(t.k);if(cur&&cur.pending){L.tiles.delete(t.k);draw(t,bm);}bm.close&&bm.close();})
        .catch(()=>{st.fail++;L.tiles.delete(t.k);if(st.ok===0&&st.fail>=6&&!st.dead){st.dead=true;st.queue.length=0;LV.forEach(l=>{l.on=false;STU.stL.value[l.i].w=0;});if(st.onDead)st.onDead();}})
        .finally(()=>{st.inflight--;});}}
  let last=0,firstTex=false,aglS=null,lastF=0;
  // Gegen «wechselnde Bilder»: Ebenen weich ein- und ausblenden statt hart umschalten, Höhe über Grund geglättet (Berge!), beim Ausblenden nichts löschen
  // Mipmaps (2048² neu rechnen ist teuer): sofort nur nach dem Leeren von Streifen (sonst blitzt Bild einer anderen Stelle auf),
  // für neu gezeichnete Kacheln höchstens eine Ebene je 120 ms im Wechsel
  let mipT=0,mipI=0;
  function update(cam,agl){if(st.dead||!st.enabled)return;const now=performance.now(),dt=Math.min(0.2,(now-(lastF||now))/1000);lastF=now;pump();
    for(const L of LV)if(L.urgent)mips(L);
    if(now-mipT>120){mipT=now;for(let k=0;k<4;k++){const L=LV[(mipI+k)%4];if(L.dirty){mips(L);mipI=(mipI+k+1)%4;break;}}}
    for(const L of LV){const v=STU.stL.value[L.i];L.w+=((L.on&&L.c?1:0)-L.w)*Math.min(1,dt*1.5);if(L.w<0.003)L.w=0;v.w=L.w;}
    aglS=aglS===null?agl:aglS+(agl-aglS)*Math.min(1,dt*0.25);
    if(now-last<250)return;last=now;
    if(!firstTex){LV.forEach(L=>{STU['stT'+L.i].value=L.tex;});firstTex=true;}
    const cx=cam.x,cz=cam.z,q=[];
    for(const L of LV){const on=L.on?aglS<L.maxAgl*1.6:aglS<L.maxAgl;L.on=on;
      if(!on){if(L.w===0&&L.c&&Math.hypot(L.c[0]-cx,L.c[1]-cz)>L.E)L.c=null;continue;}
      recenter(L,cx,cz);const v=STU.stL.value[L.i];v.x=L.c[0];v.y=L.c[1];v.z=L.E;
      for(const t of want(L,cx,cz))q.push(t);}
    // nahe zuerst, feine Ebenen bevorzugt; nicht mehr gebrauchte Aufträge fallen weg
    q.sort((a,b)=>(a.d/a.L.E+a.L.i*0.15)-(b.d/b.L.E+b.L.i*0.15));st.queue=q.slice(0,400);}
  function setEnabled(v){st.enabled=v;if(!v)LV.forEach(L=>{L.on=false;L.c=null;L.w=0;L.tiles.clear();STU.stL.value[L.i].w=0;});}
  return{update,setEnabled,state:st,levels:LV};}
