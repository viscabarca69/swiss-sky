// Karriere: Geld, Flotte, Aufträge, Tagesaufgabe, Abzeichen, Rekorde, Teilen-Code
import {APM,fromLocal,toXZ,AREA_ID,HALF} from './worldgen.js';
const BO=AREA_ID==='bo',CH=AREA_ID==='ch';

export const PRICE={alpina:0,saentis:25000,segler:40000,titlis:60000,foehn:120000,feuer:180000,rega:450000,l320:300000,l330:500000,l340:600000,l346:680000,l350:700000,l380:1000000,l32n:380000,l747:850000};
const BASEPAY={alpina:1500,saentis:2500,titlis:4000,foehn:8000,feuer:7000,l320:18000,l330:28000,l340:30000,l346:34000,l350:38000,l380:55000,l32n:19500,l747:46000};
const MINRWY={alpina:0,saentis:0,titlis:650,foehn:1100,feuer:900,l320:BO||CH?1700:2000,l32n:BO||CH?1700:2000,l330:2400};
// Linienflugzeuge nur auf echten Linienflughäfen
const ONLY={};
export const NOJOB=['segler','rega'];
export const WIDE=['l340','l346','l350','l747','l380'];
export const fmtCHF=n=>(n<0?'– ':'')+'CHF '+Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,"'");
export const ORDER=['alpina','saentis','segler','titlis','foehn','feuer','rega','l320','l32n','l330','l340','l346','l350','l747','l380'];

// Flugplätze: Anflug [Piste, rev, Distanzen, Gleitpfad] und Abflug [Piste, rev]
const APT_ZS={
  LSZH:{name:'Zürich',app:[['ZRH14',false,[8000,5000,2500,900]],['ZRH16',true,[7000,4000,1800,700]]],dep:[['ZRH16',false],['ZRH10',true]]},
  LSME:{name:'Emmen',app:[['EMM',true,[4000,2500,1000]]],dep:[['EMM',true],['EMM',false]]},
  LSZC:{name:'Buochs',app:[['BUO',true,[3500,1600,700]]],dep:[['BUO',false],['BUO',true]]},
  LSMA:{name:'Alpnach',app:[['ALP',true,[1800,800],0.075]],dep:[['ALP',true]]},
  LSZF:{name:'Birrfeld',app:[['BIR',false,[1300,600],0.06]],dep:[['BIR',false]]},
  LSZN:{name:'Hausen am Albis',app:[['HAU',false,[1300,600],0.06]],dep:[['HAU',false]]}};
const APT_BO={
  LSZB:{name:'Bern',app:[['BRN',false,[4000,2200,900]],['BRN',true,[4000,2200,900]]],dep:[['BRN',false],['BRN',true]]},
  LSMI:{name:'Interlaken',app:[['INT',true,[3000,1400,600],0.06]],dep:[['INT',false],['INT',true]]},
  LSMM:{name:'Meiringen',app:[['MEI',false,[3000,1400,600],0.06],['MEI',true,[2500,1200,500],0.06]],dep:[['MEI',false],['MEI',true]]},
  LSGR:{name:'Reichenbach',app:[['REI',false,[1800,800],0.075],['REI',true,[1800,800],0.075]],dep:[['REI',false],['REI',true]]},
  LSTA:{name:'Raron',app:[['RAR',false,[2500,1200,500],0.06],['RAR',true,[2500,1200,500],0.06]],dep:[['RAR',false],['RAR',true]]}};
const APT_NEW={
  LSGS:{name:'Sion',app:[['SIO',true,[6000,3500,1500,600]],['SIO',false,[5000,3000,1300,600]]],dep:[['SIO',false],['SIO',true]]},
  LSZG:{name:'Grenchen',app:[['GRE',false,[2500,1200,500],0.06],['GRE',true,[2500,1200,500],0.06]],dep:[['GRE',false],['GRE',true]]},
  LSGG:{name:'Genf',app:[['GVA',false,[8000,5000,2500,1000]],['GVA',true,[8000,5000,2500,1000]]],dep:[['GVA',false],['GVA',true]]},
  LFSB:{name:'Basel-Mulhouse',app:[['BSL',false,[8000,5000,2500,1000]],['BSL',true,[8000,5000,2500,1000]]],dep:[['BSL',false],['BSL',true]]},
  LSZA:{name:'Lugano',app:[['LUG',false,[3000,1500,600],0.07]],dep:[['LUG',false],['LUG',true]]},
  LSZR:{name:'St. Gallen-Altenrhein',app:[['ACH',false,[2500,1200,500],0.06],['ACH',true,[2500,1200,500],0.06]],dep:[['ACH',false],['ACH',true]]},
  LSZS:{name:'Samedan',app:[['SMV',false,[3000,1400,600],0.06],['SMV',true,[3000,1400,600],0.06]],dep:[['SMV',false],['SMV',true]]},
  LSMP:{name:'Payerne',app:[['PAY',false,[4000,2200,900]],['PAY',true,[4000,2200,900]]],dep:[['PAY',false],['PAY',true]]}};
export const APT=CH?{...APT_ZS,...APT_BO,...APT_NEW}:BO?APT_BO:APT_ZS;
const SIGHTS_ZS=[['Rigi Kulm',47.0567,8.4853,260],['Pilatus',46.9792,8.2525,280],['Bürgenstock',46.996,8.38,220],['Stanserhorn',46.929,8.34,240],['Luzern Seebecken',47.052,8.31,200],
  ['Zuger Altstadt',47.166,8.515,200],['Uetliberg',47.349,8.491,220],['Zürcher Altstadt',47.371,8.543,260],['Schloss Lenzburg',47.385,8.18,200],['Schloss Habsburg',47.462,8.183,200],
  ['Hallwilersee',47.28,8.215,180],['Mythen',47.031,8.677,260],['Rütli',46.968,8.59,220],['Türlersee',47.272,8.5,180]];
