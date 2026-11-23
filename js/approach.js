// Anflugplaner: Bahn vom Flugzeug bis zur Piste mit echten Kurvenradien, Höhenprofil und Sinkflug-Empfehlungen
import {fromLocal,toLocal,AIRPORTS} from './worldgen.js';
import {APT,wayPath} from './career.js';

const DEG=Math.PI/180,G=9.81;
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// Pisten in der Nähe eines Kartenpunkts (für das Klick-Menü)
export function runwayAt(x,z,tol){let best=null,bd=Infinity;
  for(const A of AIRPORTS){const l=toLocal(A,x,z),ex=Math.max(0,Math.abs(l.along)-A.len/2),d=Math.hypot(ex,Math.max(0,Math.abs(l.across)-A.w/2));if(d<tol&&d<bd){bd=d;best=A;}}
  return best;}
// Anflugmöglichkeiten eines Flugplatzes: geländesichere Richtungen aus der Karriere-Tabelle, sonst beide Richtungen jeder Piste
export function approachOptions(icao){const out=[],seen=new Set();const T=APT[icao];
  if(T)for(const ap of T.app){const A=AIRPORTS.find(a=>a.id===ap[0]);if(!A)continue;const k=A.id+(ap[1]?'r':'f');if(seen.has(k))continue;seen.add(k);
    out.push({A,rev:ap[1],rwy:ap[1]?A.rwyB:A.rwyA,faf:ap[2][0],gs:ap[3]||0.0524,safe:true});}
  for(const A of AIRPORTS.filter(a=>a.icao===icao))for(const rev of [false,true]){const k=A.id+(rev?'r':'f');if(seen.has(k))continue;seen.add(k);
    out.push({A,rev,rwy:rev?A.rwyB:A.rwyA,faf:A.small?1800:A.len>3000?7000:4000,gs:A.small?0.06:0.0524,safe:!T});}
  return out;}

