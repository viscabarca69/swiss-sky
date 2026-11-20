// Attraktionen: Wahrzeichen, Seilbahnen, Ballone, Gleitschirme, Kunstflugstaffel, Zeppelin, Feuerwerk, Edelweiss-Sammelobjekte
import * as THREE from 'three';
import {toXZ} from './worldgen.js';
import {mulberry} from './noise.js';
import {makeGlow} from './env.js';

const UP=new THREE.Vector3(0,1,0);
function ctex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const std=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:0.6,...o});

// Sammelpunkte (Breite, Länge, Höhe über Grund, Name)
export const EDELWEISS=[
  [47.3865,8.517,165,'Prime Tower'],[47.3701,8.5442,95,'Grossmünster'],[47.29,8.62,22,'Zürichsee'],[47.3495,8.4915,230,'Uetliberg'],
  [47.0517,8.3075,28,'Kapellbrücke'],[47.045,8.33,16,'Luzerner Seebecken'],[46.979,8.255,130,'Pilatus Kulm'],[47.0567,8.4853,120,'Rigi Kulm'],
  [46.9965,8.392,210,'Hammetschwand-Lift'],[46.929,8.34,90,'Stanserhorn'],[47.035,8.678,220,'Mythen'],[47.035,8.60,16,'Lauerzersee'],
  [47.13,8.495,16,'Zugersee'],[47.125,8.62,22,'Ägerisee'],[47.13,8.78,25,'Sihlsee'],[46.97,8.59,30,'Urnersee'],
  [46.9,8.405,320,'Engelbergertal'],[46.87,8.21,22,'Sarnersee'],[47.29,8.22,22,'Hallwilersee'],[47.2,8.26,22,'Baldeggersee'],
  [47.36,8.68,22,'Greifensee'],[47.48,8.38,110,'Lägern'],[47.27,8.52,160,'Albispass'],[47.085,8.57,70,'Wildspitz']];
export const EDELWEISS_BO=[
  [46.5475,7.9853,70,'Sphinx Jungfraujoch'],[46.5775,8.0053,140,'Eiger'],[46.5583,7.9975,130,'Mönch'],[46.5367,7.9625,140,'Jungfrau'],[46.5577,7.8355,90,'Schilthorn'],[46.5965,7.9067,110,'Staubbachfall'],
  [46.6451,7.6512,100,'Niesen'],[46.6944,7.5397,100,'Stockhorn'],[46.7593,7.6285,75,'Schloss Thun'],[46.72,7.70,18,'Thunersee'],[46.735,7.98,18,'Brienzersee'],[46.6905,7.6832,55,'Schloss Spiez'],
  [46.697,7.851,80,'Harder Kulm'],[46.686,7.858,45,'Höhematte Interlaken'],[46.787,8.0469,100,'Brienzer Rothorn'],[46.624,8.041,110,'Grindelwald'],[46.659,8.054,90,'First'],[46.613,7.94,90,'Männlichen'],
  [46.719,8.207,45,'Aareschlucht'],[46.45,8.05,220,'Aletschgletscher'],[46.5372,8.1261,140,'Finsteraarhorn'],[46.9466,7.4441,80,'Bundeshaus Bern'],[46.495,7.675,90,'Kandersteg'],[46.4936,7.7731,140,'Blüemlisalp']];