const SIGHTS_BO=[['Schloss Thun',46.759,7.630,200],['Schloss Spiez',46.686,7.683,180],['Schloss Oberhofen',46.731,7.669,180],['Harder Kulm',46.697,7.851,250],['Giessbachfälle',46.735,8.02,250],
  ['Staubbachfall',46.594,7.907,320],['Bundeshaus',46.9466,7.444,250],['Niesen',46.645,7.651,260],['Grindelwald',46.624,8.036,320],['Brienz',46.754,8.038,200],['Aareschlucht',46.718,8.215,280],['Stockhorn',46.693,7.540,260]];
const SIGHTS=CH?[...SIGHTS_ZS,...SIGHTS_BO,['Schloss Burgdorf',47.0565,7.6155,200],['Altstadt Solothurn',47.2075,7.537,220],['Napf',47.004,7.94,260],['Weissenstein',47.255,7.508,260],['Titlis',46.772,8.437,300],['Schloss Tourbillon',46.2365,7.3655,250],
  ['Jet d’Eau',46.2074,6.1557,220],['Château de Chillon',46.4142,6.9275,200],['Lavaux',46.49,6.74,260],['Creux du Van',46.932,6.725,260],['Matterhorn',45.9763,7.6586,320],['Zermatt',46.0207,7.7491,240],
  ['Rheinfall',47.6779,8.6153,220],['Basler Münster',47.5565,7.5925,200],['Säntis',47.2494,9.3433,280],['St. Moritz',46.4983,9.839,240],['Landwasserviadukt',46.6806,9.6755,220],
  ['Morteratschgletscher',46.42,9.935,300],['Castelgrande Bellinzona',46.1935,9.0217,200],['Monte San Salvatore',45.977,8.946,240],['Schloss Vaduz',47.1395,9.5245,200]]:BO?SIGHTS_BO:SIGHTS_ZS;
const FAR=['New York','Singapur','Tokio','São Paulo','Dubai','Montreal','Bangkok','Johannesburg','San Francisco','Hongkong'];

// Zufall mit Startwert
export function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const pick=(r,a)=>a[Math.floor(r()*a.length)%a.length];
const hashStr=str=>{let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const todayKey=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

const apDist=(a,b)=>{const A=APM[APT[a].app[0][0]],B=APM[APT[b].app[0][0]];return Math.hypot(A.x-B.x,A.z-B.z);};
export const canUse=(plane,icao)=>{if(WIDE.includes(plane))return false;if(ONLY[plane]&&!ONLY[plane].includes(icao))return false;const m=MINRWY[plane]??0;return Object.values(APM).some(A=>A.icao===icao&&A.len>=m)&&APT[icao];};

// ---------- Strecken ----------
// liefert {spec, start, km} oder null, wenn die Strecke nicht sicher fliegbar ist
// Kurvenflug nachrechnen: das Flugzeug fliegt durch jeden Punkt mit der bisherigen Richtung und dreht mit begrenztem Radius zum nächsten.
// Prüft, ob dabei (Überschiessen in der Kurve) genug Abstand zum Gelände bleibt.
function turnOK(pts,S,R,minC,maxUp){maxUp=maxUp??0.08;
  const sim=(a,b,c,force)=>{let h=Math.atan2(b.x-a.x,b.z-a.z),x=b.x,z=b.z,y=b.y;const dTot=Math.hypot(c.x-b.x,c.z-b.z);if(dTot<1)return true;const gr=Math.max(-0.09,Math.min(maxUp,(c.y-b.y)/dTot));
    for(let s=0;s<Math.min(dTot,R*3.6);s+=120){const want=Math.atan2(c.x-x,c.z-z);let e=want-h;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
      if(force&&Math.abs(e)>0.6)e=force*Math.abs(e);const mx=120/R;h+=Math.max(-mx,Math.min(mx,e));
      x+=Math.sin(h)*120;z+=Math.cos(h)*120;y+=gr*120;if(y-S.groundAt(x,z)<minC)return false;if(Math.abs(e)<0.05&&s>R*0.5)break;}
    return true;};
  for(let i=1;i<pts.length-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1];let e=Math.atan2(c.x-b.x,c.z-b.z)-Math.atan2(b.x-a.x,b.z-a.z);while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
    // bei Kehrtkurven (über 100°) müssen beide Drehrichtungen sicher sein – man weiss nicht, wie der Pilot dreht
    if(Math.abs(e)>1.75){if(!sim(a,b,c,1)||!sim(a,b,c,-1))return false;}else if(!sim(a,b,c,0))return false;}
  return true;}
// Ecke B zwischen A und C durch Punkte auf einem Kreisbogen (Radius R) ersetzen; lastKeep: letzter Punkt bleibt (kein Nachfolger)
function fillet(seq,R,S,clr,lastKeep,onlyLast){const out=[],end=lastKeep?seq.length:seq.length-1;
  const clear=(p,q)=>{for(let k=1;k<12;k++){const u=k/12,x=p.x+(q.x-p.x)*u,z=p.z+(q.z-p.z)*u;if(p.y+(q.y-p.y)*u-S.groundAt(x,z)<clr*0.55)return false;}return true;};
  for(let i=1;i<end;i++){const A=seq[i-1],B=seq[i],C=seq[i+1];
    // erster Steigflugpunkt nach dem Start bleibt (dort ist man noch langsam und mit Klappen unterwegs)
    const lastC=!lastKeep&&i===seq.length-2;// letzte Ecke: Eindrehen in den Endanflug
    if(!C||B.name||i===1||(onlyLast&&!lastC)){out.push(B);continue;}
    const l1=Math.hypot(B.x-A.x,B.z-A.z),l2=Math.hypot(C.x-B.x,C.z-B.z);if(l1<1||l2<1){out.push(B);continue;}
    const d1x=(B.x-A.x)/l1,d1z=(B.z-A.z)/l1,d2x=(C.x-B.x)/l2,d2z=(C.z-B.z)/l2,th=Math.acos(Math.max(-1,Math.min(1,d1x*d2x+d1z*d2z)));
    if(th<0.35||th>2.7){out.push(B);continue;}
    let bx=d2x-d1x,bz=d2z-d1z;const bl=Math.hypot(bx,bz)||1;bx/=bl;bz/=bl;let got=null;
    // nur volle Bögen: ein zu enger Bogen aus nahen Ringen ist schwerer zu fliegen als eine einfache Ecke
    for(const f of [1.15,1]){let Rr=R*f,t=Rr*Math.tan(th/2);const tm=lastC?Math.min(0.45*l1,0.98*l2):0.45*Math.min(l1,l2);if(t>tm)continue;
      const T1={x:B.x-d1x*t,z:B.z-d1z*t,y:B.y+(A.y-B.y)*t/l1},T2={x:B.x+d2x*t,z:B.z+d2z*t,y:B.y+(C.y-B.y)*t/l2},off=Rr/Math.cos(th/2)-Rr,M={x:B.x+bx*off,z:B.z+bz*off,y:(T1.y+T2.y)/2};
      const P=th>1.75?[T1,M,T2]:[T1,T2];for(const q of P){q.y=Math.max(q.y,S.groundAt(q.x,q.z)+clr*0.75);q.arc=true;}
      let ok=true;for(let k=0;k<P.length-1;k++)if(!clear(P[k],P[k+1]))ok=false;if(ok){got=P;break;}}
    if(got)out.push(...got);else out.push(B);}
  return out;}
