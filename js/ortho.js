// Echte Luftbilder (SWISSIMAGE 10 cm von swisstopo, auf 0,5 m bzw. 2 m verkleinert) als Boden:
// Flughafen Zürich und Strengelbach/Zofingen. Die Bilder werden im Geländeshader eingeblendet –
// ein Übersichtsbild je Gebiet (2 m/Pixel) und bis zu vier scharfe Kacheln (0,5 m/Pixel) in der Nähe der Kamera.
import * as THREE from 'three';
import {GEO,AIRPORTS} from './worldgen.js';
import {taxiNet} from './taxinet.js';
import {LOWMEM} from './device.js';
import {STU,STREAM_GLSL} from './stream.js';

// Gebiete in Schweizer Landeskoordinaten (LV95), Kacheln 1 km × 1 km, benannt nach der Südwest-Ecke in km
// T: Pixel je km im Übersichtsbild (Zürich/Strengelbach 512 = 2 m, neuere Gebiete 256 = 4 m – die scharfen Kacheln übernehmen die Nähe)
export const ORTHO_REGIONS=[
  {id:'zrh',name:'Flughafen Zürich',e0:2682,e1:2686,n0:1254,n1:1261,T:512},
  {id:'sbg',name:'Strengelbach/Zofingen',e0:2636,e1:2640,n0:1235,n1:1239,T:512},
  {id:'gva',name:'Flughafen Genf',e0:2495,e1:2500,n0:1119,n1:1124,T:256,ic:'LSGG',skip:['2495_1123','2496_1123']},// Frankreich: keine SWISSIMAGE-Kachel
  {id:'brn',name:'Flughafen Bern-Belp',e0:2603,e1:2606,n0:1194,n1:1198,T:256,ic:'LSZB'},
  {id:'lug',name:'Flughafen Lugano-Agno',e0:2712,e1:2716,n0:1094,n1:1098,T:256,ic:'LSZA'},
  {id:'sio',name:'Flughafen Sion',e0:2589,e1:2594,n0:1117,n1:1120,T:256,ic:'LSGS'}];
const ORTHO_DATA=null; // Offline-Version: hier stehen die Bilder als Data-URLs
const url=(e,n,k)=>{const key=`${e}_${n}_${k}`;return ORTHO_DATA&&ORTHO_DATA[key]||`data/ortho/${key}.webp`;};

// LV95 -> WGS84 (Näherungsformeln von swisstopo) -> Spielkoordinaten
function lv95ToXZ(E,N){const y=(E-2600000)/1e6,x=(N-1200000)/1e6;
  const lam=(2.6779094+4.728982*y+0.791484*y*x+0.1306*y*x*x-0.0436*y*y*y)*100/36;
  const phi=(16.9023892+3.238272*x-0.270978*y*y-0.002528*x*x-0.0447*y*y*x-0.0140*x*x*x)*100/36;
  return{x:(lam-GEO.lon0)*GEO.kx,z:-(phi-GEO.lat0)*GEO.kz};}
// Spiel (x,z) -> LV95 (E,N): je Gebiet eine affine Abbildung (Fehler < 0,3 m auf wenigen km)
function fitAffine(R){const S=new Float64Array(9),bE=new Float64Array(3),bN=new Float64Array(3);
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const E=(R.e0+(R.e1-R.e0)*i/8)*1000,N=(R.n0+(R.n1-R.n0)*j/8)*1000,p=lv95ToXZ(E,N),v=[p.x,p.z,1];
    for(let a=0;a<3;a++){bE[a]+=v[a]*E;bN[a]+=v[a]*N;for(let b=0;b<3;b++)S[a*3+b]+=v[a]*v[b];}}
  const m=new THREE.Matrix3().fromArray(S).invert().elements;// symmetrisch -> Reihenfolge egal
  const sol=b=>[0,1,2].map(r=>m[r]*b[0]+m[3+r]*b[1]+m[6+r]*b[2]);
  return{E:sol(bE),N:sol(bN)};}
