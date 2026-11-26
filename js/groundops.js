// Bodenbetrieb: Gate, Pushback mit Schlepper, Rollweg-Planung (A*) über befestigte Flächen
// Ausgelagert aus main.js. Gemeinsamer Zustand kommt über ctx (Getter), damit immer der aktuelle Flug gilt.
import * as THREE from 'three';
import {fromLocal,toLocal} from './worldgen.js';
import {makeGlow} from './env.js';
import {orthoPaved} from './ortho.js';
import {taxiNet,planPushback,smoothPath,holdFor,route} from './taxinet.js';
import {AIRLINER} from './aircraft.js';
export function createGroundOps(ctx){
function setupGate(){const {G,AP,scene}=ctx;const F=G.F;G.tug=new THREE.Group();const tb=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.3,5.2),new THREE.MeshStandardMaterial({color:0xf2c200,roughness:0.5}));tb.position.y=0.95;G.tug.add(tb);
  const cb=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.0,1.6),new THREE.MeshStandardMaterial({color:0x22262c,roughness:0.3,metalness:0.4}));cb.position.set(0,2.0,1.4);G.tug.add(cb);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,4),new THREE.MeshStandardMaterial({color:0x444}));bar.position.set(0,0.6,-4.3);G.tug.add(bar);
  scene.add(G.tug);G.dyn.push(G.tug);placeTug();
  const o=G.obj.find(q=>q.type==='taxi');G.pushPlan=null;G.taxiRoute=null;if(o){const A=AP.ZRH16;const l0=toLocal(A,F.pos.x,F.pos.z);G.taxiPlan={A,l0,o};
    // echtes Rollwegnetz (OSM): Pushback-Weg und Rollweg zum Haltepunkt vorausplanen
    const net=taxiNet('LSZH');if(net&&o.hold!=null){const e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),C=AIRLINER[F.P.id];
      try{const pb=planPushback(net,F.pos.x,F.pos.z,[-Math.sin(e.y),-Math.cos(e.y)],C?C.L:30,o.hold,{jet:F.P.cls==='jet'});if(pb){G.pushPlan=pb;G.taxiRoute=pb.taxi;}}catch(err){console.warn('Pushback-Planung',err);}}}}
function noseDist(){const {G}=ctx;const b=new THREE.Box3().setFromObject(G.model);return Math.max(8,-(b.min.z-G.model.position.z));}
function placeTug(){const {G,S}=ctx;if(!G.tug)return;const F=G.F,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),fx=-Math.sin(e.y),fz=-Math.cos(e.y),d=(G.noseD||(G.noseD=G.F.P.camDist*0.45))+6.5;
  G.tug.position.set(F.pos.x+fx*d,S.groundAt(F.pos.x+fx*d,F.pos.z+fz*d),F.pos.z+fz*d);G.tug.rotation.y=e.y+Math.PI;}
function startPushback(){const {G,atc,audio,toast}=ctx;if(G.push)return;G.atGate=false;const F=G.F,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ'),o=G.obj.find(q=>q.type==='taxi');
  let dir=1;if(o){const back=[Math.sin(e.y)*45,Math.cos(e.y)*45],p=[F.pos.x+back[0],F.pos.z+back[1]],to=[o.x-p[0],o.z-p[1]];const nose=a=>[-Math.sin(e.y+a),-Math.cos(e.y+a)];const d1=nose(Math.PI/2),d2=nose(-Math.PI/2);dir=(d1[0]*to[0]+d1[1]*to[1])>(d2[0]*to[0]+d2[1]*to[1])?1:-1;}
  // weiter zurückstossen: Nase mindestens 25 m vor die Fluggastbrücke, dann in weitem Bogen drehen
  if(G.pushPlan){const P=G.pushPlan.path,cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
    G.push={mode:'path',P,cum,L:cum[cum.length-1],s:0,i:0,ph:0,yaw:e.y};audio.click();atc.c&&toast('Pushback läuft …',2500);return;}
  G.push={ph:0,rem:Math.max(55,(G.noseD||noseDist())*1.3+25),ang:0,dir,yaw:e.y};audio.click();atc.c&&toast('Pushback läuft …',2500);}
