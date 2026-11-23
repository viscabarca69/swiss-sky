// Karriere-Missionen in der Zentralschweiz
import {APM,fromLocal,toXZ,alongV8} from './worldgen.js';

export function buildObjectives(mission,S,opt){
  const gnd=(x,z)=>S.groundAt(x,z);
  const R=(lat,lon,agl)=>{const p=toXZ(lat,lon);return{type:'ring',x:p.x,z:p.z,y:gnd(p.x,p.z)+agl,r:30};};
  const RL=(id,along,across,alt)=>{const A=APM[id],p=fromLocal(A,alongV8(A,along),across);return{type:'ring',x:p.x,z:p.z,y:Math.max(A.elev+alt,gnd(p.x,p.z)+100),r:32};};
  const F=(id,rev,dists,slope)=>{const A=APM[id],s=rev?-1:1,sl=slope||0.0524;
    return dists.map(d=>{const p=fromLocal(A,-s*(A.len/2+d),0);return{type:'ring',x:p.x,z:p.z,y:A.elev+15+d*sl,r:d>3000?48:28,dir:[A.sin*s,-A.cos*s],final:true};});};
  const L=(id)=>({type:'land',ap:APM[id],x:APM[id].x,z:APM[id].z,y:APM[id].elev+15});
  const D=(x,z,name)=>({type:'drop',x,z,y:gnd(x,z),r:45,name});
  const DL=(lat,lon,name)=>{const p=toXZ(lat,lon);return D(p.x,p.z,name);};
  const P=(x,z,y)=>({type:'ring',x,z,y,r:40});
  // Etappe 3: Wasser schöpfen, Feuer löschen, Wasserlandung, Ziellandung
  const SC=(lat,lon,r,name)=>{const p=toXZ(lat,lon);return{type:'scoop',x:p.x,z:p.z,y:S.waterLevel?S.waterLevel(p.x,p.z):434,r:r||1500,name};};
  const FI=(lat,lon,name)=>{const p=toXZ(lat,lon);return{type:'fire',x:p.x,z:p.z,y:gnd(p.x,p.z),r:75,name};};
  const W=(lat,lon,r,name)=>{const p=toXZ(lat,lon);return{type:'wland',x:p.x,z:p.z,y:S.waterLevel?S.waterLevel(p.x,p.z):434,r:r||700,name};};
  const SP=(id,k,n,tgt)=>{const A=APM[id],p=fromLocal(A,-A.len/2+tgt,0);return{type:'spot',ap:A,k,n,tgt,x:p.x,z:p.z,y:A.elev+3};};
  const TX=()=>{const A=APM.ZRH16,p=fromLocal(A,A.len/2-45,-95);return{type:'taxi',x:p.x,z:p.z,y:A.elev+4,r:38};};
  const HL=(lat,lon,name,wait,kind)=>{const p=toXZ(lat,lon);return{type:'hland',x:p.x,z:p.z,y:gnd(p.x,p.z),r:kind==='pad'?16:30,wait,name,kind};};
  const HO=(lat,lon,name,wait)=>{const p=toXZ(lat,lon);return{type:'hover',x:p.x,z:p.z,y:S.waterLevel&&S.isLake(p.x,p.z)?S.waterLevel(p.x,p.z):gnd(p.x,p.z),r:24,h:18,wait,name};};
  const list=mission.obj({R,RL,F,L,D,DL,P,SC,FI,W,SP,TX,HL,HO});
  return mission.dyn||!opt||!opt.vref?list:roundRings(list,S,opt.vref);
}
// Zu enge Ecken im Ringkurs ausrunden: Ring an der Ecke durch Ringe auf einem Bogen ersetzen.
// Radius für ca. 30° Querlage bei rund 1.7-facher Anfluggeschwindigkeit; Endanflug-Ringe bleiben unverändert.
export function roundRings(list,S,vref,inner){const v=vref*1.7,RW=v*v/(9.81*Math.tan(30*Math.PI/180)),out=[];
  for(let i=0;i<list.length;i++){const B=list[i],A=list[i-1],C=list[i+1];
    // Eindrehen in den Endanflug: Hilfspunkt K auf der verlängerten Anfluglinie, dort die Ecke ausrunden
    if(!inner&&A&&B.type==='ring'&&B.final&&A.type==='ring'&&!A.final){const dF=B.dir?{x:B.dir[0],z:B.dir[1]}:C&&C.type==='ring'?{x:(C.x-B.x)/(Math.hypot(C.x-B.x,C.z-B.z)||1),z:(C.z-B.z)/(Math.hypot(C.x-B.x,C.z-B.z)||1)}:null;
      const lab=Math.hypot(B.x-A.x,B.z-A.z);
      if(dF&&lab>1){const th0=Math.acos(Math.max(-1,Math.min(1,((B.x-A.x)*dF.x+(B.z-A.z)*dF.z)/lab)));
        if(th0>0.35&&th0<2.7){const t0=Math.min(RW*Math.tan(th0/2)*1.1,0.5*lab,2600),K={...B,final:false,dir:undefined,name:undefined,x:B.x-dF.x*t0,z:B.z-dF.z*t0,y:Math.min(Math.max(A.y,B.y),B.y+t0*0.06)};
          const prevOut=out[out.length-1],sub=roundRings([prevOut,K,{...B}],S,vref,true);if(sub.length>3){out.pop();out.push(...sub.slice(0,-1).map(q=>({...q,final:false,dir:undefined})));}}}
      out.push(B);continue;}
    if(!A||!C||B.type!=='ring'||B.final||A.type!=='ring'||C.type!=='ring'){out.push(B);continue;}
    const l1=Math.hypot(B.x-A.x,B.z-A.z),l2=Math.hypot(C.x-B.x,C.z-B.z);if(l1<1||l2<1){out.push(B);continue;}
    const d1x=(B.x-A.x)/l1,d1z=(B.z-A.z)/l1,d2x=(C.x-B.x)/l2,d2z=(C.z-B.z)/l2,th=Math.acos(Math.max(-1,Math.min(1,d1x*d2x+d1z*d2z)));
    const ar=Math.abs((B.x-A.x)*(C.z-A.z)-(C.x-A.x)*(B.z-A.z))/2,R3=ar<1?1e9:l1*l2*Math.hypot(A.x-C.x,A.z-C.z)/(4*ar);
    if(th<0.3||th>2.7||R3>=RW){out.push(B);continue;}
    let t=RW*Math.tan(th/2),Rr=RW;const tm=0.42*Math.min(l1,l2);if(t>tm){t=tm;Rr=t/Math.tan(th/2);}
    // nur ausrunden, wenn der Bogen wirklich weiter wird als die natürliche Kurve durch die drei Ringe
    if(Rr<Math.max(0.55*RW,R3*1.2)){out.push(B);continue;}
    let bx=d2x-d1x,bz=d2z-d1z;const bl=Math.hypot(bx,bz)||1;bx/=bl;bz/=bl;const off=Rr/Math.cos(th/2)-Rr,agl=Math.min(60,B.y-S.groundAt(B.x,B.z));
    const mk=(x,z,y,extra)=>({...B,name:undefined,...extra,x,z,y:Math.max(y,S.groundAt(x,z)+Math.max(15,agl))});
    const T1=mk(B.x-d1x*t,B.z-d1z*t,B.y+(A.y-B.y)*t/l1),T2=mk(B.x+d2x*t,B.z+d2z*t,B.y+(C.y-B.y)*t/l2),M=mk(B.x+bx*off,B.z+bz*off,B.name?B.y:(T1.y+T2.y)/2,{name:B.name});
    out.push(...(th>1.0||B.name?[T1,M,T2]:[T1,T2]));}
  return out;}

