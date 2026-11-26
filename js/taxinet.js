// Rollweg-Netz aus OpenStreetMap: Graph, Wegsuche (A* mit Kurvenregeln), Rollhalte, Standplätze, Pushback-Weg
import {TAXIWAYS} from './taxiways.js';
import {AIRPORTS,toLocal} from './worldgen.js';
const CACHE={};
export function taxiNet(ic){
  if(ic in CACHE)return CACHE[ic];const T=TAXIWAYS[ic];if(!T)return CACHE[ic]=null;
  const N=T.n.length/2,X=new Float64Array(N),Z=new Float64Array(N);for(let i=0;i<N;i++){X[i]=T.n[2*i]/10;Z[i]=T.n[2*i+1]/10;}
  const rws=AIRPORTS.filter(a=>a.icao===ic),adj=Array.from({length:N},()=>[]),edges=[];
  const onRwy=(x,z)=>rws.some(R=>{const l=toLocal(R,x,z);return Math.abs(l.across)<R.w/2+2&&Math.abs(l.along)<R.len/2;});
  for(let i=0;i<T.e.length;i+=5){const a=T.e[i],b=T.e[i+1],len=Math.hypot(X[b]-X[a],Z[b]-Z[a]);if(len<0.01)continue;
    const k=edges.length,mx=(X[a]+X[b])/2,mz=(Z[a]+Z[b])/2;
    edges.push({a,b,ref:T.r[T.e[i+2]]||'',w:T.e[i+3],lane:!!T.e[i+4],len,rwy:onRwy(mx,mz)||onRwy(X[a],Z[a])&&onRwy(X[b],Z[b])});adj[a].push(k);adj[b].push(k);}
  // Raster für die Suche nach dem nächsten Rollweg
  const C=80,grid=new Map(),key=(i,j)=>i*100003+j;
  edges.forEach((e,k)=>{const x0=Math.min(X[e.a],X[e.b]),x1=Math.max(X[e.a],X[e.b]),z0=Math.min(Z[e.a],Z[e.b]),z1=Math.max(Z[e.a],Z[e.b]);
    for(let i=Math.floor(x0/C);i<=Math.floor(x1/C);i++)for(let j=Math.floor(z0/C);j<=Math.floor(z1/C);j++){const q=key(i,j);if(!grid.has(q))grid.set(q,[]);grid.get(q).push(k);}});
  const holds=T.h.map(([n,x,z,ref])=>({n,x,z,ref})),stands=T.s.map(([x,z,ref,n])=>({x,z,ref,n}));
  const aprons=T.a.map(p=>{const P=[];for(let i=0;i<p.length;i+=2)P.push([p[i]/10,p[i+1]/10]);return P;});
  return CACHE[ic]={ic,N,X,Z,adj,edges,holds,stands,aprons,rws,grid,C,key,refs:T.r};}
const other=(e,n)=>e.a===n?e.b:e.a;
// nächste Kante zu einem Punkt (optional nur ungefähr parallel zu dir)
export function nearestEdge(net,x,z,maxD,dir,maxAng){const {C,grid,key,X,Z,edges}=net;let best=null;const r=Math.ceil(maxD/C);
  for(let i=Math.floor(x/C)-r;i<=Math.floor(x/C)+r;i++)for(let j=Math.floor(z/C)-r;j<=Math.floor(z/C)+r;j++){const L=grid.get(key(i,j));if(!L)continue;
    for(const k of L){const e=edges[k];if(e.rwy)continue;const ax=X[e.a],az=Z[e.a],dx=X[e.b]-ax,dz=Z[e.b]-az,L2=dx*dx+dz*dz;let t=((x-ax)*dx+(z-az)*dz)/L2;t=Math.max(0,Math.min(1,t));
      const px=ax+dx*t,pz=az+dz*t,d=Math.hypot(px-x,pz-z);if(d>maxD)continue;
      if(dir){const c=Math.abs(dx*dir[0]+dz*dir[1])/Math.sqrt(L2);if(c<Math.cos(maxAng||0.45))continue;}
      if(!best||d<best.d)best={k,t,d,x:px,z:pz};}}
  return best;}