// Punkt und Richtung auf dem Pushback-Weg bei Bogenlänge s
function pathAt(p,s){const {P,cum}=p;while(p.i<P.length-2&&cum[p.i+1]<s)p.i++;while(p.i>0&&cum[p.i]>s)p.i--;const i=p.i,t=Math.min(1,Math.max(0,(s-cum[i])/((cum[i+1]-cum[i])||1)));
  const x=P[i][0]+(P[i+1][0]-P[i][0])*t,z=P[i][1]+(P[i+1][1]-P[i][1])*t,a=P[Math.max(0,i-3)],b=P[Math.min(P.length-1,i+4)];return[x,z,b[0]-a[0],b[1]-a[1]];}
function pushTick(F,dt){const {G,S,audio,toast}=ctx;const p=G.push;let v=2.4;F.vel.set(0,0,0);F.thr=0;
  if(p.mode==='path'&&p.ph===0){v=Math.max(0.3,Math.min(2.6,0.5+p.s*0.25,0.3+(p.L-p.s)*0.3));p.s=Math.min(p.L,p.s+v*dt);const [x,z,tx,tz]=pathAt(p,p.s);F.pos.x=x;F.pos.z=z;
    if(Math.hypot(tx,tz)>0.5){const y=Math.atan2(tx,tz);let d=y-p.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));p.yaw+=d*Math.min(1,dt*5);}if(p.s>=p.L-0.01)p.ph=2,p.t=0;}
  else if(p.mode==='path'){}
  else if(p.ph===0){const d=Math.min(dt*v,p.rem);F.pos.x+=Math.sin(p.yaw)*d;F.pos.z+=Math.cos(p.yaw)*d;p.rem-=d;if(p.rem<=0)p.ph=1;}
  else if(p.ph===1){const w=v/38*dt;p.yaw+=p.dir*w;p.ang+=w;F.pos.x+=Math.sin(p.yaw)*v*dt;F.pos.z+=Math.cos(p.yaw)*v*dt;if(p.ang>=Math.PI/2)p.ph=2,p.t=0;}
  if(p.ph===2){p.t+=dt;if(p.t>2){G.push=null;if(G.tug)G.tug.visible=false;F.brake=false;toast('Pushback beendet – Schub geben und den grünen Rolllichtern zur Piste 34 folgen.',5000);buildTaxiDots();audio.chime();}}
  F.q.setFromEuler(new THREE.Euler(0,p.yaw,0,'YXZ'));F.pos.y=S.heightAt(F.pos.x,F.pos.z)+F.P.gearH;placeTug();}
