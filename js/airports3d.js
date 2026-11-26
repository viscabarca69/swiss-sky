// Flughäfen: Pisten mit Markierungen, Rollwege, Gebäude, Befeuerung, PAPI
import * as THREE from 'three';
import {inOrtho,lv95ToXZ} from './ortho.js';
// [Typ, E, N, Kurs, Abstand Flugzeugmitte–Dockfassade in Kursrichtung (0 = Aussenposition ohne Brücke)]
const ZRH_STANDS=[["l380",2683861.8,1257401.9,156,0],["l350",2683939.9,1257401.9,186,56.75],["l340",2684013.2,1257399.4,186,60.75],["l747",2684096.2,1257394.5,186,63.25],["l350",2684164.6,1257389.6,186,64.5],["l330",2684242.7,1257382.3,186,64.5],["l350",2684313.5,1257375.0,186,63.75],["l340",2684384.3,1257372.6,186,67.25],["l340",2683981.4,1257250.5,6,57.0],["l330",2684052.2,1257243.2,6,57.75],["l350",2684123.0,1257238.3,6,56.25],["l330",2684198.7,1257231.0,6,56.5],["l350",2684269.5,1257223.6,6,57.5],["l747",2684352.5,1257216.3,6,57.5],["l330",2684425.8,1257216.3,6,0],["l320",2684336.6,1256292.0,184.5,0],["l32n",2684377.6,1256285.5,184.5,46.25],["l320",2684419.9,1256279.0,184.5,56.5],["l32n",2684518.9,1256272.5,184.5,59.25],["l320",2684559.9,1256262.7,184.5,52.75],["l32n",2684296.2,1256458.0,4.5,35.75],["l320",2684337.2,1256458.0,4.5,32.25],["l32n",2684377.6,1256448.2,4.5,38.25],["l320",2684418.6,1256441.7,4.5,40.75],["l32n",2684459.0,1256454.8,4.5,24.25],["l320",2684518.9,1256435.2,4.5,38.25],["l330",2684462.2,1256103.2,4.5,66.25]];
import {bakeStatic} from './bake.js';
import {LOWMEM,TEXS} from './device.js';
import {AIRPORTS,fromLocal} from './worldgen.js';
import {mulberry} from './noise.js';
import {makeGlow} from './env.js';
import {AIRLINER,PLANES} from './aircraft.js';
function canvasT(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
function facadeMat(rx,ry){
  const draw=(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#5d7a92');g.addColorStop(0.5,'#2c4258');g.addColorStop(1,'#3b5368');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.fillStyle='rgba(255,255,255,0.08)';x.beginPath();x.moveTo(0,h*0.1);x.lineTo(w*0.6,0);x.lineTo(w,0);x.lineTo(0,h*0.7);x.fill();
    x.fillStyle='#d8dadc';for(let i=0;i<=4;i++)x.fillRect(i*w/4-2,0,4,h);x.fillRect(0,0,w,6);x.fillRect(0,h-10,w,10);x.fillRect(0,h*0.5-1,w,2);};
  const map=canvasT(128,128,draw,[rx,ry]);
  const em=canvasT(128,128,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(let i=0;i<4;i++){if((i*7)%3===1)continue;const gg=x.createLinearGradient(0,10,0,h-10);gg.addColorStop(0,'#ffd9a0');gg.addColorStop(1,'#c99a5c');x.fillStyle=gg;x.fillRect(i*w/4+3,7,w/4-6,h-18);}},[rx,ry]);
  const mat=new THREE.MeshStandardMaterial({map,emissiveMap:em,emissive:new THREE.Color(0,0,0),roughness:0.12,metalness:0.55,envMapIntensity:1.3});return{mat};
}
function apronMat(A){
  const W=512,H=1024,s=A.side,stands=[960,1090,1210,1330,1440,1520,1630,1690];
  const t=canvasT(W,H,(x)=>{x.fillStyle='#8d8e8c';x.fillRect(0,0,W,H);const r=mulberry(3);
    for(let i=0;i<60;i++)for(let j=0;j<120;j++){const v=128+(r()-0.5)*14|0;x.fillStyle=`rgb(${v},${v},${v-2})`;x.fillRect(i*W/60+0.5,j*H/120+0.5,W/60-1,H/120-1);}
    for(let i=0;i<300;i++){x.fillStyle=`rgba(40,35,30,${r()*0.12})`;x.beginPath();x.arc(r()*W,r()*H,2+r()*14,0,7);x.fill();}
    const X=ac=>((ac-s*620)+220)/440*W,Y=al=>(1-((al-1300)+480)/960)*H;
    x.strokeStyle='#e6b800';x.lineWidth=2.2;x.beginPath();x.moveTo(X(s*470),0);x.lineTo(X(s*470),H);x.stroke();
    for(const al of stands){x.beginPath();x.moveTo(X(s*470),Y(al+40));x.quadraticCurveTo(X(s*470),Y(al),X(s*520),Y(al));x.lineTo(X(s*745),Y(al));x.stroke();
      x.fillStyle='#e6b800';x.fillRect(X(s*745)-3,Y(al)-7,6,14);
      x.strokeStyle='#d33';x.lineWidth=1.4;x.strokeRect(Math.min(X(s*650),X(s*780)),Y(al+30),Math.abs(X(s*780)-X(s*650)),Y(al-30)-Y(al+30));x.strokeStyle='#e6b800';x.lineWidth=2.2;
      x.save();x.translate(X(s*700),Y(al+22));x.fillStyle='#fff';x.font='bold 13px Arial';x.textAlign='center';x.fillText('E'+(stands.indexOf(al)+12),0,0);x.restore();}});
  return new THREE.MeshStandardMaterial({map:t,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
}


// Vorfeld eines Regionalflughafens: Betonplatten, gelbe Rolllinien und Standplätze
function regApron(A){const t=canvasT(256,768,(x,W,H)=>{x.fillStyle='#8a8b88';x.fillRect(0,0,W,H);const r=mulberry(A.len|0);
    for(let i=0;i<20;i++)for(let j=0;j<60;j++){const v=128+(r()-0.5)*8|0;x.fillStyle=`rgb(${v},${v},${v-2})`;x.fillRect(i*W/20+0.5,j*H/60+0.5,W/20-1,H/60-1);}
    for(let i=0;i<140;i++){x.fillStyle=`rgba(40,35,30,${r()*0.12})`;x.beginPath();x.arc(r()*W,r()*H,2+r()*10,0,7);x.fill();}
    x.strokeStyle='#e6b800';x.lineWidth=3;x.beginPath();x.moveTo(W*0.25,0);x.lineTo(W*0.25,H);x.stroke();
    for(let k=0;k<6;k++){const y=H*(0.1+k*0.15);x.beginPath();x.moveTo(W*0.25,y+30);x.quadraticCurveTo(W*0.25,y,W*0.4,y);x.lineTo(W*0.92,y);x.stroke();x.fillStyle='#e6b800';x.fillRect(W*0.9-3,y-8,6,16);
      x.save();x.translate(W*0.7,y-14);x.fillStyle='#fff';x.font='bold 18px Arial';x.textAlign='center';x.fillText(String(k+1),0,0);x.restore();}});
  return new THREE.MeshStandardMaterial({map:t,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});}
function runwayTexture(A){
  const Wp=256*TEXS,ppA=Wp/A.w,Hp=(A.len>2000?8192:4096)*TEXS,ppL=Hp/A.len;
  const c=document.createElement('canvas');c.width=Wp;c.height=Hp;const x=c.getContext('2d'),r=mulberry(A.len);
  x.fillStyle='#2f3134';x.fillRect(0,0,Wp,Hp);
  for(let i=0;i<900;i++){const w=4+r()*60,h=10+r()*300;x.fillStyle=r()<0.5?`rgba(255,255,255,${r()*0.035})`:`rgba(0,0,0,${r()*0.06})`;x.fillRect(r()*Wp-w/2,r()*Hp,w,h);}
  for(let i=0;i<14000;i++){x.fillStyle=`rgba(255,255,255,${r()*0.06})`;x.fillRect(r()*Wp,r()*Hp,1.5,1.5);}
  const X=ac=>(ac+A.w/2)*ppA,Y=al=>(A.len/2-al)*ppL;
  const rect=(ac,al,w,l)=>x.fillRect(X(ac-w/2),Y(al+l/2),w*ppA,l*ppL);
  // Reifenspuren
  for(const s of [1,-1])for(let i=0;i<70;i++){const d=150+r()*600,l=20+r()*120;x.fillStyle=`rgba(10,10,10,${0.12+r()*0.2})`;rect((r()-0.5)*9,-s*A.len/2+s*(d+l/2),0.4+r()*1.2,l);}
  x.fillStyle='#e9e9e4';
  rect(-A.w/2+1.2,0,0.9,A.len-10);rect(A.w/2-1.2,0,0.9,A.len-10);
  for(let d=75;d<A.len-75;d+=50)rect(0,-A.len/2+d+15,0.9,30);
  const nKeys=A.w>=60?8:A.w>=45?6:A.w>=30?4:3,aim=A.len>=2400?400:A.len>=1200?250:150;
  for(const s of [1,-1]){
    const al=d=>-s*A.len/2+s*d;
    for(let k=0;k<nKeys;k++)for(const sd of [-1,1])rect(sd*(3+k*3.6),al(21),1.8,30);
    x.save();x.translate(X(0),Y(al(55)));if(s<0)x.rotate(Math.PI);x.scale(1,ppL/ppA);x.font=`bold ${13*ppA}px Arial`;x.textAlign='center';x.textBaseline='middle';
    x.fillText(s>0?A.rwyA:A.rwyB,0,0);x.restore();
    const aw=A.w>=45?10:A.w>=30?6:4,ao=A.w>=45?10:A.w*0.27;
    rect(-ao,al(aim+22),aw,45);rect(ao,al(aim+22),aw,45);
    if(A.len>=1200)for(const d of [150,600,750,900].filter(d=>d<A.len/2-100))for(const sd of [-1,1])for(let k=0;k<(d<700?2:1);k++)rect(sd*(ao+k*3.2-1.6),al(d+11),1.8,22);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;return t;
}

export function buildAirports(scene,S,addParked){
  const out={papi:[],flashers:[],windsocks:[]};
  const asph=new THREE.MeshStandardMaterial({color:0x4b4d50,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const asph2=new THREE.MeshStandardMaterial({color:0x5c5e60,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const white=new THREE.MeshStandardMaterial({color:0xe8e8e6,roughness:0.6}),concrete=new THREE.MeshStandardMaterial({color:0xb9b6ae,roughness:0.85});
  const glass=new THREE.MeshStandardMaterial({color:0x3a5266,roughness:0.08,metalness:0.7,envMapIntensity:1.4});
  const metal=new THREE.MeshStandardMaterial({color:0x9aa3ab,roughness:0.45,metalness:0.6});
  const lp=[],lc=[],ls=[];const L=(p,y,c,s)=>{lp.push(p.x,y,p.z);lc.push(...c);ls.push(s);};
  // Gebäude und Kleinteile je Flugplatz in einer Gruppe: weit entfernte Flugplätze werden ausgeblendet (Pisten bleiben sichtbar)
  const AG={},grpOf=A=>{let g=AG[A.icao];if(!g){g=AG[A.icao]=new THREE.Group();g.userData.c={x:A.x,z:A.z};g.matrixAutoUpdate=false;scene.add(g);}return g;};
  const place=(A,obj,along,across,y,rot)=>{const p=fromLocal(A,along,across);obj.position.set(p.x,(y??A.elev),p.z);obj.rotation.y=-A.a+(rot||0);grpOf(A).add(obj);return obj;};
  const flat=(A,al,ac,w,l,mat,y)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l).rotateX(-Math.PI/2),mat);m.receiveShadow=true;place(A,m,al,ac,A.elev+(y||0.04));return m;};
  const hangar=(A,al,ac,w,d,h,roofMat)=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),white);b.position.y=h/2;g.add(b);
    if(roofMat){const rf=new THREE.Mesh(new THREE.BoxGeometry(w+2,1,d+2),roofMat);rf.position.y=h+0.5;g.add(rf);}
    else{const R=w*0.6,rf=new THREE.Mesh(new THREE.CylinderGeometry(R,R,d,20,1,false,-Math.asin(w/2/R),2*Math.asin(w/2/R)),metal);rf.rotation.x=Math.PI/2;rf.position.y=h-R*Math.cos(Math.asin(w/2/R))+0.3;g.add(rf);}
    g.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});return place(A,g,al,ac);};
  const red=new THREE.MeshStandardMaterial({color:0x8a3a2a,roughness:0.7});
  const nightMats=[];out.nightMats=nightMats;
  const doorT=canvasT(256,256,(x,w,h)=>{x.fillStyle='#b9bec3';x.fillRect(0,0,w,h);for(let i=0;i<16;i++){x.fillStyle=i%2?'#aab0b6':'#c3c8cc';x.fillRect(i*16,0,16,h);x.fillStyle='#8f969c';x.fillRect(i*16,0,1,h);}x.fillStyle='#7b8288';for(let j=1;j<6;j++)x.fillRect(0,j*h/6,w,2);});
  const logoT=canvasT(1024,256,(x,w,h)=>{x.fillStyle='#ffffff';x.fillRect(0,0,w,h);x.fillStyle='#0b2545';x.font='900 170px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('LUIS',w/2-60,h/2+6);x.fillStyle='#d7263d';x.save();x.translate(w/2+250,h/2);x.rotate(-0.5);x.fillRect(-90,-18,180,36);x.restore();});
  const luisHangar=(A,al,ac,w,d,h)=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),white);b.position.y=h/2;g.add(b);
    const R=w*0.62,a=Math.asin(w/2/R);const rf=new THREE.Mesh(new THREE.CylinderGeometry(R,R,d+1,28,1,false,-a,2*a),metal);rf.rotation.x=Math.PI/2;rf.position.y=h-R*Math.cos(a)+0.3;g.add(rf);
    const door=new THREE.Mesh(new THREE.PlaneGeometry(w*0.86,h*0.8),new THREE.MeshStandardMaterial({map:doorT,roughness:0.5,metalness:0.4}));door.position.set(0,h*0.4,d/2+0.08);g.add(door);
    const logo=new THREE.Mesh(new THREE.PlaneGeometry(w*0.5,w*0.125),new THREE.MeshStandardMaterial({map:logoT,roughness:0.6}));logo.position.set(0,h*0.9,d/2+0.1);g.add(logo);
    const nav=new THREE.Mesh(new THREE.BoxGeometry(w,1.2,1.2),new THREE.MeshStandardMaterial({color:0x0b2545}));nav.position.set(0,h*0.8+0.6,d/2+0.6);g.add(nav);
    g.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});return place(A,g,al,ac);};
  const parkRot=s=>s<0?Math.PI/2:-Math.PI/2;
  // ---- Fluggastbrücken (Zürich, echte Standplätze): Festbrücke ab Dockfassade, Rotunde, Teleskoptunnel mit Glasband, Fahrwerk, Kabine mit Faltenbalg
  const bW=new THREE.MeshStandardMaterial({color:0xd9dcdf,roughness:0.42,metalness:0.3}),bG=new THREE.MeshStandardMaterial({color:0x33424d,roughness:0.06,metalness:0.88});
  const bD=new THREE.MeshStandardMaterial({color:0x2b2c2e,roughness:0.85}),bY=new THREE.MeshStandardMaterial({color:0xe8b62a,roughness:0.55}),bS=new THREE.MeshStandardMaterial({color:0x8d939a,roughness:0.5,metalness:0.5});
  const vW=new THREE.MeshStandardMaterial({color:0xeef0f1,roughness:0.5}),vGl=new THREE.MeshStandardMaterial({color:0x1d262d,roughness:0.15,metalness:0.6});
  const SD=Math.PI/180;
  // Quader von Bodenpunkt a nach b (Breite w, Höhe h), geneigt wie die Verbindung
  const beam=(g,a,b,w,hh,mat)=>{const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,L=Math.hypot(dx,dz);const m=new THREE.Mesh(new THREE.BoxGeometry(w,hh,Math.hypot(L,dy)),mat);
    m.position.set((a.x+b.x)/2,(a.y+b.y)/2+hh/2,(a.z+b.z)/2);m.rotation.order='YXZ';m.rotation.y=Math.atan2(dx,dz);m.rotation.x=-Math.atan2(dy,L);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const blk=(g,x,y,z,w,hh,d,ry,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,hh,d),mat);m.position.set(x,y+hh/2,z);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const frame=(id,p,h)=>{const C=AIRLINER[id],fw={x:Math.sin(h*SD),z:-Math.cos(h*SD)},lf={x:-Math.cos(h*SD),z:-Math.sin(h*SD)},gy=S.heightAt(p.x,p.z);
    return{C,gy,ry:-h*SD,at:(f,l,y)=>new THREE.Vector3(p.x+fw.x*f+lf.x*l,y,p.z+fw.z*f+lf.z*l)};};
  function jetBridges(g,id,p,h,F){const {C,gy,ry,at}=frame(id,p,h),R=C.R,floorY=gy+PLANES[id].gearH-R*(C.sy||1)*0.42;
    const nd=C.L>50?2:1;let lPrev=0;
    for(let i=0;i<nd;i++){const df=C.L/2-C.doors[i]*C.L,rf=F-9;let lr=R+4+0.55*(rf-df);if(i)lr=Math.max(lr+4,lPrev+9);lPrev=lr;
      const ryF=Math.max(floorY+0.6,gy+3.2),rot=at(rf,lr,ryF),cab=at(df,R+2.1,floorY-0.15);
      // Festbrücke + Stützen
      const f0=at(F+1,lr,ryF),f1=at(rf+2.2,lr,ryF);beam(g,f0,f1,3.0,3.0,bW);beam(g,at(F+1,lr,ryF+0.95),at(rf+2.2,lr,ryF+0.95),3.08,1.25,bG);
      for(let q=rf+5;q<F-1;q+=7){const c=at(q,lr,0);blk(g,c.x,gy,c.z,0.45,ryF-gy,0.45,ry,bS);}
      // Rotunde
      {const c=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.6,ryF-gy,10),bS);c.position.set(rot.x,(ryF+gy)/2,rot.z);c.castShadow=true;g.add(c);
       const r=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,3.3,18),bW);r.position.set(rot.x,ryF+1.65,rot.z);r.castShadow=true;r.receiveShadow=true;g.add(r);
       const rr2=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,0.35,18),bS);rr2.position.set(rot.x,ryF+3.4,rot.z);g.add(rr2);}
      // Tunnel: Richtung Rotunde -> Kabine
      const dir=cab.clone().sub(rot);dir.y=0;const dl=dir.length();dir.normalize();
      const t0=rot.clone().addScaledVector(dir,2.2),t1=cab.clone().addScaledVector(dir,-1.9);t0.y=ryF;t1.y=floorY-0.15;
      const tm=t0.clone().lerp(t1,0.56),tm2=t0.clone().lerp(t1,0.5);
      beam(g,t0,tm,3.4,3.25,bW);beam(g,t0.clone().setY(t0.y+0.95),tm.clone().setY(tm.y+0.95),3.48,1.3,bG);
      beam(g,tm2,t1,3.05,2.95,bW);beam(g,tm2.clone().setY(tm2.y+0.85),t1.clone().setY(t1.y+0.85),3.13,1.2,bG);
      // Fahrwerk (Hubsäulen + Drehgestell)
      const dv=t0.clone().lerp(t1,0.74),px=-dir.z,pz=dir.x,yaw=Math.atan2(dir.x,dir.z);
      for(const sd of [-1,1])blk(g,dv.x+px*sd*1.15,gy+0.9,dv.z+pz*sd*1.15,0.42,dv.y-gy-0.9,0.42,yaw,bS);
      blk(g,dv.x,gy+0.15,dv.z,3.2,0.75,1.5,yaw,bD);blk(g,dv.x,dv.y-0.35,dv.z,3.2,0.35,0.6,yaw,bS);
      // Kabine (quer zum Rumpf) + Faltenbalg
      const n=at(0,-1,0).sub(at(0,0,0));const cy=Math.atan2(n.x,n.z);
      blk(g,cab.x,cab.y,cab.z,3.5,3.3,3.4,cy,bW);blk(g,cab.x,cab.y+1.0,cab.z,3.58,1.3,2.6,cy,bG);
      const cb=at(df,R+0.25,0);blk(g,cb.x,cab.y-0.05,cb.z,3.0,3.0,0.9,cy,bD);
      const ws=at(df,R+3.9,0);blk(g,ws.x,cab.y+3.3,ws.z,1.6,0.28,0.5,cy,bS);}}
  // ---- Bodenfahrzeuge am Stand: Pushback-Schlepper, Förderband am vorderen Frachttor, Gepäckwagen, Catering/Tankwagen bei Grossraumjets
  function groundCrew(g,id,p,h,F,rq,si){const {C,gy,ry,at}=frame(id,p,h),R=C.R,L=C.L;
    const tug=at(L/2+5.5,0,0);blk(g,tug.x,gy+0.35,tug.z,2.5,1.05,5.2,ry,bY);const tc=at(L/2+7.0,0.5,0);blk(g,tc.x,gy+1.4,tc.z,1.4,1.0,1.4,ry,vGl);
    for(const [f,l] of [[L/2+3.6,1.2],[L/2+3.6,-1.2],[L/2+7.4,1.2],[L/2+7.4,-1.2]]){const w=at(f,l,0);blk(g,w.x,gy,w.z,0.45,0.75,0.75,ry,bD);}
    // Förderband rechts am vorderen Frachtraum (Rampe vom Boden zum Rumpf)
    const fc=L/2-0.27*L,bl0=at(fc,-(R+6.5),gy+0.9),bl1=at(fc,-(R+0.2),gy+PLANES[id].gearH-R*0.75);beam(g,bl0,bl1,1.1,0.35,bS);
    const bb=at(fc,-(R+4.6),0);blk(g,bb.x,gy+0.2,bb.z,4.2,0.9,2.0,ry+Math.PI/2,bY);
    // Gepäckwagen-Zug
    const nn=2+Math.floor(rq()*3);for(let k=0;k<nn;k++){const d=at(fc-4-k*3.6,-(R+9.5),0);blk(g,d.x,gy+0.35,d.z,1.6,0.12,3.0,ry,bS);blk(g,d.x,gy+0.47,d.z,1.5,1.1,2.6,ry,k%2?vW:bS);}
    const tr=at(fc-1,-(R+9.5),0);blk(g,tr.x,gy+0.3,tr.z,1.5,1.2,2.6,ry,bY);
    if(L>50){// Catering-Lastwagen hinten rechts (gehobener Kasten), Tankwagen unter dem rechten Flügel
      const cd=L/2-C.doors[C.doors.length-1]*L,ct=at(cd,-(R+3.8),0);blk(g,ct.x,gy+0.4,ct.z,2.5,1.3,7.2,ry+Math.PI/2,vW);blk(g,ct.x,gy+PLANES[id].gearH-R*0.5,ct.z,2.4,2.7,5.2,ry+Math.PI/2,vW);
      const sc=at(cd,-(R+1.2),0);blk(g,sc.x,gy+1.7,sc.z,0.3,PLANES[id].gearH-R*0.5-1.7,0.3,ry,bS);
      if(rq()<0.6){const fu=at(-L*0.08,-(R+11),0);blk(g,fu.x,gy+0.45,fu.z,2.5,2.6,9.5,ry,vW);const fk=at(-L*0.08+5.5,-(R+11),0);blk(g,fk.x,gy+0.45,fk.z,2.5,2.4,2.2,ry,vW);}
    }else if(rq()<0.5){const fu=at(-3,-(R+10),0);blk(g,fu.x,gy+0.45,fu.z,2.4,2.3,7.5,ry,vW);}
    // Stromaggregat (GPU) unter der Nase
    const gp=at(L/2-3,-(R+1.5),0);blk(g,gp.x,gy,gp.z,1.6,1.3,2.4,ry,vW);
    }
  for(const A of AIRPORTS){
    const rw=new THREE.Mesh(new THREE.PlaneGeometry(A.w,A.len).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:runwayTexture(A),roughness:0.9,polygonOffset:true,polygonOffsetFactor:-3-(A.id==='ZRH14'?1:A.id==='ZRH10'?2:0),polygonOffsetUnits:-3-(A.id==='ZRH14'?1:A.id==='ZRH10'?2:0)}));
    rw.receiveShadow=true;place(A,rw,0,0,A.elev+0.06);scene.add(rw);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(A.w+(A.small?6:16),A.len+(A.small?20:80)).rotateX(-Math.PI/2),asph);sh.receiveShadow=true;place(A,sh,0,0,A.elev+0.03);scene.add(sh);
    const s=A.side;const zrh=A.icao==='LSZH';
    const zO=zrh&&inOrtho(A.x,A.z);// Zürich mit Luftbild: Rollwege, Vorfeld und Gebäude sind echt (Luftbild + swisstopo-Gebäude)
    const tx=zO?0:A.id==='ZRH16'?190:zrh?0:A.small?0:85,tw=zrh?25:16;
    if(tx){
      flat(A,0,s*(A.w/2+tx),tw,A.len*0.92,asph2);
      const cons=zrh?[-A.len*0.45,-A.len*0.22,A.len*0.05,A.len*0.3,A.len*0.45]:[-A.len*0.45,0,A.len*0.45];
      for(const al of cons){flat(A,al,s*(A.w/2+tx/2),tx,tw,asph2,0.045);
        for(let k=0;k<tx;k+=30){L(fromLocal(A,al+tw/2+1,s*(A.w/2+k)),A.elev+0.3,[0.2,0.35,1],1.6);L(fromLocal(A,al-tw/2-1,s*(A.w/2+k)),A.elev+0.3,[0.2,0.35,1],1.6);}}
      for(let al=-A.len*0.46;al<A.len*0.46;al+=60)for(const q of [-1,1])L(fromLocal(A,al,s*(A.w/2+tx)+q*(tw/2+1)),A.elev+0.3,[0.2,0.35,1],1.6);
    }
    if(A.id==='ZRH16'&&zO){
      // Flugzeuge an den echten Standplätzen (aus dem Luftbild abgelesen): Dock E (Grossraum), Dock A/B (L-320)
      const rq=mulberry(1607);let si=0;
      // Sparmodus: nur jeder zweite Standplatz belegt (jedes Flugzeug kostet Grafikspeicher)
      for(const [id,E,N,h,F] of ZRH_STANDS){const p=lv95ToXZ(E,N),occ=!LOWMEM||si%2===0;if(addParked&&occ)addParked(id,A,0,0,0,0,{x:p.x,z:p.z,h});
        if(F)jetBridges(grpOf(A),id,p,h,F);if(occ)groundCrew(grpOf(A),id,p,h,F,rq,si);si++;}
      // Vorfeld-Flutlicht an den Docks
      for(const [e0,e1,n] of [[2683800,2684460,1257470],[2683930,2684470,1257150],[2684270,2684600,1256215],[2684270,2684570,1256525]])
        for(let e=e0;e<=e1;e+=90){const p=lv95ToXZ(e,n),gy=S.heightAt(p.x,p.z);const ms=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,28,8),metal);ms.position.set(p.x,gy+14,p.z);ms.castShadow=true;scene.add(ms);
          for(const o of [-1.4,0,1.4])L({x:p.x+o,z:p.z},gy+28,[1,0.92,0.75],6);}
    }else if(A.id==='ZRH16'){
      const SX=s;const NOSE=740,FACE=792;
      flat(A,1300,s*620,440,960,apronMat(A));flat(A,1300,s*(A.w/2+tx/2+205),tx+30,40,asph2,0.045);
      // Terminal mit Glasfassade
      const term=new THREE.Group();const TL=640,TW=56,TH=21;
      const fl=facadeMat(TL/9,TH/4.2),fs=facadeMat(TW/9,TH/4.2);
      const tb=new THREE.Mesh(new THREE.BoxGeometry(TW,TH,TL),[fs.mat,fs.mat,concrete,concrete,fl.mat,fl.mat]);
      // Box-Seiten: +x/-x sind die langen Seiten (Länge TL entlang z)
      tb.material=[fl.mat,fl.mat,concrete,concrete,fs.mat,fs.mat];tb.position.y=TH/2;term.add(tb);nightMats.push(fl.mat,fs.mat);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(TW+10,1.4,TL+12),white);roof.position.y=TH+0.7;term.add(roof);
      for(let k=0;k<6;k++){const vault=new THREE.Mesh(new THREE.CylinderGeometry(30,30,TW*0.9,24,1,true,-0.6,1.2),metal);vault.rotation.z=Math.PI/2;vault.position.set(0,TH+1.4-30*Math.cos(0.6)+0.2,-TL/2+55+k*106);term.add(vault);}
      const mid=new THREE.Mesh(new THREE.BoxGeometry(70,32,90),[fs.mat,fs.mat,concrete,concrete,fs.mat,fs.mat]);mid.position.set(s*8,16,0);term.add(mid);
      const lsr=new THREE.Mesh(new THREE.BoxGeometry(18,7,TL*0.8),concrete);lsr.position.set(-s*(TW/2+9),6,0);term.add(lsr);// Vorfahrt
      for(let k=0;k<10;k++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,6,8),white);c.position.set(-s*(TW/2+16),3,-TL*0.38+k*TL*0.084);term.add(c);}
      term.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});place(A,term,1300,s*(FACE+TW/2));
      // Parkhaus
      const ph=new THREE.Group();for(let k=0;k<6;k++){const d=new THREE.Mesh(new THREE.BoxGeometry(60,0.6,150),concrete);d.position.y=k*3.2+0.3;ph.add(d);}
      for(let i=-1;i<=1;i+=2)for(let k=-4;k<=4;k++){const c=new THREE.Mesh(new THREE.BoxGeometry(0.8,16,0.8),concrete);c.position.set(i*29,8,k*18);ph.add(c);}
      const cars=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,1.4,4.4),new THREE.MeshStandardMaterial({roughness:0.4,metalness:0.4}),400);let ci=0;const rr=mulberry(9),m4=new THREE.Matrix4(),cc=new THREE.Color();
      for(let k=0;k<6;k++)for(let r=0;r<4;r++)for(let j=0;j<28&&ci<400;j++){if(rr()<0.3)continue;m4.makeTranslation(-21+r*14,k*3.2+1.3,-68+j*5);cars.setMatrixAt(ci,m4);cars.setColorAt(ci,cc.setHSL(rr(),rr()*0.5,0.2+rr()*0.6));ci++;}
      cars.count=ci;ph.add(cars);ph.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});place(A,ph,1050,s*(FACE+TW+70));
      // Fluggastbrücken + Flugzeuge
      const gw=new THREE.MeshStandardMaterial({color:0xc9ccd0,roughness:0.5,metalness:0.4});
      const stands=[[960,'l380'],[1090,'l350'],[1210,'l346'],[1330,'l330'],[1440,'l320'],[1520,'l320']];
      for(const [al,id] of stands){let nf=null;
        if(addParked){const inf=addParked(id,A,al,0,parkRot(s),s*NOSE);nf=inf&&inf.nf;}
        const C=AIRLINER[id],R=C.R*(C.sy||1);const doorAc=NOSE-C.doors[0]*C.L-(nf?0:0);const dy=A.elev+PLANES[id].gearH-R*0.15;
        const ends=[[al+s*(R+1.3),doorAc,dy]];if(C.deck2)ends.push([al+s*(R*0.85+1.3),NOSE-C.doors[0]*C.L-2,dy+3.4]);
        ends.forEach(([ea,ec,ey],bi)=>{const sa=ea+s*(10+bi*6),sc=FACE,sy=A.elev+5.5+bi*3;
          const p0=fromLocal(A,sa,s*sc),p1=fromLocal(A,ea,s*(ec+1.5));const dx=p1.x-p0.x,dz=p1.z-p0.z,dyy=ey-sy,L=Math.hypot(dx,dz);
          const br=new THREE.Mesh(new THREE.BoxGeometry(3.2,3.1,L),gw);br.position.set((p0.x+p1.x)/2,(sy+ey)/2+1.4,(p0.z+p1.z)/2);br.rotation.order='YXZ';br.rotation.y=Math.atan2(dx,dz);br.rotation.x=-Math.atan2(dyy,L);br.castShadow=true;scene.add(br);
          const cab=new THREE.Mesh(new THREE.BoxGeometry(4.2,3.6,4.2),gw);cab.position.set(p1.x,ey+1.6,p1.z);cab.rotation.y=br.rotation.y;scene.add(cab);
          const lp2=fromLocal(A,(sa+ea)/2*0.4+ea*0.6,s*((sc+ec)/2*0.4+ec*0.6));const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,ey-A.elev,6),metal);leg.position.set(lp2.x,(ey+A.elev)/2,lp2.z);scene.add(leg);
          const wh=new THREE.Mesh(new THREE.BoxGeometry(3,1,1.6),new THREE.MeshStandardMaterial({color:0x333333}));wh.position.set(lp2.x,A.elev+0.5,lp2.z);scene.add(wh);});
        // Bodenfahrzeuge
        const veh=(dal,dac,w,h,l,col)=>{const v=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),new THREE.MeshStandardMaterial({color:col,roughness:0.6}));v.castShadow=true;place(A,v,al+dal,s*(NOSE-dac),A.elev+h/2+0.3);};
        veh(-s*(R+9),C.L*0.45,2.6,2.6,7,0xf2c200);veh(-s*(R+5),C.L*0.3,2.5,3.2,9,0xe8e8e8);veh(s*(R+6),C.L*0.62,2.4,2,6,0x2b6cb0);veh(0,-6,2.2,1.4,4,0xf2c200);}
      // Tower
      const tower=new THREE.Group();const sh1=new THREE.Mesh(new THREE.CylinderGeometry(3.2,5.6,50,20),concrete);sh1.position.y=25;tower.add(sh1);
      const bal=new THREE.Mesh(new THREE.CylinderGeometry(9.6,7,3,20),white);bal.position.y=50.5;tower.add(bal);
      const cab=new THREE.Mesh(new THREE.CylinderGeometry(9.8,8.4,6,20),glass);cab.position.y=55;tower.add(cab);const cr=new THREE.Mesh(new THREE.CylinderGeometry(10.8,10,1.6,20),white);cr.position.y=58.8;tower.add(cr);
      const cr2=new THREE.Mesh(new THREE.CylinderGeometry(6,8,2.5,20),metal);cr2.position.y=60.8;tower.add(cr2);
      const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,10,6),metal);ant.position.y=67;tower.add(ant);const rad=new THREE.Mesh(new THREE.SphereGeometry(2.4,16,10),white);rad.position.set(3,64,0);tower.add(rad);
      const base=new THREE.Mesh(new THREE.BoxGeometry(30,9,30),[fs.mat,fs.mat,concrete,concrete,fs.mat,fs.mat]);base.position.y=4.5;tower.add(base);
      tower.children.forEach(m=>m.castShadow=true);place(A,tower,760,s*470);L(fromLocal(A,760,s*470),A.elev+72.5,[1,0.1,0.05],4);
      // Hangars mit Toren und LUIS-Logo
      flat(A,1880,s*555,340,240,asph2,0.035);flat(A,1700,s*500,40,400,asph2,0.036);
      for(let k=0;k<3;k++)luisHangar(A,1980+k*0,s*(450+k*105),88,78,26);
      // Tanklager
      for(let k=0;k<4;k++){const t=new THREE.Mesh(new THREE.CylinderGeometry(11,11,12,24),new THREE.MeshStandardMaterial({color:0xdfe3e6,roughness:0.5,metalness:0.3}));t.castShadow=true;place(A,t,2250+(k%2)*28,s*(800+(k>>1)*28),A.elev+6);}
      // Flutlichtmasten
      for(let al=900;al<=1720;al+=135){const ms=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,30,8),metal);place(A,ms,al+20,s*600,A.elev+15);const hd=new THREE.Mesh(new THREE.BoxGeometry(4,1.6,1),metal);place(A,hd,al+20,s*600,A.elev+30.5);
        for(const o of [-1.4,0,1.4])L(fromLocal(A,al+20+o,s*600),A.elev+29.8,[1,0.92,0.75],6);}
      if(addParked){addParked('foehn',A,1630,s*720,parkRot(s));addParked('titlis',A,1690,s*735,parkRot(s));addParked('alpina',A,1790,s*580,0.3);addParked('saentis',A,1815,s*600,0.3);}
    }else if(A.mil){
      flat(A,-A.len*0.2,s*(A.w/2+tx+90),160,520,asph2);
      for(let k=0;k<4;k++){const g=new THREE.Group();const R=14;const sc=new THREE.Mesh(new THREE.CylinderGeometry(R,R,30,16,1,false,-Math.PI/2,Math.PI),new THREE.MeshStandardMaterial({color:0x6f7465,roughness:0.9}));sc.rotation.x=Math.PI/2;g.add(sc);g.children.forEach(m=>m.castShadow=true);place(A,g,-A.len*0.2-180+k*110,s*(A.w/2+tx+150),A.elev,0);}
      hangar(A,-A.len*0.2+260,s*(A.w/2+tx+120),70,60,18);
      const tw2=new THREE.Group();const s1=new THREE.Mesh(new THREE.BoxGeometry(7,18,7),concrete);s1.position.y=9;tw2.add(s1);const c2=new THREE.Mesh(new THREE.BoxGeometry(10,5,10),glass);c2.position.y=20.5;tw2.add(c2);place(A,tw2,A.len*0.1,s*(A.w/2+tx+60));
      if(addParked){addParked('titlis',A,-A.len*0.2+120,s*(A.w/2+tx+60),parkRot(s));addParked('titlis',A,-A.len*0.2+150,s*(A.w/2+tx+60),parkRot(s));}
    }else if(zrh){/* Nebenpisten in Zürich: Gebäude stehen beim Hauptterminal */
    }else if(!A.small){
      // Regionalflughafen: Vorfeld mit Standplätzen, Terminal mit Glasfront und Namen, Tower, Hangars, Tanklager, Parkplatz, Fahrzeuge
      const G0=grpOf(A),aC=-A.len*0.12,acA=s*(A.w/2+tx+95),big=['LSZB','LSGS','LSME','LSZG','LSGG','LFSB','LSMP','LSZA'].includes(A.icao);
      flat(A,aC,acA,150,440,regApron(A),0.05);flat(A,aC,s*(A.w/2+tx/2+8),tx-10,36,asph2,0.045);
      // Terminal
      {const tb=new THREE.Group(),TL=big?150:90,TH=big?12:9,TW=24,f1=facadeMat(TL/8,TH/4),f2=facadeMat(TW/8,TH/4);nightMats.push(f1.mat,f2.mat);
        const b=new THREE.Mesh(new THREE.BoxGeometry(TW,TH,TL),[f1.mat,f1.mat,concrete,concrete,f2.mat,f2.mat]);b.position.y=TH/2;tb.add(b);
        const rf=new THREE.Mesh(new THREE.BoxGeometry(TW+8,0.9,TL+8),white);rf.position.y=TH+0.45;tb.add(rf);
        const can=new THREE.Mesh(new THREE.BoxGeometry(8,0.5,TL*0.5),white);can.position.set(s*(TW/2+4),5.2,0);tb.add(can);
        for(let k=0;k<6;k++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,5,8),white);c.position.set(s*(TW/2+7.5),2.5,-TL*0.22+k*TL*0.088);tb.add(c);}
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(TL*0.55,TH*0.42),new THREE.MeshBasicMaterial({map:canvasT(1024,128,(x,w,h)=>{x.fillStyle='#0b2545';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='900 84px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText((A.name||'').toUpperCase(),w/2,h/2+4);}),toneMapped:false}));
        sign.position.set(-s*(TW/2+0.2),TH+3.4,0);sign.rotation.y=-s*Math.PI/2;tb.add(sign);
        const sb=new THREE.Mesh(new THREE.BoxGeometry(0.4,TH*0.5,TL*0.57),white);sb.position.set(-s*(TW/2-0.1),TH+3.4,0);tb.add(sb);
        tb.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});place(A,tb,aC,acA+s*(75+TW/2+4));}
      // Tower
      {const tw=new THREE.Group(),Hh=big?30:22;const sh1=new THREE.Mesh(new THREE.CylinderGeometry(2.2,3.2,Hh,16),concrete);sh1.position.y=Hh/2;tw.add(sh1);
        const bal=new THREE.Mesh(new THREE.CylinderGeometry(6.2,4.6,1.6,16),white);bal.position.y=Hh+0.8;tw.add(bal);
        const cab=new THREE.Mesh(new THREE.CylinderGeometry(6.0,5.2,4.2,16),glass);cab.position.y=Hh+3.7;tw.add(cab);
        const cr=new THREE.Mesh(new THREE.CylinderGeometry(6.8,6.4,1.2,16),white);cr.position.y=Hh+6.4;tw.add(cr);
        const an=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,7,6),metal);an.position.y=Hh+10.5;tw.add(an);
        const bs=new THREE.Mesh(new THREE.BoxGeometry(16,6,16),concrete);bs.position.y=3;tw.add(bs);
        tw.children.forEach(m=>m.castShadow=true);place(A,tw,aC+260,acA+s*40);L(fromLocal(A,aC+260,acA+s*40),A.elev+Hh+14.2,[1,0.1,0.05],3);}
      // Radar (dreht sich)
      if(big){const rd=new THREE.Group();const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.9,14,10),metal);mast.position.y=7;rd.add(mast);
        const dish=new THREE.Group();dish.position.y=15;const d1=new THREE.Mesh(new THREE.BoxGeometry(9,2.6,0.4),white);dish.add(d1);rd.add(dish);place(A,rd,aC+420,acA+s*120);out.radars=(out.radars||[]);out.radars.push(dish);}
      // Hangars und LUIS-Wartungshalle
      hangar(A,aC-290,acA+s*20,52,46,15,red);hangar(A,aC-350,acA+s*20,52,46,15,red);
      if(big)luisHangar(A,aC-440,acA+s*35,70,62,22);
      // Tanklager, Feuerwehr
      for(let k=0;k<3;k++){const t=new THREE.Mesh(new THREE.CylinderGeometry(6,6,8,20),new THREE.MeshStandardMaterial({color:0xdfe3e6,roughness:0.5,metalness:0.3}));t.castShadow=true;place(A,t,aC+340+k*16,acA+s*120,A.elev+4);}
      {const fw=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(18,8,30),new THREE.MeshStandardMaterial({color:0xd8d2c4,roughness:0.8}));b.position.y=4;fw.add(b);
        for(let k=0;k<3;k++){const d=new THREE.Mesh(new THREE.PlaneGeometry(5,5.5),new THREE.MeshStandardMaterial({color:0xc4302b,roughness:0.5}));d.position.set(-s*9.05,2.8,-9+k*9);d.rotation.y=-s*Math.PI/2;fw.add(d);}
        fw.children.forEach(m=>m.castShadow=true);place(A,fw,aC+200,acA+s*20);
        const tr=new THREE.Mesh(new THREE.BoxGeometry(3,3.2,10),new THREE.MeshStandardMaterial({color:0xd7263d,roughness:0.5}));tr.castShadow=true;place(A,tr,aC+215,acA-s*5,A.elev+1.9);}
      // Parkplatz mit Autos
      {flat(A,aC,acA+s*(75+24+40),70,140,asph2,0.04);const cars=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,1.4,4.4),new THREE.MeshStandardMaterial({roughness:0.4,metalness:0.4}),120);let ci=0;const rr=mulberry(A.len),m4=new THREE.Matrix4(),cc=new THREE.Color(),q=new THREE.Quaternion();
        for(let r=0;r<5;r++)for(let j=0;j<26&&ci<120;j++){if(rr()<0.35)continue;const p=fromLocal(A,aC-62+j*5,acA+s*(75+24+14+r*12));q.setFromAxisAngle(new THREE.Vector3(0,1,0),-A.a+Math.PI/2);m4.compose(new THREE.Vector3(p.x,A.elev+0.75,p.z),q,new THREE.Vector3(1,1,1));cars.setMatrixAt(ci,m4);cars.setColorAt(ci,cc.setHSL(rr(),rr()*0.5,0.2+rr()*0.6));ci++;}
        cars.count=ci;cars.castShadow=true;G0.add(cars);}
      // Bodenfahrzeuge
      const veh=(al,ac,w,h,l,col)=>{const v=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),new THREE.MeshStandardMaterial({color:col,roughness:0.6}));v.castShadow=true;place(A,v,al,ac,A.elev+h/2+0.3);};
      veh(aC-40,acA+s*30,2.6,2.8,8,0xf2c200);veh(aC+60,acA+s*35,2.4,2.2,6,0xe8e8e8);veh(aC+110,acA+s*20,2.2,1.4,4,0xf2c200);
      // geparkte Flugzeuge auf dem Vorfeld
      if(addParked){let np=0;const P2=(id,al,ac)=>{if(LOWMEM&&np++>=2)return;const r=addParked(id,A,al,ac,parkRot(s));if(r&&r.m)G0.add(r.m);};
        if(big){P2('l320',aC-120,acA+s*30);P2('foehn',aC-20,acA+s*25);P2('titlis',aC+70,acA+s*20);}
        else{P2('foehn',aC-60,acA+s*25);P2('titlis',aC+30,acA+s*20);}
        P2('alpina',aC-200,acA+s*10);P2('saentis',aC-230,acA+s*10);}
    }else{
      flat(A,-A.len*0.3,s*(A.w/2+40),60,90,asph2);
      hangar(A,-A.len*0.3,s*(A.w/2+85),24,28,8,red);
      {const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(10,4,16),new THREE.MeshStandardMaterial({color:0xe7dcc6,roughness:0.9}));b.position.y=2;g.add(b);
       const r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,7.6,4,4,1).rotateY(Math.PI/4).scale(1,1,1.6),red);r.position.y=6;g.add(r);
       const ter=new THREE.Mesh(new THREE.BoxGeometry(5,0.3,14),new THREE.MeshStandardMaterial({color:0x8a6a4a}));ter.position.set(7,0.15,0);g.add(ter);
       for(let k=0;k<3;k++){const u=new THREE.Mesh(new THREE.ConeGeometry(1.8,1.2,10),new THREE.MeshStandardMaterial({color:k%2?0xd7263d:0xffffff}));u.position.set(7,2.6,-4+k*4);g.add(u);const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,4),metal);st.position.set(7,1.2,-4+k*4);g.add(st);}
       g.children.forEach(m=>{m.castShadow=true;});place(A,g,-A.len*0.3+60,s*(A.w/2+70));}
      if(addParked){addParked('alpina',A,-A.len*0.3+20,s*(A.w/2+35),parkRot(s));addParked('saentis',A,-A.len*0.3-15,s*(A.w/2+40),parkRot(s));}
    }
    // Windsack
    const ws=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,8,6),white);pole.position.y=4;ws.add(pole);
    const sockG=new THREE.CylinderGeometry(0.35,0.7,4.5,10,1,true);sockG.rotateZ(Math.PI/2);sockG.translate(2.4,0,0);
    const sock=new THREE.Mesh(sockG,new THREE.MeshStandardMaterial({color:0xff6a1a,roughness:0.7,side:THREE.DoubleSide}));sock.position.y=7.8;ws.add(sock);
    place(A,ws,-A.len/2+Math.min(250,A.len*0.25),-s*(A.w/2+(A.small?25:45)));out.windsocks.push(sock);
    // Befeuerung
    const sp=A.len>2000?60:50;
    for(let al=-A.len/2;al<=A.len/2+0.1;al+=sp)for(const q of [-1,1])L(fromLocal(A,al,q*(A.w/2+1.5)),A.elev+0.4,[1,0.9,0.72],2.2);
    for(let ac=-A.w/2;ac<=A.w/2;ac+=3){L(fromLocal(A,-A.len/2-1,ac),A.elev+0.3,[0.2,1,0.35],2);L(fromLocal(A,A.len/2+1,ac),A.elev+0.3,[0.2,1,0.35],2);}
    if(!zrh&&A.len>=2400)for(let al=-A.len/2+30;al<A.len/2;al+=30)L(fromLocal(A,al,0),A.elev+0.15,(Math.abs(al)>A.len/2-600&&Math.round(al/30)%2)?[1,0.2,0.1]:[1,0.95,0.85],1.2);
    if(zrh)for(let al=-A.len/2+30;al<A.len/2;al+=30)L(fromLocal(A,al,0),A.elev+0.15,(Math.abs(al)>A.len/2-900&&Math.round(al/30)%2)?[1,0.2,0.1]:[1,0.95,0.85],1.4);
    const aim=A.len>=2400?400:A.len>=1200?250:150;
    for(const sg of [1,-1]){
      if(zrh){const fl=[];for(let d=60;d<=900;d+=30){for(let k=-2;k<=2;k++)L(fromLocal(A,-sg*(A.len/2+d),k*1.6),A.elev+1+d*0.004,[1,0.95,0.8],2.0);
          if(d===300)for(let k=-7;k<=7;k++)L(fromLocal(A,-sg*(A.len/2+d),k*2),A.elev+2,[1,0.95,0.8],2);fl.push(fromLocal(A,-sg*(A.len/2+d),0));}
        const fp=[],fc=[],fs=[];fl.reverse().forEach(p=>{fp.push(p.x,A.elev+4,p.z);fc.push(0,0,0);fs.push(5);});
        const F=makeGlow(fp,fc,fs);scene.add(F);out.flashers.push(F);}
      else{// vereinfachte Anflugbefeuerung (420 m mit Querbalken) und Blitzlichter
        const fl=[];for(let d=60;d<=420;d+=30){for(let k=-1;k<=1;k++)L(fromLocal(A,-sg*(A.len/2+d),k*1.6),A.elev+1+d*0.003,[1,0.95,0.8],1.8);if(d===300)for(let k=-5;k<=5;k++)L(fromLocal(A,-sg*(A.len/2+d),k*2.2),A.elev+1.8,[1,0.95,0.8],1.8);fl.push(fromLocal(A,-sg*(A.len/2+d),0));}
        const fp=[],fc=[],fs=[];fl.reverse().forEach(p=>{fp.push(p.x,A.elev+3,p.z);fc.push(0,0,0);fs.push(4);});const F=makeGlow(fp,fc,fs);scene.add(F);out.flashers.push(F);
        const pm=new THREE.MeshStandardMaterial({color:0x8d939a,roughness:0.5,metalness:0.5});for(let d=60;d<=420;d+=60){const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,1+d*0.003,5),pm);place(A,pl,-sg*(A.len/2+d),0,A.elev+(1+d*0.003)/2);}}
      // PAPI an jeder Piste, auch an kleinen Plätzen
      const pu={uI:{value:2.4},uScale:{value:500},uFogD:{value:0.00003}};const pp=[],pc=[],ps=[],units=[];
      for(let k=0;k<4;k++){const p=fromLocal(A,-sg*(A.len/2-aim),-sg*(A.w/2+14+k*9));pp.push(p.x,A.elev+1,p.z);pc.push(1,1,1);ps.push(4.5);units.push(new THREE.Vector3(p.x,A.elev+1,p.z));}
      const P=makeGlow(pp,pc,ps,pu);scene.add(P);out.papi.push({P,units,thr:[3.5,3.17,2.83,2.5],u:pu});
      for(let k=0;k<4;k++){const box=new THREE.Mesh(new THREE.BoxGeometry(1.2,1,1.5),new THREE.MeshStandardMaterial({color:0x222222}));place(A,box,-sg*(A.len/2-aim),-sg*(A.w/2+14+k*9),A.elev+0.5);}
    }
  }
  const lights=makeGlow(lp,lc,ls);scene.add(lights);out.lights=lights;
  out.setNight=n=>{for(const m of nightMats)m.emissive.setScalar(n*1.4);};
  // Gebäude, Fahrzeuge usw. je Flugplatz zusammenfassen (Windsäcke, Radarschirme, abgestellte Flugzeuge bleiben einzeln)
  {const rd=new Set(out.radars||[]),ws=new Set(out.windsocks);for(const k in AG)bakeStatic(AG[k],o=>!!(o.userData.parts||o.userData.baked||ws.has(o)||rd.has(o)));}
  out.update=(eye,t,glowScale,fogD)=>{
    for(const k in AG){const g=AG[k],c=g.userData.c;g.visible=Math.hypot(eye.x-c.x,eye.z-c.z)<24000+Math.max(0,eye.y-1500)*3;}
    for(const P of out.papi){P.u.uScale.value=glowScale;P.u.uFogD.value=fogD;const c=P.P.geometry.attributes.gcol;
      P.units.forEach((u,k)=>{const dh=Math.hypot(eye.x-u.x,eye.z-u.z),ang=Math.atan2(eye.y-u.y,dh)*180/Math.PI;const w=ang>P.thr[k];c.setXYZ(k,1,w?1:0.08,w?1:0.05);});c.needsUpdate=true;}
    const ph=(t*2)%1;
    for(const F of out.flashers){const c=F.geometry.attributes.gcol,n=c.count,on=Math.floor(ph*n*1.6);for(let k=0;k<n;k++){const v=k===on?3:0;c.setXYZ(k,v,v,v);}c.needsUpdate=true;}
    for(const s of out.windsocks){s.rotation.y=Math.sin(t*0.7)*0.15+0.6;s.rotation.z=-0.15+Math.sin(t*3)*0.04;}
    for(const d of out.radars||[])d.rotation.y=t*1.6;
  };
  return out;
}