// Rollhalt vor einer Piste: R = Piste, sgn = +1 Start am A-Ende (rwyA), -1 am B-Ende
export function holdFor(net,R,sgn){if(!net)return null;const th=-sgn*R.len/2;let best=null;
  for(const h of net.holds){const l=toLocal(R,h.x,h.z);if(Math.abs(l.across)<R.w/2+15||Math.abs(l.across)>200||Math.abs(l.along)>R.len/2+150)continue;
    // gehört der Rollhalt zu dieser Piste (nächste Piste des Platzes)?
    const mine=net.rws.every(Q=>Q===R||Math.abs(toLocal(Q,h.x,h.z).across)>Math.abs(l.across)||Math.abs(toLocal(Q,h.x,h.z).along)>Q.len/2+150);if(!mine)continue;
    const ac=Math.abs(l.across),d=Math.abs(l.along-th)+(ac>145?400:0)+(h.ref?0:60);if(!best||d<best.d)best={...h,d};}
  return best;}
// A* über gerichtete Kanten: keine Spitzkehren (> 115°), Pisten nur queren wenn nötig, Rollgassen (Vorfeld) etwas teurer
export function route(net,x0,z0,goalNode,opt={}){if(!net||goalNode==null||goalNode<0)return null;const {X,Z,edges,adj}=net,gx=X[goalNode],gz=Z[goalNode];
  const st=opt.from?{k:opt.from.k,t:0,x:X[opt.from.n],z:Z[opt.from.n],d:0}:nearestEdge(net,x0,z0,opt.maxD||120);if(!st)return null;const e0=edges[st.k];
  const cost=e=>e.len*(e.lane?1.35:1)*(opt.jet&&e.lane&&e.w<15?1.3:1)+(e.rwy?900:0);
  const H=n=>Math.hypot(X[n]-gx,Z[n]-gz);const best=new Map(),heap=[];
  const push=(f,s)=>{heap.push([f,s]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const t=heap[0],l=heap.pop();if(heap.length){heap[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<heap.length&&heap[a][0]<heap[m][0])m=a;if(b<heap.length&&heap[b][0]<heap[m][0])m=b;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return t;};
  // Zustand: an Knoten n, angekommen über Kante k (Richtung ist damit bekannt)
  const hd=opt.heading;// [dx,dz] Blickrichtung zu Beginn (optional)
  for(const [n,frac] of opt.from?[[opt.from.n,0]]:[[e0.a,st.t],[e0.b,1-st.t]]){const dx=X[n]-st.x,dz=Z[n]-st.z,dl=Math.hypot(dx,dz)||1;let pen=0;
    if(hd&&dl>3){const c=(dx*hd[0]+dz*hd[1])/dl;if(c<-0.3)pen=opt.strictHeading?Infinity:600;}
    if(pen===Infinity)continue;const g=e0.len*frac*(e0.lane?1.35:1)+pen,s={n,k:st.k,g,prev:null};best.set(n+':'+st.k,g);push(g+H(n),s);}
  let found=null,it=0;
  while(heap.length&&it++<200000){const [,s]=pop();if(best.get(s.n+':'+s.k)<s.g-1e-6)continue;if(s.n===goalNode){found=s;break;}
    const e=edges[s.k],pn=other(e,s.n),ix=X[s.n]-X[pn],iz=Z[s.n]-Z[pn],il=Math.hypot(ix,iz)||1;
    for(const k2 of adj[s.n]){if(k2===s.k)continue;const e2=edges[k2],m=other(e2,s.n),ox=X[m]-X[s.n],oz=Z[m]-Z[s.n],ol=Math.hypot(ox,oz)||1;
      const c=(ix*ox+iz*oz)/(il*ol);if(c<-0.42)continue;// Spitzkehre
      const g=s.g+cost(e2)+(c<0.5?8:0),kk=m+':'+k2;if(best.has(kk)&&best.get(kk)<=g)continue;best.set(kk,g);push(g+H(m),{n:m,k:k2,g,prev:s});}}
  if(!found)return null;const nodes=[],ks=[];for(let s=found;s;s=s.prev){nodes.push(s.n);ks.push(s.k);}nodes.reverse();ks.reverse();
  const pts=[[x0,z0],[st.x,st.z],...nodes.map(n=>[X[n],Z[n]])];
  // Namen der Rollwege in Reihenfolge (ohne Wiederholungen, ohne unbenannte Gassen)
  // nur sprechbare Rollweg-Namen (A, E11, Link 3, Inner) – OSM-Notizen wie «D1TOD5» oder «PRKG E-F» fallen weg
  const names=[],ok=r=>/^([A-Z]{1,2}\d{0,2}|Link [0-9A-Z]{1,2}|[A-Z][a-z]{2,8})$/.test(r);for(const k of ks){const r=edges[k].ref;if(r&&ok(r)&&names[names.length-1]!==r&&!edges[k].rwy)names.push(r);}
  return{pts:dedup(pts),names,nodes,edges:ks,len:found.g};}
function dedup(P){const o=[];for(const p of P)if(!o.length||Math.hypot(p[0]-o[o.length-1][0],p[1]-o[o.length-1][1])>0.5)o.push(p);return o;}
// Polylinie mit runden Kurven (Radius r) neu abtasten, Schrittweite ds
export function smoothPath(P,r,ds){if(P.length<3)return resample(P,ds);const out=[P[0]];
  for(let i=1;i<P.length-1;i++){const a=P[i-1],b=P[i],c=P[i+1],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const u1=[(b[0]-a[0])/l1,(b[1]-a[1])/l1],u2=[(c[0]-b[0])/l2,(c[1]-b[1])/l2],cs=u1[0]*u2[0]+u1[1]*u2[1];
    if(cs>0.995){out.push(b);continue;}const t=Math.min(r*Math.tan(Math.acos(Math.max(-1,Math.min(1,cs)))/2),l1*0.48,l2*0.48);
    const p0=[b[0]-u1[0]*t,b[1]-u1[1]*t],p2=[b[0]+u2[0]*t,b[1]+u2[1]*t];for(let q=0;q<=8;q++){const s=q/8,w0=(1-s)*(1-s),w1=2*s*(1-s),w2=s*s;out.push([p0[0]*w0+b[0]*w1+p2[0]*w2,p0[1]*w0+b[1]*w1+p2[1]*w2]);}}
  out.push(P[P.length-1]);return resample(dedup(out),ds);}
export function resample(P,ds){const o=[P[0]];let acc=0;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);let s=ds-acc;
    while(s<=L){o.push([a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L]);s+=ds;}acc=L-(s-ds);}
  const l=P[P.length-1];if(Math.hypot(l[0]-o[o.length-1][0],l[1]-o[o.length-1][1])>ds*0.3)o.push(l);return o;}
