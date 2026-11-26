// Welt: Zürich – Mittelland – Bern – Oberland – Wallis aus echten Höhendaten
import {GEO,LAKES,AIRPORTS_RAW,TOWNS,PEAKS,ROADS,RIVERS,TERRAIN,AREA_ID,AREA_NAME,BORDER} from './swissdata.js';
import {sstep,clamp} from './noise.js';
import {loadFine} from './finedata.js';
import {LOWMEM} from './device.js';
export {TOWNS,PEAKS,ROADS,RIVERS,LAKES,AREA_ID,AREA_NAME,GEO,BORDER};
export const HALF=GEO.half,WORLD=2*HALF,G=GEO.g,N1=G+1,CELL=WORLD/G;
export const toXZ=(lat,lon)=>({x:(lon-GEO.lon0)*GEO.kx,z:-(lat-GEO.lat0)*GEO.kz});

const EXT={SIO:[200,0],GRE:[250,0],BRN:[250,0],INT:[150,0],MEI:[150,0],REI:[260,0],RAR:[260,0],ZRH16:[300,0],ZRH14:[300,0],ZRH10:[300,0],EMM:[700,0],BUO:[500,-250],ALP:[500,0],BIR:[560,0],HAU:[520,0],WAN:[700,0]};
// Version 8: alle Pisten mindestens ~2.6 km und 45 m breit (L-320/L-330 tauglich); [Verlängerung am A-Ende, am B-Ende] in Metern, je nach Gelände
const EXT8={BUO:[223,0],ALP:[450,150],BIR:[675,675],HAU:[700,676],BRN:[312,312],INT:[377,376],MEI:[228,228],REI:[766,765],RAR:[755,754],SIO:[212,211],GRE:[684,683],LUG:[0,452],ACH:[332,332]};
export const AIRPORTS=AIRPORTS_RAW.filter(A=>A.id!=='WAN').map(A0=>{
  const e=EXT[A0.id]||[0,0],x8=EXT8[A0.id]||[0,0],A={...A0,len:A0.len+e[0]+x8[0]+x8[1],w:A0.keepSmall?A0.w:Math.max(A0.w,45),lenOld:A0.len+e[0],eA:x8[0],eB:x8[1],wasSmall:!!A0.small,small:!!A0.keepSmall};
  const sh=e[1]+(x8[1]-x8[0])/2;if(sh){A.x+=Math.sin(A0.a)*sh;A.z-=Math.cos(A0.a)*sh;}A.sh8=(x8[1]-x8[0])/2;
  const big=A.icao==='LSZH',small=!!A0.keepSmall;
  return{...A,sin:Math.sin(A.a),cos:Math.cos(A.a),
    flatW:big?280:small?70:160,flatL:A.len/2+(big?320:small?90:180),blend:big?500:small?220:380,
    side:A0.side?A0.side:A.id==='ZRH16'?-1:A.id==='EMM'?-1:A.id==='BUO'?1:A.id==='INT'?-1:A.id==='MEI'?1:1,hdg:((Math.round(A.a*180/Math.PI)%360)+360)%360};
});
// Missionspunkte wurden für die alten Pistenlängen gesetzt: Längsposition auf die verlängerte Piste umrechnen
export const alongV8=(A,al)=>{if(!A.lenOld||(!A.eA&&!A.eB))return al;const h=A.lenOld/2;const a=al>h?al+A.eB:al<-h?al-A.eA:-h-A.eA+(al+h)*(A.lenOld+A.eA+A.eB)/A.lenOld;return a-A.sh8;};
export const toLocal=(A,x,z)=>{const dx=x-A.x,dz=z-A.z;return{along:dx*A.sin-dz*A.cos,across:dx*A.cos+dz*A.sin};};
export const fromLocal=(A,along,across)=>({x:A.x+along*A.sin+across*A.cos,z:A.z-along*A.cos+across*A.sin});
export const APM=Object.fromEntries(AIRPORTS.map(a=>[a.id,a]));
// zusätzliche flache Zone: Vorfeld Zürich
const Z16=APM.ZRH16;
// Regionalflughäfen: ebenes Vorfeld/Terminal-Gelände neben der Piste
const REGF=AIRPORTS.filter(A=>!A.mil&&!A.small&&A.icao!=='LSZH').map(A=>{const p=fromLocal(A,-A.len*0.12,A.side*(A.w/2+85+150));return{...A,flatW:150,flatL:420,blend:260,x:p.x,z:p.z};});
export const FLATS=Z16?[...AIRPORTS,...REGF,{...Z16,flatW:330,flatL:720,blend:300,x:fromLocal(Z16,1550,-640).x,z:fromLocal(Z16,1550,-640).z}]:[...AIRPORTS,...REGF];
export const MAIN_AP=AIRPORTS.find(a=>a.main)||AIRPORTS[0];
// Hindernisfreiheit: Piste mit Streifen ganz frei; An-/Abflugschneisen (bis 4 km hinter dem Pistenende, 15 % Aufweitung)
// frei bis zur Hindernisfläche 1:40 über der Pistenhöhe. Rechteck (Weltkoordinaten, achsparallel) + Oberkante (absolute Höhe).
export function rwObstacle(x0,z0,x1,z1,top){
  for(const A of AIRPORTS){const L2=A.len/2,R=L2+4200;if(x1<A.x-R||x0>A.x+R||z1<A.z-R||z0>A.z+R)continue;
    let amin=1e9,amax=-1e9,cmin=1e9,cmax=-1e9;
    for(let k=0;k<4;k++){const x=k&1?x1:x0,z=k&2?z1:z0,dx=x-A.x,dz=z-A.z,al=dx*A.sin-dz*A.cos,ac=dx*A.cos+dz*A.sin;
      if(al<amin)amin=al;if(al>amax)amax=al;if(ac<cmin)cmin=ac;if(ac>cmax)cmax=ac;}
    const sw=A.w/2+(A.small?35:60);
    if(amax>-L2-90&&amin<L2+90&&cmax>-sw&&cmin<sw)return A;
    const cAbs=cmin>0?cmin:cmax<0?-cmax:0;
    for(const sg of [1,-1]){if(sg>0?amax<=L2:amin>=-L2)continue;const d=Math.max(0,sg>0?amin-L2:-amax-L2);
      if(d<4000&&cAbs<A.w/2+60+0.15*d&&top>A.elev+d/40-2)return A;}}
  return null;}
