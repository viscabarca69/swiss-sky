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
  // Ruckeln vermeiden: Leeren direkt auf der Grafikkarte (Framebuffer + Scissor statt Nullen hochladen),
  // Kacheln im Hintergrund dekodieren und auf Texelgrösse skalieren (createImageBitmap), danach je Bild nur wenige kleine Uploads
  const gl=renderer.getContext();
  function ready(L){if(L.init)return;renderer.initTexture(L.tex);L.tex.generateMipmaps=false;L.init=true;}
  function mips(L){if(!L.dirty&&!L.urgent)return;L.dirty=false;L.urgent=false;const p=renderer.properties.get(L.tex);if(!p.__webglTexture)return;
    renderer.state.bindTexture(gl.TEXTURE_2D,p.__webglTexture);gl.generateMipmap(gl.TEXTURE_2D);renderer.state.unbindTexture();}
  // Rechteck in Texeln (X0,Z0, Breite w, Höhe h) in bis zu vier Stücke am Texturrand teilen: [Ziel x, Ziel z, Versatz x, Versatz z, Breite, Höhe]
  function pieces(X0,Z0,w,h){if(w<1||h<1)return[];const mx=((X0%S)+S)%S,mz=((Z0%S)+S)%S;
    const xs=mx+w>S?[[mx,0,S-mx],[0,S-mx,w-(S-mx)]]:[[mx,0,w]],zs=mz+h>S?[[mz,0,S-mz],[0,S-mz,h-(S-mz)]]:[[mz,0,h]],out=[];
    for(const [dx,ox,ww] of xs)for(const [dz,oz,hh] of zs)if(ww>=1&&hh>=1)out.push([dx,dz,ox,oz,ww,hh]);return out;}
  let stateDirty=false;
  function fbOf(L){const p=renderer.properties.get(L.tex);if(!p.__webglTexture)return false;
    if(!L.fb||L.fbTex!==p.__webglTexture){L.fb=gl.createFramebuffer();L.fbTex=p.__webglTexture;gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,L.fbTex,0);L.fbOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;}
    else gl.bindFramebuffer(gl.FRAMEBUFFER,L.fb);return L.fbOK;}
  function clear(L,x0,z0,x1,z1){ready(L);L.dirty=true;const X0=Math.round(px(L,x0)),Z0=Math.round(px(L,z0)),P=pieces(X0,Z0,Math.round(px(L,x1))-X0,Math.round(px(L,z1))-Z0);if(!P.length)return;
    stateDirty=true;
    if(fbOf(L)){gl.disable(gl.DITHER);gl.enable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);
      for(const [dx,dz,,,ww,hh] of P){gl.scissor(dx,dz,ww,hh);gl.clear(gl.COLOR_BUFFER_BIT);}
      gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);// Rückfall: Nullen hochladen
    for(const [dx,dz,,,ww,hh] of P){const t=new THREE.DataTexture(L.zeros,ww,hh,THREE.RGBAFormat);renderer.copyTextureToTexture(new THREE.Vector2(dx,dz),t,L.tex);}}
  // fertig skalierte Kachel (Bitmap = ganze Kachel in Texeln ab X0,Z0) hochladen – nur der Teil im aktuellen Fenster
  function upload(u){const {L,t,bm,X0,Z0}=u,w=bm.width,h=bm.height,[N0,N1,N2,N3]=L.N;
    const a0=Math.max(X0,Math.round(px(L,N0))),a1=Math.min(X0+w,Math.round(px(L,N2))),b0=Math.max(Z0,Math.round(px(L,N1))),b1=Math.min(Z0+h,Math.round(px(L,N3)));
    if(a1<=a0||b1<=b0)return;ready(L);const p=renderer.properties.get(L.tex);if(!p.__webglTexture)return;
    renderer.state.bindTexture(gl.TEXTURE_2D,p.__webglTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);
    for(const [dx,dz,ox,oz,ww,hh] of pieces(a0,b0,a1-a0,b1-b0)){gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,a0-X0+ox);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,b0-Z0+oz);
      gl.texSubImage2D(gl.TEXTURE_2D,0,dx,dz,ww,hh,gl.RGBA,gl.UNSIGNED_BYTE,bm);}
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);renderer.state.unbindTexture();L.dirty=true;}
  // Fenster um die Kamera (auf ein Viertel der Ausdehnung gerastert); neu sichtbare Streifen leeren
  function recenter(L,cx,cz){const g=L.E/4,nx=Math.round(cx/g)*g,nz=Math.round(cz/g)*g;if(L.c&&L.c[0]===nx&&L.c[1]===nz)return false;const h=L.E/2;
    const N=[nx-h,nz-h,nx+h,nz+h];
    if(!L.c||Math.abs(L.c[0]-nx)>=L.E||Math.abs(L.c[1]-nz)>=L.E){clear(L,N[0],N[1],N[2],N[3]);L.tiles.clear();}
    else{const O=[L.c[0]-h,L.c[1]-h,L.c[0]+h,L.c[1]+h];
      // Streifen: Teil des neuen Fensters ausserhalb des alten
      if(N[0]<O[0])clear(L,N[0],N[1],O[0],N[3]);if(N[2]>O[2])clear(L,O[2],N[1],N[2],N[3]);
      const xa=Math.max(N[0],O[0]),xb=Math.min(N[2],O[2]);if(xb>xa){if(N[1]<O[1])clear(L,xa,N[1],xb,O[1]);if(N[3]>O[3])clear(L,xa,O[3],xb,N[3]);}
      // Kacheln, die in die geleerten Streifen reichen, neu zeichnen
      for(const [k,t] of L.tiles){const inO=t.x0>=O[0]&&t.x1<=O[2]&&t.z0>=O[1]&&t.z1<=O[3];if(!inO)L.tiles.delete(k);}}
    L.c=[nx,nz];L.N=N;L.urgent=true;return true;}
  function want(L,cx,cz){const n=2**L.z,[x0,z0,x1,z1]=L.N;const a=Math.floor(tx(lonOf(x0),n)),b=Math.floor(tx(lonOf(x1),n)),c=Math.floor(ty(latOf(z0),n)),d=Math.floor(ty(latOf(z1),n));
    const list=[];for(let X=a;X<=b;X++)for(let Y=c;Y<=d;Y++){const k=X+'_'+Y;if(L.tiles.has(k))continue;
      const wx0=(lonT(X,n)-GEO.lon0)*GEO.kx,wx1=(lonT(X+1,n)-GEO.lon0)*GEO.kx,wz0=-(latT(Y,n)-GEO.lat0)*GEO.kz,wz1=-(latT(Y+1,n)-GEO.lat0)*GEO.kz;
      list.push({L,k,X,Y,x0:wx0,x1:wx1,z0:wz0,z1:wz1,d:Math.hypot((wx0+wx1)/2-cx,(wz0+wz1)/2-cz)});}
    return list;}
  const UP=[];// fertig dekodierte Kacheln, warten auf den Upload
  function pump(){while(!st.dead&&st.inflight<MAXQ&&st.queue.length){const t=st.queue.shift(),L=t.L;if(L.tiles.has(t.k)||!L.on)continue;L.tiles.set(t.k,{...t,pending:true});st.inflight++;
      const X0=Math.round(px(L,t.x0)),Z0=Math.round(px(L,t.z0)),w=Math.max(1,Math.round(px(L,t.x1))-X0),h=Math.max(1,Math.round(px(L,t.z1))-Z0);
      fetch(URL(L.z,t.X,t.Y),{mode:'cors'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob();})
        .then(b=>{st.bytes+=b.size;return createImageBitmap(b,{resizeWidth:w,resizeHeight:h,resizeQuality:'medium'}).catch(()=>createImageBitmap(b));})
        .then(bm=>{st.ok++;st.loaded++;UP.push({L,t,bm,X0,Z0,w,h});})
        .catch(()=>{st.fail++;L.tiles.delete(t.k);if(st.ok===0&&st.fail>=6&&!st.dead){st.dead=true;st.queue.length=0;LV.forEach(l=>{l.on=false;STU.stL.value[l.i].w=0;});if(st.onDead)st.onDead();}})
        .finally(()=>{st.inflight--;});}}
  // je Bild höchstens ~3 ms Uploads
  function flush(){const t0=performance.now();let n=0;
    while(UP.length&&n<12&&performance.now()-t0<3){const u=UP.shift(),L=u.L,cur=L.tiles.get(u.t.k);
      if(cur&&cur.pending&&L.on&&L.N){
        if(u.bm.width!==u.w||u.bm.height!==u.h){// Browser ohne Skalier-Option: auf Leinwand skalieren
          const c=document.createElement('canvas');c.width=u.w;c.height=u.h;c.getContext('2d').drawImage(u.bm,0,0,u.w,u.h);u.bm.close&&u.bm.close();u.bm=c;}
        L.tiles.set(u.t.k,u.t);upload(u);n++;}
      else if(cur&&cur.pending)L.tiles.delete(u.t.k);
      u.bm.close&&u.bm.close();}}
  let last=0,firstTex=false,aglS=null,lastF=0;
  // Gegen «wechselnde Bilder»: Ebenen weich ein- und ausblenden statt hart umschalten, Höhe über Grund geglättet (Berge!), beim Ausblenden nichts löschen
  // Mipmaps (2048² neu rechnen ist teuer): sofort nur nach dem Leeren von Streifen (sonst blitzt Bild einer anderen Stelle auf),
  // für neu gezeichnete Kacheln höchstens eine Ebene je 120 ms im Wechsel
  let mipT=0,mipI=0;
  function update(cam,agl){if(st.dead||!st.enabled)return;const now=performance.now(),dt=Math.min(0.2,(now-(lastF||now))/1000);lastF=now;pump();flush();
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
    if(stateDirty){stateDirty=false;renderer.resetState();}// eigene GL-Aufrufe: Zustands-Cache von three.js neu aufbauen
    q.sort((a,b)=>(a.d/a.L.E+a.L.i*0.15)-(b.d/b.L.E+b.L.i*0.15));st.queue=q.slice(0,400);}
  function setEnabled(v){st.enabled=v;if(!v)LV.forEach(L=>{L.on=false;L.c=null;L.w=0;L.tiles.clear();STU.stL.value[L.i].w=0;});}
  return{update,setEnabled,state:st,levels:LV};}