export function createAttractions(scene,S,opts){
  const A={};const r=mulberry(42);const BO=opts.area==='bo',ZSon=opts.area!=='bo',BOon=opts.area!=='zs';const EW=ZSon&&BOon?[...EDELWEISS,...EDELWEISS_BO]:BO?EDELWEISS_BO:EDELWEISS;
  const P=(lat,lon,agl)=>{const p=toXZ(lat,lon);return new THREE.Vector3(p.x,S.groundAt(p.x,p.z)+(agl||0),p.z);};
  const PH=(lat,lon,agl)=>{const p=toXZ(lat,lon);return new THREE.Vector3(p.x,S.heightAt(p.x,p.z)+(agl||0),p.z);};
  const grp=new THREE.Group();scene.add(grp);
  const add=(geo,mat,pos,ry,parent)=>{const m=new THREE.Mesh(geo,mat);if(pos)m.position.copy(pos);if(ry)m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;(parent||grp).add(m);return m;};
  const winTex=(col,wcol,fx,fy)=>ctex(128,128,(x,w,h)=>{x.fillStyle=col;x.fillRect(0,0,w,h);x.fillStyle=wcol;for(let i=0;i<4;i++)for(let j=0;j<4;j++)x.fillRect(i*32+3,j*32+4,26,22);});
  const nightM=[];
  // ---------- Wahrzeichen ----------
  if(BOon)buildBO();if(ZSon){
  {// Prime Tower Zürich (126 m, grünes Glas)
    const p=PH(47.3863,8.5168,-1);const t=winTex('#3f6d66','#86b9ad');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,30);
    const m=std(0xffffff,{map:t,metalness:0.6,roughness:0.15,emissive:new THREE.Color(0,0,0),emissiveMap:t});nightM.push(m);
    const g=new THREE.Group();g.position.copy(p);grp.add(g);
    const b=add(new THREE.CylinderGeometry(22,26,126,6),m,new THREE.Vector3(0,63,0),0.3,g);b.scale.z=0.62;
    add(new THREE.CylinderGeometry(23,23,3,6),std(0xd8dcde),new THREE.Vector3(0,127,0),0.3,g).scale.z=0.62;
    const ant=add(new THREE.CylinderGeometry(0.4,0.4,14,6),std(0xc0c0c0),new THREE.Vector3(0,135,0),0,g);
    A.primeTop=p.clone().add(new THREE.Vector3(0,142,0));}
  {// Grossmünster mit Doppeltürmen, Fraumünster mit grünem Spitzturm
    const p=PH(47.3701,8.5442,-1),g=new THREE.Group();g.position.copy(p);g.rotation.y=0.25;grp.add(g);const st=std(0xd9cdb4),dm=std(0x4a3f38);
    add(new THREE.BoxGeometry(24,22,60),st,new THREE.Vector3(0,11,10),0,g);add(new THREE.ConeGeometry(18,10,4),std(0x6b3a2a),new THREE.Vector3(0,27,10),Math.PI/4,g).scale.z=2.3;
    for(const s of [-1,1]){add(new THREE.BoxGeometry(8,52,8),st,new THREE.Vector3(s*8,26,-22),0,g);add(new THREE.CylinderGeometry(4.2,4.6,6,8),st,new THREE.Vector3(s*8,55,-22),0,g);
      add(new THREE.SphereGeometry(4.4,12,8,0,Math.PI*2,0,Math.PI/2),dm,new THREE.Vector3(s*8,58,-22),0,g);add(new THREE.ConeGeometry(0.6,6,6),dm,new THREE.Vector3(s*8,64,-22),0,g);}
    const f=PH(47.3697,8.5413,-1),g2=new THREE.Group();g2.position.copy(f);grp.add(g2);
    add(new THREE.BoxGeometry(18,18,46),st,new THREE.Vector3(0,9,0),0,g2);add(new THREE.BoxGeometry(9,38,9),st,new THREE.Vector3(0,19,-26),0,g2);
    add(new THREE.ConeGeometry(5.5,26,8),std(0x3f8a6b,{metalness:0.3}),new THREE.Vector3(0,51,-26),0,g2);}
  {// Uetliberg-Fernsehturm (rot-weiss)
    const p=PH(47.3495,8.4915,-1),g=new THREE.Group();g.position.copy(p);grp.add(g);
    for(let i=0;i<9;i++)add(new THREE.CylinderGeometry(2.6-i*0.2,2.8-i*0.2,20,10),std(i%2?0xd92b2b:0xf2f2f2),new THREE.Vector3(0,10+i*20,0),0,g);
    add(new THREE.CylinderGeometry(0.4,0.4,12,6),std(0xd0d0d0),new THREE.Vector3(0,186,0),0,g);}
  {// Kapellbrücke mit Wasserturm, KKL
    const a=P(47.0522,8.3053,0),b=P(47.0512,8.3098,0);a.y=b.y=Math.max(a.y,b.y);const len=a.distanceTo(b),mid=a.clone().lerp(b,0.5),ang=Math.atan2(b.x-a.x,b.z-a.z);
    const g=new THREE.Group();g.position.copy(mid);g.rotation.y=ang;grp.add(g);const wood=std(0x7a4a2a),roof=std(0x8c3b2a);
    add(new THREE.BoxGeometry(5,0.6,len),wood,new THREE.Vector3(0,2.5,0),0,g);add(new THREE.BoxGeometry(6,0.4,len),roof,new THREE.Vector3(0,6.2,0),0,g);
    for(let z=-len/2;z<len/2;z+=8)for(const s of [-1,1])add(new THREE.BoxGeometry(0.3,3.5,0.3),wood,new THREE.Vector3(s*2.4,4.3,z),0,g);
    for(let z=-len/2;z<len/2;z+=6)add(new THREE.BoxGeometry(0.4,0.4,0.4).scale(6,1,1),wood,new THREE.Vector3(0,2.0,z),0,g);
    const flowers=std(0xd7263d);add(new THREE.BoxGeometry(5.4,0.5,len),flowers,new THREE.Vector3(0,2.9,0),0,g).scale.set(1.05,1,1);
    const wt=add(new THREE.CylinderGeometry(6,6.5,34,8),std(0xb9a27c),new THREE.Vector3(5,17,len*0.12),0,g);add(new THREE.ConeGeometry(7.2,9,8),roof,new THREE.Vector3(5,38.5,len*0.12),0,g);
    const k=P(47.0505,8.3125,0),g2=new THREE.Group();g2.position.copy(k);g2.rotation.y=0.35;grp.add(g2);
    add(new THREE.BoxGeometry(70,22,90),std(0x9aa3ab,{metalness:0.4,roughness:0.3}),new THREE.Vector3(0,11,0),0,g2);
    add(new THREE.BoxGeometry(110,2,128),std(0xb8c0c6,{metalness:0.6,roughness:0.25}),new THREE.Vector3(-10,24,-8),0,g2);
    A.bridge=mid.clone().add(new THREE.Vector3(0,12,0));}
  {// Rigi Kulm: Sendeturm und Hotel
    const p=PH(47.0567,8.4853,-2),g=new THREE.Group();g.position.copy(p);grp.add(g);
    for(let i=0;i<6;i++)add(new THREE.CylinderGeometry(2.4-i*0.25,2.6-i*0.25,12,10),std(i%2?0xd92b2b:0xf2f2f2),new THREE.Vector3(0,6+i*12,0),0,g);
    add(new THREE.CylinderGeometry(4,4,3,12),std(0xe8e8e8),new THREE.Vector3(0,58,0),0,g);add(new THREE.CylinderGeometry(0.3,0.3,14,6),std(0xd0d0d0),new THREE.Vector3(0,79,0),0,g);
    add(new THREE.BoxGeometry(34,14,14),std(0xece6d8),new THREE.Vector3(40,7,20),0.4,g);add(new THREE.ConeGeometry(22,6,4),std(0x5a5a62),new THREE.Vector3(40,17,20),0.4+Math.PI/4,g).scale.z=0.45;}
  {// Pilatus Kulm: Hotel Bellevue (rund) und Pilatus-Kulm
    const p=PH(46.9785,8.2545,-3),g=new THREE.Group();g.position.copy(p);grp.add(g);
    add(new THREE.CylinderGeometry(14,14,12,24),std(0xe9e3d6),new THREE.Vector3(0,6,0),0,g);add(new THREE.CylinderGeometry(14.5,14.5,1.4,24),std(0x6b6b70),new THREE.Vector3(0,12.7,0),0,g);
    add(new THREE.BoxGeometry(40,16,16),std(0xece6d8),new THREE.Vector3(30,8,-12),0.3,g);add(new THREE.ConeGeometry(25,8,4),std(0x6b3a2a),new THREE.Vector3(30,20,-12),0.3+Math.PI/4,g).scale.z=0.5;}
  {// Bürgenstock mit Hammetschwand-Lift (153 m, gläserne Kabine)
    const p=PH(46.9963,8.3925,-2),g=new THREE.Group();g.position.copy(p);grp.add(g);const steel=std(0x8f969c,{metalness:0.7,roughness:0.35});
    for(const [x,z] of [[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]])add(new THREE.BoxGeometry(0.35,153,0.35),steel,new THREE.Vector3(x,76.5,z),0,g);
    for(let y=6;y<153;y+=9){add(new THREE.BoxGeometry(3.6,0.25,0.25),steel,new THREE.Vector3(0,y,-1.6),0,g);add(new THREE.BoxGeometry(3.6,0.25,0.25),steel,new THREE.Vector3(0,y,1.6),0,g);}
    A.liftCab=add(new THREE.BoxGeometry(2.6,3,2.6),std(0x6fa8c8,{metalness:0.8,roughness:0.05,transparent:true,opacity:0.85}),new THREE.Vector3(0,5,0),0,g);
    add(new THREE.BoxGeometry(80,18,22),std(0xd8d2c4),new THREE.Vector3(-90,-30,60),0.6,g);}
  }
  function buildBO(){
    {// Sphinx-Observatorium auf dem Jungfraujoch
      const p=PH(46.5475,7.9853,-3),g=new THREE.Group();g.position.copy(p);grp.add(g);const rock=std(0x6d6a66),st=std(0xd6d9dc,{metalness:0.5,roughness:0.3});
      add(new THREE.CylinderGeometry(9,12,22,10),rock,new THREE.Vector3(0,8,0),0,g);add(new THREE.CylinderGeometry(9,9,10,20),st,new THREE.Vector3(0,24,0),0,g);
      add(new THREE.SphereGeometry(7.5,24,12,0,Math.PI*2,0,Math.PI/2),std(0xe9ecef,{metalness:0.8,roughness:0.2}),new THREE.Vector3(0,29,0),0,g);
      add(new THREE.CylinderGeometry(12,12,1,20),std(0x8a8f95,{metalness:0.6}),new THREE.Vector3(0,19,0),0,g);
      add(new THREE.BoxGeometry(46,14,18),std(0xe2e4e6,{metalness:0.3}),new THREE.Vector3(-40,-60,25),0.4,g);}
    {// Schloss Thun mit vier Ecktürmen
      const p=PH(46.7593,7.6285,-1),g=new THREE.Group();g.position.copy(p);g.rotation.y=0.2;grp.add(g);const wh=std(0xf1ede4),rf=std(0x8d3a2a);
      add(new THREE.BoxGeometry(20,30,26),wh,new THREE.Vector3(0,15,0),0,g);add(new THREE.ConeGeometry(19,16,4),rf,new THREE.Vector3(0,38,0),Math.PI/4,g).scale.z=1.25;
      for(const [x,z] of [[-10,-13],[10,-13],[-10,13],[10,13]]){add(new THREE.CylinderGeometry(3.4,3.6,34,12),wh,new THREE.Vector3(x,17,z),0,g);add(new THREE.ConeGeometry(4.2,12,12),rf,new THREE.Vector3(x,40,z),0,g);}
      add(new THREE.BoxGeometry(46,9,30),std(0xe6e0d2),new THREE.Vector3(18,-2,24),0.3,g);}
    {// Bundeshaus Bern mit grüner Kuppel
      const p=PH(46.9466,7.4441,-1),g=new THREE.Group();g.position.copy(p);g.rotation.y=0.1;grp.add(g);const sand=std(0xcdbf9e);
      add(new THREE.BoxGeometry(110,26,34),sand,new THREE.Vector3(0,13,0),0,g);add(new THREE.BoxGeometry(34,34,40),sand,new THREE.Vector3(0,17,0),0,g);
      add(new THREE.CylinderGeometry(11,12,10,20),sand,new THREE.Vector3(0,38,0),0,g);add(new THREE.SphereGeometry(11.5,24,14,0,Math.PI*2,0,Math.PI/2),std(0x4f8a72,{metalness:0.3,roughness:0.45}),new THREE.Vector3(0,43,0),0,g);
      add(new THREE.ConeGeometry(1.5,8,8),std(0x4f8a72),new THREE.Vector3(0,58,0),0,g);for(const s of [-1,1])add(new THREE.ConeGeometry(16,9,4),std(0x5a6f66),new THREE.Vector3(s*38,30.5,0),Math.PI/4,g).scale.z=1.6;}
    {// Piz Gloria auf dem Schilthorn (Drehrestaurant)
      const p=PH(46.5577,7.8355,-4),g=new THREE.Group();g.position.copy(p);grp.add(g);const tm=winTex('#c9cdd2','#2a3e52');tm.wrapS=THREE.RepeatWrapping;tm.repeat.set(8,1);
      const gm=std(0xffffff,{map:tm,metalness:0.6,roughness:0.2,emissive:new THREE.Color(0,0,0),emissiveMap:tm});nightM.push(gm);
      add(new THREE.CylinderGeometry(6,8,10,16),std(0x7b7f84),new THREE.Vector3(0,5,0),0,g);add(new THREE.CylinderGeometry(19,17,8,32),gm,new THREE.Vector3(0,14,0),0,g);
      add(new THREE.CylinderGeometry(19.5,19.5,1.2,32),std(0xd8dcdf),new THREE.Vector3(0,18.6,0),0,g);add(new THREE.CylinderGeometry(0.4,0.4,16,6),std(0xc0c0c0),new THREE.Vector3(6,27,0),0,g);}
    {// Schloss Spiez mit Bergfried und Kirche
      const p=PH(46.6905,7.6832,-1),g=new THREE.Group();g.position.copy(p);grp.add(g);const wh=std(0xece4d4),rf=std(0x7c3a2a);
      add(new THREE.BoxGeometry(13,32,13),wh,new THREE.Vector3(0,16,0),0,g);add(new THREE.ConeGeometry(11,12,4),rf,new THREE.Vector3(0,38,0),Math.PI/4,g);
      add(new THREE.BoxGeometry(30,14,14),wh,new THREE.Vector3(18,7,6),0.2,g);add(new THREE.ConeGeometry(17,7,4),rf,new THREE.Vector3(18,17.5,6),0.2+Math.PI/4,g).scale.z=0.5;}
    {// Harder Kulm mit Zweiseensteg
      const p=PH(46.697,7.851,-2),g=new THREE.Group();g.position.copy(p);grp.add(g);const wd=std(0x8a5a3a),wh=std(0xefe7d6);
      add(new THREE.BoxGeometry(26,10,14),wh,new THREE.Vector3(0,5,0),0.3,g);for(const x of [-10,10])add(new THREE.CylinderGeometry(2.6,2.6,16,10),wh,new THREE.Vector3(x,8,-6),0,g),add(new THREE.ConeGeometry(3.4,7,10),std(0x7a3a2a),new THREE.Vector3(x,19.5,-6),0,g);
      add(new THREE.BoxGeometry(3,0.6,28),wd,new THREE.Vector3(0,3,-24),0.3,g);}
  }
  // ---------- Seilbahnen ----------
  const lifts=[];
  const mkLift=(a,b,n,col)=>{const pa=PH(a[0],a[1],8),pb=PH(b[0],b[1],8);const geo=new THREE.BufferGeometry().setFromPoints([pa,pb]);
    for(const off of [-1.2,1.2]){const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x222222}));l.position.x=off;grp.add(l);}
    for(const q of [pa,pb]){add(new THREE.BoxGeometry(8,8,12),std(0x9aa3ab),q.clone().add(new THREE.Vector3(0,-4,0)));}
    const len=pa.distanceTo(pb),cabs=[];for(let i=0;i<n;i++){const c=new THREE.Group();const box=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.6,3.6),std(col,{roughness:0.4}));box.position.y=-3.5;c.add(box);
      const win=new THREE.Mesh(new THREE.BoxGeometry(3.3,1.0,3.7),std(0x1e3346,{metalness:0.9,roughness:0.05}));win.position.y=-3.1;c.add(win);
      const h=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.4,4),std(0x333333));h.position.y=-1.2;c.add(h);grp.add(c);cabs.push(c);}
    lifts.push({pa,pb,len,cabs,sp:8,ph:r()});};
  if(BOon){mkLift([46.559,7.892],[46.5577,7.8355],2,0xd7263d);mkLift([46.62,8.03],[46.613,7.94],3,0xe8e8e8);mkLift([46.624,8.041],[46.659,8.054],3,0xffd23f);mkLift([46.674,7.665],[46.645,7.651],2,0xd7263d);mkLift([46.66,7.55],[46.694,7.54],2,0xe8e8e8);}
  if(ZSon){mkLift([46.996,8.271],[46.9795,8.2565],2,0xd7263d);     // Pilatus Luftseilbahn
  mkLift([46.9568,8.3536],[46.9295,8.3405],2,0xd7263d);   // Stanserhorn CabriO
  mkLift([47.0305,8.442],[47.044,8.466],2,0xe8e8e8);      // Weggis – Rigi Kaltbad
  mkLift([46.986,8.454],[46.975,8.47],2,0x2b6cb0);}        // Beckenried – Klewenalp
  // ---------- Heissluftballone ----------
  const balloons=[];const envProf=[];for(let i=0;i<=20;i++){const a=i/20;const y=a*20;const rr=a<0.15?3+a*30:a<0.75?7.5+3*Math.sin((a-0.15)/0.6*Math.PI):10.5*Math.sqrt(Math.max(0,1-(a-0.75)/0.26));envProf.push(new THREE.Vector2(Math.max(0.3,rr),y));}
  const envG=new THREE.LatheGeometry(envProf,24);
  const PAL=[['#d7263d','#ffffff'],['#ffcf3a','#d7263d'],['#2b6cb0','#ffcf3a'],['#3ddc6a','#ffffff'],['#7b2cbf','#ff9f1c'],['#0b2545','#d7263d'],['#ff6b6b','#ffe66d'],['#00a6a6','#ffffff']];
  for(let i=0,NB=ZSon&&BOon?16:12;i<NB;i++){const pal=PAL[i%PAL.length];const t=ctex(256,64,(x,w,h)=>{for(let k=0;k<12;k++){x.fillStyle=pal[k%2];x.fillRect(k*w/12,0,w/12+1,h);}x.fillStyle='rgba(255,255,255,0.25)';x.fillRect(0,h*0.55,w,h*0.08);});
    const g=new THREE.Group();const env=new THREE.Mesh(envG,new THREE.MeshStandardMaterial({map:t,roughness:0.7}));env.position.y=6;g.add(env);
    const bk=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.2,1.6),std(0x8b5a2b));g.add(bk);
    const burner=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.6,8),std(0x555555));burner.position.y=2.5;g.add(burner);
    for(const [x,z] of [[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]]){const l=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,6,3),std(0x333333));l.position.set(x*1.4,3.6,z*1.4);g.add(l);}
    g.scale.setScalar(1.6);grp.add(g);const b={g,lat:(BO||(BOon&&i%2))?46.66+r()*0.24:47.15+r()*0.3,lon:(BO||(BOon&&i%2))?7.5+r()*0.55:8.2+r()*0.6,agl:350+r()*600,ph:r()*9};const p=P(b.lat,b.lon,b.agl);g.position.copy(p);b.base=p.clone();balloons.push(b);}
  // ---------- Gleitschirme ----------
  const gliders=[];const canG=new THREE.TorusGeometry(5,0.35,4,16,Math.PI*0.8);canG.rotateZ(Math.PI*0.1);canG.scale(1,0.45,2.2);
  const SPB=[[46.698,7.79],[46.697,7.85],[46.613,7.94],[46.659,8.054],[46.645,7.651],[46.56,7.89],[46.69,7.81]],SPZ=[[47.05,8.47],[46.99,8.28],[46.94,8.345],[46.95,8.55],[47.03,8.66],[46.975,8.47]];
  const spots=ZSon&&BOon?[...SPZ,...SPB]:BO?SPB:SPZ;
  for(let i=0,NG=ZSon&&BOon?26:18;i<NG;i++){const sp=spots[i%spots.length],c=P(sp[0]+(r()-0.5)*0.02,sp[1]+(r()-0.5)*0.03,0);const g=new THREE.Group();
    const cm=new THREE.Mesh(canG,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(r(),0.85,0.5),roughness:0.6,side:THREE.DoubleSide}));cm.position.y=6.5;cm.rotation.z=Math.PI;g.add(cm);
    const pil=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.2,0.6),std(0x222222));g.add(pil);grp.add(g);gliders.push({g,c,rad:90+r()*160,h:250+r()*400,ph:r()*6.28,sp:0.06+r()*0.04,climb:r()});}
  // ---------- Kunstflugstaffel mit Rauch ----------
  const jetG=(()=>{const g=new THREE.Group();const red=std(0xd7263d,{roughness:0.35,metalness:0.2}),wh=std(0xf4f4f4,{roughness:0.35});
    const f=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.8,11,10).rotateX(Math.PI/2),red);g.add(f);const n=new THREE.Mesh(new THREE.ConeGeometry(0.55,3,10).rotateX(-Math.PI/2),red);n.position.z=-7;g.add(n);
    const ws=new THREE.Shape();ws.moveTo(0,-2);ws.lineTo(4.6,2.4);ws.lineTo(4.6,3.4);ws.lineTo(0,3.2);ws.lineTo(-4.6,3.4);ws.lineTo(-4.6,2.4);ws.closePath();
    const w=new THREE.Mesh(new THREE.ExtrudeGeometry(ws,{depth:0.25,bevelEnabled:false}).rotateX(Math.PI/2),red);w.position.y=-0.2;g.add(w);
    const cross=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.27,0.7),wh);cross.position.set(3,-0.05,1.6);g.add(cross);const c2=cross.clone();c2.scale.set(0.27,1,3.7);g.add(c2);
    const fin=new THREE.Shape();fin.moveTo(0,0);fin.lineTo(3,0);fin.lineTo(3.4,3);fin.lineTo(2.4,3);fin.closePath();const fm=new THREE.Mesh(new THREE.ExtrudeGeometry(fin,{depth:0.2,bevelEnabled:false}).rotateY(-Math.PI/2),red);fm.position.set(0.1,0.3,2.2);g.add(fm);
    const can=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8).scale(1,0.7,2.4),std(0x1e3346,{metalness:0.9,roughness:0.05}));can.position.set(0,0.55,-3.6);g.add(can);return g;})();
  const team=[];const FORM=[[0,0,0],[-14,-1,12],[14,-1,12],[0,-2,24],[-28,-2,24],[28,-2,24]];
  for(let i=0;i<6;i++){const m=jetG.clone();m.scale.setScalar(1.15);grp.add(m);team.push({m,off:FORM[i],trail:[]});}
  const TN=6*180,tp=new Float32Array(TN*3),ta=new Float32Array(TN);const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(tp,3));tg.setAttribute('age',new THREE.BufferAttribute(ta,1));
  const smoke=new THREE.Points(tg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uS:{value:500}},
    vertexShader:'attribute float age;varying float vA;uniform float uS;void main(){vA=age;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp((6.0+age*26.0)*uS/max(-mv.z,1.0),1.0,160.0);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying float vA;void main(){vec2 c=gl_PointCoord-0.5;float d=dot(c,c)*4.0;if(d>1.0||vA<=0.0)discard;gl_FragColor=vec4(vec3(0.97),(1.0-d)*0.5*clamp(1.0-vA/7.0,0.0,1.0));}'}));
  smoke.frustumCulled=false;grp.add(smoke);const ctr=BO?P(46.71,7.74,0):P(46.99,8.505,0);ctr.y=BO?1500:1150;let tAcc=0;
  // ---------- Zeppelin über Zürich ----------
  const zep=new THREE.Group();{const tx=ctex(1024,256,(x,w,h)=>{x.fillStyle='#f6f6f4';x.fillRect(0,0,w,h);x.fillStyle='#0b2545';x.font='900 120px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('LUIS',w*0.5,h*0.35);x.fillStyle='#d7263d';x.fillRect(0,h*0.62,w,h*0.07);});
    const env=new THREE.Mesh(new THREE.SphereGeometry(1,32,20).scale(9,9,37),new THREE.MeshStandardMaterial({map:tx,roughness:0.5}));zep.add(env);
    for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(0.3,7,6),std(0x0b2545));const a=i*Math.PI/2+Math.PI/4;f.position.set(Math.sin(a)*8,Math.cos(a)*8,30);f.rotation.z=-a;zep.add(f);}
    const gon=new THREE.Mesh(new THREE.BoxGeometry(3,2.6,9),std(0xdddddd));gon.position.set(0,-9.6,-4);zep.add(gon);grp.add(zep);}
  const zc=BO?P(46.76,7.64,0):P(47.365,8.535,0);zc.y=Math.max(zc.y,420)+520;
  // ---------- Feuerwerk ----------
  const FN=2400,fp=new Float32Array(FN*3),fc=new Float32Array(FN*3),fv=new Float32Array(FN*3),fa=new Float32Array(FN);
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(fp,3));fg.setAttribute('col',new THREE.BufferAttribute(fc,3));fg.setAttribute('age',new THREE.BufferAttribute(fa,1));
  const fw=new THREE.Points(fg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uS:{value:500}},
    vertexShader:'attribute vec3 col;attribute float age;varying vec3 vC;varying float vA;uniform float uS;void main(){vC=col;vA=age;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(4.5*uS/max(-mv.z,1.0),1.5,40.0);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 c=gl_PointCoord-0.5;float d=dot(c,c)*4.0;if(d>1.0||vA<=0.0)discard;float a=clamp(vA,0.0,1.0);gl_FragColor=vec4(vC*(1.0-d)*a*2.2,1.0);}'}));
  fw.frustumCulled=false;grp.add(fw);let fwi=0,fwT=0;const fwSites=[...(BOon?[P(46.70,7.69,0),P(46.735,7.98,0)]:[]),...(ZSon?[P(47.358,8.545,0),P(47.048,8.318,0)]:[])].map(v=>{v.y=Math.max(v.y,410)+170;return v;});
  function burst(c){const col=new THREE.Color().setHSL(r(),0.9,0.6),n=180,sp=28+r()*20;for(let i=0;i<n;i++){const k=fwi;fwi=(fwi+1)%FN;const u=r()*2-1,th=r()*6.283,s=Math.sqrt(1-u*u);
      fp[k*3]=c.x;fp[k*3+1]=c.y;fp[k*3+2]=c.z;fv[k*3]=s*Math.cos(th)*sp;fv[k*3+1]=u*sp;fv[k*3+2]=s*Math.sin(th)*sp;fc[k*3]=col.r;fc[k*3+1]=col.g;fc[k*3+2]=col.b;fa[k]=1.6+r()*0.6;}}
  // ---------- Edelweiss ----------
  const got=new Set(opts.collected||[]);const ew=[];
  const flower=(()=>{const s=new THREE.Shape();const n=10;for(let i=0;i<=n*2;i++){const a=i/(n*2)*Math.PI*2,rad=i%2?2.2:6;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?s.lineTo(x,y):s.moveTo(x,y);}
    return new THREE.ExtrudeGeometry(s,{depth:0.8,bevelEnabled:true,bevelSize:0.4,bevelThickness:0.4,bevelSegments:2});})();
  const fMat=new THREE.MeshStandardMaterial({color:0xffd23a,emissive:0xffb000,emissiveIntensity:0.9,metalness:0.6,roughness:0.25});
  EW.forEach(([la,lo,agl,name],i)=>{if(got.has(i))return;const p=P(la,lo,agl);const m=new THREE.Mesh(flower,fMat);m.position.copy(p);grp.add(m);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(9,0.5,8,40),new THREE.MeshBasicMaterial({color:0xfff2a6,transparent:true,opacity:0.6}));m.add(halo);
    const gl=makeGlow([0,0,0],[1.4,1.0,0.25],[30]);m.add(gl);ew.push({i,m,p,name});});
  A.edelweissLeft=()=>ew.length;A.edelweissTotal=EW.length;A.dots=()=>ew.map(e=>({x:e.p.x,z:e.p.z}));
  A.collect=(pos)=>{for(let k=ew.length-1;k>=0;k--){const e=ew[k];if(e.p.distanceTo(pos)<22){grp.remove(e.m);ew.splice(k,1);got.add(e.i);return{name:e.name,count:got.size,total:EW.length,ids:[...got]};}}return null;};
  // ---------- Update ----------
  // feste Wahrzeichen weit weg nicht zeichnen (grosse Karte: viele Objekte)
  const mov=new Set([...balloons.map(b=>b.g),...gliders.map(g=>g.g),...team.map(t=>t.m),zep]);const CULL=[];const bx=new THREE.Box3(),cv=new THREE.Vector3();
  grp.updateMatrixWorld(true);for(const c of grp.children){if(mov.has(c)||c.isPoints||!(c.isMesh||c.isGroup||c.isLine))continue;bx.setFromObject(c);if(bx.isEmpty())continue;CULL.push({c,p:bx.getCenter(new THREE.Vector3()),r:bx.getSize(cv).length()/2});}
  let cullT=0;
  A.update=(dt,t,cam,night,glowS,wind)=>{
    cullT-=dt;if(cullT<=0||dt===0){cullT=0.5;const cp=cam.position,far=32000+Math.max(0,cp.y-1500)*4;for(const o of CULL)o.c.visible=o.p.distanceTo(cp)-o.r<far;}
    for(const m of nightM)m.emissiveIntensity=night*0.9;nightM.forEach(m=>m.emissive.setScalar(night>0.3?0.8:0));
    if(A.liftCab)A.liftCab.position.y=5+(0.5-0.5*Math.cos(t*0.12))*143;
    for(const L of lifts){L.cabs.forEach((c,i)=>{const u=0.5-0.5*Math.cos(t*L.sp/L.len*Math.PI+L.ph*6+i*Math.PI);c.position.copy(i%2?L.pb:L.pa).lerp(i%2?L.pa:L.pb,u);});}
    for(const b of balloons){b.g.position.x=b.base.x+Math.sin(t*0.01+b.ph)*300;b.g.position.z=b.base.z+Math.cos(t*0.013+b.ph)*300;b.g.position.y=b.base.y+Math.sin(t*0.05+b.ph)*60;b.g.rotation.y=t*0.02+b.ph;}
    for(const p of gliders){const a=p.ph+t*p.sp*(p.rad<150?1.4:1);p.g.position.set(p.c.x+Math.cos(a)*p.rad,p.c.y+p.h+((t*1.2+p.climb*500)%500),p.c.z+Math.sin(a)*p.rad);p.g.rotation.set(0,-a,0.35);}
    // Staffel: Ellipse mit Wellen, Formation, Rauch
    const w=0.045,ph=t*w,a=4200,bb=2300;const pos=new THREE.Vector3(ctr.x+Math.cos(ph)*a,ctr.y+Math.sin(ph*2)*220,ctr.z+Math.sin(ph)*bb);
    const vel=new THREE.Vector3(-Math.sin(ph)*a*w,Math.cos(ph*2)*440*w,Math.cos(ph)*bb*w),acc=new THREE.Vector3(-Math.cos(ph)*a*w*w,0,-Math.sin(ph)*bb*w*w);
    const fwd=vel.clone().normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),fwd);const latA=acc.clone().sub(fwd.clone().multiplyScalar(acc.dot(fwd)));
    const right=new THREE.Vector3(1,0,0).applyQuaternion(q);const bank=Math.atan2(latA.dot(right),9.81);q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-bank));
    tAcc+=dt;const emit=tAcc>0.12;if(emit)tAcc=0;
    team.forEach((J,i)=>{const o=new THREE.Vector3(J.off[0],J.off[1],J.off[2]).applyQuaternion(q);J.m.position.copy(pos).add(o);J.m.quaternion.copy(q);
      if(emit){J.trail.unshift(J.m.position.clone().add(new THREE.Vector3(0,0,7).applyQuaternion(q)));if(J.trail.length>180)J.trail.pop();}
      for(let k=0;k<180;k++){const o2=(i*180+k);const v=J.trail[k];if(v){tp[o2*3]=v.x;tp[o2*3+1]=v.y;tp[o2*3+2]=v.z;ta[o2]=k*0.12+0.01;}else ta[o2]=0;}});
    tg.attributes.position.needsUpdate=true;tg.attributes.age.needsUpdate=true;smoke.material.uniforms.uS.value=glowS;smoke.visible=night<0.6;
    // Zeppelin
    const zp=t*0.006;zep.position.set(zc.x+Math.cos(zp)*2600,zc.y,zc.z+Math.sin(zp)*2600);zep.rotation.y=-zp;
    // Feuerwerk
    fw.material.uniforms.uS.value=glowS;fw.visible=night>0.55;
    if(night>0.55){fwT-=dt;if(fwT<=0){fwT=0.6+r()*1.4;const s=fwSites[(r()*fwSites.length)|0];burst(s.clone().add(new THREE.Vector3((r()-0.5)*120,r()*90,(r()-0.5)*120)));}
      for(let k=0;k<FN;k++){if(fa[k]<=0)continue;fa[k]-=dt*0.7;fv[k*3+1]-=9.81*dt*0.35;const d=1-dt*0.6;fv[k*3]*=d;fv[k*3+1]*=d;fv[k*3+2]*=d;fp[k*3]+=fv[k*3]*dt;fp[k*3+1]+=fv[k*3+1]*dt;fp[k*3+2]+=fv[k*3+2]*dt;}
      fg.attributes.position.needsUpdate=true;fg.attributes.age.needsUpdate=true;fg.attributes.col.needsUpdate=true;}
    for(const e of ew){e.m.rotation.y=t*1.5;e.m.position.y=e.p.y+Math.sin(t*2+e.i)*1.5;}
  };
  // Kollision mit Attraktionen (nur grobe Kugeln)
  A.hit=(pos)=>{for(const J of team)if(J.m.position.distanceTo(pos)<9)return'Kunstflugstaffel';if(zep.position.distanceTo(pos)<20)return'Zeppelin';for(const b of balloons)if(b.g.position.distanceTo(pos)<20)return'Heissluftballon';return null;};
  return A;
}
