// Helikopter-Landeplätze: Spitäler (auf dem Dach, wenn dort ein Gebäude steht) und SAC-Hütten im Hochgebirge.
// Jeder Platz hat eine Plattform mit «H», Randlichter für die Nacht und zählt für die Landung als Boden.
import * as THREE from 'three';
import {toXZ} from './worldgen.js';
import {makeGlow} from './env.js';
export const HELIPADS=[
  {n:'Universitätsspital Zürich',k:'spital',lat:47.3772,lon:8.5510},
  {n:'Kantonsspital Aarau',k:'spital',lat:47.3923,lon:8.0563},
  {n:'Spital Zofingen',k:'spital',lat:47.2929,lon:7.9512},
  {n:'Inselspital Bern',k:'spital',lat:46.9476,lon:7.4246},
  {n:'Universitätsspital Basel',k:'spital',lat:47.5616,lon:7.5833},
  {n:'Kantonsspital St. Gallen',k:'spital',lat:47.4312,lon:9.3887},
  {n:'Luzerner Kantonsspital',k:'spital',lat:47.0600,lon:8.2955},
  {n:'Hôpitaux Universitaires de Genève',k:'spital',lat:46.1932,lon:6.1488},
  {n:'Spital Interlaken',k:'spital',lat:46.6840,lon:7.8650},
  {n:'Kantonsspital Graubünden',k:'spital',lat:46.8530,lon:9.5135},
  {n:'Ospedale Civico Lugano',k:'spital',lat:46.0128,lon:8.9580},
  {n:'Spital Wallis Sion',k:'spital',lat:46.2346,lon:7.3726},
  {n:'Mönchsjochhütte',k:'huette',lat:46.5583,lon:7.9917},
  {n:'Konkordiahütte',k:'huette',lat:46.4986,lon:8.0592},
  {n:'Glecksteinhütte',k:'huette',lat:46.6239,lon:8.0961},
  {n:'Blüemlisalphütte',k:'huette',lat:46.4895,lon:7.7710},
  {n:'Lauteraarhütte',k:'huette',lat:46.5870,lon:8.2172},
  {n:'Cabane de Moiry',k:'huette',lat:46.1145,lon:7.5867},
  {n:'Tierberglihütte',k:'huette',lat:46.6950,lon:8.4065}];