export function planRoute(kind,from,to,plane,S,r){
  const jet=!['alpina','saentis','titlis','foehn','feuer'].includes(plane),clr=jet?260:170,maxC=jet?0.075:0.11,maxD=jet?0.09:0.13,TR=jet?3200:['foehn','feuer'].includes(plane)?1500:850,TC=jet?70:45,RF={alpina:620,saentis:900,titlis:1150,foehn:1800,feuer:1500}[plane]||2800;
  // Ecken der Route zu weiten Bögen ausrunden (mehrere Ringe statt einer scharfen Ecke)
  const round=(sp,after)=>{const Pin=sp.filter(o=>o.k==='P'),rest=sp.filter(o=>o.k!=='P'),pts=Pin.map(o=>({x:o.a[0],z:o.a[1],y:o.a[2],name:o.name}));
    const out=fillet([prev0,...pts,...(after?[after]:[])],RF,S,clr,!after,jet);return[...out.map(q=>({k:'P',a:[q.x,q.z,q.y],name:q.name,...(q.arc?{r:Math.round(Math.min(75,Math.max(45,RF/38)))}:{})})),...rest];};
  const g=(x,z)=>S.groundAt(x,z);
  const segOK=(a,b,c)=>{for(let k=1;k<20;k++){const u=k/20,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,y=a.y+(b.y-a.y)*u;if(y-g(x,z)<c)return false;}return true;};
  const ringsF=(id,rev,dists,sl)=>{const A=APM[id],s=rev?-1:1;sl=sl||0.0524;return dists.map(d=>{const p=fromLocal(A,-s*(A.len/2+d),0);return{x:p.x,z:p.z,y:A.elev+15+d*sl};});};
  const spec=[];let start,km=0;
  if(kind==='arr'){const ap=pick(r,APT.LSZH.app),dist=ap[2][0]+5000;start=[ap[0],ap[1],{dist,agl:jet?900:600}];
    spec.push({k:'F',a:[ap[0],ap[1],ap[2],ap[3]]},{k:'L',a:[ap[0]]});return{spec,start,km:0,app:ap};}
  const deps=APT[from].dep;if(deps.length>1&&!r.__noRetry){
    // bevorzugt die Startrichtung, die schon zum Ziel zeigt (keine Kehrtkurve kurz nach dem Start)
    const tgt=to&&APT[to]&&APT[to].app[0]?APM[APT[to].app[0][0]]:null;
    const score=d=>{if(!tgt||to===from)return r();const A0=APM[d[0]],s0=d[1]?-1:1,p0=fromLocal(A0,0,0),p1=fromLocal(A0,s0*1000,0),h=Math.atan2(p1.x-p0.x,p1.z-p0.z),hb=Math.atan2(tgt.x-p0.x,tgt.z-p0.z);let e=Math.abs(h-hb);while(e>Math.PI)e=Math.abs(e-2*Math.PI);return e+r()*0.3;};
    const order=deps.map(d=>[score(d),d]).sort((a,b)=>a[0]-b[0]).map(o=>o[1]);for(const d of order){const R2=planRoute(kind,from,to,plane,S,Object.assign(()=>r(),{__noRetry:true,__dep:d}));if(R2)return R2;}return null;}
  const dep=r.__dep||pick(r,deps),A=APM[dep[0]],sd=dep[1]?-1:1;start=[dep[0],dep[1]];
  const st=fromLocal(A,sd*(A.len/2),0);let prev={x:st.x,z:st.z,y:A.elev+15};
  const d1=fromLocal(A,sd*(A.len/2+(jet?4600:2400)),0);let r1={x:d1.x,z:d1.z,y:Math.max(A.elev+(jet?380:300),g(d1.x,d1.z)+clr)};
  const climbOK=()=>{for(let k=1;k<20;k++){const u=k/20,x=prev.x+(r1.x-prev.x)*u,z=prev.z+(r1.z-prev.z)*u,y=prev.y+(r1.y-prev.y)*u;if(y-g(x,z)<10+60*u)return false;}return true;};
  for(let i=0;i<30&&!climbOK();i++)r1.y+=60;
  if((r1.y-prev.y)/Math.hypot(r1.x-prev.x,r1.z-prev.z)>maxC*1.4)return null;
  const prev0={x:st.x,z:st.z,y:A.elev+15};spec.push({k:'P',a:[r1.x,r1.z,r1.y]});prev=r1;
  const tail=[];
  if(kind==='dep'){// Abflug: zwei weitere Steigflugringe bis zur Übergabe
    const h0=Math.atan2(r1.x-st.x,r1.z-st.z),offs=[0,0.45,-0.45,0.9,-0.9].sort(()=>r()-0.5);let got=null;
    for(const o of offs){let p=r1;const out=[];for(let i=0;i<2;i++){const h=h0+o*(i+1)/2,q={x:p.x+Math.sin(h)*6500,z:p.z+Math.cos(h)*6500,y:p.y+420};let mx=0;for(let k=1;k<=20;k++){const u=k/20;mx=Math.max(mx,g(p.x+(q.x-p.x)*u,p.z+(q.z-p.z)*u));}
        q.y=Math.max(q.y,mx+clr+60);if((q.y-p.y)/6500>maxC||!segOK(p,q,clr))break;out.push(q);p=q;}
      if(out.length===2){got=out;break;}}
    if(!got)return null;if(!turnOK([prev0,r1,got[0]],S,TR*1.3,TC,0.03)||!turnOK([prev0,r1,...got],S,TR,TC))return null;for(const q of got)spec.push({k:'P',a:[q.x,q.z,q.y]});
    return{spec:round(spec,null),start,km:12};}
  let dest;
  if(kind==='rund'){// Rundflug: 1–2 Sehenswürdigkeiten, zurück zum Start
    const near=SIGHTS.map(s=>{const p=toXZ(s[1],s[2]);return{s,p,d:Math.hypot(p.x-A.x,p.z-A.z)};}).filter(o=>o.d>3000&&o.d<17000);if(!near.length)return null;
    const sel=[];const a=pick(r,near);sel.push(a);const b=near.filter(o=>o!==a&&Math.hypot(o.p.x-a.p.x,o.p.z-a.p.z)>2500&&Math.hypot(o.p.x-a.p.x,o.p.z-a.p.z)<12000);if(b.length&&r()<0.7)sel.push(pick(r,b));
    for(const o of sel){const q={x:o.p.x,z:o.p.z,y:g(o.p.x,o.p.z)+o.s[3]};tail.push({...q,name:o.s[0]});}
    dest=from;}
  else dest=to;
  // Anflug: Eintrittspunkt auf der verlängerten Pistenachse
  const last0=tail.length?tail[tail.length-1]:r1;
  // Jets brauchen einen längeren Endanflug: so weit hinaus wie das Gelände erlaubt (max. 6 km)
  const jetD=ap=>{if(!jet||ap[2][0]>=4000)return ap[2];const A2=APM[ap[0]],s2=ap[1]?-1:1,sl=ap[3]||0.0524;let best=ap[2][0];
    for(let d=ap[2][0]+500;d<=6000;d+=500){let ok=true;for(let dd=ap[2][0];dd<=d;dd+=250){const p=fromLocal(A2,-s2*(A2.len/2+dd),0);if(A2.elev+15+dd*sl-g(p.x,p.z)<70){ok=false;break;}}if(!ok)break;best=d;}
    return best>ap[2][0]?[best,Math.round(best*0.55/100)*100,Math.round(best*0.25/100)*100,Math.min(600,ap[2][ap[2].length-1])]:ap[2];};
  const apps=APT[dest].app.map(ap0=>{const ap=[ap0[0],ap0[1],jetD(ap0),ap0[3]];const AR=ringsF(ap[0],ap[1],ap[2],ap[3]),A2=APM[ap[0]],s2=ap[1]?-1:1,sl=ap[3]||0.0524;let E=null;
    const roomy=e=>{for(const rr of [TR*0.5,TR])for(let k=0;k<12;k++){const a=k/12*Math.PI*2;if(g(e.x+Math.cos(a)*rr,e.z+Math.sin(a)*rr)>e.y-TC)return false;}return true;};
    for(const ex of [3200,2200,1400,700]){const dO=ap[2][0]+ex,p=fromLocal(A2,-s2*(A2.len/2+dO),0),y=A2.elev+15+dO*sl,e={x:p.x,z:p.z,y:Math.max(y,g(p.x,p.z)+90)};if(e.y-y<120&&segOK(e,AR[0],50)&&roomy(e)){E=e;break;}}
    return{ap,AR,E:E||{...AR[0]},d:Math.hypot(AR[0].x-last0.x,AR[0].z-last0.z)};}).sort((a,b)=>a.d-b.d);
  // Linienflug mit Jet oder Turboprop: wie in echt auf eine Reiseflughöhe steigen, halten und mit 3° sinken
  if(kind==='flug'&&!['alpina','saentis','feuer'].includes(plane)){
    for(const {ap:app,AR,E} of apps){const C=cruiseRoute(r1,E,S,plane,jet,clr);if(!C)continue;
      const all=[r1,...C.rings,E,...AR];
      if(!turnOK([prev0,r1,all[1]],S,TR*1.3,TC,0.03)||!turnOK([prev0,...all.slice(0,-AR.length+1||undefined)],S,TR*0.6,25))continue;
      for(const q of C.rings)spec.push({k:'P',a:[q.x,q.z,q.y]});
      for(let i=0;i<all.length-1;i++)km+=Math.hypot(all[i+1].x-all[i].x,all[i+1].z-all[i].z)/1000;
      if(E!==AR[0]&&!AR.includes(E)&&Math.hypot(E.x-AR[0].x,E.z-AR[0].z)>300)spec.push({k:'P',a:[E.x,E.z,E.y]});
      spec.push({k:'F',a:[app[0],app[1],app[2],app[3]]},{k:'L',a:[app[0]]});
      return{spec:round(spec,AR[0]),start,km:Math.round(km+Math.hypot(r1.x-st.x,r1.z-st.z)/1000),app,cr:C.cr};}}
  // Weg durch die Täler: Gitter-Wegpunkte, kürzester sicherer Pfad; Anflugvarianten der Reihe nach probieren
  const legs=[];let cur=r1;for(const t of tail){const w=wayPath(cur,t,S,jet);if(!w)return null;legs.push(...w,t);cur=t;}
  for(const {ap:app,AR,E} of apps){const w2=wayPath(cur,E,S,jet);if(!w2)continue;const L2=[...legs,...w2];
    const all=[r1,...L2,E,...AR];if(!turnOK([prev0,r1,all[1]],S,TR*1.3,TC,0.03)||!turnOK([prev0,...all.slice(0,-AR.length+1||undefined)],S,TR*0.6,25))continue;
    for(const q of L2)spec.push({k:'P',a:[q.x,q.z,q.y],name:q.name});
    for(let i=0;i<all.length-1;i++)km+=Math.hypot(all[i+1].x-all[i].x,all[i+1].z-all[i].z)/1000;
    if(E!==AR[0]&&!AR.includes(E)&&Math.hypot(E.x-AR[0].x,E.z-AR[0].z)>300)spec.push({k:'P',a:[E.x,E.z,E.y]});
    spec.push({k:'F',a:[app[0],app[1],app[2],app[3]]},{k:'L',a:[app[0]]});
    return{spec:round(spec,AR[0]),start,km:Math.round(km+Math.hypot(r1.x-st.x,r1.z-st.z)/1000),app};}
  return null;
}
// Reiseflug-Profil: möglichst direkt; Steigen (Jet 6,5 %, Turboprop 5 %) auf die Reiseflughöhe, halten, Sinkflug mit 3°.
// Reiseflughöhe wächst mit der Strecke (realistisch, aber spielbar) und liegt immer sicher über dem Gelände.
function cruiseRoute(a,b,S,plane,jet,clr){
  const gc=jet?0.065:0.05,gd=0.0524,g=(x,z)=>S.groundAt(x,z),crMax=jet?9000:plane==='foehn'?6000:4800;
  const gw=(x,z)=>{let m=g(x,z);for(let k=0;k<8;k++){const t=k/8*Math.PI*2;m=Math.max(m,g(x+Math.cos(t)*600,z+Math.sin(t)*600));}return m;};
  const build=(path,raise,valley)=>{
    const cs=[0];for(let i=1;i<path.length;i++)cs.push(cs[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));const L=cs[cs.length-1];if(L<8000)return null;
    const at=s=>{let i=1;while(i<path.length-1&&cs[i]<s)i++;const u=Math.max(0,Math.min(1,(s-cs[i-1])/Math.max(1,cs[i]-cs[i-1]))),p=path[i-1],q=path[i];
      return{x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u,ys:p.ys==null||q.ys==null?-1e9:p.ys+(q.ys-p.ys)*u};};
    let cr=Math.min(crMax,jet?1800+0.026*L:900+0.016*L);cr=Math.min(cr,(0.7*L+a.y/gc+b.y/gd)/(1/gc+1/gd));
    if(raise){let t=0;for(let s=0;s<=L;s+=500){const p=at(s);t=Math.max(t,gw(p.x,p.z));}cr=Math.max(cr,t+clr+150);if(cr>crMax+300)return null;}
    cr=Math.max(cr,a.y+300,b.y+300);cr=Math.ceil(cr/150)*150;
    const prof=s=>Math.min(a.y+s*gc,cr,b.y+(L-s)*gd),yAt=s=>Math.max(at(s).ys,prof(s));
    for(let s=0;s<=L;s+=250){const p=at(s);if(yAt(s)-(valley?g(p.x,p.z):gw(p.x,p.z))<clr*(valley?0.6:0.75))return null;}
    // Ringe: alle 10 km im Steig- und Sinkflug, höchstens 25 km im Reiseflug, an Kurven und an den Knickpunkten
    let s1=(cr-a.y)/gc,s2=L-(cr-b.y)/gd;if(s2<s1){s1=s2=(b.y+L*gd-a.y)/(gc+gd);}
    const S0=[];for(let s=10000;s<s1;s+=10000)S0.push([s,0]);S0.push([s1,1]);
    const nC=Math.ceil((s2-s1)/25000);for(let k=1;k<nC;k++)S0.push([s1+(s2-s1)*k/nC,0]);S0.push([s2,1]);
    for(let s=s2+10000;s<L-3000;s+=10000)S0.push([s,0]);for(let i=1;i<path.length-1;i++)S0.push([cs[i],2]);
    S0.sort((p,q)=>p[0]-q[0]);const keep=[];
    for(const o of S0){if(o[0]<3000||o[0]>L-3000)continue;const l=keep[keep.length-1];if(l&&o[0]-l[0]<2500){if(o[1]>l[1])keep[keep.length-1]=o;continue;}keep.push(o);}
    const rings=keep.map(([s])=>{const p=at(s);return{x:p.x,z:p.z,y:Math.ceil(yAt(s)/50)*50};});
    return{rings,cr};};
  // 1. direkt (falls nötig etwas höher), 2. durch die Täler, aber ebenfalls auf Reiseflughöhe
  return build([a,b],false)||build([a,b],true)||(()=>{const w=wayPath(a,b,S,jet);if(!w)return null;const P=[a,...w];if(P[P.length-1]!==b)P.push(b);
    return build(P.map(p=>({x:p.x,z:p.z,ys:p.y})),false,true);})();}