export const ICAOS=[...new Set(AIRPORTS.map(a=>a.icao))].map(icao=>({icao,name:AIRPORTS.find(a=>a.icao===icao).name,rwys:AIRPORTS.filter(a=>a.icao===icao)}));

export async function buildGrid(progress){
  // Offline-Version: Höhendaten als Data-URL direkt dekodieren (kein fetch – das sperren manche Vorschau-Fenster)
  let blob;if(TERRAIN.startsWith('data:')){const b64=TERRAIN.slice(TERRAIN.indexOf(',')+1),bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);blob=new Blob([u],{type:'image/png'});}
  else{const res=await fetch(TERRAIN);if(!res.ok)throw new Error('Höhendaten fehlen ('+res.status+')');blob=await res.blob();}
  let bmp;try{bmp=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});}catch(e){bmp=await createImageBitmap(blob);}
  const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bmp,0,0);const d=ctx.getImageData(0,0,N1,N1).data;
  const H=new Float32Array(N1*N1),LK=new Uint8Array(N1*N1);
  for(let k=0;k<N1*N1;k++){H[k]=((d[k*4]<<8)|d[k*4+1])/10-100;LK[k]=d[k*4+2];}
  progress&&progress(0.5);await new Promise(r=>setTimeout(r,0));
  applyFlats(H,LK);
  // feines Höhenmodell (30 m) – nicht im Sparmodus; fehlt es, bleibt das 120-m-Raster
  if(!LOWMEM&&!(typeof location!=='undefined'&&/[?&]coarse/.test(location.search))){try{FINE.T=await loadFine('terrain');prepFine(FINE.T);}catch(e){console.warn('Feines Höhenmodell nicht geladen:',e.message);FINE.T=null;}}
  try{FINE.W=await loadFine('forest');}catch(e){FINE.W=null;}
  progress&&progress(1);
  return{H,LK};
}
// ---------- Feinraster (CELL/4): Abweichung zum Grundraster + Wald ----------
export const FF=4,NF=G*FF,CF=CELL/FF;
export const FINE={T:null,W:null,lut:null};
// Kodierung c (int8): d = sign(c)·(c/K)²; in Flugplatz-Ebenen wird die Abweichung beim Laden ausgeblendet
function prepFine(T){const lut=T.lut,enc=T.enc,Z=T.zero;FINE.lut=lut;
  for(const A of FLATS){const R=Math.hypot(A.flatW,A.flatL)+A.blend;
    const i0=Math.max(0,Math.floor((A.x-R+HALF)/CF)),i1=Math.min(NF,Math.ceil((A.x+R+HALF)/CF)),j0=Math.max(0,Math.floor((A.z-R+HALF)/CF)),j1=Math.min(NF,Math.ceil((A.z+R+HALF)/CF));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=T.tiles[(j>>8)*T.NT+(i>>8)];if(!t)continue;const o=((j&255)<<8)|(i&255);if(t[o]===Z)continue;
      const x=-HALF+i*CF,z=-HALF+j*CF,dx=x-A.x,dz=z-A.z,al=dx*A.sin-dz*A.cos,ac=dx*A.cos+dz*A.sin;
      const ex=Math.max(0,Math.abs(ac)-A.flatW),ez=Math.max(0,Math.abs(al)-A.flatL),dd=Math.hypot(ex,ez);if(dd>=A.blend)continue;
      const m=1-sstep(0,A.blend,dd);t[o]=enc(lut[t[o]]*(1-m));}}}