for(const R of ORTHO_REGIONS){R.aff=fitAffine(R);}
const toEN=(R,x,z)=>[R.aff.E[0]*x+R.aff.E[1]*z+R.aff.E[2],R.aff.N[0]*x+R.aff.N[1]*z+R.aff.N[2]];
// liegt ein Punkt im Luftbild-Gebiet? (für Bäume, Häuser, Strassen der Spielwelt)
export function orthoAt(x,z,margin){margin=margin||0;for(const R of ORTHO_REGIONS){const [E,N]=toEN(R,x,z);
  if(E>R.e0*1000+margin&&E<R.e1*1000-margin&&N>R.n0*1000+margin&&N<R.n1*1000-margin){
    if(R.skip&&R.skip.includes(Math.floor(E/1000)+'_'+Math.floor(N/1000)))return null;return R;}}return null;}
export const inOrtho=(x,z,m)=>!!orthoAt(x,z,m);
// Spiel (x,z) -> LV95 [E,N] im Luftbild-Gebiet (sonst null)
export function toLV95(x,z){const R=orthoAt(x,z);return R?toEN(R,x,z):null;}
// Flughafen Zürich: Gelände der Flughafengebäude (LV95, Meter) – dort moderne Fassaden statt Wohnhaus-Fenster
const ZRH_AREA=[[[2683780,1257150],[2684560,1257150],[2684560,1257500],[2683780,1257500]],
  [[2684200,1256750],[2685950,1256750],[2685950,1256400],[2685400,1256100],[2685350,1255200],[2684750,1255150],[2684200,1255400]],
  [[2683750,1255850],[2684200,1255850],[2684200,1255100],[2683750,1255100]]];
export function inAirportArea(x,z){const p=toLV95(x,z);if(p){const [E,N]=p;
  for(const P of ZRH_AREA){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];
    if((yi>N)!==(yj>N)&&E<(xj-xi)*(N-yi)/(yj-yi)+xi)c=!c;}if(c)return true;}}
  return nearApron(x,z,90);}
// übrige Flugplätze: Gebäude am Rand eines OSM-Vorfelds sind Flughafengebäude (Bodenhöhe 210–700 m: so weit reicht die Kodierung im Gebäude-Shader)
let APR=null;
function apronList(){if(APR)return APR;APR=[];const seen=new Set();
  for(const A of AIRPORTS){if(seen.has(A.icao)||A.icao==='LSZH')continue;seen.add(A.icao);if(A.elev<210||A.elev>700)continue;
    let net=null;try{net=taxiNet(A.icao);}catch(e){net=null;}if(!net)continue;
    for(const P of net.aprons){if(P.length<3)continue;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const [px,pz] of P){x0=Math.min(x0,px);x1=Math.max(x1,px);z0=Math.min(z0,pz);z1=Math.max(z1,pz);}
      APR.push({P,x0,x1,z0,z1});}}
  return APR;}
function nearApron(x,z,m){for(const a of apronList()){if(x<a.x0-m||x>a.x1+m||z<a.z0-m||z>a.z1+m)continue;const P=a.P;let c=false,d=1e9;
    for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;
      const dx=xj-xi,dz=zj-zi,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((x-xi)*dx+(z-zi)*dz)/L2));d=Math.min(d,Math.hypot(xi+dx*t-x,zi+dz*t-z));}
    if(c||d<m)return true;}
  return false;}
// Mittelpunkt eines Gebiets in Spielkoordinaten
export function orthoCenter(id){const R=ORTHO_REGIONS.find(r=>r.id===id);return lv95ToXZ((R.e0+R.e1)*500,(R.n0+R.n1)*500);}
export {lv95ToXZ};

const blank=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1);blank.needsUpdate=true;
// Uniforms (werden vom Geländeshader übernommen)
export const ORU={orA:{value:blank},orB:{value:blank},orH0:{value:blank},orH1:{value:blank},orH2:{value:blank},orH3:{value:blank},
  orAE:{value:new THREE.Vector3()},orAN:{value:new THREE.Vector3()},orBE:{value:new THREE.Vector3()},orBN:{value:new THREE.Vector3()},
  orABox:{value:new THREE.Vector4(0,0,1,1)},orBBox:{value:new THREE.Vector4(0,0,1,1)},orOn:{value:new THREE.Vector2(0,0)},
  orHT:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,0,0,0))},orGain:{value:0.92},...STU};