// Wegpunkt-Gitter über dem Gelände (regelmässig, 2.7 km); Kanten nur, wenn Höhe und Steigung passen
const GRID={},GS=2700;
function grid(S,jet){const key=jet?'j':'p';if(GRID[key]&&GRID[key].S===S)return GRID[key];const clr=jet?260:CH?210:170,N=[],NX=Math.floor((2*HALF-3000)/GS)+1;
  for(let j=0;j<NX;j++)for(let i=0;i<NX;i++){const x=-HALF+1500+i*GS,z=-HALF+1500+j*GS;let mx=S.groundAt(x,z);
    // Randstreifen der Karte (abgeflacht) nicht als Abkürzung benutzen
    if(CH&&(Math.abs(x)>HALF-9000||Math.abs(z)>HALF-9000))mx=9000;
    for(let k=0;k<9;k++){const a=k/9*Math.PI*2;mx=Math.max(mx,S.groundAt(x+Math.cos(a)*900,z+Math.sin(a)*900));}
    N.push({x,z,y:Math.ceil((mx+clr+60)/50)*50,i,j});}
  return GRID[key]={S,N,NX};}
function legOK(a,b,S,jet,c){const d=Math.hypot(b.x-a.x,b.z-a.z),gr=(b.y-a.y)/Math.max(1,d);if(gr>(jet?0.07:0.1)||-gr>(jet?0.08:0.12))return false;
  const n=Math.max(4,Math.ceil(d/250));for(let k=1;k<n;k++){const u=k/n;if(a.y+(b.y-a.y)*u-S.groundAt(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u)<c)return false;}return true;}