// Abweichung am Feinknoten (fi, fj ganzzahlig)
export function fineD(fi,fj){const T=FINE.T;if(!T)return 0;if(fi<0)fi=0;else if(fi>NF)fi=NF;if(fj<0)fj=0;else if(fj>NF)fj=NF;
  const t=T.tiles[(fj>>8)*T.NT+(fi>>8)];return t?FINE.lut[t[((fj&255)<<8)|(fi&255)]]:0;}
// Wald am Ort: -1 = keine Daten, 0 kein Wald, 1 Nadelwald (< 30 % Laubholz), 2 Mischwald, 3 Laubwald (> 70 % Laubholz)
export function fineForest(x,z){const W=FINE.W;if(!W)return -1;const fi=Math.round((x+HALF)/CF),fj=Math.round((z+HALF)/CF);if(fi<0||fj<0||fi>NF||fj>NF)return -1;
  const t=W.tiles[(fj>>8)*W.NT+(fi>>8)];if(!t)return 0;const b=t[((fj&255)<<6)|((fi&255)>>2)];return (b>>(((fi&255)&3)*2))&3;}
export function applyFlats(H,LK){
  for(const A of FLATS){
    const R=Math.hypot(A.flatW,A.flatL)+A.blend;const i0=Math.max(0,Math.floor((A.x-R+HALF)/CELL)),i1=Math.min(G,Math.ceil((A.x+R+HALF)/CELL)),j0=Math.max(0,Math.floor((A.z-R+HALF)/CELL)),j1=Math.min(G,Math.ceil((A.z+R+HALF)/CELL));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=-HALF+i*CELL,z=-HALF+j*CELL,dx=x-A.x,dz=z-A.z,al=dx*A.sin-dz*A.cos,ac=dx*A.cos+dz*A.sin;
      const ex=Math.max(0,Math.abs(ac)-A.flatW),ez=Math.max(0,Math.abs(al)-A.flatL),dd=Math.hypot(ex,ez);
      if(dd<A.blend&&!LK[j*N1+i]){const k=j*N1+i,m=1-sstep(0,A.blend,dd);H[k]=H[k]*(1-m)+A.elev*m;}}
  }
}
export function makeSampler(H,LK){
  function baseAt(x,z){
    let gx=(x+HALF)/CELL,gz=(z+HALF)/CELL;gx=clamp(gx,0,G-0.0001);gz=clamp(gz,0,G-0.0001);
    const i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,a=H[j*N1+i],b=H[(j+1)*N1+i],c=H[(j+1)*N1+i+1],d=H[j*N1+i+1];
    if(fx+fz<=1)return a+(d-a)*fx+(b-a)*fz;
    return c+(b-c)*(1-fx)+(d-c)*(1-fz);
  }
  // Feinraster: Dreiecke wie das Geländenetz (Diagonale (i+1,j)–(i,j+1)); liegen ganz in den Dreiecken des Grundrasters
  function detailAt(x,z){
    let gx=(x+HALF)/CF,gz=(z+HALF)/CF;gx=clamp(gx,0,NF-0.0001);gz=clamp(gz,0,NF-0.0001);
    const i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,a=fineD(i,j),b=fineD(i,j+1),c=fineD(i+1,j+1),d=fineD(i+1,j);
    if(fx+fz<=1)return a+(d-a)*fx+(b-a)*fz;
    return c+(b-c)*(1-fx)+(d-c)*(1-fz);
  }
  const heightAt=FINE.T?(x,z)=>baseAt(x,z)+detailAt(x,z):baseAt;
  function lakeId(x,z){const i=clamp(Math.round((x+HALF)/CELL),0,G),j=clamp(Math.round((z+HALF)/CELL),0,G);return LK[j*N1+i];}
  function waterLevel(x,z){const id=lakeId(x,z);return id?LAKES[id-1].level:-1e9;}
  function slopeAt(x,z){const e=CELL;const hx=heightAt(x+e,z)-heightAt(x-e,z),hz=heightAt(x,z+e)-heightAt(x,z-e);return Math.hypot(hx,hz)/(2*e);}
  function isLake(x,z){const w=waterLevel(x,z);return w>-1e8&&heightAt(x,z)<w;}
  function groundAt(x,z){return Math.max(heightAt(x,z),waterLevel(x,z));}
  // Höhe am Feinknoten (für das Geländenetz)
  const nodeH=(fi,fj)=>{fi=Math.max(0,Math.min(NF,fi));fj=Math.max(0,Math.min(NF,fj));return baseAt(-HALF+fi*CF,-HALF+fj*CF)+fineD(fi,fj);};
  return{heightAt,slopeAt,isLake,waterLevel,groundAt,lakeId,nodeH,baseAt};
}
// Umrechnung von Koordinaten der früheren Einzelkarten (zs/bo) in die grosse Karte
const OLDG={zs:{lat0:47.2,lon0:8.5,kx:75635.40599039201,kz:111132},bo:{lat0:46.6,lon0:7.88,kx:76486.58170274837,kz:111132}};
export const oldXZ=(area,x,z)=>{const g=OLDG[area];return toXZ(g.lat0-z/g.kz,g.lon0+x/g.kx);};
