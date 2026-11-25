// Welt: Zürich – Mittelland – Bern – Oberland – Wallis aus echten Höhendaten
import {GEO,LAKES,AIRPORTS_RAW,TOWNS,PEAKS,ROADS,RIVERS,TERRAIN,AREA_ID,AREA_NAME,BORDER} from './swissdata.js';
import {sstep,clamp} from './noise.js';
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
  progress&&progress(1);
  return{H,LK};
}
export function applyFlats(H,LK){
  for(const A of FLATS){
    const R=Math.hypot(A.flatW,A.flatL)+A.blend;const i0=Math.max(0,Math.floor((A.x-R+HALF)/CELL)),i1=Math.min(G,Math.ceil((A.x+R+HALF)/CELL)),j0=Math.max(0,Math.floor((A.z-R+HALF)/CELL)),j1=Math.min(G,Math.ceil((A.z+R+HALF)/CELL));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=-HALF+i*CELL,z=-HALF+j*CELL,dx=x-A.x,dz=z-A.z,al=dx*A.sin-dz*A.cos,ac=dx*A.cos+dz*A.sin;
      const ex=Math.max(0,Math.abs(ac)-A.flatW),ez=Math.max(0,Math.abs(al)-A.flatL),dd=Math.hypot(ex,ez);
      if(dd<A.blend&&!LK[j*N1+i]){const k=j*N1+i,m=1-sstep(0,A.blend,dd);H[k]=H[k]*(1-m)+A.elev*m;}}
  }
}
export function makeSampler(H,LK){
  function heightAt(x,z){
    let gx=(x+HALF)/CELL,gz=(z+HALF)/CELL;gx=clamp(gx,0,G-0.0001);gz=clamp(gz,0,G-0.0001);
    const i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,a=H[j*N1+i],b=H[(j+1)*N1+i],c=H[(j+1)*N1+i+1],d=H[j*N1+i+1];
    if(fx+fz<=1)return a+(d-a)*fx+(b-a)*fz;
    return c+(b-c)*(1-fx)+(d-c)*(1-fz);
  }
  function lakeId(x,z){const i=clamp(Math.round((x+HALF)/CELL),0,G),j=clamp(Math.round((z+HALF)/CELL),0,G);return LK[j*N1+i];}
  function waterLevel(x,z){const id=lakeId(x,z);return id?LAKES[id-1].level:-1e9;}
  function slopeAt(x,z){const e=CELL;const hx=heightAt(x+e,z)-heightAt(x-e,z),hz=heightAt(x,z+e)-heightAt(x,z-e);return Math.hypot(hx,hz)/(2*e);}
  function isLake(x,z){const w=waterLevel(x,z);return w>-1e8&&heightAt(x,z)<w;}
  function groundAt(x,z){return Math.max(heightAt(x,z),waterLevel(x,z));}
  return{heightAt,slopeAt,isLake,waterLevel,groundAt,lakeId};
}
// Umrechnung von Koordinaten der früheren Einzelkarten (zs/bo) in die grosse Karte
const OLDG={zs:{lat0:47.2,lon0:8.5,kx:75635.40599039201,kz:111132},bo:{lat0:46.6,lon0:7.88,kx:76486.58170274837,kz:111132}};
export const oldXZ=(area,x,z)=>{const g=OLDG[area];return toXZ(g.lat0-z/g.kz,g.lon0+x/g.kx);};