// ab Punkt p auf Kante k in Richtung Knoten n die Strecke D entlanglaufen (geradeaus über Knoten hinweg)
function walkAlong(net,p,k,n,D){const {X,Z,edges,adj}=net,out=[];let acc=0,cx=p[0],cz=p[1],kk=k,nn=n;
  for(let g=0;g<60;g++){const seg=Math.hypot(X[nn]-cx,Z[nn]-cz);if(acc+seg>=D){const t=(D-acc)/(seg||1);out.push([cx+(X[nn]-cx)*t,cz+(Z[nn]-cz)*t]);return out;}
    acc+=seg;out.push([X[nn],Z[nn]]);const ux=X[nn]-cx,uz=Z[nn]-cz;let bq=null,bc=0.75;
    for(const q of adj[nn]){if(q===kk)continue;const m=other(edges[q],nn),c=((X[m]-X[nn])*ux+(Z[m]-Z[nn])*uz)/(edges[q].len*Math.hypot(ux,uz)||1);if(c>bc){bc=c;bq=q;}}
    if(bq==null){const l=Math.hypot(ux,uz)||1;out.push([X[nn]+ux/l*(D-acc),Z[nn]+uz/l*(D-acc)]);return out;}
    cx=X[nn];cz=Z[nn];kk=bq;nn=other(edges[bq],nn);}
  return out;}
