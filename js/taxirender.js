// Rollwege aus OpenStreetMap sichtbar machen: Belag, Vorfelder, gelbe Mittellinien, Haltemarkierungen,
// Rollweg-Befeuerung (Zürich grüne Mittellinienlichter, sonst blaue Randlichter), Stoppbalken und Pistenschilder.
// Kleine Flugplätze (oft Graspisten) bekommen nur das Netz für die Wegsuche, keinen Belag.
import * as THREE from 'three';
import {taxiNet} from './taxinet.js';
import {TAXIWAYS} from './taxiways.js';
import {toLocal} from './worldgen.js';
import {inOrtho} from './ortho.js';
import {LOWMEM} from './device.js';
const BIG=new Set(['LSZH','LSGG','LFSB']);
function canvasT(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;}
function rnd(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
// einfache Geometrie-Sammler (Position + Welt-UV)
function Buf(){const P=[],U=[],I=[];return{P,U,I,v(x,y,z,uS){P.push(x,y,z);U.push(x/(uS||10),z/(uS||10));return P.length/3-1;},
  tri(a,b,c){I.push(a,b,c);},quad(a,b,c,d){I.push(a,b,c,a,c,d);},
  mesh(mat){if(!I.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
    g.setIndex(P.length/3>65535?new THREE.Uint32BufferAttribute(I,1):new THREE.Uint16BufferAttribute(I,1));g.computeVertexNormals();g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.userData.baked=1;return m;}};}
export function buildOsmTaxi({S,AIRPORTS,grpOf,L,nightMats}){
  const out={nets:{},drawn:{}};
  const asphT=canvasT(128,128,(x,w,h)=>{x.fillStyle='#7c7f82';x.fillRect(0,0,w,h);const r=rnd(7);for(let i=0;i<2200;i++){const v=110+r()*40|0;x.fillStyle=`rgba(${v},${v},${v+2},0.35)`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
    for(let i=0;i<6;i++){x.fillStyle=`rgba(30,30,30,${0.02+r()*0.04})`;x.beginPath();x.arc(r()*w,r()*h,6+r()*20,0,7);x.fill();}},true);
  const concT=canvasT(128,128,(x,w,h)=>{x.fillStyle='#a3a29d';x.fillRect(0,0,w,h);const r=rnd(11);
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){const v=150+(r()-0.5)*18|0;x.fillStyle=`rgb(${v},${v},${v-4})`;x.fillRect(i*64+1,j*64+1,62,62);}
    for(let i=0;i<1500;i++){const v=120+r()*60|0;x.fillStyle=`rgba(${v},${v},${v},0.25)`;x.fillRect(r()*w,r()*h,1,1);}
    for(let i=0;i<8;i++){x.fillStyle=`rgba(40,35,30,${0.04+r()*0.07})`;x.beginPath();x.arc(r()*w,r()*h,3+r()*10,0,7);x.fill();}},true);
  const mAsph=new THREE.MeshStandardMaterial({map:asphT,color:0x8a8c8e,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-26});
  const mApron=new THREE.MeshStandardMaterial({map:concT,color:0xd8d6d0,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-22});
  const mYel=new THREE.MeshStandardMaterial({color:0xe3b21c,roughness:0.6,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-34});
  const mDark=new THREE.MeshStandardMaterial({color:0x1d1f22,roughness:0.7,side:THREE.DoubleSide});
  // Schilder: Atlas mit allen Texten (rot «16-34» + schwarz/gelb «E11»)
  const signs=[];// {A,x,z,dx,dz,red,loc}
  const nets=[];
  for(const ic of Object.keys(TAXIWAYS)){const net=taxiNet(ic);if(!net||!net.edges.length)continue;out.nets[ic]=net;
    const A0=AIRPORTS.find(a=>a.icao===ic);if(!A0)continue;const small=net.rws.every(R=>R.small||R.wasSmall);nets.push({ic,net,A0,small});}
  const sgnTxt=new Map();const cell=LOWMEM?[128,32]:[256,64];
  for(const {ic,net,A0,small} of nets){
    const zO=ic==='LSZH'&&inOrtho(A0.x,A0.z),g=grpOf(A0),Y=(x,z,o)=>S.heightAt(x,z)+o,wOf=e=>BIG.has(ic)?e.w:Math.min(e.w,18);
    const onRwy=(x,z,m)=>net.rws.some(R=>{const l=toLocal(R,x,z);return Math.abs(l.across)<R.w/2+(m||0)&&Math.abs(l.along)<R.len/2+(m||0);});
    const {X,Z,edges,adj}=net;
    if(!small){
      // --- Belag (nicht in Zürich: dort zeigt das Luftbild die echten Flächen)
      if(!zO){const B=Buf(),Ap=Buf();
        for(const e of edges){if(e.rwy)continue;const ax=X[e.a],az=Z[e.a],dx=(X[e.b]-ax)/e.len,dz=(Z[e.b]-az)/e.len,nx=-dz,nz=dx,h=wOf(e)/2,n=Math.max(1,Math.ceil(e.len/12));let pl=-1,pr=-1;
          for(let k=0;k<=n;k++){const s=e.len*k/n,x=ax+dx*s,z=az+dz*s,l=B.v(x+nx*h,Y(x+nx*h,z+nz*h,0.12),z+nz*h),r=B.v(x-nx*h,Y(x-nx*h,z-nz*h,0.12),z-nz*h);const sm=e.len*(k-0.5)/n;if(k&&!onRwy(ax+dx*sm,az+dz*sm,1))B.quad(pl,l,r,pr);pl=l;pr=r;}}
        // runde Knoten (Kreuzungen, Kurven, Enden)
        for(let i=0;i<net.N;i++){if(!adj[i].length||onRwy(X[i],Z[i],2))continue;let h=0;for(const k of adj[i])if(!edges[k].rwy)h=Math.max(h,wOf(edges[k])/2);if(!h)continue;
          const c=B.v(X[i],Y(X[i],Z[i],0.125),Z[i]),seg=14;let first=-1,prev=-1;for(let q=0;q<=seg;q++){const a=q/seg*Math.PI*2,x=X[i]+Math.cos(a)*h,z=Z[i]+Math.sin(a)*h;const v=q<seg?B.v(x,Y(x,z,0.125),z):first;if(q===0)first=v;else B.tri(c,v,prev);prev=v;}}
        // Vorfelder: Dreiecke, fein unterteilt, damit sie dem Gelände folgen
        for(const P0 of net.aprons){let P=P0.slice();if(P.length>3&&Math.hypot(P[0][0]-P[P.length-1][0],P[0][1]-P[P.length-1][1])<0.5)P.pop();if(P.length<3)continue;
          const tri=THREE.ShapeUtils.triangulateShape(P.map(p=>new THREE.Vector2(p[0],p[1])),[]);
          const sub=(a,b,c,d)=>{const L1=Math.hypot(a[0]-b[0],a[1]-b[1]),L2=Math.hypot(b[0]-c[0],b[1]-c[1]),L3=Math.hypot(c[0]-a[0],c[1]-a[1]);
            if(d<5&&Math.max(L1,L2,L3)>30){const m=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];const ab=m(a,b),bc=m(b,c),ca=m(c,a);sub(a,ab,ca,d+1);sub(ab,b,bc,d+1);sub(ca,bc,c,d+1);sub(ab,bc,ca,d+1);return;}
            const v=p=>Ap.v(p[0],Y(p[0],p[1],0.1),p[1],10);Ap.tri(v(a),v(c),v(b));};
          for(const [i,j,k] of tri)sub(P[i],P[j],P[k],0);}
        const m1=B.mesh(mAsph),m2=Ap.mesh(mApron);if(m1)g.add(m1);if(m2)g.add(m2);
        // gelbe Mittellinien (nicht auf der Piste)
        const C=Buf();for(const e of edges){if(e.rwy)continue;const ax=X[e.a],az=Z[e.a],dx=(X[e.b]-ax)/e.len,dz=(Z[e.b]-az)/e.len,nx=-dz*0.18,nz=dx*0.18,n=Math.max(1,Math.ceil(e.len/8));
          for(let k=0;k<n;k++){const s0=e.len*k/n,s1=e.len*(k+1)/n,x0=ax+dx*s0,z0=az+dz*s0,x1=ax+dx*s1,z1=az+dz*s1;if(onRwy((x0+x1)/2,(z0+z1)/2,3))continue;
            C.quad(C.v(x0+nx,Y(x0,z0,0.17),z0+nz),C.v(x1+nx,Y(x1,z1,0.17),z1+nz),C.v(x1-nx,Y(x1,z1,0.17),z1-nz),C.v(x0-nx,Y(x0,z0,0.17),z0-nz));}}
        // Haltemarkierung: zwei durchgezogene und zwei gestrichelte Linien quer über den Rollweg, gestrichelt auf der Pistenseite
        for(const h of net.holds){const n=h.n;if(n<0||!adj[n].length)continue;const e=edges[adj[n][0]],m=e.a===n?e.b:e.a;let tx=X[m]-X[n],tz=Z[m]-Z[n];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
          // zeigt t zur Piste? (Abstand zur nächsten Pistenachse nimmt ab)
          const dR=(x,z)=>Math.min(...net.rws.map(R=>Math.abs(toLocal(R,x,z).across)));if(dR(X[n]+tx*5,Z[n]+tz*5)>dR(X[n],Z[n])){tx=-tx;tz=-tz;}
          const hw=wOf(e)/2,nx=-tz,nz=tx;
          [[0,1],[0.6,1],[1.2,0],[1.8,0]].forEach(([o,solid])=>{const cx=X[n]+tx*o,cz=Z[n]+tz*o;const st=solid?[[-hw,hw]]:Array.from({length:Math.floor(hw)},(_,i)=>[-hw+i*2,-hw+i*2+1]);
            for(const [a,b] of st){const p=(s,q)=>C.v(cx+nx*s+tx*q,Y(cx+nx*s,cz+nz*s,0.18),cz+nz*s+tz*q);C.quad(p(a,-0.15),p(b,-0.15),p(b,0.15),p(a,0.15));}});}
        const m3=C.mesh(mYel);if(m3)g.add(m3);out.drawn[ic]=true;}
      // --- Befeuerung
      const green=zO,blue=!zO;let lit=0;const cap=LOWMEM?1500:6000;
      for(const e of edges){if(e.rwy||lit>cap)continue;const ax=X[e.a],az=Z[e.a],dx=(X[e.b]-ax)/e.len,dz=(Z[e.b]-az)/e.len;
        if(green){for(let s=15;s<e.len;s+=30){const x=ax+dx*s,z=az+dz*s;if(onRwy(x,z,5))continue;L({x,z},Y(x,z,0.3),[0.2,1,0.35],1.3);lit++;}}
        else if(blue&&!e.lane){const hw=wOf(e)/2+1.2;for(let s=20;s<e.len;s+=45){const x=ax+dx*s,z=az+dz*s;if(onRwy(x,z,8))continue;for(const q of [-1,1])L({x:x-dz*hw*q,z:z+dx*hw*q},Y(x,z,0.4),[0.25,0.35,1],1.5);lit+=2;}}}
      // Stoppbalken (rot) an den grossen Flughäfen
      if(BIG.has(ic))for(const h of net.holds){const n=h.n;if(n<0||!adj[n].length)continue;const e=edges[adj[n][0]],m=e.a===n?e.b:e.a,tl=Math.hypot(X[m]-X[n],Z[m]-Z[n])||1,nx=-(Z[m]-Z[n])/tl,nz=(X[m]-X[n])/tl,hw=wOf(e)/2;
        for(let s=-hw+1.5;s<=hw-1.5;s+=3)L({x:X[n]+nx*s,z:Z[n]+nz*s},Y(X[n],Z[n],0.3),[1,0.12,0.08],1.2);}
    }
    // --- Pistenschilder an den Haltepunkten (auch in Zürich)
    if(!small)for(const h of net.holds){const n=h.n;if(n<0||!adj[n].length)continue;let R=null,bd=1e9;for(const Q of net.rws){const l=toLocal(Q,X[n],Z[n]);if(Math.abs(l.along)<Q.len/2+200&&Math.abs(l.across)<bd){bd=Math.abs(l.across);R=Q;}}if(!R||bd>220)continue;
      const l=toLocal(R,X[n],Z[n]),near=l.along<0?R.rwyA:R.rwyB,far=l.along<0?R.rwyB:R.rwyA,e=edges[adj[n][0]],m=e.a===n?e.b:e.a;let tx=X[m]-X[n],tz=Z[m]-Z[n];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
      const dR=(x,z)=>Math.abs(toLocal(R,x,z).across);if(dR(X[n]+tx*5,Z[n]+tz*5)>dR(X[n],Z[n])){tx=-tx;tz=-tz;}
      const red=`${near}-${far}`,loc=(h.ref||'').slice(0,6),key=red+'|'+loc;if(!sgnTxt.has(key))sgnTxt.set(key,sgnTxt.size);
      // links neben dem Rollweg, Blick zur Piste: links = (tz,-tx)
      const off=wOf(e)/2+7;signs.push({g:grpOf(A0),x:X[n]+tz*off-tx*2,z:Z[n]-tx*off-tz*2,fx:-tx,fz:-tz,cell:sgnTxt.get(key),wide:!!loc});}
  }
  // Atlas zeichnen und Schilder bauen
  if(signs.length){const [cw,ch]=cell,cols=Math.floor(2048/cw),rows=Math.ceil(sgnTxt.size/cols),H=Math.min(2048,THREE.MathUtils.ceilPowerOfTwo(Math.max(1,rows)*ch));
    const atlas=canvasT(cols*cw,H,(x)=>{for(const [key,i] of sgnTxt){const [red,loc]=key.split('|'),cx=(i%cols)*cw,cy=Math.floor(i/cols)*ch;if(cy>=H)continue;
        const sp=loc?0.62:1;x.fillStyle='#c8161d';x.fillRect(cx,cy,cw*sp,ch);x.fillStyle='#fff';x.font=`bold ${ch*0.62}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(red,cx+cw*sp/2,cy+ch*0.54);
        if(loc){x.fillStyle='#111';x.fillRect(cx+cw*sp,cy,cw*(1-sp),ch);x.fillStyle='#f2c200';x.fillText(loc,cx+cw*(1+sp)/2,cy+ch*0.54);x.strokeStyle='#f2c200';x.lineWidth=ch*0.06;x.strokeRect(cx+cw*sp+ch*0.08,cy+ch*0.08,cw*(1-sp)-ch*0.16,ch*0.84);}}});
    atlas.anisotropy=8;const mS=new THREE.MeshStandardMaterial({map:atlas,emissiveMap:atlas,emissive:new THREE.Color(0,0,0),roughness:0.6});if(nightMats)nightMats.push(mS);
    const byG=new Map();for(const s of signs){if(!byG.has(s.g))byG.set(s.g,{F:Buf(),K:Buf()});const {F,K}=byG.get(s.g),i=s.cell,u0=(i%cols)*cw/(cols*cw),u1=u0+cw/(cols*cw),v1=1-Math.floor(i/cols)*ch/H,v0=v1-ch/H;
      const W=s.wide?3.4:2.2,Hh=0.85,y0=S.heightAt(s.x,s.z)+0.45,rx=s.fz,rz=-s.fx;// rechts aus Sicht des Betrachters (er blickt gegen f)
      const p=(a,b,d)=>[s.x+rx*a+s.fx*d,y0+b,s.z+rz*a+s.fz*d];const f=(q,u,v)=>{F.P.push(...q);F.U.push(u,v);return F.P.length/3-1;};
      const a=f(p(-W/2,0,0.13),u0,v0),b=f(p(W/2,0,0.13),u1,v0),c=f(p(W/2,Hh,0.13),u1,v1),d=f(p(-W/2,Hh,0.13),u0,v1);F.quad(a,b,c,d);
      // Kasten + zwei Beine (dunkel)
      const box=(cx,cy,w,hh,dd)=>{const pts=[];for(const [i2,j2,k2] of [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]]){const q=p(cx-w/2+w*i2,cy+hh*j2,-dd/2+dd*k2+0.0);pts.push(K.v(q[0],q[1],q[2]));}
        for(const [q1,q2,q3,q4] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])K.quad(pts[q1],pts[q2],pts[q3],pts[q4]);};
      box(0,0,W+0.1,Hh+0.05,0.24);box(-W/2+0.3,-0.45,0.08,0.45,0.08);box(W/2-0.3,-0.45,0.08,0.45,0.08);}
    for(const [g,{F,K}] of byG){const m1=F.mesh(mS),m2=K.mesh(mDark);if(m1){m1.castShadow=false;g.add(m1);}if(m2){m2.castShadow=true;g.add(m2);}}}
  // Abfrage: liegt ein Punkt auf Belag (Rollweg, Vorfeld, Piste)? – für das Verschieben von Gebäuden
  out.paved=(ic,x,z,mg)=>{const net=out.nets[ic];if(!net)return false;mg=mg||0;
    if(net.rws.some(R=>{const l=toLocal(R,x,z);return Math.abs(l.across)<R.w/2+20+mg&&Math.abs(l.along)<R.len/2+80;}))return true;
    for(const P of net.aprons){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}if(c)return true;}
    const {X,Z,edges,grid,C,key}=net;for(let gi=-1;gi<=1;gi++)for(let gj=-1;gj<=1;gj++){const L2=grid.get(key(Math.floor(x/C)+gi,Math.floor(z/C)+gj));if(L2)for(const k of L2){const e=edges[k],ax=X[e.a],az=Z[e.a],dx=X[e.b]-ax,dz=Z[e.b]-az;let t=((x-ax)*dx+(z-az)*dz)/(e.len*e.len);t=Math.max(0,Math.min(1,t));
      if(!e.rwy&&Math.hypot(ax+dx*t-x,az+dz*t-z)<(BIG.has(ic)?e.w:Math.min(e.w,18))/2+3+mg)return true;}}
    return false;};
  return out;}