// Sichtbare Flugbahn durch die Ringe. Zwischen zwei Ringen ein Dubins-Weg (Kurve–Gerade–Kurve mit festem Kurvenradius):
// so ist die Bahn mit dem jeweiligen Flugzeug wirklich fliegbar; bei Haarnadeln zeigt sie den nötigen Bogen.
// Richtung an einem Ring = Winkelhalbierende von Ein- und Ausflug (Endanflug-Ringe: Pistenrichtung).
// Jedes Ziel o bekommt o.pi=[a,b] (Punktbereich der Bahn, die zu ihm führt) und o.hd (Flugrichtung im Ring).
const M2P=Math.PI*2,md=a=>((a%M2P)+M2P)%M2P;
function dubins(q0,q1,r){const dx=q1.X-q0.X,dy=q1.Y-q0.Y,D=Math.hypot(dx,dy),d=D/r,ph=Math.atan2(dy,dx),al=md(q0.t-ph),be=md(q1.t-ph);
  const sa=Math.sin(al),sb=Math.sin(be),ca=Math.cos(al),cb=Math.cos(be),cab=Math.cos(al-be),C=[];
  {const p2=2+d*d-2*cab+2*d*(sa-sb);if(p2>=0){const t1=Math.atan2(cb-ca,d+sa-sb);C.push(['LSL',md(-al+t1),Math.sqrt(p2),md(be-t1)]);}}
  {const p2=2+d*d-2*cab+2*d*(sb-sa);if(p2>=0){const t1=Math.atan2(ca-cb,d-sa+sb);C.push(['RSR',md(al-t1),Math.sqrt(p2),md(-be+t1)]);}}
  {const p2=-2+d*d+2*cab+2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t2=Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,p);C.push(['LSR',md(-al+t2),p,md(-md(be)+t2)]);}}
  {const p2=d*d-2+2*cab-2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t2=Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,p);C.push(['RSL',md(al-t2),p,md(be-t2)]);}}
  {const tm=(6-d*d+2*cab+2*d*(sa-sb))/8;if(Math.abs(tm)<=1){const p=md(M2P-Math.acos(tm)),t=md(al-Math.atan2(ca-cb,d-sa+sb)+p/2);C.push(['RLR',t,p,md(al-be-t+p)]);}}
  {const tm=(6-d*d+2*cab+2*d*(-sa+sb))/8;if(Math.abs(tm)<=1){const p=md(M2P-Math.acos(tm)),t=md(-al-Math.atan2(ca-cb,d+sa-sb)+p/2);C.push(['LRL',t,p,md(md(be)-al-t+p)]);}}
  let best=null;for(const c of C){const L=c[1]+c[2]+c[3];if(!best||L<best.L)best={w:c[0],s:[c[1],c[2],c[3]],L};}return best;}
function dubinsPts(q0,q1,r,step){const b=dubins(q0,q1,r);if(!b)return null;const out=[];let X=q0.X,Y=q0.Y,t=q0.t;
  for(let k=0;k<3;k++){const ty=b.w[k],len=b.s[k]*r,n=Math.max(1,Math.ceil(len/step));
    for(let i=1;i<=n;i++){const u=len*i/n;let x,y,tt;
      if(ty==='S'){x=X+Math.cos(t)*u;y=Y+Math.sin(t)*u;tt=t;}
      else if(ty==='L'){const cx=X-r*Math.sin(t),cy=Y+r*Math.cos(t);tt=t+u/r;x=cx+r*Math.sin(tt);y=cy-r*Math.cos(tt);}
      else{const cx=X+r*Math.sin(t),cy=Y-r*Math.cos(t);tt=t-u/r;x=cx-r*Math.sin(tt);y=cy+r*Math.cos(tt);}
      out.push({X:x,Y:y});if(i===n){X=x;Y=y;t=tt;}}}
  return {pts:out,L:b.L*r};}