// Pushback: vom Stand rückwärts (über die Zufahrt, falls in OSM vorhanden, sonst gerade) bis auf die Rollgasse,
// dann entlang der Rollgasse so weit zurück, dass die Nase in Rollrichtung zum Ziel zeigt.
// x,z = Flugzeugmitte, nose = [dx,dz] Blickrichtung, L = Rumpflänge, goal = Ziel-Knoten (Rollhalt)
export function planPushback(net,x,z,nose,L,goal,opt={}){if(!net)return null;const {X,Z,edges,adj}=net,back=[-nose[0],-nose[1]],jet=opt.jet;
  const Dp=Math.max(22,L*0.5+8),R=Math.max(18,Math.min(36,L*0.7));let P=[[x,z]],J=null;
  // 1) Zufahrt (Rollgasse unter dem Flugzeug, parallel zur Rumpfachse) bis zur ersten Verzweigung
  const lead=nearestEdge(net,x,z,30,nose,0.4);
  if(lead){const e=edges[lead.k];let n=(X[e.b]-X[e.a])*back[0]+(Z[e.b]-Z[e.a])*back[1]>0?e.b:e.a,k=lead.k,guard=0;P.push([lead.x,lead.z],[X[n],Z[n]]);
    while(adj[n].length===2&&guard++<60){const k2=adj[n].find(q=>q!==k),m=other(edges[k2],n);k=k2;n=m;P.push([X[n],Z[n]]);}
    if(adj[n].length>=3)J={n,kIn:k};else P=[[x,z]];}
  // Kandidaten für die Rollrichtung ab dem Einmündungspunkt
  const cands=[];
  if(J){for(const q of adj[J.n]){if(q===J.kIn)continue;const m=other(edges[q],J.n),d=[X[m]-X[J.n],Z[m]-Z[J.n]],l=Math.hypot(d[0],d[1])||1;cands.push({p:[X[J.n],Z[J.n]],dF:[d[0]/l,d[1]/l]});}}
  else{// 2) gerade zurück bis zur ersten querenden Rollgasse
    let hit=null;for(let s=6;s<=260&&!hit;s+=3){const qx=x+back[0]*s,qz=z+back[1]*s,c=nearestEdge(net,qx,qz,2.5);if(!c)continue;const e=edges[c.k],ex=X[e.b]-X[e.a],ez=Z[e.b]-Z[e.a];
      if(Math.abs(ex*back[0]+ez*back[1])/e.len<0.72)hit=c;}
    if(!hit)return null;const e=edges[hit.k];P.push([hit.x,hit.z]);
    for(const n of [e.a,e.b]){const d=[X[n]-hit.x,Z[n]-hit.z],l=Math.hypot(d[0],d[1]);if(l<0.5)continue;cands.push({p:[hit.x,hit.z],dF:[d[0]/l,d[1]/l],k:hit.k,toward:n});}}
  // beste Rollrichtung: kürzester Weg zum Ziel, der in dieser Richtung beginnt; Rollweg, nicht zurück in die Zufahrt
  let best=null;for(const c of cands){const r=route(net,c.p[0]+c.dF[0]*0.6,c.p[1]+c.dF[1]*0.6,goal,{jet,maxD:3,heading:c.dF,strictHeading:true});
    // Wendung vom Rückwärtsschieben in die Rollrichtung: zwischen 45° und 135° zur Schubrichtung ist realistisch
    const last=P[P.length-1],prev=P[P.length-2]||[x,z],ux=last[0]-prev[0],uz=last[1]-prev[1],ul=Math.hypot(ux,uz)||1,c2=Math.abs((ux*c.dF[0]+uz*c.dF[1])/ul);
    if(r&&(!best||r.len+c2*200<best.score))best={...c,r,score:r.len+c2*200};}
  if(!best)return null;
  // Heck in Gegenrichtung schieben
  let tail;if(J){let bk=null,bc=0.3;for(const q of adj[J.n]){if(q===J.kIn)continue;const m=other(edges[q],J.n),dx=X[m]-X[J.n],dz=Z[m]-Z[J.n],c=-(dx*best.dF[0]+dz*best.dF[1])/(Math.hypot(dx,dz)||1);if(c>bc){bc=c;bk=q;}}
      tail=bk!=null?walkAlong(net,best.p,bk,other(edges[bk],J.n),Dp):[[best.p[0]-best.dF[0]*Dp,best.p[1]-best.dF[1]*Dp]];}
  else{const e=edges[best.k],away=best.toward===e.a?e.b:e.a;tail=walkAlong(net,best.p,best.k,away,Dp);}
  const path=smoothPath(dedup([...P,...tail]),R,1),end=path[path.length-1],pe=path[path.length-6]||path[0];
  const dir=[pe[0]-end[0],pe[1]-end[1]],dl=Math.hypot(dir[0],dir[1])||1;
  const taxi=route(net,end[0],end[1],goal,{jet,maxD:15,heading:[dir[0]/dl,dir[1]/dl],strictHeading:true})||best.r;
  return{path,taxi};}