// Rollweg zur Piste: kürzester Weg über befestigte Flächen im Luftbild, mit Abstand zu allen Gebäuden (halbe Spannweite)
function planTaxi(x0,z0,x1,z1,half){const {world}=ctx;const C=6,pad=450,X0=Math.min(x0,x1)-pad,Z0=Math.min(z0,z1)-pad,NX=Math.ceil((Math.max(x0,x1)+pad-X0)/C),NZ=Math.ceil((Math.max(z0,z1)+pad-Z0)/C),N=NX*NZ;
  if(N>600000)return null;const occ=new Uint8Array(N),idx=(i,j)=>j*NX+i;
  // Gebäude-Dreiecke auf den Boden projizieren und rastern
  const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
  for(const m of world.heavy||[]){const g=m.geometry;if(!g||!g.attributes.aInfo)continue;const P=g.attributes.position,I=g.index,ox=m.position.x,oz=m.position.z;
    if(g.boundingBox==null)g.computeBoundingBox();const bb=g.boundingBox;if(bb.max.x+ox<X0||bb.min.x+ox>X0+NX*C||bb.max.z+oz<Z0||bb.min.z+oz>Z0+NZ*C)continue;
    const nT=I?I.count/3:P.count/3;for(let t=0;t<nT;t++){const a=I?I.getX(t*3):t*3,b=I?I.getX(t*3+1):t*3+1,c=I?I.getX(t*3+2):t*3+2;
      va.fromBufferAttribute(P,a);vb.fromBufferAttribute(P,b);vc.fromBufferAttribute(P,c);const mnx=Math.min(va.x,vb.x,vc.x)+ox,mxx=Math.max(va.x,vb.x,vc.x)+ox,mnz=Math.min(va.z,vb.z,vc.z)+oz,mxz=Math.max(va.z,vb.z,vc.z)+oz;
      if(mxx<X0||mnx>X0+NX*C||mxz<Z0||mnz>Z0+NZ*C)continue;const n=Math.max(1,Math.ceil(Math.max(mxx-mnx,mxz-mnz)/(C*0.5)));
      for(let u=0;u<=n;u++)for(let w=0;w<=n-u;w++){const A1=u/n,B1=w/n,C1=1-A1-B1,x=va.x*A1+vb.x*B1+vc.x*C1+ox,z=va.z*A1+vb.z*B1+vc.z*C1+oz,i=Math.floor((x-X0)/C),j=Math.floor((z-Z0)/C);if(i>=0&&j>=0&&i<NX&&j<NZ)occ[idx(i,j)]=1;}}}
  // Abstand zum nächsten Gebäude (Chamfer-Distanz, in Zellen)
  const D=new Float32Array(N).fill(1e6);for(let k=0;k<N;k++)if(occ[k])D[k]=0;const s2=1.414;
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const k=idx(i,j);let d=D[k];if(i>0)d=Math.min(d,D[k-1]+1);if(j>0){d=Math.min(d,D[k-NX]+1);if(i>0)d=Math.min(d,D[k-NX-1]+s2);if(i<NX-1)d=Math.min(d,D[k-NX+1]+s2);}D[k]=d;}
  for(let j=NZ-1;j>=0;j--)for(let i=NX-1;i>=0;i--){const k=idx(i,j);let d=D[k];if(i<NX-1)d=Math.min(d,D[k+1]+1);if(j<NZ-1){d=Math.min(d,D[k+NX]+1);if(i<NX-1)d=Math.min(d,D[k+NX+1]+s2);if(i>0)d=Math.min(d,D[k+NX-1]+s2);}D[k]=d;}
  const need=(half+4)/C,cost=new Float32Array(N);
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const k=idx(i,j),x=X0+(i+0.5)*C,z=Z0+(j+0.5)*C;
    if(D[k]<need&&Math.hypot(x-x0,z-z0)>40&&Math.hypot(x-x1,z-z1)>40){cost[k]=Infinity;continue;}const pv=orthoPaved(x,z);cost[k]=pv===1?1:pv===0?14:3;}
  // A*
  const si=Math.floor((x0-X0)/C),sj=Math.floor((z0-Z0)/C),gi=Math.floor((x1-X0)/C),gj=Math.floor((z1-Z0)/C),S0=idx(si,sj),G0=idx(gi,gj);
  const gS=new Float64Array(N).fill(Infinity),from=new Int32Array(N).fill(-1),heap=[];const hpush=(f,k)=>{heap.push([f,k]);let n=heap.length-1;while(n>0){const p=(n-1)>>1;if(heap[p][0]<=heap[n][0])break;[heap[p],heap[n]]=[heap[n],heap[p]];n=p;}};
  const hpop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let n=0;for(;;){const l=2*n+1,r=l+1;let m=n;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===n)break;[heap[m],heap[n]]=[heap[n],heap[m]];n=m;}}return top;};
  const hh=k=>Math.hypot(k%NX-gi,Math.floor(k/NX)-gj);gS[S0]=0;hpush(hh(S0),S0);let found=false,it=0;
  while(heap.length&&it++<2e6){const [f,k]=hpop();if(k===G0){found=true;break;}if(f-hh(k)>gS[k]+1e-6)continue;const i=k%NX,j=(k-i)/NX,gk=gS[k];
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=NX||nj>=NZ)continue;const nk=idx(ni,nj),c=cost[nk];if(c===Infinity)continue;
      const g2=gk+c*(di&&dj?1.414:1);if(g2<gS[nk]){gS[nk]=g2;from[nk]=k;hpush(g2+hh(nk),nk);}}}
  planTaxi.dbg={NX,NZ,it,found,blk:cost.reduce((n,c)=>n+(c===Infinity?1:0),0),paved:cost.reduce((n,c)=>n+(c===1?1:0),0),occ:occ.reduce((n,c)=>n+c,0)};
  if(!found)return null;const cells=[];for(let k=G0;k>=0;k=from[k])cells.push(k);cells.reverse();
  const P2=cells.map(k=>[X0+(k%NX+0.5)*C,Z0+(Math.floor(k/NX)+0.5)*C]);P2[0]=[x0,z0];P2[P2.length-1]=[x1,z1];
  // glätten: gerade Stücke, solange die Linie nur über Zellen mit gleichen oder kleineren Kosten führt
  const lineOK=(a,b)=>{const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/(C*0.5));for(let q=1;q<n;q++){const x=a[0]+(b[0]-a[0])*q/n,z=a[1]+(b[1]-a[1])*q/n,k=idx(Math.floor((x-X0)/C),Math.floor((z-Z0)/C));if(!(cost[k]<=1.01))return false;}return true;};
  const out=[P2[0]];let cur=0;while(cur<P2.length-1){let nx=cur+1;for(let q=Math.min(P2.length-1,cur+120);q>cur+1;q--)if(lineOK(P2[cur],P2[q])){nx=q;break;}out.push(P2[nx]);cur=nx;}
  return out;}