export function turnRadius(P){if(!P||P.heli)return 0;const V=(P.prop?1.45:1.5)*P.Vref,bk=P.prop?38:28;return V*V/(9.81*Math.tan(bk*Math.PI/180));}
export function objPath(objs,st){
  const pts=[],R=st&&st.r||600,STEP=Math.max(25,Math.min(60,R/12));
  const th=(dx,dz)=>Math.atan2(-dz,dx);
  // Kontrollpunkte (Pose: Position, Richtung, Höhe) je zusammenhängender Ringfolge
  const runs=[];let cp=[];
  if(st&&objs[0]&&objs[0].type==='ring'){const dx=st.hx,dz=st.hz;cp.push({x:st.x,y:st.y,z:st.z,t:th(dx,dz),leg:0,fix:1});
    if(st.ground){const roll=st.jet?1700:600,climb=st.jet?2600:1100;cp.push({x:st.x+dx*roll,y:st.y+4,z:st.z+dz*roll,t:th(dx,dz),leg:0,fix:1,str:1});
      const f=objs[0];if(((f.x-st.x)*dx+(f.z-st.z)*dz)>roll+climb+600)cp.push({x:st.x+dx*(roll+climb),y:st.y+(st.jet?190:110),z:st.z+dz*(roll+climb),t:th(dx,dz),leg:0,fix:1,str:1});}
    else cp.push({x:st.x+dx*500,y:st.y,z:st.z+dz*500,t:th(dx,dz),leg:0,fix:1,str:1});}
  objs.forEach((o,i)=>{o.pi=null;
    if(o.type==='ring'){const c={x:o.x,y:o.y,z:o.z,leg:i,o};if(o.dir){c.t=th(o.dir[0],o.dir[1]);c.fix=1;}cp.push(c);return;}
    if(o.type==='land'&&cp.length&&objs[i-1]&&objs[i-1].type==='ring'&&objs[i-1].dir){const A=o.ap,dr=objs[i-1].dir,s=Math.sign(dr[0]*A.sin-dr[1]*A.cos)||1,t=th(dr[0],dr[1]);
      const td=fromLocal(A,-s*(A.len/2-330),0),ro=fromLocal(A,-s*(A.len/2-1100),0);o.td={x:td.x,y:A.elev,z:td.z};
      cp.push({x:td.x,y:A.elev+1,z:td.z,t,fix:1,str:1,leg:i,o},{x:ro.x,y:A.elev+0.5,z:ro.z,t,fix:1,str:1,leg:i});runs.push(cp);cp=[];return;}
    runs.push(cp);cp=[];});
  runs.push(cp);
  for(const c of runs){if(c.length<2)continue;
    // Richtungen an freien Ringen: Winkelhalbierende
    for(let j=0;j<c.length;j++){const q=c[j];if(q.fix)continue;const a=c[j-1],b=c[j+1];let ux=0,uz=0;
      if(a){const l=Math.hypot(q.x-a.x,q.z-a.z)||1;ux+=(q.x-a.x)/l;uz+=(q.z-a.z)/l;}
      if(b){const l=Math.hypot(b.x-q.x,b.z-q.z)||1;ux+=(b.x-q.x)/l;uz+=(b.z-q.z)/l;}
      if(Math.hypot(ux,uz)<0.25&&a&&b){// Haarnadel: quer zur Einflugrichtung, zur Seite des nächsten Rings
        const l=Math.hypot(q.x-a.x,q.z-a.z)||1,ix=(q.x-a.x)/l,iz=(q.z-a.z)/l,side=Math.sign(ix*(b.z-q.z)-iz*(b.x-q.x))||1;ux=-iz*side;uz=ix*side;}
      if(Math.hypot(ux,uz)<1e-6){ux=0;uz=-1;}q.t=th(ux,uz);}
    for(let j=0;j<c.length-1;j++){const A=c[j],B=c[j+1],a=pts.length;let seg=null;
      if(!B.str){const dp=dubinsPts({X:A.x,Y:-A.z,t:A.t},{X:B.x,Y:-B.z,t:B.t},R,STEP);if(dp)seg=dp.pts.map(p=>({x:p.X,z:-p.Y}));}
      if(!seg){const L=Math.hypot(B.x-A.x,B.z-A.z),n=Math.max(1,Math.ceil(L/STEP));seg=[];for(let i=1;i<=n;i++)seg.push({x:A.x+(B.x-A.x)*i/n,z:A.z+(B.z-A.z)*i/n});}
      if(j===0)pts.push({x:A.x,y:A.y,z:A.z,leg:B.leg});
      // Höhe: weich (smoothstep) entlang der Weglänge
      let tot=0;const ds=[];let px=A.x,pz=A.z;for(const q of seg){tot+=Math.hypot(q.x-px,q.z-pz);ds.push(tot);px=q.x;pz=q.z;}
      seg.forEach((q,i)=>{const u=tot>0?ds[i]/tot:1,w=u*u*(3-2*u)*0.6+u*0.4;pts.push({x:q.x,y:A.y+(B.y-A.y)*w,z:q.z,leg:B.leg});});
      if(B.o&&B.o.pi==null)B.o.pi=[Math.max(0,a-1),pts.length];if(B.o)B.o.hd=[Math.cos(B.t),-Math.sin(B.t)];}
    const last=c[c.length-1];if(last.o&&last.o.pi)last.o.pi[1]=pts.length;
    const lo=c.find(q=>q.o&&q.o.type==='land');if(lo&&lo.o.pi)lo.o.pi[1]=pts.length;
    pts.push({...pts[pts.length-1],brk:1});}
  let sAcc=0;for(let k=0;k<pts.length;k++){if(k&&!pts[k-1].brk)sAcc+=Math.hypot(pts[k].x-pts[k-1].x,pts[k].z-pts[k-1].z);pts[k].s=sAcc;}
  return pts;}