// Standplätze mit genau einer Zufahrt: Position (Bugrad), Blickrichtung in die Box, Abstand zum nächsten Stand
const pip=(P,x,z)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;};
// Standplätze mit Blickrichtung; ap: liegt auf einer gezeichneten Vorfeldfläche (bevorzugt)
export function standsFor(ic,jet){const net=taxiNet(ic);if(!net)return[];if(!net.sf)net.sf={};if(net.sf[jet])return net.sf[jet];const {X,Z,adj,edges,grid,key,C}=net,out=net.sf[jet]=[],dead=n=>adj[n].length===1;
  for(const st of net.stands){let nn=1e9;for(const o of net.stands)if(o!==st)nn=Math.min(nn,Math.hypot(o.x-st.x,o.z-st.z));if(jet&&nn<34)continue;const n=st.n;
    if(n>=0&&dead(n)){const e=edges[adj[n][0]],m=e.a===n?e.b:e.a,dl=Math.hypot(X[n]-X[m],Z[n]-Z[m])||1;
      out.push({n,x:X[n],z:Z[n],fx:(X[n]-X[m])/dl,fz:(Z[n]-Z[m])/dl,nn,ref:st.ref||'',lead:true,ap:net.aprons.some(P=>pip(P,X[n],Z[n]))});continue;}
    // Standplatz ohne eigene Einfahrtslinie: Nase weg vom nächsten Rollweg (keine Sackgassen, keine Pisten)
    let b=null;const r=Math.ceil(100/C);
    for(let i=Math.floor(st.x/C)-r;i<=Math.floor(st.x/C)+r;i++)for(let j=Math.floor(st.z/C)-r;j<=Math.floor(st.z/C)+r;j++){const L=grid.get(key(i,j));if(!L)continue;
      for(const k of L){const e=edges[k];if(e.rwy||dead(e.a)||dead(e.b))continue;const ax=X[e.a],az=Z[e.a],dx=X[e.b]-ax,dz=Z[e.b]-az,L2=dx*dx+dz*dz||1;
        const t=Math.max(0,Math.min(1,((st.x-ax)*dx+(st.z-az)*dz)/L2)),px=ax+dx*t,pz=az+dz*t,d=Math.hypot(st.x-px,st.z-pz);
        if(d>=8&&d<=100&&(!b||d<b.d))b={d,t,px,pz,e};}}
    if(b)out.push({n:b.t<0.5?b.e.a:b.e.b,x:st.x,z:st.z,fx:(st.x-b.px)/b.d,fz:(st.z-b.pz)/b.d,nn,ref:st.ref||'',ex:b.px,ez:b.pz,ap:net.aprons.some(P=>pip(P,st.x,st.z))});}
  return out;}