// Rollweg zur Startpiste über das echte Netz (alle Flugplätze mit OSM-Daten), z. B. wenn der Funk um Rollfreigabe gebeten wird
function routeToRunway(){const {G}=ctx;const F=G.F,A=G.startAP;if(!A||!F)return null;const net=taxiNet(A.icao);if(!net)return null;const h=holdFor(net,A,G.startRev?-1:1);if(!h)return null;
  const e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');let r=route(net,F.pos.x,F.pos.z,h.n,{jet:F.P.cls==='jet',maxD:150,heading:[-Math.sin(e.y),-Math.cos(e.y)]});
  if(!r)r=route(net,F.pos.x,F.pos.z,h.n,{jet:F.P.cls==='jet',maxD:150});if(!r)return null;G.taxiRoute=r;G.taxiHold=h;return r;}
function buildTaxiDots(){const {G,S,AP,scene}=ctx;const o=G.obj.find(q=>q.type==='taxi');if(!o&&!G.taxiRoute)return;const F=G.F;
  if(G.taxiDots){scene.remove(G.taxiDots);G.taxiDots=null;}
  let segs=[];if(o){const A=AP.ZRH16,l0=toLocal(A,F.pos.x,F.pos.z),lh=toLocal(A,o.x,o.z),corner=fromLocal(A,lh.along,l0.across);segs=[[F.pos.x,F.pos.z,corner.x,corner.z],[corner.x,corner.z,o.x,o.z]];}const pos=[],col=[],sz=[];
  if(G.taxiRoute&&G.taxiRoute.pts.length>1){const R=smoothPath([[F.pos.x,F.pos.z],...G.taxiRoute.pts.slice(1)],30,4);segs=[];for(let i=0;i<R.length-1;i++)segs.push([R[i][0],R[i][1],R[i+1][0],R[i+1][1]]);G.taxiPath=R;}
  else if(o)try{const t0=performance.now(),path=planTaxi(F.pos.x,F.pos.z,o.x,o.z,(F.P.wingTip||18));if(path&&path.length>1){segs=[];for(let i=0;i<path.length-1;i++)segs.push([path[i][0],path[i][1],path[i+1][0],path[i+1][1]]);}G.taxiPath=path;G.taxiMs=Math.round(performance.now()-t0);}catch(e){console.warn('Rollweg',e);}
  for(const [ax,az,bx,bz] of segs){const L=Math.hypot(bx-ax,bz-az),n=Math.ceil(L/12);for(let k=0;k<=n;k++){const x=ax+(bx-ax)*k/n,z=az+(bz-az)*k/n;pos.push(x,S.heightAt(x,z)+0.3,z);col.push(0.15,1,0.35);sz.push(1.1);}}
  const d=makeGlow(pos,col,sz);scene.add(d);G.dyn.push(d);G.taxiDots=d;}
return {setupGate,noseDist,placeTug,startPushback,pushTick,planTaxi,buildTaxiDots,routeToRunway};}
