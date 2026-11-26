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

// Kürzeste Bahn mit Mindestradius R von (x0,z0,Kurs h0) nach (x1,z1,Kurs h1) – Dubins: Kurve·Gerade·Kurve oder drei Kurven.
// So kommt der Anflug immer genau auf der verlängerten Pistenachse und mit Pistenkurs an (vorher: bis 4 km daneben).
// Kurs h wie im Spiel: Richtung (sin h, cos h) in (x, z). Rückgabe: Punkte im Abstand ds (ohne Startpunkt).
const M2=a=>{a%=2*Math.PI;return a<0?a+2*Math.PI:a;};
export function dubins(x0,z0,h0,x1,z1,h1,R,ds){
  const t0=Math.PI/2-h0,t1=Math.PI/2-h1,dx=(x1-x0)/R,dy=(z1-z0)/R,d=Math.hypot(dx,dy),ph=Math.atan2(dy,dx),a=M2(t0-ph),b=M2(t1-ph);
  const sa=Math.sin(a),sb=Math.sin(b),ca=Math.cos(a),cb=Math.cos(b),cab=Math.cos(a-b),W=[];
  {const p2=2+d*d-2*cab+2*d*(sa-sb);if(p2>=0){const t1_=Math.atan2(cb-ca,d+sa-sb);W.push(['LSL',M2(-a+t1_),Math.sqrt(p2),M2(b-t1_)]);}}
  {const p2=2+d*d-2*cab+2*d*(sb-sa);if(p2>=0){const t1_=Math.atan2(ca-cb,d-sa+sb);W.push(['RSR',M2(a-t1_),Math.sqrt(p2),M2(-b+t1_)]);}}
  {const p2=-2+d*d+2*cab+2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t2=Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,p);W.push(['LSR',M2(-a+t2),p,M2(-M2(b)+t2)]);}}
  {const p2=d*d-2+2*cab-2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t2=Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,p);W.push(['RSL',M2(a-t2),p,M2(b-t2)]);}}
  {const tm=(6-d*d+2*cab+2*d*(sa-sb))/8;if(Math.abs(tm)<=1){const p=M2(2*Math.PI-Math.acos(tm)),t=M2(a-Math.atan2(ca-cb,d-sa+sb)+p/2);W.push(['RLR',t,p,M2(a-b-t+p)]);}}
  {const tm=(6-d*d+2*cab+2*d*(-sa+sb))/8;if(Math.abs(tm)<=1){const p=M2(2*Math.PI-Math.acos(tm)),t=M2(-a-Math.atan2(ca-cb,d+sa-sb)+p/2);W.push(['LRL',t,p,M2(M2(b)-a-t+p)]);}}
  if(!W.length)return null;W.sort((u,v)=>(u[1]+u[2]+u[3])-(v[1]+v[2]+v[3]));const [w,...L]=W[0];
  let X=x0,Y=z0,T=t0;const out=[];
  for(let k=0;k<3;k++){const ty=w[k],len=L[k]*R,n=Math.max(1,Math.ceil(len/ds));
    for(let i=1;i<=n;i++){const sl=len*i/n;let x,y;
      if(ty==='S'){x=X+Math.cos(T)*sl;y=Y+Math.sin(T)*sl;}
      else if(ty==='L'){x=X+R*(Math.sin(T+sl/R)-Math.sin(T));y=Y-R*(Math.cos(T+sl/R)-Math.cos(T));}
      else{x=X-R*(Math.sin(T-sl/R)-Math.sin(T));y=Y+R*(Math.cos(T-sl/R)-Math.cos(T));}
      out.push({x,z:y});}
    if(ty==='S'){X+=Math.cos(T)*len;Y+=Math.sin(T)*len;}
    else if(ty==='L'){X+=R*(Math.sin(T+len/R)-Math.sin(T));Y-=R*(Math.cos(T+len/R)-Math.cos(T));T+=len/R;}
    else{X-=R*(Math.sin(T-len/R)-Math.sin(T));Y+=R*(Math.cos(T-len/R)-Math.cos(T));T-=len/R;}}
  return out;}