// im Shader relativ zur Südwest-Ecke des Gebiets rechnen (kleine Zahlen -> genug Genauigkeit in float32)
// zwei Plätze im Shader (A, B): jeweils die zwei Gebiete, die der Kamera am nächsten sind und schon geladen sind
const rel=(a,o)=>[a[0],a[1],a[2]-o],SLOT=[null,null];
function setSlot(k,R){SLOT[k]=R;const P=k?['orB','orBE','orBN','orBBox']:['orA','orAE','orAN','orABox'];
  if(!R){ORU.orOn.value.setComponent(k,0);ORU[P[0]].value=blank;return;}
  ORU[P[0]].value=R.tex;ORU[P[1]].value.fromArray(rel(R.aff.E,R.e0*1000));ORU[P[2]].value.fromArray(rel(R.aff.N,R.n0*1000));
  ORU[P[3]].value.set(0,0,(R.e1-R.e0)*1000,(R.n1-R.n0)*1000);ORU.orOn.value.setComponent(k,1);}
// Abstand Kamera – Gebiet (m, 0 innerhalb)
function regionDist(R,x,z){const [E,N]=toEN(R,x,z);return Math.hypot(Math.max(0,R.e0*1000-E,E-R.e1*1000),Math.max(0,R.n0*1000-N,N-R.n1*1000));}

export const ORTHO_GLSL_HEAD=`uniform sampler2D orA,orB,orH0,orH1,orH2,orH3;uniform vec3 orAE,orAN,orBE,orBN;uniform vec4 orABox,orBBox;uniform vec2 orOn;uniform vec4 orHT[4];uniform float orGain;
${STREAM_GLSL}
// Luftbild an einer Weltposition: rgb (linear) + Deckung (0 ausserhalb, weicher Rand 350 m)
vec4 orthoStatic(vec2 wp){vec3 P3=vec3(wp.x,wp.y,1.0);vec2 eA=vec2(dot(P3,orAE),dot(P3,orAN)),eB=vec2(dot(P3,orBE),dot(P3,orBN));vec3 oc=vec3(0.0);float m=0.0;
 vec2 uA=(eA-orABox.xy)/orABox.zw,uB=(eB-orBBox.xy)/orBBox.zw;
 if(orOn.x>0.5&&uA.x>0.0&&uA.x<1.0&&uA.y>0.0&&uA.y<1.0){float ed=min(min(eA.x,orABox.z-eA.x),min(eA.y,orABox.w-eA.y));vec4 t4=texture2D(orA,uA);m=smoothstep(0.0,350.0,ed)*smoothstep(0.5,1.0,t4.a);oc=t4.rgb/max(t4.a,0.5);}
 else if(orOn.y>0.5&&uB.x>0.0&&uB.x<1.0&&uB.y>0.0&&uB.y<1.0){float ed=min(min(eB.x,orBBox.z-eB.x),min(eB.y,orBBox.w-eB.y));vec4 t4=texture2D(orB,uB);m=smoothstep(0.0,350.0,ed)*smoothstep(0.5,1.0,t4.a);oc=t4.rgb/max(t4.a,0.5);}
 if(m>0.0){
  #define ORHI(k,S) if(orHT[k].z>0.5){vec2 u=((orHT[k].w>0.5?eB:eA)-orHT[k].xy)/1000.0;if(u.x>0.0&&u.x<1.0&&u.y>0.0&&u.y<1.0)oc=texture2D(S,u).rgb;}
  ORHI(0,orH0) ORHI(1,orH1) ORHI(2,orH2) ORHI(3,orH3)
 }
 return vec4(oc*orGain,m);}
// mitgelieferte Luftbilder (Zürich, Strengelbach: Flugzeuge entfernt) vor dem Stream; dazwischen weich überblenden
vec4 orthoAt(vec2 wp){vec4 s=orthoStatic(wp);if(s.a>0.999)return s;vec4 t=streamAt(wp);if(t.a<0.001)return s;t.rgb*=orGain;
 float A=s.a+t.a*(1.0-s.a);return vec4((s.rgb*s.a+t.rgb*t.a*(1.0-s.a))/max(A,1e-4),A);}`;