// Bahn planen. F: Flugzustand, P: Flugzeugdaten, opt: Eintrag aus approachOptions
export function planApproach(F,P,opt,S){
  const A=opt.A,s=opt.rev?-1:1,jet=!P.prop,gs=opt.gs;
  const v=Math.max(F.vel.length(),P.Vref*1.45),R=clamp(v*v/(G*Math.tan(25*DEG)),280,4200);
  const cx=s*A.sin,cz=-s*A.cos;// Landerichtung
  const TH=fromLocal(A,-s*A.len/2,0),yTH=A.elev+15;
  const at=d=>{const p=fromLocal(A,-s*(A.len/2+d),0);return{x:p.x,z:p.z};};
  // Endanflugpunkt (FAF) und Eindrehpunkt (IF) weiter draussen, solange das Gelände es erlaubt
  const Dfaf=Math.max(opt.faf,jet?6000:P.mass>8000?3500:1800),yF=yTH+Dfaf*gs;let Dif=Dfaf;
  const want=Dfaf+clamp(v*(jet?28:22),1200,4000);
  for(let d=Dfaf+250;d<=want;d+=250){const p=at(d);let mx=0;for(const o of [-300,0,300])mx=Math.max(mx,S.groundAt(p.x+cz*o,p.z-cx*o));if(mx+(jet?260:180)>yF)break;Dif=d;}
  const FAF={...at(Dfaf),y:yF},IF={...at(Dif),y:yF};
  // Weg bis zum Eindrehpunkt: durch die Täler, falls direkt nicht sicher
  const P0={x:F.pos.x,z:F.pos.z,y:F.pos.y};
  let mids=[];try{const w=wayPath({...P0,y:Math.max(P0.y,S.groundAt(P0.x,P0.z)+200)},{...IF,y:Math.max(IF.y,yF)},S,jet);if(w)mids=w;}catch(e){}
  // von vorne oder von der Seite zu nah am Eindrehpunkt? → Einflugpunkt weiter draussen und seitlich (Basisteil)
  const last=mids.length?mids[mids.length-1]:P0,ra=(last.x-IF.x)*cx+(last.z-IF.z)*cz,rb=(last.x-IF.x)*(-cz)+(last.z-IF.z)*cx;
  if(ra>-2*R){const side=rb>=0?1:-1,J={x:IF.x-cx*2.6*R+(-cz)*side*2.2*R,z:IF.z-cz*2.6*R+cx*side*2.2*R};let ok=true;
    for(let k=1;k<=20;k++){const u=k/20,x=IF.x+(J.x-IF.x)*u,z=IF.z+(J.z-IF.z)*u;if(S.groundAt(x,z)+(jet?250:170)>yF+Math.hypot(J.x-IF.x,J.z-IF.z)*u*0.05)ok=false;}
    if(ok)mids.push({...J,y:yF});}
  const W=[P0,...mids,IF,FAF,{x:TH.x,z:TH.z,y:yTH}];
  // Bahn abfliegen wie ein Flugmanagement-System: Kurven mit Radius R, Vorhalt beim Leg-Wechsel, Rückkehr auf die Linie
  const ds=40,pts=[];let x=P0.x,z=P0.z,h=Math.atan2(F.vel.x,F.vel.z);if(F.vel.length()<5){h=Math.atan2(IF.x-x,IF.z-z);}
  let cur=1,sum=0,iIF=-1,iFAF=-1;pts.push({x,z,s:0});
  for(let n=0;n<8000;n++){const a=W[cur-1],b=W[cur],lx=b.x-a.x,lz=b.z-a.z,ll=Math.hypot(lx,lz)||1,ux=lx/ll,uz=lz/ll,crs=Math.atan2(ux,uz);
    const dtg=(b.x-x)*ux+(b.z-z)*uz,xt=(x-a.x)*uz-(z-a.z)*ux;
    if(cur<W.length-1){const c2=W[cur+1],c2c=Math.atan2(c2.x-b.x,c2.z-b.z),dl=Math.abs(wrap(c2c-crs)),lead=Math.min(R*Math.tan(Math.min(dl,2.6)/2),Math.hypot(c2.x-b.x,c2.z-b.z)*0.9);
      if(dtg<=lead||Math.hypot(b.x-x,b.z-z)<ds){if(W[cur]===IF)iIF=pts.length-1;if(W[cur]===FAF)iFAF=pts.length-1;cur++;continue;}}
    else if(dtg<=0)break;
    let des;if(cur===1)des=Math.atan2(b.x-x,b.z-z);else des=crs-clamp(xt/(R*0.9),-0.8,0.8);
    const e=wrap(des-h),mx=ds/R;h+=clamp(e,-mx,mx);x+=Math.sin(h)*ds;z+=Math.cos(h)*ds;sum+=ds;pts.push({x,z,s:sum});}
  if(iIF<0)iIF=Math.max(0,pts.length-Math.ceil((Dif)/ds));if(iFAF<0)iFAF=Math.max(0,pts.length-Math.ceil(Dfaf/ds));
  const L=sum,sIF=pts[iIF].s,sFAF=pts[iFAF].s;
  // Höhenprofil wie ein Flugmanagement-System: gleichmässig steigen auf eine Reiseflughöhe, diese halten,
  // rechtzeitig mit 3° sinken bis zum Eindrehpunkt, Endanflug auf dem Gleitpfad. Gelände nur als untere Grenze –
  // im Steigflug nie wieder runter, im Sinkflug nie wieder rauf (kein Auf und Ab).
  const gd=0.0524,gc=jet?0.065:P.mass>8000?0.055:0.05,marg=jet?300:220,y0=F.pos.y,nI=Math.max(1,iIF);
  const ys=pts.map(p=>p.s<sFAF?S.groundAt(p.x,p.z)+(p.s<sIF?marg:marg*0.6):-1e9);
  let terr=-1e9;for(let i=0;i<nI;i++)terr=Math.max(terr,ys[i]);
  const dist=sIF;let cr=jet?Math.min(9000,1800+0.026*dist):Math.min(P.mass>8000?6000:4200,900+0.014*dist);
  const fit=(0.7*dist+y0/gc+yF/gd)/(1/gc+1/gd);cr=Math.min(cr,fit);
  cr=Math.max(cr,terr,yF+150,Math.min(y0,jet?11000:6000));cr=Math.ceil(cr/150)*150;
  for(const p of pts){const toTH=L-p.s;
    if(p.s>=sFAF)p.y=yTH+toTH*gs;else if(p.s>=sIF)p.y=yF;else p.y=Math.min(y0+p.s*gc,cr,yF+(sIF-p.s)*gd);}
  let iTop=0;for(let i=0;i<nI;i++)if(pts[i].y>pts[iTop].y+0.01)iTop=i;
  {let m=-1e9;for(let i=0;i<=iTop;i++){m=Math.max(m,ys[i]);if(pts[i].y<m)pts[i].y=m;}}
  {let m=-1e9;for(let i=Math.min(iFAF,pts.length-1);i>iTop;i--){m=Math.max(m,ys[i]);if(pts[i].y<m)pts[i].y=m;}}
  let iTOD=-1;for(let i=iTop;i<iFAF;i++){if(pts[i].y<pts[iTop].y-5){iTOD=Math.max(0,i-1);break;}}
  let climb=false;for(let i=0;i<iIF;i++)if(pts[i].y>y0+60){climb=true;break;}
  // Kurven für die Anzeige (Richtung, Beginn)
  const turns=[];{let acc=0,st=-1;for(let i=2;i<pts.length;i++){const h1=Math.atan2(pts[i-1].x-pts[i-2].x,pts[i-1].z-pts[i-2].z),h2=Math.atan2(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z),d=wrap(h2-h1);
    if(Math.abs(d)>0.004){if(st<0){st=i-1;acc=0;}acc+=d;}else if(st>=0){if(Math.abs(acc)>12*DEG)turns.push({i:st,j:i-1,deg:acc/DEG});st=-1;}}if(st>=0&&Math.abs(acc)>12*DEG)turns.push({i:st,j:pts.length-1,deg:acc/DEG});}
  const name=A.name,rwy=opt.rwy;
  return{pts,L,iIF,iFAF,iTOD,iTop,cr:pts[iTop].y,sIF,sFAF,yF,yTH,gs,R,v,A,rev:opt.rev,rwy,name,turns,climb,TH,hdgFinal:((Math.atan2(cx,-cz)/DEG)+360)%360,last:0,made:performance.now()};}