// kürzester sicherer Weg durch die Täler (Dijkstra mit Heap, nur Nachbarn im Umkreis)
export function wayPath(a,b,S,jet){const clr=jet?220:CH?190:150;if(legOK(a,b,S,jet,clr))return[];
  const {N,NX}=grid(S,jet),R=6500,ci=p=>Math.round((p.x+HALF-1500)/GS),cj=p=>Math.round((p.z+HALF-1500)/GS);
  const n=N.length+2,A=n-2,B=n-1,node=k=>k===A?a:k===B?b:N[k],dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n);
  const near=(p,rad)=>{const out=[],i0=ci(p),j0=cj(p),r=Math.ceil(rad/GS)+1;for(let j=Math.max(0,j0-r);j<=Math.min(NX-1,j0+r);j++)for(let i=Math.max(0,i0-r);i<=Math.min(NX-1,i0+r);i++)out.push(j*NX+i);return out;};
  const endN=new Set(near(b,R*1.3));
  const H=[];const push=(d,k)=>{H.push([d,k]);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p;}};
  const pop=()=>{const top=H[0],last=H.pop();if(H.length){H[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<H.length&&H[l][0]<H[m][0])m=l;if(r<H.length&&H[r][0]<H[m][0])m=r;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m;}}return top;};
  dist[A]=0;push(0,A);
  while(H.length){const [du,u]=pop();if(done[u])continue;done[u]=1;if(u===B)break;const U=node(u);
    const cand=near(U,R);if(endN.has(u)||u===A&&Math.hypot(b.x-a.x,b.z-a.z)<R*1.3)cand.push(B);
    for(const v of cand){if(done[v]||v===u)continue;const V=node(v),d=Math.hypot(V.x-U.x,V.z-U.z);if(d>(v===B?R*1.3:R)||d<1)continue;
      const c=du+d*(1+Math.max(0,V.y-700)/1800);if(c<dist[v]&&legOK(U,V,S,jet,clr)){dist[v]=c;prev[v]=u;push(c,v);}}}
  if(prev[B]<0)return null;let path=[];for(let v=prev[B];v!==A&&v>=0;v=prev[v])path.unshift(node(v));
  // Fadenziehen: unnötige Zwischenpunkte entfernen
  const pts=[a,...path,b],out=[a];let i=0;while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!legOK(pts[i],pts[j],S,jet,clr))j--;if(j<pts.length-1)out.push(pts[j]);i=j;}
  return out.slice(1).map(p=>({x:p.x,z:p.z,y:p.y}));}
