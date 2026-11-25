// 3D-Cockpit der Linienflugzeuge: Instrumente (PFD/ND auf Canvas), Panels, Scheibenrahmen
// Ausgelagert aus main.js. Gemeinsamer Zustand kommt über ctx (Getter).
import * as THREE from 'three';
import {AIRLINER} from './aircraft.js';
export function createCockpit(ctx){
function buildCockpit(model,P){const {hud,$}=ctx;
  const body=model.children[0],eye=model.userData.parts.eye,g=new THREE.Group();g.position.copy(eye);body.add(g);
  const small=P.cls==='small'||P.heli,jet=P.cls==='jet',cx=-eye.x,hw=small?(P.id==='titlis'?0.72:0.62):P.cls==='regional'?0.95:1.18;
  const AL=AIRLINER[P.id],boe=!!(AL&&AL.hump),big=!!(AL&&(AL.ws==='a350'||AL.deck2));
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  const cvT=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return{c,t};};
  const dark=new THREE.MeshStandardMaterial({color:0x17191c,roughness:0.85}),metal=new THREE.MeshStandardMaterial({color:0x9097a0,roughness:0.35,metalness:0.7});
  const pfd=new THREE.CanvasTexture(hud.pfdCanvas);pfd.colorSpace=THREE.SRGBColorSpace;
  const nd=new THREE.CanvasTexture($('mini'));nd.colorSpace=THREE.SRGBColorSpace;
  const E=cvT(256,256),SD=cvT(256,256),FCU=cvT(1024,128),MC=cvT(256,320),OV=cvT(512,512);
  const scrM=tex=>new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
  const lev=(x,y,z,len,col)=>{const piv=new THREE.Group();piv.position.set(x,y,z);g.add(piv);const r=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,len,8),metal);r.position.y=len/2;piv.add(r);
    const k=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.035,0.04),new THREE.MeshStandardMaterial({color:col,roughness:0.5}));k.position.y=len;piv.add(k);return piv;};
  const ne=jet&&['l340','l346','l380','l747'].includes(P.id)?4:jet||P.id==='foehn'?2:1;const thr=[];let flapL,gearL=null;const sticks=[];
  if(jet&&AL){
    // ---- Airliner-Cockpit nach Airbus-Vorbild (6 Bildschirme, FCU im Blendschutz, Mittelkonsole mit MCDU, Sidesticks, Overhead) – 747: Boeing-Grau und Steuerhörner
    const panC=boe?0x5d6165:0x4d5b69,panM=new THREE.MeshStandardMaterial({color:panC,roughness:0.75}),bez=new THREE.MeshStandardMaterial({color:0x0d0e10,roughness:0.5});
    const pz=-0.98,tilt=-0.18,W=hw*2;
    add(new THREE.BoxGeometry(W,0.56,0.06),panM,cx,-0.56,pz,tilt);// Hauptinstrumentenbrett
    add(new THREE.BoxGeometry(W,0.08,0.3),dark,cx,-0.24,pz+0.08);// Blendschutz (matt schwarz)
    // FCU / MCP vorne am Blendschutz (zum Piloten geneigt)
    add(new THREE.PlaneGeometry(0.78,0.075),scrM(FCU.t),cx,-0.25,pz+0.235,-0.3);
    for(const sd of [-1,1]){add(new THREE.BoxGeometry(0.24,0.075,0.02),new THREE.MeshStandardMaterial({color:0x2a2d31,roughness:0.6}),cx+sd*(0.39+0.15),-0.25,pz+0.228,-0.3);
      for(let k=0;k<4;k++)add(new THREE.CylinderGeometry(0.011,0.011,0.018,10),metal,cx+sd*(0.39+0.06+k*0.05),-0.25,pz+0.245,Math.PI/2-0.3);}
    // sechs Anzeigen: PFD, ND | E/WD über SD | ND, PFD
    const dw=big?0.25:0.19,dh=big?0.21:0.19,dy=-0.47,ang=big?0.22:0;
    const du=(tex,x,y,ry)=>{const b=add(new THREE.BoxGeometry(dw+0.03,dh+0.03,0.02),bez,x,y,pz+0.04,tilt,ry||0);const m=add(new THREE.PlaneGeometry(dw,dh),scrM(tex),x,y,pz+0.052,tilt,ry||0);return m;};
    du(pfd,-0.13,dy,ang);du(nd,0.13,dy,ang*0.4);du(E.t,cx,dy+0.02);du(SD.t,cx,dy-0.23);du(nd,2*cx-0.13,dy,-ang*0.4);du(pfd,2*cx+0.13,dy,-ang);
    // Fahrwerkshebel und Autobrake neben der Mitte
    gearL=(()=>{const piv=new THREE.Group();piv.position.set(cx+dw*0.5+0.1,-0.62,pz+0.06);g.add(piv);const r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.09,8),metal);r.rotation.x=Math.PI/2;r.position.z=0.045;piv.add(r);
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.026,0.022,16),new THREE.MeshStandardMaterial({color:0xdddddd}));wh.rotation.z=Math.PI/2;wh.position.z=0.095;piv.add(wh);return piv;})();
    // Mittelkonsole: Schräge mit zwei MCDU, flacher Teil mit Schubhebeln, Klappen- und Bremshebel
    add(new THREE.BoxGeometry(0.56,0.32,0.36),panM,cx,-0.84,pz+0.12,-0.55);
    add(new THREE.BoxGeometry(0.56,0.2,0.62),panM,cx,-0.86,-0.42);
    for(const sd of [-1,1]){add(new THREE.BoxGeometry(0.2,0.25,0.02),bez,cx+sd*0.135,-0.78,pz+0.27,-0.55-Math.PI/2+Math.PI/2);
      add(new THREE.PlaneGeometry(0.15,0.12),scrM(MC.t),cx+sd*0.135,-0.735,pz+0.295,-0.55);}
    for(let i=0;i<ne;i++)thr.push(lev(cx+(i-(ne-1)/2)*0.055,-0.76,-0.5,0.17,0x2a2a2a));
    flapL=lev(cx+0.2,-0.76,-0.42,0.12,0xe2e2e2);lev(cx-0.2,-0.76,-0.5,0.1,0xd8d8d8);
    // Seitenkonsolen mit Sidestick (Airbus) bzw. Steuerhörner (747)
    for(const sx of [-0.43,2*cx+0.43])add(new THREE.BoxGeometry(0.22,0.2,0.9),panM,sx,-0.72,-0.5);
    if(boe){for(const x of [0,2*cx]){const st=new THREE.Group();st.position.set(x,-0.5,-0.62);g.add(st);const col=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.035,0.45,10),dark);col.position.y=-0.22;st.add(col);
        const yk=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.016,8,28,Math.PI*1.15),dark);yk.rotation.z=Math.PI*0.92;yk.position.y=0.03;st.add(yk);sticks.push(st);}}
    else for(const x of [-0.4,2*cx+0.4]){const st=new THREE.Group();st.position.set(x,-0.6,-0.38);g.add(st);const s1=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.024,0.12,10),dark);s1.position.y=0.06;st.add(s1);
      const s2=new THREE.Mesh(new THREE.CapsuleGeometry(0.026,0.06,4,10),dark);s2.position.y=0.14;s2.rotation.x=-0.25;st.add(s2);sticks.push(st);}
    // Overhead-Panel (Blick nach oben)
    add(new THREE.BoxGeometry(0.9,0.04,0.9),panM,cx,0.42,-0.42,0.35);add(new THREE.PlaneGeometry(0.86,0.86),new THREE.MeshStandardMaterial({map:OV.t,roughness:0.7,emissive:0xffffff,emissiveMap:OV.t,emissiveIntensity:0.08}),cx,0.398,-0.42,Math.PI/2+0.35);
    {const c=OV.c.getContext('2d');c.fillStyle=boe?'#5d6165':'#4d5b69';c.fillRect(0,0,512,512);c.strokeStyle='rgba(255,255,255,0.18)';
     for(let r=0;r<6;r++)for(let k=0;k<5;k++){const x0=12+k*100,y0=12+r*84;c.strokeRect(x0,y0,90,74);for(let b=0;b<6;b++){const bx=x0+8+(b%3)*27,by=y0+10+Math.floor(b/3)*32;c.fillStyle='#1f2328';c.fillRect(bx,by,22,24);
       const on=((r*7+k*3+b)%5===0);c.fillStyle=on?'#ffffff':'rgba(255,255,255,0.12)';c.fillRect(bx+3,by+3,16,4);if((r+k+b)%11===0){c.fillStyle='#ffb000';c.fillRect(bx+3,by+15,16,4);}}}OV.t.needsUpdate=true;}
  }else{
    // ---- Kleinflugzeuge: Glascockpit mit zwei grossen Bildschirmen (PFD/MFD), Steuerhorn oder Sidestick
    const panelM=new THREE.MeshStandardMaterial({color:0x2c2f34,roughness:0.7}),frameM=new THREE.MeshStandardMaterial({color:0x22252a,roughness:0.6});
    add(new THREE.BoxGeometry(hw*2,0.07,0.55),dark,cx,-0.2,-0.88);
    add(new THREE.BoxGeometry(hw*2,0.62,0.05),panelM,cx,-0.55,-1.0,-0.2);
    const scr=(tex,w,h,x,y)=>{add(new THREE.BoxGeometry(w+0.03,h+0.03,0.015),new THREE.MeshStandardMaterial({color:0x0d0e10,roughness:0.5}),x,y,-0.972,-0.2);return add(new THREE.PlaneGeometry(w,h),scrM(tex),x,y,-0.962,-0.2);};
    scr(pfd,small?0.27:0.3,small?0.2:0.22,0,-0.5);scr(nd,small?0.27:0.26,small?0.2:0.22,small?0.33:0.36,-0.5);scr(E.t,0.14,0.14,cx+(small?0.18:0),-0.75+(small?0.12:0.1));
    const post=(x,top)=>{const m=add(new THREE.BoxGeometry(0.028,0.6,0.03),frameM,x,0.08,-0.92,-0.55,0,0);if(top)m.rotation.z=top;return m;};
    if(!small||P.id==='titlis')post(cx,0);
    for(const s2 of [-1,1]){const pl=post(cx+s2*hw*0.98,-s2*0.42);pl.rotation.x=-0.45;add(new THREE.BoxGeometry(0.03,0.45,0.03),frameM,cx+s2*hw*1.1,0.05,0.05);}
    add(new THREE.BoxGeometry(hw*2.1,0.04,0.3),frameM,cx,0.38,-0.62);
    if(P.id==='titlis'){const h=add(new THREE.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xeef0f2,roughness:0.35,metalness:0.1}),cx,-0.4,-2.62);h.scale.set(0.6,0.27,1.5);}
    add(new THREE.BoxGeometry(small?0.18:0.34,0.18,0.55),panelM,cx,-0.62,-0.55);
    for(let i=0;i<ne;i++)thr.push(lev(cx+(i-(ne-1)/2)*0.05,-0.53,-0.6,0.16,0x2a2a2a));
    flapL=lev(cx+(small?0.07:0.14),-0.53,-0.6,0.11,0xdedede);
    if(!P.fixedGear){const piv=new THREE.Group();piv.position.set(cx+0.06,-0.44,-0.98);g.add(piv);const r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.09,8),metal);r.position.y=0.045;piv.add(r);
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.02,16),new THREE.MeshStandardMaterial({color:0xdddddd}));wh.rotation.z=Math.PI/2;wh.position.y=0.095;piv.add(wh);gearL=piv;}
    const st=new THREE.Group();g.add(st);st.position.set(0,-0.42,-0.72);const col=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.25,8),metal);col.rotation.x=Math.PI/2;col.position.z=-0.12;st.add(col);
    const yk=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.014,8,24,Math.PI),dark);yk.rotation.z=Math.PI;yk.position.y=0.03;st.add(yk);sticks.push(st);
  }
  g.visible=false;g.userData={tex:pfd,nd,E,SD,FCU,MC,thr,flapL,gearL,sticks,jet:jet&&!!AL,boe,small};return g;
}
function updateCockpit(F){const {G,DEG}=ctx;const u=G.cockpit.userData;u.tex.needsUpdate=true;u.nd.needsUpdate=true;
  for(const l of u.thr)l.rotation.x=-0.5+F.thr*1.0;if(u.flapL)u.flapL.rotation.x=0.2-F.flaps*0.25;if(u.gearL)u.gearL.rotation.x=F.gear?0.5:-0.5;
  for(const s of u.sticks){if(u.jet&&!u.boe)s.rotation.set(-F.elev*0.25,0,-F.ail*0.3);else{s.rotation.set(0,0,-F.ail*0.35);s.position.z=(u.jet?-0.62:-0.72)+F.elev*0.06;}}
  if((G.t*6|0)===u.lastE)return;u.lastE=G.t*6|0;
  const P=F.P,ne=u.thr.length;
  {const c=u.E.c.getContext('2d'),W=256;c.fillStyle='#05080c';c.fillRect(0,0,W,W);c.font='bold 18px Inter,Arial';c.fillStyle='#7fe0ff';c.textAlign='left';
    c.fillText(P.prop?'TRIEBWERK':'N1 %',12,24);
    for(let i=0;i<ne;i++){const r=ne>2?24:34,x0=ne>2?36+i*61:70+i*116,y0=78,v=F.eng;c.strokeStyle='#cfd8e3';c.lineWidth=3;c.beginPath();c.arc(x0,y0,r,Math.PI*0.75,Math.PI*2.25);c.stroke();
      c.strokeStyle=v>0.95?'#ffcf3a':'#3ddc6a';c.lineWidth=4;c.beginPath();c.moveTo(x0,y0);const a=Math.PI*0.75+v*Math.PI*1.5;c.lineTo(x0+Math.cos(a)*r,y0+Math.sin(a)*r);c.stroke();
      c.fillStyle='#3ddc6a';c.font='bold 15px Inter,Arial';c.textAlign='center';c.fillText((v*100).toFixed(1),x0,y0+r+18);}
    c.textAlign='left';c.fillStyle='#cfd8e3';c.font='bold 16px Inter,Arial';c.fillText('KLAPPEN',12,170);c.fillStyle='#3ddc6a';c.fillText(String(P.flapNames[F.flaps]),110,170);
    c.fillStyle='#cfd8e3';c.fillText('FAHRWERK',12,196);c.fillStyle=F.gearPos>0.98?'#3ddc6a':F.gearPos<0.02?'#cfd8e3':'#ff5a4a';c.fillText(P.fixedGear?'FEST':F.gearPos>0.98?'DOWN':F.gearPos<0.02?'UP':'TRANSIT',110,196);
    c.fillStyle='#cfd8e3';c.fillText('SPOILER',12,222);c.fillStyle=F.spoiler?'#ffcf3a':'#3ddc6a';c.fillText(F.spoiler?'AUSGEF.':'EIN',110,222);
    if(F.vel.y<-12&&!F.onGround){c.fillStyle='#ff5a4a';c.fillText('SINK RATE',12,248);}u.E.t.needsUpdate=true;}
  if(!u.jet)return;
  {const c=u.SD.c.getContext('2d'),W=256;c.fillStyle='#05080c';c.fillRect(0,0,W,W);c.fillStyle='#7fe0ff';c.font='bold 17px Inter,Arial';c.textAlign='center';c.fillText('F/CTL · RÄDER',W/2,24);
    // Räder: drei grüne Dreiecke wenn ausgefahren
    for(const [x,y] of [[128,70],[70,120],[186,120]]){c.fillStyle=F.gearPos>0.98?'#3ddc6a':F.gearPos<0.02?'#2b3036':'#ff5a4a';c.beginPath();c.moveTo(x-16,y+12);c.lineTo(x+16,y+12);c.lineTo(x,y-12);c.closePath();c.fill();}
    const ed=Math.atan2(F.vel.y,Math.hypot(F.vel.x,F.vel.z))/DEG;c.fillStyle='#cfd8e3';c.font='bold 15px Inter,Arial';c.textAlign='left';
    c.fillText('GS '+Math.round(Math.hypot(F.vel.x,F.vel.z)*1.944)+' kt',14,176);c.fillText('FPA '+ed.toFixed(1)+'°',140,176);
    c.fillText('QUER '+Math.round((F.bank||0)/DEG)+'°',14,204);c.fillText('V/S '+Math.round(F.vel.y*196.85),140,204);
    const tt=new Date();c.fillStyle='#3ddc6a';c.fillText('UTC '+String(tt.getUTCHours()).padStart(2,'0')+':'+String(tt.getUTCMinutes()).padStart(2,'0'),14,240);u.SD.t.needsUpdate=true;}
  {const c=u.FCU.c.getContext('2d');c.fillStyle='#16181b';c.fillRect(0,0,1024,128);const ap=G.ap,e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');
    const box=(x,lbl,val)=>{c.fillStyle='#050505';c.fillRect(x,40,170,70);c.fillStyle='#e8e8e8';c.font='bold 22px Inter,Arial';c.textAlign='center';c.fillText(lbl,x+85,30);c.fillStyle='#ff9a2e';c.font='bold 44px "Courier New",monospace';c.fillText(val,x+85,92);};
    box(20,'SPD',ap?String(Math.round(ap.spd*1.944)):'---');box(270,'HDG',ap?String(Math.round(ap.hdg)%360).padStart(3,'0'):'---');
    box(560,'ALT',ap?String(Math.round(ap.alt*3.281/100)*100):String(Math.round(F.pos.y*3.281/100)*100));box(820,'V/S',ap?'----':(F.vel.y*196.85>=0?'+':'')+String(Math.round(F.vel.y*196.85/100)*100).replace('-','−'));
    c.fillStyle=ap?'#3ddc6a':'#3a3f45';c.fillRect(470,50,60,40);c.fillStyle='#111';c.font='bold 20px Inter,Arial';c.fillText('AP',500,78);u.FCU.t.needsUpdate=true;}
  {const c=u.MC.c.getContext('2d');c.fillStyle='#05080c';c.fillRect(0,0,256,320);c.textAlign='left';c.font='bold 20px "Courier New",monospace';
    const nx=G.obj&&G.obj[G.oi];c.fillStyle='#ffffff';c.fillText(' F-PLN',8,26);c.fillStyle='#3ddc6a';
    if(nx){const d=Math.hypot(nx.x-F.pos.x,nx.z-F.pos.z)/1852;c.fillText((nx.name||(nx.ap&&nx.ap.name)||(nx.type==='ring'?'RING':nx.type.toUpperCase())).slice(0,14).toUpperCase(),8,62);c.fillStyle='#ffffff';c.fillText(d.toFixed(1)+' NM',8,92);}
    else{c.fillText('FREIER FLUG',8,62);}
    c.fillStyle='#7fe0ff';c.fillText('ALT '+Math.round(F.pos.y*3.281)+' FT',8,140);c.fillText('SPD '+Math.round(F.vel.length()*1.944)+' KT',8,170);
    c.fillStyle='#bfc6cf';for(let r=0;r<3;r++)for(let k=0;k<6;k++){c.fillRect(8+k*41,214+r*34,34,26);}u.MC.t.needsUpdate=true;}}
return {buildCockpit,updateCockpit};}