const R=11;// Radius der Landefläche
export function buildHelipads(scene,S,heavy){
  const out={pads:[],lights:null};const ray=new THREE.Raycaster(),dn=new THREE.Vector3(0,-1,0);
  const deckTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#2f3a33';x.fillRect(0,0,256,256);
    x.strokeStyle='#f4f4f0';x.lineWidth=10;x.beginPath();x.arc(128,128,96,0,Math.PI*2);x.stroke();x.fillStyle='#f4f4f0';x.fillRect(84,70,20,116);x.fillRect(152,70,20,116);x.fillRect(84,118,88,20);
    x.strokeStyle='#ffd23f';x.lineWidth=6;x.strokeRect(6,6,244,244);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;})();
  const deckM=new THREE.MeshStandardMaterial({map:deckTex,roughness:0.8}),legM=new THREE.MeshStandardMaterial({color:0x8d939a,roughness:0.5,metalness:0.6}),redM=new THREE.MeshStandardMaterial({color:0xd7263d,roughness:0.5});
  const lp=[],lc=[],ls=[];
  for(const H of HELIPADS){const p=toXZ(H.lat,H.lon);let g=-1e9;for(const [dx,dz] of [[0,0],[R,0],[-R,0],[0,R],[0,-R],[R*0.7,R*0.7],[-R*0.7,-R*0.7],[R*0.7,-R*0.7],[-R*0.7,R*0.7]])g=Math.max(g,S.heightAt(p.x+dx,p.z+dz));
    // Dachlandeplatz: steht ein echtes Gebäude darunter, kommt die Plattform aufs Dach
    let roof=null;if(H.k==='spital'&&heavy&&heavy.length){ray.set(new THREE.Vector3(p.x,g+400,p.z),dn);ray.far=420;const hit=ray.intersectObjects(heavy.filter(m=>m.geometry&&m.geometry.attributes.aInfo&&m.visible!==undefined),false)[0];if(hit&&hit.point.y>g+3)roof=hit.point.y;}
    const y=(roof??g)+1.2;const grp=new THREE.Group();grp.position.set(p.x,y,p.z);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.5,32),[legM,deckM,legM]);deck.position.y=-0.25;deck.receiveShadow=true;deck.castShadow=true;grp.add(deck);
    // Stützen bis zum Boden bzw. Dach
    const lh=y-(roof??Math.min(S.heightAt(p.x,p.z),g-1));if(lh>0.6)for(let k=0;k<6;k++){const a=k/6*Math.PI*2,l=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,lh,6),legM);l.position.set(Math.cos(a)*(R-1.5),-lh/2-0.5,Math.sin(a)*(R-1.5));grp.add(l);}
    // Windsack
    {const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,3.5,6),legM);pole.position.set(R+1,1.75,0);grp.add(pole);const sock=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.4,1.8,8,1,true).rotateZ(Math.PI/2).translate(0.9,0,0),new THREE.MeshStandardMaterial({color:0xff6a1a,side:THREE.DoubleSide}));sock.position.set(R+1,3.3,0);grp.add(sock);}
    if(H.k==='huette'){const hut=new THREE.Mesh(new THREE.BoxGeometry(14,6,8),new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:0.9}));hut.position.set(0,-lh-0.5+3,-R-9);grp.add(hut);
      const rf=new THREE.Mesh(new THREE.CylinderGeometry(0.01,7.5,3,4,1).rotateY(Math.PI/4).scale(1.4,1,0.8),redM);rf.position.set(0,-lh-0.5+7.5,-R-9);grp.add(rf);}
    scene.add(grp);
    const li=lp.length/3;for(let k=0;k<12;k++){const a=k/12*Math.PI*2;lp.push(p.x+Math.cos(a)*R,y+0.25,p.z+Math.sin(a)*R);lc.push(1,0.85,0.2);ls.push(2.6);}
    out.pads.push({...H,x:p.x,z:p.z,y,g,li,roof:roof!=null,checked:roof!=null||H.k!=='spital',grp});}
  out.lights=makeGlow(lp,lc,ls);out.lights.visible=false;scene.add(out.lights);
  // Höhe der Landefläche an (x,z) oder null
  out.deckAt=(x,z)=>{for(const P of out.pads){if(Math.abs(x-P.x)<R&&Math.abs(z-P.z)<R&&(x-P.x)*(x-P.x)+(z-P.z)*(z-P.z)<R*R)return P.y;}return null;};
  out.near=(x,z,r)=>{let b=null,bd=r||1e9;for(const P of out.pads){const d=Math.hypot(x-P.x,z-P.z);if(d<bd){bd=d;b=P;}}return b;};
  out.setNight=n=>{out.lights.visible=n>0.25;};
  // Gebäude werden erst in der Nähe gebaut: Dachhöhe der Spital-Landeplätze nachträglich bestimmen
  let tChk=0;out.update=(pos,dt)=>{tChk-=dt||0;if(tChk>0)return;tChk=1;
    for(const P of out.pads){if(P.checked||Math.hypot(pos.x-P.x,pos.z-P.z)>3000)continue;P.checked=true;
      ray.set(new THREE.Vector3(P.x,P.g+400,P.z),dn);ray.far=420;const ms=heavy.filter(m=>m.geometry&&m.geometry.attributes.aInfo);const hit=ray.intersectObjects(ms,false)[0];
      if(hit&&hit.point.y>P.g+3){P.y=hit.point.y+1.2;P.roof=true;P.grp.position.y=P.y;const a=out.lights.geometry.attributes.position;for(let k=0;k<12;k++)a.setY(P.li+k,P.y+0.25);a.needsUpdate=true;}}};
  return out;}