export const specObj=spec=>H=>spec.flatMap(o=>o.k==='F'?H.F(...o.a):[o.k==='P'?{...H.P(...o.a),name:o.name,...(o.r?{r:o.r}:{})}:H[o.k](...o.a)]);

// ---------- Aufträge ----------
const CARGO=['Ersatzteile','Post','Medikamente','Uhren','Schokolade','Blumen','Zeitungen','Käse'];
function makeJob(n,plane,S,r,owned,FROM){const PK=plane==='l32n'?'l320':plane;
  const icaos=Object.keys(APT).filter(i=>canUse(plane,i));if(FROM&&!WIDE.includes(plane)&&!icaos.includes(FROM))return null;
  for(let tries=0;tries<14;tries++){
    let kind,from,to;
    if(WIDE.includes(plane)){if(!APT.LSZH||(FROM&&FROM!=='LSZH'))return null;kind=FROM?'dep':r()<0.55?'arr':'dep';from=to='LSZH';}
    else if((plane==='alpina'||plane==='saentis')&&r()<0.35){kind='rund';from=to=FROM||pick(r,icaos);}
    else{if(icaos.length<2)continue;from=FROM||pick(r,icaos);
      // grosse Karte: kurze Hüpfer oder Langstrecke quer durch die Schweiz
      let pool=icaos.filter(i=>i!==from);if(CH){const far=PK==='l320'||PK==='l330'||(['titlis','foehn'].includes(PK)&&r()<0.5),d=i=>apDist(from,i);
        const f=pool.filter(i=>far?d(i)>55000:d(i)<(plane==='alpina'||plane==='saentis'?38000:50000));if(f.length)pool=f;else if(!far)continue;}
      to=pick(r,pool);kind='flug';}
    const R=planRoute(kind,from,to,plane,S,r);if(!R||R.km>((CH?{alpina:48,saentis:55,titlis:200,foehn:230,feuer:70,l320:290,l330:300}:{alpina:26,saentis:28,titlis:34,foehn:42,feuer:40,l320:60})[PK]||99))continue;
    const cargo=kind==='flug'&&r()<0.4,P=BASEPAY[plane],km=R.km,df=kind==='arr'||kind==='dep'?1:CH?Math.min(5,Math.max(0.8,0.7+km/30)):Math.min(2.2,Math.max(0.8,0.7+km/25)),lng=kind==='flug'&&km>=70;
    const pay=Math.round(P*df*(cargo?1.1:1)/50)*50,fn=n%900+100,hour=pick(r,[8.5,10,11.5,13,14.5,16,17.5,19.8,21.5]),weather=hour>21||hour<7?'clear':pick(r,['clear','fair','fair','cloudy']);
    const T=APT[from].name,D=APT[to].name,city=pick(r,FAR),gd=pick(r,CARGO);
    const title=kind==='arr'?`Ankunft LUIS ${fn} aus ${city}`:kind==='dep'?`Abflug LUIS ${fn} nach ${city}`:kind==='rund'?`Rundflug ab ${T}`:cargo?`Fracht: ${gd} nach ${D}`:(lng?'Langstrecke: ':'')+(PK==='l320'||PK==='l330'?`Linienflug LUIS ${fn} · ${T} → ${D}`:plane==='foehn'?`Regionalflug ${T} → ${D}`:`Lufttaxi ${T} → ${D}`);
    const sights=R.spec.filter(o=>o.name).map(o=>o.name);
    const brief=kind==='arr'?`Langstreckenflug aus ${city}: Du übernimmst im Anflug auf Zürich. Folge den blauen Ringen zum Gleitpfad und lande sanft – die Passagiere sind müde.`
      :kind==='dep'?`Start in Zürich mit vollen Tanks nach ${city}. Steig ruhig durch die Ringe bis zur Übergabe an die Flugsicherung.`
      :kind==='rund'?`Gäste wollen die Schweiz von oben sehen: ${sights.join(' und ')}. Ruhig fliegen, schöne Kurven, dann zurück nach ${T}.`
      :cargo?`${gd} müssen dringend von ${T} nach ${D}. Rund ${km} km Strecke.${R.cr?` Reiseflughöhe ${R.cr} m.`:''}`:lng?`Langstrecke quer durch die Schweiz: Passagiere von ${T} nach ${D}, rund ${km} km. Folge den Ringen über Mittelland und Alpen – der Autopilot (U) hilft auf dem langen Reiseteil.${R.cr?` Reiseflughöhe ${R.cr} m.`:''}`:`Passagiere von ${T} nach ${D}, rund ${km} km. Sanft fliegen – Komfort zählt.${R.cr?` Reiseflughöhe ${R.cr} m.`:''}`;
    return{n,plane,kind,from,to,long:lng,title,brief,pay,km,hour,weather,wind:pick(r,['calm','light','light','mid']),spec:R.spec,start:R.start,pax:!cargo,locked:owned&&!owned.includes(plane)};}
  return null;
}
// Aufträge ab einem bestimmten Flugplatz (freier Flug): Passagier- und Frachtflüge mit dem aktuellen Flugzeug
export function freeJobs(plane,from,S,seed){if(NOJOB.includes(plane))return[];const r=rng(hashStr('F'+plane+from+seed)),out=[],seen=new Set();
  for(let i=0;i<14&&out.length<4;i++){const j=makeJob(7000+i,plane,S,r,null,from);if(!j||j.from!==from)continue;const k=j.to+j.kind;if(seen.has(k))continue;seen.add(k);j.free=true;out.push(j);}
  return out;}