// Führung für den aktuellen Moment
export function approachGuide(pl,F,P){
  const pts=pl.pts,n=pts.length;let i0=Math.max(0,pl.last-30),i1=Math.min(n-1,pl.last+400),bi=pl.last,bd=Infinity;
  for(let i=i0;i<=i1;i++){const d=Math.hypot(pts[i].x-F.pos.x,pts[i].z-F.pos.z);if(d<bd){bd=d;bi=i;}}
  if(bd>3000){for(let i=0;i<n;i+=4){const d=Math.hypot(pts[i].x-F.pos.x,pts[i].z-F.pos.z);if(d<bd){bd=d;bi=i;}}}
  pl.last=bi;const p=pts[bi],q=pts[Math.min(n-1,bi+1)],hx=q.x-p.x,hz=q.z-p.z,hl=Math.hypot(hx,hz)||1;
  const xt=((F.pos.x-p.x)*hz-(F.pos.z-p.z)*hx)/hl;// >0: Flugzeug links der Bahn (Bahn liegt rechts)
  const toGo=pl.L-p.s,dy=F.pos.y-p.y,V=Math.max(30,Math.hypot(F.vel.x,F.vel.z));
  const lines=[];let phase;
  if(bi>=pl.iFAF)phase='final';else if(bi>=pl.iIF)phase='if';else phase='route';
  // Höhe / Sinkflug
  const vsRec=V*(phase==='final'?pl.gs:0.0524);
  if(phase==='route'&&bi<pl.iTop)lines.push(`Steigen auf Reiseflughöhe ${Math.round(pl.cr)} m`);
  else if(phase!=='final'&&pl.iTOD>bi){const d=pts[pl.iTOD].s-p.s;lines.push(d>400?`Reiseflughöhe ${Math.round(pl.cr)} m halten · Sinkflug in ${(d/1000).toFixed(d>20000?0:1)} km`:'Jetzt Sinkflug beginnen');}
  else if(phase==='route'&&pts[Math.min(n-1,bi+25)].y<p.y-5)lines.push(`Sinken ca. ${vsRec.toFixed(1)} m/s · Ziel ${Math.round(pl.yF)} m am Eindrehpunkt`);
  if(phase==='final')lines.push(Math.abs(dy)<25?'Auf dem Gleitpfad':dy>0?`${Math.round(dy)} m zu hoch – etwas mehr sinken`:`${Math.round(-dy)} m zu tief – flacher sinken`);
  else if(Math.abs(dy)>80)lines.push(dy>0?`${Math.round(dy)} m über der Bahn`:`${Math.round(-dy)} m unter der Bahn`);
  // Kurven
  const nt=pl.turns.find(t=>t.j>bi);
  if(nt){if(nt.i<=bi)lines.push(`${nt.deg<0?'Linkskurve':'Rechtskurve'} · Querlage ca. ${Math.round(Math.min(30,Math.atan(V*V/(G*pl.R))/DEG))}°`);
    else{const d=pts[nt.i].s-p.s;if(d<350)lines.push(`Jetzt ${nt.deg<0?'Linkskurve':'Rechtskurve'} (${Math.round(Math.abs(nt.deg))}°)`);else if(d<6000)lines.push(`${nt.deg<0?'Linkskurve':'Rechtskurve'} in ${(d/1000).toFixed(1)} km (${Math.round(Math.abs(nt.deg))}°)`);}}
  if(Math.abs(xt)>250)lines.push(`Bahn ${Math.round(Math.abs(xt))} m ${xt>0?'rechts':'links'} von dir`);
  if(phase!=='route'&&!P.fixedGear&&F.gearPos<0.5)lines.push('Fahrwerk ausfahren (G)');
  if(phase!=='route'&&F.flaps<1)lines.push('Klappen setzen (F)');
  return{bi,xt,toGo,dy,phase,lines,vsRec,p};}