export const MISSIONS=[
  {id:'m1',name:'Platzrunde Birrfeld',plane:'alpina',start:['BIR',false],hour:10.5,weather:'fair',
   brief:'Erste Schritte auf dem Flugplatz Birrfeld im Aargau: Start auf Piste 08, Linkskurven über Gegen- und Queranflug, dann Landung auf der kurzen Piste.',
   tip:'Die Piste ist nur 690 m lang: Im Endanflug Klappen 30° (F drücken), langsam fliegen und früh aufsetzen.',
   obj:({RL,F,L})=>[RL('BIR',1300,0,170),RL('BIR',1900,-1000,260),RL('BIR',300,-1400,300),RL('BIR',-1400,-1400,300),RL('BIR',-2100,-700,230),...F('BIR',false,[1300,600],0.06),L('BIR')]},
  {id:'m2',name:'Seeflug Luzern–Alpnach',plane:'alpina',air:{lat:47.058,lon:8.318,alt:520,hdg:118},hour:19.7,weather:'fair',wind:'light',
   brief:'Abendflug knapp über dem Wasser: vom Luzerner Seebecken am Meggenhorn vorbei zum Kreuztrichter, durch die Horwer Bucht und über den Alpnachersee zur Landung in Alpnach.',
   tip:'Bleib tief über dem Wasser und leite die Kurven früh ein – die Ringe liegen dicht hintereinander. Im Endanflug Klappen 20–30°.',
   obj:({R,F,L})=>[R(47.05,8.335,60),R(47.035,8.37,75),R(47.02,8.38,55),R(46.99,8.33,55),R(46.985,8.335,60),R(46.972,8.33,70),R(46.965,8.31,60),...F('ALP',true,[1800,800],0.075),L('ALP')]},
  {id:'m3',name:'Gipfelflug Pilatus',plane:'alpina',air:{lat:47.035,lon:8.292,alt:1900,hdg:205},hour:9.3,weather:'fair',wind:'light',
   brief:'Gipfelflug um den Pilatus (2128 m): von Kriens hinauf zum Pilatus Kulm, um das Tomlishorn herum und in einer steilen Kurve hinunter zum Alpnachersee und zur Landung in Alpnach.',
   tip:'Nah an den Felsen wird es eng – Tempo halten und die Kurve ums Tomlishorn früh einleiten. Danach Schub weg, Luftbremse (B / ✕) und Klappen für den steilen Abstieg.',
   obj:({R,F,L})=>[R(47.01,8.265,870),R(46.99,8.262,820),R(46.979,8.255,200),R(46.977,8.24,450),R(46.965,8.31,420),...F('ALP',true,[1800,800],0.075),L('ALP')]},
  {id:'m4',name:'Hüttenversorgung',plane:'foehn',start:['BUO',false],hour:13.5,weather:'fair',
   brief:'Die Klewenalp und die Hütte auf dem Niederbauen über dem Urnersee brauchen Nachschub. Wirf über jedem Ziel eine Kiste am Fallschirm ab (Leertaste / ▼) und lande wieder in Buochs.',
   tip:'Der weisse Kreis am Boden zeigt, wo die Kiste landen würde. Langsam und tief anfliegen – die Berge stehen nah.',
   obj:({D,DL,R,F,L})=>[DL(46.9394,8.475,'Klewenalp'),DL(46.946,8.555,'Niederbauen'),R(46.982,8.50,520),...F('BUO',true,[2200,900]),L('BUO')]},
  {id:'m5',name:'Zürichsee im Abendrot',plane:'foehn',start:['ZRH16',false],hour:20.1,weather:'fair',
   brief:'Start in Zürich auf Piste 16, tief über die Altstadt und das Seebecken bis Zollikon, Wende über dem Zürichberg und Landung auf Piste 34.',
   tip:'Im Endanflug auf Piste 34 fliegst du von Süden her über Dübendorf. Fahrwerk (G) nicht vergessen!',
   obj:({R,F,L})=>[R(47.41,8.545,380),R(47.378,8.54,330),R(47.355,8.553,280),R(47.34,8.575,300),R(47.37,8.60,350),...F('ZRH16',true,[3000,1300]),L('ZRH16')]},
  {id:'m6',name:'Nachtlandung Zürich',plane:'l320',start:['ZRH10',true],hour:22.6,weather:'clear',
   brief:'Linienflug bei Nacht: Start mit dem LUIS L-320 auf Piste 28, Gegenanflug über die Lägern, weite Rechtskurve über dem Rafzerfeld und langer Endanflug auf Piste 14 – die Lichter von Zürich unter dir.',
   tip:'Folge der leuchtenden Bahn durch die Ringe. Die grosse Kurve mit etwa 25° Querlage bei 400 km/h fliegen. Fahrwerk (G) vor dem Endanflug ausfahren, Klappen schrittweise (F). PAPI: zwei weisse, zwei rote Lichter = perfekter Gleitpfad.',
   // Abflug West, Gegenanflug parallel zur Anfluglinie (6.4 km südwestlich), Halbkreis mit 3.2 km Radius direkt in den Endanflug (10 km)
   obj:({RL,F,L})=>[RL('ZRH10',-4800,0,330),RL('ZRH14',-4600,5700,470),RL('ZRH14',-7600,6400,560),RL('ZRH14',-10600,6400,620),RL('ZRH14',-14071,5463,620),RL('ZRH14',-15008,3200,590),RL('ZRH14',-14071,937,540),...F('ZRH14',false,[9000,6000,3500,1500,600]),L('ZRH14')]},
  {id:'m7',name:'Langstrecke: Ankunft in Zürich',plane:'l350',start:['ZRH16',true,{dist:10000,agl:600}],hour:7.1,weather:'fair',
   brief:'Nach einer langen Nacht über Europa: Mit dem Grossraumjet LUIS L-350 im Morgenlicht über den Zürichsee anfliegen und auf Piste 34 landen.',
   tip:'Das schwere Flugzeug reagiert träge – plane jede Kurve früh. Klappen stufenweise auf FULL, Fahrwerk spätestens 6 km vor der Piste.',
   obj:({F,L})=>[...F('ZRH16',true,[7000,4000,1800,700]),L('ZRH16')]}
  ,{id:'m8',name:'Zugersee-Slalom',plane:'saentis',air:{lat:47.072,lon:8.512,alt:520,hdg:352},hour:16.2,weather:'fair',wind:'light',
   brief:'Mit dem schnellen Säntis S-22 im Tiefflug über den Zugersee: Slalom von Arth bis Zug, dann hinauf zur Landung auf der kurzen Piste von Hausen am Albis.',
   tip:'Die Ringe hängen nur 45 m über dem Wasser und wechseln die Seite – kleine, schnelle Korrekturen statt grosser Kurven. Hausen liegt 170 m höher als der See: rechtzeitig steigen!',
   obj:({R,F,L})=>[R(47.09,8.52,45),R(47.1,8.505,45),R(47.11,8.49,45),R(47.13,8.495,45),R(47.15,8.48,45),R(47.165,8.495,60),...F('HAU',false,[1300,600],0.06),L('HAU')]},
  {id:'m9',name:'Der Riese: L-380 nach Zürich',plane:'l380',start:['ZRH14',false,{dist:11000,agl:620}],hour:18.9,weather:'fair',
   brief:'Der grösste Passagierjet der Flotte im Abendlicht: Anflug aus Nordwesten über das Furttal und Landung auf Piste 14 in Zürich.',
   tip:'Bei 420 Tonnen reagiert alles sehr langsam. Früh verzögern, Klappen schrittweise und das Fahrwerk 8 km vor der Piste ausfahren.',
   obj:({F,L})=>[...F('ZRH14',false,[8000,5000,2500,900]),L('ZRH14')]}
,
  {id:'m10',name:'Bergrettung Engelbergertal',plane:'titlis',air:{lat:46.965,lon:8.393,alt:1650,hdg:178},hour:11.2,weather:'fair',wind:'mid',windDir:200,
   brief:'Auf dem Haldigrat und auf der Bannalp ob dem Engelbergertal warten Bergsteiger auf Medikamente. Fliege mit dem Titlis T-12 hinauf, wirf über beiden Hütten eine Kiste ab und kehre nach Buochs zurück. In den Bergen ist es böig!',
   tip:'Die Hütten liegen auf über 1700 m – steige früh. Mit der Luftbremse (B / ✕) wirst du vor dem Abwurf langsamer. Der weisse Kreis zeigt den Landepunkt der Kiste.',
   obj:({R,DL,F,L})=>[R(46.925,8.40,1200),R(46.9,8.405,1000),DL(46.904,8.437,'Haldigrat'),DL(46.873,8.437,'Bannalp'),R(46.935,8.40,1150),R(46.955,8.385,850),...F('BUO',true,[2200,900]),L('BUO')]},
  {id:'m11',name:'Panoramaflug Luzern',plane:'foehn',start:['EMM',true],hour:15.5,weather:'fair',wind:'light',comfort:true,
   brief:'48 Gäste haben einen Rundflug gebucht: über die Altstadt von Luzern mit der Kapellbrücke, über das Seebecken zum Meggenhorn und über Ebikon zurück nach Emmen. Fliege so sanft wie möglich – steile Kurven, ruckartiges Ziehen und harte Landungen kosten Komfortpunkte.',
   tip:'Querneigung unter 30° halten, Steig- und Sinkraten klein, Nase ruhig. Und vor dem Start den Tower rufen (T / L3)!',
   obj:({R,F,L})=>[R(47.06,8.29,300),R(47.052,8.307,250),R(47.05,8.335,200),R(47.035,8.37,200),R(47.07,8.36,250),R(47.1,8.35,300),R(47.125,8.40,350),R(47.155,8.40,350),...F('EMM',true,[6000,3500,1500,600]),L('EMM')]},
{id:'m12',name:'Seerennen Vierwaldstättersee',plane:'saentis',air:{lat:46.976,lon:8.405,alt:520,hdg:72},hour:13.0,weather:'clear',wind:'light',race:[260,330],
   brief:'Zeitrennen! Mit dem schnellen Säntis S-22 tief über dem Vierwaldstättersee: von Buochs nach Brunnen und zurück – so schnell wie möglich durch alle Ringe. Unter 4:20 gibt es drei Sterne.',
   tip:'Vollgas (W / R2) und die Kurven früh einleiten. Bei Brunnen kommt eine enge Wende – Tempo nicht verlieren, nicht zu steil kurven.',
   obj:({R})=>[R(46.99,8.47,45),R(46.985,8.525,45),R(46.99,8.56,50),R(46.997,8.585,55),R(46.99,8.56,40),R(46.983,8.522,45),R(46.986,8.47,40),R(46.982,8.43,40)]},
  {id:'m13',name:'Föhnsturm in Buochs',plane:'foehn',start:['BUO',true,{dist:5000,agl:300}],hour:17.8,weather:'foehn',wind:{spd:12,gust:7,turb:0.7,dir:222},
   brief:'Föhnlage über der Zentralschweiz: klare Sicht, aber heftige Böen aus Süden. Lande die Föhn TP-42 auf Piste 24 in Buochs – mit kräftigem Seitenwind.',
   tip:'Bei Seitenwind dreht das Flugzeug die Nase in den Wind («Vorhaltewinkel»). Steuere mit A/D gegen die Drift und halte etwas mehr Tempo als sonst – Böen können dich plötzlich absacken lassen.',
   obj:({F,L})=>[...F('BUO',true,[3500,1600,700]),L('BUO')]},
  {id:'m14',name:'Nebelmeer: Blindanflug Zürich',plane:'l330',start:['ZRH14',false,{dist:12500,agl:950}],hour:9.4,weather:'fog',wind:'calm',
   brief:'Hochnebel über dem Mittelland: Über dir strahlende Sonne, unter dir ein weisses Nebelmeer. Sinke mit der LUIS L-330 durch die Wolkendecke und lande auf Piste 14 – nur mit Gleitpfad-Anzeige und den blauen Ringen.',
   tip:'Vertraue den Instrumenten: Gleitpfad-Hinweis oben («zu hoch/zu tief») und die Mittellinie halten. Die Pistenbefeuerung taucht erst etwa 3 km vor dem Aufsetzen auf.',
   obj:({F,L})=>[...F('ZRH14',false,[10000,7500,5000,3000,1500,600]),L('ZRH14')]},
  // ---------- Etappe 3: Notfälle, Löschflugzeug, Wasserflugzeug, Ziellandung, Segelflug ----------
  {id:'m15',name:'Notfall: Motorausfall',plane:'saentis',air:{lat:47.183,lon:8.462,alt:1650,hdg:20},hour:15.2,weather:'fair',wind:'light',emerg:{type:'engine',at:9},
   brief:'Rundflug über dem Zugersee – bis der Motor plötzlich stottert. Ohne Schub musst du im Gleitflug den Flugplatz Hausen am Albis erreichen und sicher landen.',
   tip:'Nase leicht senken und rund 145 km/h halten – so gleitest du am weitesten. Klappen erst ganz zum Schluss. Der grüne Gleitpfad-Hinweis zeigt, ob du hoch genug bist.',
   obj:({L})=>[L('HAU')]},
  {id:'m16',name:'Notfall: Triebwerk aus nach dem Start',plane:'foehn',start:['ZRH10',true],hour:11,weather:'cloudy',wind:'light',emerg:{type:'engine2',ring:1},
   brief:'Start auf Piste 28 in Zürich. Kurz nach dem Abheben fällt das rechte Triebwerk aus. Das Flugzeug giert zur Seite – halte es mit dem Seitenruder gerade, fliege die Platzrunde und lande auf Piste 14.',
   tip:'Seitenruder (Q/E bzw. L1/R1) gegen das Gieren geben, Vollgas auf dem guten Triebwerk. Flache Kurven, nicht zu langsam werden.',
   obj:({RL,F,L})=>[RL('ZRH10',-3200,0,420),RL('ZRH10',-4800,0,600),RL('ZRH14',-8000,3500,800),...F('ZRH14',false,[6000,3500,1500,600]),L('ZRH14')]},
  {id:'m17',name:'Notfall: Fahrwerk klemmt',plane:'l320',start:['ZRH14',false,{dist:12500,agl:850}],hour:18.6,weather:'fair',wind:'light',emerg:{type:'gear',at:6},
   brief:'Anflug auf Zürich mit dem L-320. Die Hydraulik meldet einen Fehler – das Fahrwerk lässt sich nicht normal ausfahren. Pumpe es mit der Handpumpe aus und lande sicher auf Piste 14.',
   tip:'Fahrwerk-Taste (G bzw. ○) 6-mal drücken, dann ist das Fahrwerk verriegelt. Erst danach landen!',
   obj:({F,L})=>[...F('ZRH14',false,[8000,5000,2500,900]),L('ZRH14')]},
  {id:'m18',name:'Waldbrand am Bürgenstock',plane:'feuer',air:{lat:47.043,lon:8.34,alt:520,hdg:100},hour:14.5,weather:'clear',wind:'light',
   brief:'Am Bürgenstock und an der Rigi brennt der Wald! Schöpfe mit dem Feuervogel Wasser aus dem Vierwaldstättersee, wirf es über den Flammen ab und lande danach in Buochs.',
   tip:'Schöpfen: Fahrwerk EINGEFAHREN, sanft auf dem See aufsetzen und mit Schub 3 Sekunden übers Wasser gleiten – dann wieder abheben. Abwerfen mit Leertaste / ▼ knapp vor dem Feuer, höchstens 150 m über Grund.',
   obj:({SC,FI,F,L})=>[SC(47.03,8.378,1600,'Vierwaldstättersee'),FI(46.996,8.378,'Bürgenstock'),SC(47.0,8.47,1500,'Gersauer Becken'),FI(47.03,8.462,'Rigi-Südhang'),...F('BUO',true,[3500,1600,700]),L('BUO')]},
  {id:'m19',name:'Wasserlandung Luzern',plane:'feuer',air:{lat:47.06,lon:8.24,alt:800,hdg:105},hour:8.2,weather:'clear',wind:'calm',
   brief:'Der Feuervogel ist ein Amphibienflugzeug. Flieg über Luzern und lande mitten im Seebecken auf dem Wasser – mit eingefahrenem Fahrwerk!',
   tip:'Fahrwerk eingefahren lassen (G), Klappen 20°, flach anfliegen und mit wenig Sinkrate aufsetzen. Danach Schub weg und ausgleiten lassen.',
   obj:({R,W})=>[R(47.055,8.285,260),R(47.052,8.31,140),W(47.043,8.335,650,'Luzerner Seebecken')]},
  {id:'m20',name:'Ziellande-Wettbewerb Birrfeld',plane:'alpina',start:['BIR',false],hour:10.2,weather:'clear',wind:'calm',contest:true,
   brief:'Drei Platzrunden, drei Ziellandungen: Setze jeweils so nah wie möglich an der weiss-orangen Ziellinie auf und starte gleich wieder durch. Gewertet wird der Abstand zur Linie.',
   tip:'Nach dem Aufsetzen sofort wieder Vollgas (W) und abheben. Im kurzen Endanflug mit Klappen 30° langsam fliegen – die Linie liegt 150 m nach der Schwelle.',
   obj:({RL,F,SP})=>{const C=()=>[RL('BIR',900,0,150),RL('BIR',1500,-850,220),RL('BIR',-300,-1100,250),RL('BIR',-1750,-850,210),...F('BIR',false,[1250,500],0.06)];return[...C(),SP('BIR',1,3,150),...C(),SP('BIR',2,3,150),...C(),SP('BIR',3,3,150)];}},
  {id:'m21',name:'Thermik am Pilatus',plane:'segler',air:{lat:46.952,lon:8.305,alt:1450,hdg:280},hour:13.5,weather:'fair',wind:'calm',thermals:true,
   brief:'Lautlos durch die Alpen: Mit dem Segler LS-18 suchst du unter den Quellwolken Thermik, kreist darin hoch bis zum Pilatus und landest danach in Alpnach.',
   tip:'Unter den weissen Quellwolken steigt die Luft. Dort enge Kreise fliegen (30° Schräglage), bis du hoch genug bist. Das Vario piepst, wenn es steigt. Zum Landen Luftbremse (B).',
   obj:({R,F,L})=>[R(46.957,8.265,620),R(46.978,8.252,330),R(46.97,8.3,700),...F('ALP',true,[1800,800],0.075),L('ALP')]},
  // ---------- Etappe 4 ----------
  {id:'m22',name:'Gewitterfront über Zürich',plane:'foehn',start:['ZRH14',false,{dist:12000,agl:700}],hour:17.3,weather:'storm',
   brief:'Ein Gewitter zieht über Zürich. Blitze, Böen und Regen – bring die Passagiere trotzdem sicher auf Piste 14.',
   tip:'Bei Böen etwas schneller anfliegen (+10 km/h). Die Turbulenz rüttelt – Flügel gerade halten und dem blauen Gleitpfad folgen.',
   obj:({F,L})=>[...F('ZRH14',false,[8000,5000,2500,900]),L('ZRH14')]},
  {id:'m23',name:'Winterzauber an der Rigi',plane:'titlis',air:{lat:47.105,lon:8.47,alt:1700,hdg:175},hour:11.2,weather:'clear',season:'winter',
   brief:'Ein klarer Wintertag: Die Zentralschweiz liegt unter frischem Schnee. Flieg über die verschneite Rigi und den Vierwaldstättersee nach Buochs.',
   tip:'Über dem Schnee täuscht die Höhe – achte auf den Höhenmesser. Im Anflug auf Buochs früh Klappen setzen.',
   obj:({R,F,L})=>[R(47.075,8.47,850),R(47.057,8.488,260),R(47.02,8.45,750),...F('BUO',true,[3500,1600,700]),L('BUO')]},
  {id:'m24',name:'Vom Gate in die Luft',plane:'l320',start:['ZRH16',true],gate:true,hour:7.4,weather:'clear',
   brief:'Ein ganzer Abflug wie im echten Cockpit: Pushback vom Gate, Rollen zur Piste 34, Start und Steigflug nach Westen.',
   tip:'Pushback mit J (Controller ◀). Danach wenig Schub zum Rollen, mit A/D lenken und den grünen Lichtern folgen. Auf der Piste ausrichten, Startfreigabe mit T.',
   obj:({TX,RL})=>[TX(),RL('ZRH16',-5200,0,520),RL('ZRH16',-7800,-2600,800),RL('ZRH16',-8000,-7500,1100)]},
  // ---------- Etappe 6: Rega ----------
  {id:'m25',name:'Rega: Bergrettung am Pilatus',plane:'rega',start:['BUO',false],hour:10.6,weather:'fair',wind:'light',comfort:true,
   brief:'Alarm in Buochs: Eine Wanderin ist am Pilatus gestürzt. Flieg zur Unfallstelle (orangefarbener Rauch), lande beim weissen Kreuz und bring die Patientin ins Kantonsspital Luzern.',
   tip:'W/S bzw. R2/L2 = Kollektiv (steigen/sinken), loslassen hält die Höhe. Stick neigt den Heli, Q/E bzw. L1/R1 drehen. Zum Landen langsam werden, über dem Ziel schweben und mit S sanft absinken.',
   obj:({HL})=>[HL(46.99,8.262,'Pilatus',12,'site'),HL(47.0585,8.2995,'Kantonsspital Luzern',5,'pad')]},
  {id:'m26',name:'Rega: Rettung auf dem Zürichsee',plane:'rega',start:['ZRH16',false],hour:15.4,weather:'fair',wind:'mid',comfort:true,
   brief:'Start bei der Rega-Zentrale am Flughafen Zürich: Auf dem Zürichsee ist ein Segelboot gekentert. Schwebe über dem Boot, damit die Person mit der Seilwinde geborgen werden kann, und flieg danach zum Unispital.',
   tip:'Über dem Boot tief und ruhig schweben (unter 18 m, kaum Bewegung). Der Wind versetzt dich – mit kleinen Stickbewegungen korrigieren.',
   obj:({HO,HL})=>[HO(47.29,8.60,'Zürichsee',10),HL(47.3775,8.5505,'Unispital Zürich',5,'pad')]},
  {id:'m27',name:'Rega: Nachteinsatz an der Rigi',plane:'rega',start:['BUO',false],hour:21.8,weather:'clear',wind:'calm',comfort:true,
   brief:'Nachtalarm: Ein Skitourengänger hat sich bei Rigi Kaltbad verletzt. Flieg im Dunkeln zur Unfallstelle, lande sicher und bring ihn ins Kantonsspital Luzern.',
   tip:'Nachts täuschen Distanzen. Langsam anfliegen und auf den orangen Rauch und das Leuchtsignal achten. Landescheinwerfer helfen beim Aufsetzen.',
   obj:({HL})=>[HL(47.048,8.47,'Rigi Kaltbad',12,'site'),HL(47.0585,8.2995,'Kantonsspital Luzern',5,'pad')]},
  // ---------- Etappe 7: Berner Oberland ----------
  {id:'b1',area:'bo',name:'Jungfrau-Rundflug',plane:'titlis',air:{lat:46.665,lon:7.875,alt:3050,hdg:185},hour:11,weather:'clear',wind:'light',
   brief:'Der Klassiker: durchs Lauterbrunnental mit seinen Wasserfällen hinauf zum Jungfraujoch, vorbei an Mönch und Eiger-Nordwand und über Grindelwald zurück nach Interlaken.',
   tip:'Vor dem Jungfraujoch früh steigen – der Sattel liegt auf 3500 m. Über dem Aletschgletscher wenden, die Höhe halten bis du wieder über dem Grat bist, dann mit wenig Schub und Klappen ins Tal hinunter.',
   obj:({R,F,L})=>[R(46.60,7.905,2200),R(46.565,7.94,2050),R(46.5475,7.985,320),R(46.5316,8.0029,700),R(46.5469,7.9768,380),R(46.585,7.96,1300),R(46.615,8.005,1500),R(46.624,8.035,1300),R(46.637,7.98,800),R(46.632,7.905,380),R(46.66,7.87,320),R(46.705,7.905,260),R(46.722,7.965,260),...F('INT',true,[3000,1400,600]),L('INT')]},
  {id:'b2',area:'bo',name:'Thunersee im Abendrot',plane:'alpina',air:{lat:46.745,lon:7.64,alt:860,hdg:150},hour:19.9,weather:'fair',wind:'calm',
   brief:'Abendstimmung über dem Thunersee: knapp über dem Wasser an Schloss Oberhofen und Schloss Spiez vorbei, mit Blick auf Eiger, Mönch und Jungfrau – Landung in Interlaken.',
   tip:'Tief über dem Wasser bleiben (60–100 m) und den Ringen folgen. Über Interlaken hinweg auf den Brienzersee, dort wenden und von Osten her landen.',
   obj:({R,F,L})=>[R(46.725,7.672,90),R(46.705,7.69,80),R(46.69,7.70,90),R(46.70,7.73,70),R(46.69,7.742,170),R(46.68,7.76,170),R(46.681,7.785,90),R(46.682,7.81,90),R(46.686,7.84,150),R(46.70,7.90,130),R(46.718,7.962,160),...F('INT',true,[2200,900],0.06),L('INT')]},
  {id:'b3',area:'bo',name:'Gletscherflug Aletsch',plane:'saentis',air:{lat:46.535,lon:7.99,alt:3850,hdg:150},hour:13,weather:'clear',wind:'light',
   brief:'Über den grössten Gletscher der Alpen: vom Jungfraujoch über Konkordiaplatz den Aletschgletscher hinunter, dann ins Rhonetal zur Landung in Raron.',
   tip:'Über dem Eis täuscht die Höhe. Nach dem letzten Ring Schub zurück, Luftbremse (B) und in Kurven ins Rhonetal sinken.',
   obj:({R,F,L})=>[R(46.50,8.05,380),R(46.465,8.06,380),R(46.43,8.06,420),R(46.40,8.03,450),R(46.37,8.03,700),R(46.34,8.0,500),R(46.31,7.95,350),R(46.30,7.90,300),...F('RAR',true,[2600,1100],0.065),L('RAR')]},
  {id:'b4',area:'bo',name:'Rega: Einsatz an der Kleinen Scheidegg',plane:'rega',start:['INT',false],hour:14.5,weather:'fair',wind:'light',comfort:true,
   brief:'Ein Bergsteiger hat sich unter der Eiger-Nordwand verletzt. Flieg von Interlaken zur Kleinen Scheidegg, lande beim Kreuz und bring ihn ins Spital Interlaken.',
   tip:'Hinauf zur Scheidegg sind es 1500 Höhenmeter – Kollektiv (W) gedrückt halten. Oben langsam werden und sanft auf dem Kreuz landen.',
   obj:({HL})=>[HL(46.585,7.96,'Kleine Scheidegg',12,'site'),HL(46.684,7.865,'Spital Interlaken',5,'pad')]},
  {id:'b5',area:'bo',name:'Linienflug nach Bern',plane:'l320',start:['BRN',false,{dist:11000,agl:750}],hour:9.2,weather:'fair',wind:'light',
   brief:'Anflug mit dem L-320 auf Bern-Belp: über die Bundesstadt, am Gurten vorbei und auf die kurze Piste 14. Präzision ist gefragt!',
   tip:'Die Piste ist kurz: Klappen voll, genau auf dem Gleitpfad und mit Vref aufsetzen. Danach kräftig bremsen (B) und Umkehrschub.',
   obj:({F,L})=>[...F('BRN',false,[7000,4000,2000,800]),L('BRN')]},
  {id:'b6',area:'bo',name:'Thermik am Niesen',plane:'segler',air:{lat:46.675,lon:7.70,alt:1650,hdg:240},hour:13.5,weather:'fair',wind:'calm',thermals:true,
   brief:'Segelflug über dem Thunersee: Kreise unter den Quellwolken am Niesen hoch, flieg hinüber zum Stockhorn und lande in Reichenbach im Kandertal.',
   tip:'Am Niesen-Osthang steigt die Luft kräftig. Enge Kreise fliegen, bis du über 2600 m bist – erst dann zum nächsten Ring.',
   obj:({R,F,L})=>[R(46.655,7.675,700),R(46.645,7.645,450),R(46.68,7.57,700),R(46.65,7.64,900),...F('REI',false,[1800,800],0.08),L('REI')]},
  {id:'b7',area:'bo',name:'Waldbrand am Harder',plane:'feuer',air:{lat:46.745,lon:8.03,alt:700,hdg:245},hour:15,weather:'clear',wind:'light',
   brief:'Über Interlaken brennt der Wald am Harder und am Beatenberg. Schöpfe Wasser aus Brienzer- und Thunersee, lösche beide Brände und lande danach auf dem Thunersee.',
   tip:'Schöpfen: Fahrwerk ein, auf dem See aufsetzen und 3 Sekunden mit Schub gleiten. Abwurf tief und knapp vor dem Feuer (Leertaste / ▼).',
   obj:({SC,FI,W})=>[SC(46.73,7.98,1800,'Brienzersee'),FI(46.70,7.83,'Harder'),SC(46.70,7.73,1800,'Thunersee'),FI(46.705,7.80,'Beatenberg'),W(46.69,7.72,700,'Thunersee')]},
  // ---------- Etappe 9: die ganze Schweiz ----------
  {id:'c1',name:'Linienflug Zürich – Genf',plane:'l320',start:['ZRH10',true],hour:8.4,weather:'fair',wind:'light',comfort:true,
   brief:'Der Klassiker der Schweizer Luftfahrt: mit dem LUIS L-320 von Zürich quer übers Mittelland, vorbei an Bern und dem Neuenburgersee, dann über den Genfersee zur Landung auf Piste 22 in Genf. Rund 35 Minuten Flug.',
   tip:'Nach dem Start auf etwa 2000 m steigen und mit 450 km/h reisen. Ab Rolle den Sinkflug einleiten – der Endanflug auf Piste 22 beginnt über dem See bei Coppet.',
   obj:({R,RL,F,L})=>[RL('ZRH10',-4800,0,330),R(47.38,8.30,900),R(47.24,7.95,1500),R(47.08,7.52,1700),R(46.92,7.12,1600),R(46.72,6.82,1400),R(46.48,6.42,900),...F('GVA',true,[9000,6000,3500,1500,600]),L('GVA')]},
  {id:'c2',name:'Matterhorn-Rundflug',plane:'titlis',air:{lat:46.285,lon:7.872,alt:1450,hdg:182},hour:10.5,weather:'clear',wind:'light',
   brief:'Von Visp durchs Mattertal hinauf nach Zermatt, einmal ganz um das Matterhorn herum und zurück zur Landung in Raron. Der berühmteste Berg der Alpen aus nächster Nähe.',
   tip:'Im Mattertal stetig steigen – Zermatt liegt auf 1600 m, der Ring am Matterhorn auf über 3500 m. Rund um den Gipfel mit etwa 30° Querlage kreisen, dann mit wenig Schub talwärts. Raron liegt östlich von Visp: Piste 28 von Osten.',
   obj:({R,F,L})=>[R(46.235,7.873,450),R(46.213,7.843,520),R(46.177,7.805,600),R(46.105,7.783,700),R(46.028,7.752,800),R(45.995,7.705,700),R(45.990,7.662,650),R(45.973,7.630,650),R(45.956,7.660,650),R(45.968,7.690,650),R(46.03,7.752,900),R(46.11,7.785,800),R(46.177,7.805,650),R(46.215,7.842,550),R(46.237,7.872,480),R(46.272,7.876,420),...F('RAR',true,[2500,1200,500],0.06),L('RAR')]},
  {id:'c3',name:'Rega: Einsatz am Gotthard',plane:'rega',air:{lat:46.84,lon:8.645,alt:900,hdg:180},hour:10.2,weather:'fair',wind:'mid',comfort:true,
   brief:'Alarm aus der Leventina: Auf der Gotthard-Passstrasse beim Hospiz ist ein Motorradfahrer gestürzt. Flieg von Erstfeld über Andermatt hinauf zum Pass, lande neben der Strasse und bring den Patienten hinunter ins Ospedale San Giovanni in Bellinzona.',
   tip:'Der Pass liegt auf 2100 m – genug Leistung einplanen und gegen den Wind landen. Talwärts in die Leventina der Strasse folgen; Bellinzona erkennst du an den drei Burgen.',
   obj:({HL})=>[HL(46.5578,8.5679,'Gotthard-Hospiz',12,'site'),HL(46.2066,9.0156,'Ospedale San Giovanni',5,'pad')]},
  {id:'c4',name:'Lugano: Anflug zwischen den Bergen',plane:'titlis',air:{lat:45.872,lon:8.985,alt:1150,hdg:330},hour:18.3,weather:'fair',wind:'calm',
   brief:'Abendstimmung im Tessin: von Mendrisio über den Luganersee zum Seedamm von Melide, rund um die Halbinsel von Morcote und durch den Seearm von Figino in den steilen Anflug auf Piste 01 von Lugano-Agno.',
   tip:'Lugano liegt eng zwischen Bergen: Der Gleitpfad ist mit 4° steiler als sonst. Früh Klappen setzen, langsam fliegen und erst über dem See auf die Pistenachse eindrehen.',
   obj:({R,F,L})=>[R(45.915,8.968,350),R(45.952,8.950,300),R(45.921,8.912,300),R(45.947,8.897,300),...F('LUG',false,[3000,1500,600],0.07),L('LUG')]},
  {id:'c5',name:'Engadin: Landung in Samedan',plane:'alpina',air:{lat:46.418,lon:9.735,alt:2150,hdg:48},hour:12.5,weather:'clear',wind:'light',
   brief:'Hoch hinaus: über die Oberengadiner Seen von Sils über Silvaplana nach St. Moritz und zur Landung in Samedan – mit 1707 m der höchste Flugplatz Europas mit Linienverkehr-Piste.',
   tip:'In dünner Luft steigt das Flugzeug träge und braucht mehr Anlauf. Tief über den Seen bleiben, nach St. Moritz sanft nach links auf die Piste 03 eindrehen.',
   obj:({R,F,L})=>[R(46.435,9.765,180),R(46.462,9.795,180),R(46.493,9.838,200),...F('SMV',false,[3000,1400,600],0.06),L('SMV')]},
  {id:'c6',name:'Genfersee: Lavaux und Jet d’Eau',plane:'saentis',air:{lat:46.50,lon:6.66,alt:620,hdg:245},hour:16.8,weather:'clear',wind:'light',
   brief:'Tiefflug über den Genfersee: von Lausanne-Ouchy vorbei an Morges, Rolle und Nyon nach Genf, einmal hoch über den Jet d’Eau und dann zur Landung auf Piste 04.',
   tip:'Die Ringe hängen nur 60 m über dem Wasser – ruhig und gleichmässig fliegen. Nach dem Jet d’Eau westwärts über die Stadt, dann in einem weiten Bogen auf die Piste 04 eindrehen.',
   obj:({R,F,L})=>[R(46.48,6.55,60),R(46.43,6.38,60),R(46.37,6.25,60),R(46.29,6.18,60),R(46.212,6.162,200),R(46.20,6.12,320),...F('GVA',false,[5000,2500,1000]),L('GVA')]},
  {id:'c7',name:'Basel bei Nacht',plane:'l320',air:{lat:47.556,lon:7.86,alt:950,hdg:268},hour:21.6,weather:'clear',wind:'calm',comfort:true,
   brief:'Nachtflug am Rheinknie: entlang des Rheins von Rheinfelden nach Basel, über die Lichter der Stadt und in den Anflug auf Piste 33 des EuroAirports Basel-Mulhouse – der Flughafen liegt in Frankreich.',
   tip:'Nachts täuschen Distanzen: die Ringe und die Flugbahn zeigen dir den Weg. Vor Basel Fahrwerk und Klappen setzen, nach dem letzten Ring weit nach rechts auf die Pistenachse eindrehen.',
   obj:({R,F,L})=>[R(47.553,7.77,520),R(47.545,7.665,480),...F('BSL',true,[7000,4000,1800,700]),L('BSL')]}
];