export function jobMission(j,id){return{id:id||('job'+j.n),name:j.title,plane:j.plane,start:j.start,hour:j.hour,weather:j.weather,wind:j.wind,season:j.season,brief:j.brief,
  tip:j.kind==='arr'?'Klappen schrittweise, Fahrwerk spätestens beim zweiten blauen Ring. Schub früh reduzieren.':j.kind==='dep'?'Nach dem Abheben Fahrwerk ein (G), Klappen schrittweise ein (F) und mit ca. 8° Nase hoch steigen.':'Folge den gelben Ringen, dann dem blauen Gleitpfad. Bei Bedarf Karte (M) öffnen.',
  obj:specObj(j.spec),comfort:j.pax,contract:j,dyn:true};}

// ---------- Tagesaufgabe ----------
const THEMES=[
  {n:'Föhnsturm',weather:'foehn',wind:'foehn',hour:14,t:'Föhn bläst böig aus Süden – halte die Flügel gerade und lande trotzdem sauber.'},
  {n:'Nachtflug',weather:'clear',wind:'light',hour:22.6,t:'Die Schweiz bei Nacht: Pistenbefeuerung, Lichter der Städte – und eine präzise Landung.'},
  {n:'Nebelmeer',weather:'fog',wind:'calm',hour:9,t:'Über dem Mittelland liegt das Nebelmeer. Steig darüber, geniess die Gipfel und tauche zur Landung ein.'},
  {n:'Abendrot',weather:'fair',wind:'light',hour:20.05,t:'Goldenes Licht über den Seen – ein Flug zum Geniessen.'},
  {n:'Regenfront',weather:'rain',wind:'mid',hour:16,t:'Regen und Böen: Geschwindigkeit im Anflug genau halten.'},
  {n:'Seitenwind',weather:'cloudy',wind:'cross',hour:12,t:'Kräftiger Wind quer zur Piste. Mit dem Seitenruder ausrichten, kurz vor dem Aufsetzen gerade stellen.'},
  {n:'Morgenflug',weather:'clear',wind:'calm',hour:7.3,t:'Ruhige Morgenluft, lange Schatten – perfekt für eine butterweiche Landung.'},
  {n:'Winterzauber',weather:'clear',season:'winter',wind:'light',hour:11.5,t:'Frischer Schnee bis ins Mittelland – die Schweiz glitzert in der Wintersonne.'},
  {n:'Schneetreiben',weather:'snow',season:'winter',wind:'mid',hour:15,t:'Dichter Schneefall, wenig Sicht: Instrumente im Blick behalten.'},
  {n:'Gewitter',weather:'storm',wind:'storm',hour:17.5,t:'Blitze und kräftige Böen – vorsichtig fliegen, genau anfliegen.'}];