// nach der Grundfarbe des Geländes: Luftbild darüberlegen
export const ORTHO_GLSL_BODY=`
float oM=0.0;{vec4 o4=orthoAt(vWP.xz);oM=o4.a;if(oM>0.0)diffuseColor.rgb=mix(diffuseColor.rgb,o4.rgb,oM);}
`;

// Wald im Luftbild erkennen (dunkles Grün, 2-m-Übersichtsbild, 3×3 gemittelt): 1 = Laubwald, 2 = dunkler Nadelwald
const READY=[];export const onOrthoReady=f=>READY.push(f);
export function orthoTree(x,z){const R=orthoAt(x,z);if(!R||!R.pix)return 0;const [E,N]=toEN(R,x,z);
  const px=Math.floor((E/1000-R.e0)*R.T),py=Math.floor((R.n1-N/1000)*R.T);let r=0,g=0,b=0,n=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=px+dx,Y=py+dy;if(X<0||Y<0||X>=R.pw||Y>=R.ph)continue;const o=(Y*R.pw+X)*4;r+=R.pix[o];g+=R.pix[o+1];b+=R.pix[o+2];n++;}
  if(!n)return 0;r/=n;g/=n;b/=n;const l=(r+g+b)/3;
  if(!(l<92&&g>=r-2&&g>=b-4&&g-b>3))return 0;
  // Wald ist rau (Kronen + Schatten), Wiese und Schatten sind glatt: Helligkeits-Streuung im 5×5-Fenster (10 m)
  let s1=0,s2=0,m=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=px+dx,Y=py+dy;if(X<0||Y<0||X>=R.pw||Y>=R.ph)continue;const o=(Y*R.pw+X)*4,v=(R.pix[o]+R.pix[o+1]+R.pix[o+2])/3;s1+=v;s2+=v*v;m++;}
  const sd=Math.sqrt(Math.max(0,s2/m-(s1/m)*(s1/m)));if(sd<11)return 0;
  return l<62?2:1;}
// Befestigte Fläche im Luftbild (Asphalt, Beton): grau, wenig Farbe, nicht grün. -1 = kein Luftbild
export function orthoPaved(x,z){const R=orthoAt(x,z);if(!R||!R.pix)return -1;const [E,N]=toEN(R,x,z);
  const px=Math.floor((E/1000-R.e0)*R.T),py=Math.floor((R.n1-N/1000)*R.T);let r=0,g=0,b=0,n=0;
  for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){const X=px+dx,Y=py+dy;if(X<0||Y<0||X>=R.pw||Y>=R.ph)continue;const o=(Y*R.pw+X)*4;r+=R.pix[o];g+=R.pix[o+1];b+=R.pix[o+2];n++;}
  if(!n)return -1;r/=n;g/=n;b/=n;const l=(r+g+b)/3,sat=Math.max(r,g,b)-Math.min(r,g,b);
  return(sat<24&&l>50&&l<225&&!(g>r+5&&g>b+3))?1:0;}