// Bahn planen. F: Flugzustand, P: Flugzeugdaten, opt: Eintrag aus approachOptions
// Wie steil muss der Endanflug auf diese Piste sein? (gleiche Regel wie im Planer: Gleitpfad überall über dem Gelände)
// → {deg, D} mit dem flachsten möglichen Gleitwinkel; deg > 3.5 heisst: für Jets ein steiler Bergflugplatz-Anflug
export function finalSlope(A,rev,S,jet){const s=rev?-1:1,yTH=A.elev+15,at=d=>fromLocal(A,-s*(A.len/2+d),0);
  const ok=(D,g)=>{for(let d=600;d<=D;d+=100){const p=at(d);if(S.groundAt(p.x,p.z)+(d>D-300?60:25)>yTH+d*g)return false;}return true;};
  const D0=jet?6000:1800,Dmin=jet?1500:800;
  for(const g of [0.0524,0.06,0.07,0.085,0.1,0.12])for(let D=D0;D>=Dmin;D-=250)if(ok(D,g))return{deg:Math.atan(g)/Math.PI*180,D};
  return{deg:99,D:Dmin};}
export function planApproach(F,P,opt,S){
  const A=opt.A,s=opt.rev?-1:1,jet=!P.prop;
  const cx=s*A.sin,cz=-s*A.cos;// Landerichtung
  const TH=fromLocal(A,-s*A.len/2,0),yTH=A.elev+15;
  const at=d=>{const p=fromLocal(A,-s*(A.len/2+d),0);return{x:p.x,z:p.z};};
  const P0={x:F.pos.x,z:F.pos.z,y:F.pos.y};
  // Endanflug: Gleitpfad darf nirgends ins Gelände; sonst kürzer und steiler (bis 5,7° wie in Lugano oder Samedan)
  let Dfaf=Math.max(opt.faf,jet?6000:P.mass>8000?3500:1800),gs=opt.gs;
  const finOK=(D,g)=>{for(let d=600;d<=D;d+=100){const p=at(d);if(S.groundAt(p.x,p.z)+(d>D-300?60:25)>yTH+d*g)return false;}return true;};
  if(!finOK(Dfaf,gs)){let found=false;
    const Dmin=jet?1500:800,gmax=jet?[gs,0.07,0.085,0.1]:[gs,0.07,0.085,0.1,0.12];
    for(const g of gmax)for(let D=Dfaf;D>=Dmin&&!found;D-=100)if(finOK(D,g)){Dfaf=D;gs=g;found=true;}
    if(!found){Dfaf=Dmin;gs=gmax[gmax.length-1];}}
  const yF=yTH+Dfaf*gs;
  const FAF={...at(Dfaf),y:yF};
  const v0=Math.max(F.vel.length(),P.Vref*1.45),vSlow=P.Vref*1.3;
  // Varianten wie ein Fluglehrer sie im Gebirge plant, der Reihe nach probiert – die erste sichere gewinnt:
  // normale Kurven bei Reisetempo, dann enge Kurven bei Anfluggeschwindigkeit; Eindrehpunkt nah (auf Gleitpfadhöhe) oder weit draussen (höher);
  // Basisteil links/rechts, Volte im Tal, schräger Zwischenanflug durch das Tal.
  const marg=jet?150:120;let best=null,tries=0;
  // Endanflug muss wirklich über die ganze Länge FAF→Schwelle geflogen werden (sonst kam die Bahn von der falschen Seite und hat IF/FAF übersprungen)
  const judge=pl=>{let pre=1e9,fin=1e9;pl.pts.forEach((q,i)=>{const c=q.y-S.groundAt(q.x,q.z);if(i<pl.iFAF)pre=Math.min(pre,c);else if(pl.L-q.s>600||Math.hypot(q.x-TH.x,q.z-TH.z)>600)fin=Math.min(fin,c);});
    const finLen=pl.L-pl.sFAF;if(finLen<Dfaf*0.8)fin=Math.min(fin,-200-(Dfaf*0.8-finLen));
    pl.clear=Math.min(pre-marg,fin-20,(0.1-(pl.steep||0))*3000);pl.ok=pl.clear>=0;pl.score=pl.ok?1e7-pl.L:pl.clear*1000;return pl;};
  const routes=new Map(),route=T=>{const k=Math.round(T.x)+','+Math.round(T.z);if(routes.has(k))return routes.get(k);let w=[];try{w=wayPath({...P0,y:Math.max(P0.y,S.groundAt(P0.x,P0.z)+200)},{...T},S,jet)||[];}catch(e){}routes.set(k,w);return w;};
  const tryC=c=>{tries++;let pl;try{pl=fly(c);}catch(e){return false;}if(!pl)return false;pl.steep=c.steep;pl.ang=c.ang||0;judge(pl);if(!best||pl.score>best.score)best=pl;return pl.ok;};
  const mkIF=(R,th,len,lat)=>{const c=Math.cos(th*DEG),sn=Math.sin(th*DEG),bx=-(cx*c-(-cz)*sn),bz=-(cz*c-cx*sn);// Richtung vom FAF nach aussen
    let yI=yF+len*gs;for(let d=0;d<=len;d+=120){const x=FAF.x+bx*d,z=FAF.z+bz*d;let mx=0;for(const o of [-lat,0,lat])mx=Math.max(mx,S.groundAt(x+(-bz)*o,z+bx*o));yI=Math.max(yI,mx+(jet?260:170)+(len-d)*0.02-(d<300?60:0));}
    return{x:FAF.x+bx*len,z:FAF.z+bz*len,y:yI,th,len};};
  outer:for(const [v,bank] of [[v0,25],[vSlow,30]]){
    const R=clamp(v*v/(G*Math.tan(bank*DEG)),220,4200);
    // a) nah: so weit hinaus, wie das Gelände auf Gleitpfadhöhe erlaubt
    let Da=Dfaf;const want=Dfaf+clamp(v*(jet?28:22),1200,4000);
    for(let d=Dfaf+250;d<=want;d+=250){const p=at(d);let mx=0;for(const o of [-300,0,300])mx=Math.max(mx,S.groundAt(p.x+cz*o,p.z-cx*o));if(mx+(jet?260:180)>yF)break;Da=d;}
    const IFa={...at(Da),y:yF};
    // b) weit: genug Gerade vor dem FAF, dafür höher
    const Lb=clamp(1.8*R,1500,5000),IFb=mkIF(R,0,Lb,250),stb=(IFb.y-yF)/Lb;
    for(const [IF,Dif,steep] of [[IFa,Da,0],[{x:IFb.x,z:IFb.z,y:IFb.y},Dfaf+Lb,stb]]){if(steep>0.1)continue;const yIF=IF.y,mids=route(IF);
      const base=(back,lat,side)=>({x:IF.x-cx*back*R+(-cz)*side*lat*R,z:IF.z-cz*back*R+cx*side*lat*R,y:yIF});
      if(tryC({W:[P0,...mids,IF,FAF],R,v,Dif,IF,yIF,steep}))break outer;
      for(const side of [1,-1])for(const [b,l] of [[2.6,2.2],[1.6,1.3],[4,1.4]])if(tryC({W:[P0,...mids,base(b,l,side),IF,FAF],R,v,Dif,IF,yIF,steep}))break outer;
      // Volte im Tal: über die Piste, Gegenanflug parallel (Abstand 2R), dann 180°-Kurve auf den Endanflug
      for(const side of [1,-1]){const off=2.05*R,ab=(d,o)=>({x:TH.x-cx*d+(-cz)*side*o,z:TH.z-cz*d+cx*side*o,y:yIF});
        const D1=ab(-A.len,off),D2=ab(Dif+R*0.6,off);if(tryC({W:[P0,...route(D1),D1,D2,IF,FAF],R,v,Dif,IF,yIF,steep,volte:side}))break outer;}}
    // c) schräger Zwischenanflug: Fächer ±120° und drei Längen, die zwei tiefsten fliegbaren
    const fan=[];for(let th=-120;th<=120;th+=10)if(th)for(const f of [0.8,1.2,1.8]){const len=Math.max(R*f,700),I2=mkIF(R,th,len,150),st=(I2.y-yF)/len;if(st<=0.1&&Math.abs(th)*DEG*R*0.5<Dfaf+200)fan.push({I2,st,sc:I2.y+Math.abs(th)*0.4});}
    fan.sort((a,b)=>a.sc-b.sc);
    for(const f of fan.slice(0,2)){const I={x:f.I2.x,z:f.I2.z,y:f.I2.y};if(tryC({W:[P0,...route(I),I,FAF],R,v,Dif:Dfaf+f.I2.len,IF:I,yIF:I.y,steep:f.st,ang:f.I2.th}))break outer;}}
  if(best){best.unsafe=!best.ok;best.tries=tries;}
  return best;

  function fly({W:W0,R,v,Dif,IF,yIF}){
  // Bahn abfliegen wie ein Flugmanagement-System: Kurven mit Radius R, Vorhalt beim Leg-Wechsel, Rückkehr auf die Linie –
  // bis zum letzten Punkt vor der Pistenachse; dann eine Dubins-Kurve, die genau auf der Achse mit Pistenkurs ankommt,
  // und ab dort exakt auf der verlängerten Mittellinie bis zur Schwelle.
    const onCL=p=>{const l=toLocal(A,p.x,p.z);return Math.abs(l.across)<5&&-s*l.along>A.len/2-1;};
    let jI=W0.findIndex((p,i)=>i>0&&onCL(p));if(jI<0)jI=W0.length-1;const J=W0[jI],W=W0.slice(0,jI);
    const crsF=Math.atan2(cx,cz),dTH=p=>Math.hypot(p.x-TH.x,p.z-TH.z);
    const ds=40,pts=[];let x=P0.x,z=P0.z,h=Math.atan2(F.vel.x,F.vel.z);if(F.vel.length()<5){h=Math.atan2(J.x-x,J.z-z);}
    let cur=1,sum=0,iIF=-1,iFAF=-1;pts.push({x,z,s:0});
    for(let n=0;n<8000&&cur<W.length;n++){const a=W[cur-1],b=W[cur],lx=b.x-a.x,lz=b.z-a.z,ll=Math.hypot(lx,lz)||1,ux=lx/ll,uz=lz/ll,crs=Math.atan2(ux,uz);
      const dtg=(b.x-x)*ux+(b.z-z)*uz,xt=(x-a.x)*uz-(z-a.z)*ux;
      const nx=cur<W.length-1?W[cur+1]:J,c2c=Math.atan2(nx.x-b.x,nx.z-b.z),dl=Math.abs(wrap(c2c-crs)),lead=Math.min(R*Math.tan(Math.min(dl,2.6)/2),Math.hypot(nx.x-b.x,nx.z-b.z)*0.9);
      // Wegpunkt erst abhaken, wenn man in seiner Nähe ist – sonst würde eine Bahn von der falschen Seite Punkte überspringen
      const dB=Math.hypot(b.x-x,b.z-z);if((dtg<=lead&&dB<lead+2.5*R)||dB<ds){if(W[cur]===IF)iIF=pts.length-1;cur++;continue;}
      let des;if(cur===1||dtg<0||Math.abs(xt)>3*R)des=Math.atan2(b.x-x,b.z-z);else des=crs-clamp(xt/(R*0.9),-0.8,0.8);
      const e=wrap(des-h),mx=ds/R;h+=clamp(e,-mx,mx);x+=Math.sin(h)*ds;z+=Math.cos(h)*ds;sum+=ds;pts.push({x,z,s:sum});}
    // Eindrehen: Dubins bis J (auf der Achse, Pistenkurs)
    const dub=dubins(x,z,h,J.x,J.z,crsF,R,ds);if(!dub)return null;
    for(const q of dub){sum+=Math.hypot(q.x-x,q.z-z);x=q.x;z=q.z;pts.push({x,z,s:sum});}
    if(J===IF||iIF<0)iIF=pts.length-1;if(J===FAF)iFAF=pts.length-1;
    // Endanflug: exakt auf der verlängerten Mittellinie (Abstände von der Schwelle)
    for(let d=dTH(J)-ds;d>0;d-=ds){const q=at(d);sum+=Math.hypot(q.x-x,q.z-z);x=q.x;z=q.z;if(iFAF<0&&d<=Dfaf+1e-6)iFAF=pts.length;pts.push({x,z,s:sum});}
    sum+=Math.hypot(TH.x-x,TH.z-z);x=TH.x;z=TH.z;pts.push({x,z,s:sum});
    if(iIF<0)iIF=Math.max(0,pts.length-Math.ceil((Dif)/ds));if(iFAF<0)iFAF=Math.max(0,pts.length-Math.ceil(Dfaf/ds));
    const L=sum,sIF=pts[iIF].s,sFAF=pts[iFAF].s;
    // Höhenprofil wie ein Flugmanagement-System: gleichmässig steigen auf eine Reiseflughöhe, diese halten,
    // rechtzeitig mit 3° sinken bis zum Eindrehpunkt, Endanflug auf dem Gleitpfad. Gelände nur als untere Grenze –
    // im Steigflug nie wieder runter, im Sinkflug nie wieder rauf (kein Auf und Ab).
    const gd=0.0524,gc=jet?0.065:P.mass>8000?0.055:0.05,marg=jet?300:220,y0=F.pos.y,nI=Math.max(1,iIF);
    const ys=pts.map(p=>p.s<sFAF?S.groundAt(p.x,p.z)+(p.s<sIF?marg:marg*0.6):-1e9);
    let terr=-1e9;for(let i=0;i<nI;i++)terr=Math.max(terr,ys[i]);
    const dist=sIF;let cr=jet?Math.min(9000,1800+0.026*dist):Math.min(P.mass>8000?6000:4200,900+0.014*dist);
    const fit=(0.7*dist+y0/gc+yIF/gd)/(1/gc+1/gd);cr=Math.min(cr,fit);
    cr=Math.max(cr,terr,yIF+150,Math.min(y0,jet?11000:6000));cr=Math.ceil(cr/150)*150;
    for(const p of pts){const toTH=L-p.s;
      if(p.s>=sFAF)p.y=yTH+toTH*gs;else if(p.s>=sIF)p.y=yIF+(yF-yIF)*(p.s-sIF)/Math.max(1,sFAF-sIF);else p.y=Math.min(y0+p.s*gc,cr,yIF+(sIF-p.s)*gd);}
    let iTop=0;for(let i=0;i<nI;i++)if(pts[i].y>pts[iTop].y+0.01)iTop=i;
    {let m=-1e9;for(let i=0;i<=iTop;i++){m=Math.max(m,ys[i]);if(pts[i].y<m)pts[i].y=m;}}
    {let m=-1e9;for(let i=Math.min(iFAF,pts.length-1);i>iTop;i--){m=Math.max(m,ys[i]);if(pts[i].y<m)pts[i].y=m;}}
    let iTOD=-1;for(let i=iTop;i<iFAF;i++){if(pts[i].y<pts[iTop].y-5){iTOD=Math.max(0,i-1);break;}}
    let climb=false;for(let i=0;i<iIF;i++)if(pts[i].y>y0+60){climb=true;break;}
    // Kurven für die Anzeige (Richtung, Beginn)
    const turns=[];{let acc=0,st=-1;for(let i=2;i<pts.length;i++){const h1=Math.atan2(pts[i-1].x-pts[i-2].x,pts[i-1].z-pts[i-2].z),h2=Math.atan2(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z),d=wrap(h2-h1);
      if(Math.abs(d)>0.004){if(st<0){st=i-1;acc=0;}acc+=d;}else if(st>=0){if(Math.abs(acc)>12*DEG)turns.push({i:st,j:i-1,deg:acc/DEG});st=-1;}}if(st>=0&&Math.abs(acc)>12*DEG)turns.push({i:st,j:pts.length-1,deg:acc/DEG});}
    const name=A.name,rwy=opt.rwy;
    return{pts,L,iIF,iFAF,iTOD,iTop,cr:pts[iTop].y,sIF,sFAF,yF,yIF,yTH,gs,R,v,A,rev:opt.rev,rwy,name,turns,climb,TH,hdgFinal:((Math.atan2(cx,-cz)/DEG)+360)%360,last:0,made:performance.now()};}
}

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