export function dailyJob(S,key){
  key=key||todayKey();const r=rng(hashStr('AF'+key));const th=THEMES[Math.floor(r()*THEMES.length)];
  for(let i=0;i<8;i++){const plane=pick(r,ORDER.filter(p=>!NOJOB.includes(p)&&(!BO||!WIDE.includes(p))));const j=makeJob(9000+i,plane,S,r,null);if(!j)continue;
    j.hour=th.hour;j.weather=th.weather;j.wind=th.wind;j.season=th.season;j.title=`${th.n}: ${j.title}`;j.brief=th.t+' '+j.brief;j.daily=key;j.pay=5000;j.theme=th.n;
    if(th.wind==='cross'){const ap=j.spec.find(o=>o.k==='F'),A=APM[ap?ap.a[0]:j.start[0]],rw=ap?(ap.a[1]?A.rwyB:A.rwyA):A.rwyA;j.wind={spd:9,gust:5,turb:0.45,dir:((+rw*10+90)%360)};}
    return j;}
  return null;
}

// ---------- Abzeichen ----------
export const BADGES=[
  ['erster','Erster Flug','Einen Flug erfolgreich beenden','🛫'],['schein','Pilotenschein','Die Flugschul-Prüfung bestehen','🎓'],['butter','Butterweich','Eine Landung mit Note S','🧈'],
  ['treffer','Volltreffer','Eine Kiste weniger als 10 m neben dem Ziel','🎯'],['sammler','Sammler','10 goldene Edelweiss finden','🌼'],['edel','Alle Edelweiss','Alle 48 goldenen Edelweiss finden','✨'],
  ['nacht','Nachtflieger','Eine Nachtlandung schaffen','🌙'],['nebel','Nebelmeister','Mission «Nebelmeer» bestehen','🌫️'],['foehn','Föhnbezwinger','Mission «Föhnsturm» bestehen','🌬️'],
  ['renn','Rennfahrer','Das Pylonenrennen mit 3 Sternen','🏁'],['pax','Passagierliebling','Mindestens 95 % Komfort','😊'],['funk','Funkprofi','5 Flüge ohne Regelverstoss mit Funk','📻'],
  ['kapitaen','Kapitän','30 Sterne sammeln','👨‍✈️'],['gross','Grossraum','Mit dem L-380 landen','🐋'],['auftrag','Auftragsprofi','10 Aufträge erledigen','📦'],
  ['notfall','Notfallprofi','Alle drei Notfall-Missionen bestehen','🚨'],['loesch','Feuerwehr','Den Waldbrand am Bürgenstock löschen','🔥'],['segel','Thermikkönig','Mit dem Segler zum Pilatus und zurück','🦅'],['ziel','Punktlandung','Ziellandungen im Schnitt unter 10 m','📍'],
  ['rega','Lebensretter','Alle drei Rega-Einsätze erfüllen','🚁'],
  ['unter','Unternehmer','Insgesamt CHF 1 Mio. verdienen','💰'],['flotte','Flottenchef','Alle Flugzeuge besitzen','🛩️'],['tages','Tagesheld','Eine Tagesaufgabe erfüllen','📅']];

// ---------- Teilen-Code ----------
export function encodeShare(o){const s=JSON.stringify(o);return'AF1-'+btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decodeShare(code){try{code=(code||'').trim();if(!code.startsWith('AF1-'))return null;let b=code.slice(4).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';const o=JSON.parse(decodeURIComponent(escape(atob(b))));return o&&typeof o==='object'?o:null;}catch(e){return null;}}

// ---------- Zustand ----------
export function createCareer(save,persist){
  const C=save.career=Object.assign({money:20000,earned:0,owned:['alpina'],jobs:[],seq:1,done:0,badges:{},daily:{},stats:{},name:'',liv:{},ghost:true,best:{},friends:[]},save.career||{});
  const JK=BO?'jobsBO':'jobs';if(!Array.isArray(C[JK]))C[JK]=[];
  // Aufträge enthalten Koordinaten: nach dem Kartenwechsel neu erzeugen
  if(CH&&C.jobsW!=='ch1'){C.jobs=[];delete C.jobsBO;C.jobsW='ch1';}
  const K={C,jobs:()=>C[JK],
    owns:id=>C.owned.includes(id),
    buy(id){if(K.owns(id)||C.money<PRICE[id])return false;C.money-=PRICE[id];C.owned.push(id);persist();return true;},
    add(v){C.money=Math.max(0,C.money+v);if(v>0)C.earned+=v;persist();},
    refill(S,force){if(force)C[JK]=C[JK].filter(j=>j.locked);// gesperrte bleiben als Anreiz
      const own=C.owned.filter(id=>!NOJOB.includes(id)).sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b)),next=ORDER.find(id=>!K.owns(id)&&!NOJOB.includes(id));
      const r=rng(hashStr('J'+C.seq+'|'+C.done));let guard=0;
      while(C[JK].filter(j=>!j.locked).length<5&&guard++<30){const w=own.map((id,i)=>1+i*0.6),sum=w.reduce((a,b)=>a+b,0);let x=r()*sum,pl=own[0];for(let i=0;i<own.length;i++){x-=w[i];if(x<=0){pl=own[i];break;}}
        const j=makeJob(C.seq++,pl,S,r,C.owned);if(j)C[JK].push(j);}
      C[JK]=C[JK].filter(j=>!j.locked||!K.owns(j.plane));
      if(next&&!C[JK].some(j=>j.locked)){const j=makeJob(C.seq++,next,S,r,C.owned);if(j)C[JK].push(j);}
      persist();return C[JK];},
    jobDone(n){C[JK]=C[JK].filter(j=>j.n!==n);C.done++;persist();},
    stat(k,v=1){C.stats[k]=(C.stats[k]||0)+v;persist();return C.stats[k];},
    has:id=>!!C.badges[id],
    award(id){if(C.badges[id])return null;C.badges[id]=Date.now();persist();return BADGES.find(b=>b[0]===id);},
    ghostGet(mid){try{const g=JSON.parse(localStorage.getItem('alpenflug-ghost2')||'{}');return g[mid]||null;}catch(e){return null;}},
    ghostSet(mid,t,data){try{const g=JSON.parse(localStorage.getItem('alpenflug-ghost2')||'{}');g[mid]={t,d:data};localStorage.setItem('alpenflug-ghost2',JSON.stringify(g));}catch(e){}},
  };
  return K;
}