// Laden: Übersichtsbilder sofort (Atlas je Gebiet), scharfe Kacheln je nach Kameraposition
export function initOrtho(renderer){
  const cache=new Map(),slots=[null,null,null,null],loader=new THREE.TextureLoader();let last=-1,slotDirty=true;
  const aniso=renderer.capabilities.getMaxAnisotropy();
  const loadImg=src=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});
  ORTHO_REGIONS.forEach(async(R,ri)=>{const nx=R.e1-R.e0,ny=R.n1-R.n0,T=R.T,cv=document.createElement('canvas');cv.width=nx*T;cv.height=ny*T;const c=cv.getContext('2d');
    const jobs=[];for(let e=R.e0;e<R.e1;e++)for(let n=R.n0;n<R.n1;n++)if(!(R.skip&&R.skip.includes(e+'_'+n)))jobs.push(loadImg(url(e,n,'l')).then(im=>{if(im)c.drawImage(im,(e-R.e0)*T,(R.n1-1-n)*T,T,T);}));
    await Promise.all(jobs);try{R.pix=c.getImageData(0,0,cv.width,cv.height).data;R.pw=cv.width;R.ph=cv.height;}catch(e){}
    const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=aniso;tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping;
    R.tex=tx;last=-1;slotDirty=true;
    for(const f of READY)f(R);});

  const get=(ri,e,n)=>{const key=ri+'_'+e+'_'+n;let o=cache.get(key);if(!o){o={key,ri,e,n,tex:null,used:0};cache.set(key,o);
      loader.load(url(e,n,'h'),t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=aniso;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;o.tex=t;last=-1;});}
    o.used=performance.now();return o;};
  return function update(cp,agl){const now=performance.now();if(now-last<400)return;last=now;
    // die zwei nächsten geladenen Gebiete in die Shader-Plätze (ein Gebiet behält seinen Platz)
    const near=ORTHO_REGIONS.filter(R=>R.tex).map(R=>({R,d:regionDist(R,cp.x,cp.z)})).sort((a,b)=>a.d-b.d).slice(0,2).map(o=>o.R);
    if(slotDirty||near.some(R=>!SLOT.includes(R))||SLOT.some(R=>R&&!near.includes(R))){slotDirty=false;
      const nx=[SLOT[0]&&near.includes(SLOT[0])?SLOT[0]:null,SLOT[1]&&near.includes(SLOT[1])?SLOT[1]:null];
      for(const R of near)if(!nx.includes(R))nx[nx[0]?1:0]=R;setSlot(0,nx[0]);setSlot(1,nx[1]);}
    // die vier nächsten Kacheln (nur unterhalb ~3500 m über Grund – darüber reicht das Übersichtsbild)
    const want=[];if(agl<3500)ORTHO_REGIONS.forEach((R,ri)=>{if(!SLOT.includes(R))return;const [E,N]=toEN(R,cp.x,cp.z);
      for(let e=R.e0;e<R.e1;e++)for(let n=R.n0;n<R.n1;n++){if(R.skip&&R.skip.includes(e+'_'+n))continue;const dx=Math.max(0,e*1000-E,E-(e+1)*1000),dy=Math.max(0,n*1000-N,N-(n+1)*1000),d=Math.hypot(dx,dy);if(d<2200)want.push({ri,e,n,d});}});
    want.sort((a,b)=>a.d-b.d);const sel=want.slice(0,LOWMEM?2:4).map(w=>get(w.ri,w.e,w.n));
    // Plätze stabil halten: was schon geladen ist, bleibt im gleichen Platz
    const next=[null,null,null,null];sel.forEach(o=>{const i=slots.indexOf(o);if(i>=0&&o.tex)next[i]=o;});
    sel.forEach(o=>{if(next.includes(o)||!o.tex)return;const i=next.indexOf(null);if(i>=0)next[i]=o;});
    for(let i=0;i<4;i++){slots[i]=next[i];const o=next[i],H=ORU.orHT.value[i];ORU['orH'+i].value=o?o.tex:blank;const R=o&&ORTHO_REGIONS[o.ri],sl=R?SLOT.indexOf(R):-1;if(o&&sl>=0)H.set((o.e-R.e0)*1000,(o.n-R.n0)*1000,1,sl);else{H.set(0,0,0,0);ORU['orH'+i].value=blank;}}
    // Speicher: höchstens 8 scharfe Kacheln behalten
    const KEEP=LOWMEM?3:8;if(cache.size>KEEP){const arr=[...cache.values()].filter(o=>!slots.includes(o)).sort((a,b)=>a.used-b.used);while(cache.size>KEEP&&arr.length){const o=arr.shift();if(o.tex)o.tex.dispose();cache.delete(o.key);}}};
}
