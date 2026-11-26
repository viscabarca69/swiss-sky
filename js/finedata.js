// Feindaten (Version 13): Höhen-Abweichung (swissALTIRegio) und Wald (LFI) im Raster CELL/4 (~30 m), Kacheln 256×256 Knoten.
// Format (tools/pipeline/terrain_fine.py, forest_fine.py): 'SSFT'/'SSFW' | u16 Version | u16 TS | u16 NT | u16 Anzahl | f32 K | Anzahl×(u16 ti,u16 tj) | gzip(Kacheln)
// Dateien liegen als Base64-Text vor (data/*.txt), weil der Artifact-Server keine Binärdateien ausliefert; offline als Data-URL.
const OFF=typeof window!=='undefined'&&window.__OFF||null;
export const FINE_SRC={terrain:OFF&&OFF.tfine||'data/terrain_fine.txt',forest:OFF&&OFF.ffine||'data/forest_fine.txt'};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function bytesOf(src){
  let txt;
  if(src.startsWith('data:'))txt=src.slice(src.indexOf(',')+1);
  else{const r=await fetch(src);if(!r.ok)throw new Error(src+' fehlt ('+r.status+')');txt=(await r.text()).trim();
    // grosse Dateien sind in Teile geteilt (Artifact-Server: höchstens 20 MB je Datei): name_2.txt, name_3.txt …
    for(let k=2;k<9;k++){const r2=await fetch(src.replace(/\.txt$/,'_'+k+'.txt'));if(!r2.ok)break;txt+=(await r2.text()).trim();}}
  const bin=atob(txt),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return u8;}
async function gunzip(u8){if(typeof DecompressionStream==='undefined')throw new Error('Browser kann gzip nicht entpacken');
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());}
// Höhen Format 2 (tools/pipeline/fine_pack.py): WebP-Atlanten mit Grauwert c+128; Stufen STEP bis LIM, darüber STEP2
async function loadTerrain2(u8,dv){
  const TS=dv.getUint16(6,true),NT=dv.getUint16(8,true),n=dv.getUint16(10,true),STEP=dv.getFloat32(12,true),LIM=dv.getUint16(16,true),STEP2=dv.getFloat32(18,true),NA=dv.getUint16(22,true),COLS=dv.getUint16(24,true);
  let o=26;const idx=[];for(let k=0;k<n;k++){idx.push([dv.getUint16(o,true),dv.getUint16(o+2,true)]);o+=4;}
  const len=[];for(let a=0;a<NA;a++){len.push(dv.getUint32(o,true));o+=4;}
  const tiles=new Array(NT*NT).fill(null);let k0=0;
  for(let a=0;a<NA;a++){const bm=await createImageBitmap(new Blob([u8.subarray(o,o+len[a])],{type:'image/webp'}),{colorSpaceConversion:'none',premultiplyAlpha:'none'});o+=len[a];
    const cv=document.createElement('canvas');cv.width=bm.width;cv.height=bm.height;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(bm,0,0);bm.close&&bm.close();
    const px=cx.getImageData(0,0,cv.width,cv.height).data,W=cv.width,per=COLS*COLS;
    for(let k=k0;k<Math.min(n,k0+per);k++){const q=k-k0,x0=(q%COLS)*TS,y0=Math.floor(q/COLS)*TS,t=new Uint8Array(TS*TS);
      for(let j=0;j<TS;j++){let si=((y0+j)*W+x0)*4,di=j*TS;for(let i=0;i<TS;i++,si+=4)t[di+i]=px[si];}
      const [ti,tj]=idx[k];tiles[tj*NT+ti]=t;}
    k0+=per;cv.width=cv.height=1;await tick();}
  const lut=new Float32Array(256);for(let u=0;u<256;u++){const c=u-128,a=Math.abs(c);lut[u]=Math.sign(c)*(a<=LIM?a*STEP:LIM*STEP+(a-LIM)*STEP2);}
  return{TS,NT,n,tiles,lut,zero:128,enc:d=>{const a=Math.abs(d);let c=a<=LIM*STEP?Math.round(a/STEP):LIM+Math.round((a-LIM*STEP)/STEP2);c=Math.min(127,c)*Math.sign(d);return c+128;}};}
// Rückgabe: {TS,NT,tiles:Array(NT*NT) mit Uint8Array oder null, lut, zero, enc}
export async function loadFine(kind){
  const u8=await bytesOf(FINE_SRC[kind]),dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  const magic=String.fromCharCode(u8[0],u8[1],u8[2],u8[3]);if(magic!==(kind==='terrain'?'SSFT':'SSFW'))throw new Error('Feindaten: falsches Format '+magic);
  if(kind==='terrain'&&dv.getUint16(4,true)===2)return loadTerrain2(u8,dv);
  const TS=dv.getUint16(6,true),NT=dv.getUint16(8,true),n=dv.getUint16(10,true),K=dv.getFloat32(12,true);let o=16;
  const idx=[];for(let k=0;k<n;k++){idx.push([dv.getUint16(o,true),dv.getUint16(o+2,true)]);o+=4;}
  const raw=await gunzip(u8.subarray(o));const per=kind==='terrain'?TS*TS:TS*TS/4;
  if(raw.length<per*n)throw new Error('Feindaten unvollständig');
  const tiles=new Array(NT*NT).fill(null);
  for(let k=0;k<n;k++){const [ti,tj]=idx[k];let t=raw.subarray(k*per,(k+1)*per);
    if(kind==='terrain'){// Gradienten-Vorhersage zurückrechnen: u = d + links + oben − linksoben (mod 256)
      const u=new Uint8Array(per);
      for(let j=0;j<TS;j++){const r=j*TS;for(let i=0;i<TS;i++){const l=i?u[r+i-1]:0,up=j?u[r-TS+i]:0,ul=i&&j?u[r-TS+i-1]:0;u[r+i]=(t[r+i]+l+up-ul)&255;}}
      t=u;}
    else t=t.slice();
    tiles[tj*NT+ti]=t;if(k%60===59)await tick();}
  if(kind!=='terrain')return{TS,NT,K,tiles,n};
  const lut=new Float32Array(256);for(let u=0;u<256;u++){const c=u<128?u:u-256;lut[u]=Math.sign(c)*(c/K)*(c/K);}
  return{TS,NT,n,tiles,lut,zero:0,enc:d=>Math.max(-127,Math.min(127,Math.round(Math.sign(d)*Math.sqrt(Math.abs(d))*K)))&255};
}
