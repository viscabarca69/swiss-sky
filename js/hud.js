// Glas-Cockpit (PFD), Minikarte, Marker
const DEG=Math.PI/180,clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createHUD(){
  const H={};
  const pfd=document.getElementById('pfd'),ctx=pfd.getContext('2d');
  const W=584,Hh=360;pfd.width=W*2;pfd.height=Hh*2;ctx.scale(2,2);H.pfdCanvas=pfd;
  const mini=document.getElementById('mini'),mctx=mini.getContext('2d');mini.width=mini.height=420;
  H.drawPFD=(d)=>{
    const u=d.units;const c=ctx;c.clearRect(0,0,W,Hh);
    const cx=255,cy=160,ppd=6.2;
    // Fluglageanzeige
    c.save();c.beginPath();rr(c,90,8,330,300,14);c.clip();
    c.translate(cx,cy);c.rotate(d.bank);c.translate(0,d.pitch/DEG*ppd);
    let g=c.createLinearGradient(0,-500,0,0);g.addColorStop(0,'#0f3f8a');g.addColorStop(1,'#3d8ae0');c.fillStyle=g;c.fillRect(-600,-900,1200,900);
    g=c.createLinearGradient(0,0,0,500);g.addColorStop(0,'#8a5a2b');g.addColorStop(1,'#4a2f15');c.fillStyle=g;c.fillRect(-600,0,1200,900);
    c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-600,0);c.lineTo(600,0);c.stroke();
    c.font='600 11px Inter,sans-serif';c.fillStyle='#fff';c.textAlign='right';c.textBaseline='middle';c.lineWidth=1.5;
    for(let p=-40;p<=40;p+=2.5){if(p===0)continue;const y=-p*ppd,w=p%10===0?44:p%5===0?26:12;c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();
      if(p%10===0){c.fillText(Math.abs(p),-w-5,y);c.textAlign='left';c.fillText(Math.abs(p),w+5,y);c.textAlign='right';}}
    c.restore();
    // Querneigungsskala
    c.save();c.translate(cx,cy);c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(0,0,128,-Math.PI/2-60*DEG,-Math.PI/2+60*DEG);c.stroke();
    for(const a of [-60,-45,-30,-20,-10,10,20,30,45,60]){c.save();c.rotate(a*DEG);c.beginPath();c.moveTo(0,-128);c.lineTo(0,Math.abs(a)%30===0?-142:-136);c.stroke();c.restore();}
    c.fillStyle='#fff';c.beginPath();c.moveTo(0,-128);c.lineTo(-7,-140);c.lineTo(7,-140);c.closePath();c.fill();
    c.rotate(d.bank);c.fillStyle=Math.abs(d.bank)>50*DEG?'#ff4040':'#ffd23f';c.beginPath();c.moveTo(0,-126);c.lineTo(-8,-113);c.lineTo(8,-113);c.closePath();c.fill();
    c.restore();
    // Flugbahnvektor
    if(d.speed>5){const fx=cx+Math.max(-140,Math.min(140,d.drift/DEG*ppd)),fy=cy-Math.max(-130,Math.min(130,(d.gamma-d.pitch)/DEG*ppd));
      c.save();c.translate(fx,fy);c.rotate(d.bank);c.strokeStyle='#3dff8a';c.lineWidth=2;c.beginPath();c.arc(0,0,7,0,7);c.moveTo(-20,0);c.lineTo(-7,0);c.moveTo(7,0);c.lineTo(20,0);c.moveTo(0,-7);c.lineTo(0,-15);c.stroke();c.restore();}
    // Flugzeugsymbol
    c.fillStyle='#111';c.strokeStyle='#ffd23f';c.lineWidth=3;c.beginPath();c.moveTo(cx-90,cy);c.lineTo(cx-38,cy);c.lineTo(cx-38,cy+10);c.moveTo(cx+90,cy);c.lineTo(cx+38,cy);c.lineTo(cx+38,cy+10);c.stroke();
    c.fillStyle='#ffd23f';c.fillRect(cx-4,cy-4,8,8);
    // ILS: Gleitpfad rechts, Landekurs unten (magenta Raute)
    if(d.ils){const I=d.ils;c.save();c.strokeStyle='#fff';c.fillStyle='#fff';c.lineWidth=1.5;
      for(let k=-2;k<=2;k++){if(!k)continue;c.beginPath();c.arc(404,cy+k*28,3,0,7);c.stroke();c.beginPath();c.arc(cx+k*28,294,3,0,7);c.stroke();}
      c.fillRect(398,cy-1,12,2);c.fillRect(cx-1,288,2,12);
      const dia=(x,y)=>{c.beginPath();c.moveTo(x,y-7);c.lineTo(x+6,y);c.lineTo(x,y+7);c.lineTo(x-6,y);c.closePath();c.fill();};c.fillStyle='#ff4fd8';
      dia(404,cy+clampN(I.gs,-2.5,2.5)*28);dia(cx+clampN(I.loc,-2.5,2.5)*28,294);
      c.font='700 10px Inter,sans-serif';c.textAlign='left';c.fillStyle='#ff4fd8';c.fillText('ILS '+I.rwy,100,286);c.restore();}
    // Modus
    c.font='700 11px Inter,sans-serif';c.textAlign='center';c.fillStyle=d.assist?'#3dff8a':'#9aa4b0';c.fillText(d.assist?(d.prot?'FLUGHILFE · SCHUTZ':'FLUGHILFE'):'MANUELL',cx,22);
    if(d.stall&&(Date.now()%600<380)){c.fillStyle='#ff3030';c.font='900 26px Inter,sans-serif';c.fillText('STALL',cx,cy+70);}
    // Geschwindigkeitsband
    const sp=u.metric?d.speed*3.6:d.speed*1.944,spp=u.metric?1.6:3.2,step=u.metric?20:10;
    c.save();c.beginPath();rr(c,6,8,76,300,8);c.clip();c.fillStyle='rgba(20,24,30,0.78)';c.fillRect(6,8,76,300);
    const sy=v=>cy-(v-sp)*spp;
    if(!d.ground0){const vs=u.metric?d.vs0*3.6:d.vs0*1.944;c.fillStyle='rgba(255,40,40,0.85)';c.fillRect(70,sy(vs),10,400);
    c.fillStyle='rgba(255,180,0,0.8)';c.fillRect(70,sy(vs*1.13),10,sy(vs)-sy(vs*1.13));}
    c.strokeStyle='#fff';c.fillStyle='#fff';c.font='600 12px Inter';c.textAlign='right';c.lineWidth=1.5;
    for(let v=Math.floor((sp-110/spp)/(step/2))*(step/2);v<sp+110/spp;v+=step/2){if(v<0)continue;const y=sy(v);c.beginPath();c.moveTo(70,y);c.lineTo(62,y);c.stroke();if(v%step===0)c.fillText(Math.round(v),58,y+4);}
    const vr=u.metric?d.vr*3.6:d.vr*1.944;c.fillStyle='#29d4ff';c.font='700 10px Inter';c.textAlign='left';c.fillText('R',72,sy(vr)-2);c.fillRect(70,sy(vr)-1,10,2);
    c.restore();
    box(c,10,cy-16,68,32,Math.round(sp)+'',d.overspeed?'#ff4040':d.spdAmber?'#ffb000':'#fff');
    if(d.spdLbl){c.font='800 10px Inter';c.textAlign='center';c.fillStyle=d.overspeed?'#ff6060':'#ffb000';c.fillText(d.spdLbl,44,cy+30);}
    c.fillStyle='#9aa4b0';c.font='600 10px Inter';c.textAlign='center';c.fillText(u.metric?'km/h':'kt',44,326);
    if(d.trend){const t=(u.metric?d.trend*3.6:d.trend*1.944)*10*spp;c.strokeStyle='#ff4fd8';c.lineWidth=2;c.beginPath();c.moveTo(84,cy);c.lineTo(84,cy-Math.max(-140,Math.min(140,t)));c.stroke();}
    // Höhenband
    const alt=u.metric?d.alt:d.alt*3.281,ap=u.metric?0.55:0.17,ast=u.metric?50:100;
    c.save();c.beginPath();rr(c,428,8,82,300,8);c.clip();c.fillStyle='rgba(20,24,30,0.78)';c.fillRect(428,8,82,300);
    const ay=v=>cy-(v-alt)*ap;
    const gnd=u.metric?d.ground:d.ground*3.281;c.fillStyle='rgba(150,90,40,0.55)';c.fillRect(428,ay(gnd),82,400);
    c.strokeStyle='#fff';c.fillStyle='#fff';c.font='600 12px Inter';c.textAlign='left';
    for(let v=Math.floor((alt-160/ap)/ast)*ast;v<alt+160/ap;v+=ast){const y=ay(v);c.beginPath();c.moveTo(428,y);c.lineTo(v%(ast*2)===0?440:435,y);c.stroke();if(v%(ast*2)===0)c.fillText(Math.round(v),444,y+4);}
    c.restore();
    box(c,430,cy-16,78,32,Math.round(alt)+'','#fff');
    c.fillStyle='#9aa4b0';c.font='600 10px Inter';c.textAlign='center';c.fillText(u.metric?'m ü. M.':'ft MSL',469,321);
    // Höhe über Grund (eigenes Feld unter dem Höhenband)
    {const ag=Math.max(0,d.agl??(d.alt-d.ground)),agv=u.metric?ag:ag*3.281,low=ag<150;c.fillStyle='rgba(20,24,30,0.85)';c.beginPath();rr(c,430,327,78,27,7);c.fill();
     c.fillStyle=low?'#ffb000':'#e9eef5';c.font='800 13px Inter';c.textAlign='center';c.fillText(String(Math.round(agv>2000?agv/10:agv)*(agv>2000?10:1)),469,341);
     c.fillStyle='#9aa4b0';c.font='600 8px Inter';c.fillText(u.metric?'m über Grund':'ft AGL',469,351);}
    // Variometer: eigene Spalte rechts neben dem Höhenband
    {const vs=d.vspeed,vsv=u.metric?vs:vs*196.85,X=514,Y0=8,HH=300,mid=Y0+HH/2,sc=v=>Math.sign(v)*Math.min(1,Math.sqrt(Math.abs(v)/20))*(HH/2-14);
     c.save();c.beginPath();rr(c,X,Y0,62,HH,8);c.clip();c.fillStyle='rgba(20,24,30,0.7)';c.fillRect(X,Y0,62,HH);
     c.strokeStyle='rgba(255,255,255,0.55)';c.fillStyle='#c9d1db';c.font='600 9px Inter';c.textAlign='left';c.lineWidth=1;
     for(const m of [-20,-10,-5,-2,0,2,5,10,20]){const y=mid-sc(m);c.beginPath();c.moveTo(X,y);c.lineTo(X+(m===0?14:8),y);c.stroke();if(m)c.fillText(Math.abs(m),X+11,y+3);}
     const y=mid-sc(vs);c.strokeStyle=Math.abs(vs)>8?'#ffb000':'#3dff8a';c.lineWidth=3;c.beginPath();c.moveTo(X+2,mid);c.lineTo(X+30,y);c.stroke();c.restore();
     c.fillStyle='rgba(20,24,30,0.9)';c.beginPath();rr(c,X+4,mid-13,56,26,6);c.fill();
     c.fillStyle=Math.abs(vs)>8?'#ffb000':'#fff';c.font='800 12px Inter';c.textAlign='center';c.fillText((vsv>0.05?'+':'')+(u.metric?vsv.toFixed(1):Math.round(vsv/10)*10),X+32,mid+4);
     c.fillStyle='#9aa4b0';c.font='600 9px Inter';c.fillText(u.metric?'m/s':'ft/min',X+31,321);}
    // Kursband
    c.save();c.beginPath();rr(c,140,316,230,38,8);c.clip();c.fillStyle='rgba(20,24,30,0.78)';c.fillRect(140,316,230,38);
    const hd=d.heading,hp=4.2;c.strokeStyle='#fff';c.fillStyle='#fff';c.textAlign='center';c.font='600 11px Inter';
    for(let a=Math.floor(hd/5)*5-30;a<=hd+30;a+=5){const x=cx-(hd-a)*hp,aa=((a%360)+360)%360;c.beginPath();c.moveTo(x,316);c.lineTo(x,a%10===0?326:321);c.stroke();
      if(a%10===0){const lbl={0:'N',90:'E',180:'S',270:'W'}[aa]??String(aa/10);c.fillText(lbl,x,340);}}
    const tx=cx-((hd-d.track+540)%360-180)*hp;c.fillStyle='#ff4fd8';c.beginPath();c.moveTo(tx,317);c.lineTo(tx-5,325);c.lineTo(tx+5,325);c.fill();
    if(d.wpBrg!=null){const off=((d.wpBrg-hd+540)%360)-180,bx=cx+clampN(off,-27,27)*hp;c.fillStyle='#22e0ff';c.strokeStyle='#05202a';c.lineWidth=1.2;c.beginPath();
      if(Math.abs(off)<=27){c.moveTo(bx-7,316);c.lineTo(bx+7,316);c.lineTo(bx+7,324);c.lineTo(bx+3,324);c.lineTo(bx,320);c.lineTo(bx-3,324);c.lineTo(bx-7,324);}else{const sg=Math.sign(off);c.moveTo(bx+sg*6,330);c.lineTo(bx-sg*4,324);c.lineTo(bx-sg*4,336);}c.closePath();c.fill();c.stroke();}
    c.restore();c.fillStyle='#ffd23f';c.beginPath();c.moveTo(cx,318);c.lineTo(cx-6,310);c.lineTo(cx+6,310);c.fill();
    c.fillStyle='#fff';c.font='700 12px Inter';c.fillText(String(Math.round(hd)%360).padStart(3,'0')+'°',cx,306);
  };
  // Route: Flugzeug → verbleibende Ziele (Ringe usw.) → eigenes Ziel
  const pin=(c,x,y,sc,lbl)=>{c.save();c.translate(x,y);c.scale(sc,sc);c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=6;c.fillStyle='#22e0ff';c.strokeStyle='#05202a';c.lineWidth=2;
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-4,-8,-11,-12,-11,-20);c.arc(0,-20,11,Math.PI,0);c.bezierCurveTo(11,-12,4,-8,0,0);c.closePath();c.fill();c.shadowBlur=0;c.stroke();
    c.fillStyle='#05202a';c.beginPath();c.arc(0,-20,4.2,0,7);c.fill();c.restore();
    if(lbl){c.font='800 13px Inter';const w=c.measureText(lbl).width;c.fillStyle='rgba(5,20,28,.85)';c.beginPath();rr(c,x+12,y-36*sc,w+14,22,6);c.fill();c.fillStyle='#22e0ff';c.textAlign='left';c.fillText(lbl,x+19,y-36*sc+15);}};
  const route=(c,P,d,objs,oi,wp,lw)=>{
    let prev=d.from?P(d.from[0],d.from[1]):P(d.x,d.z);const pts=[];
    if(d.path&&d.path.length){const pa=d.path;objs.forEach((o,i)=>{if(i<oi)return;
        if(o.pi){let a=o.pi[0];const b=Math.min(pa.length,o.pi[1]);
          if(i===oi&&!d.from){let bd=1e18;for(let k=a;k<b;k++){const q=pa[k],dd=(q.x-d.x)**2+(q.z-d.z)**2;if(dd<bd){bd=dd;a=k;}}if(bd<2500*2500)prev=P(pa[a].x,pa[a].z);}
          for(let k=a;k<b;k+=2)pts.push(P(pa[k].x,pa[k].z));if(b>a)pts.push(P(pa[b-1].x,pa[b-1].z));}
        else pts.push(P(o.x,o.z));});}
    else objs.forEach((o,i)=>{if(i>=oi)pts.push(P(o.x,o.z));});
    c.lineCap=c.lineJoin='round';
    if(pts.length){c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=lw+3;c.setLineDash([]);c.beginPath();c.moveTo(...prev);pts.forEach(q=>c.lineTo(...q));c.stroke();
      c.strokeStyle='#ffd23f';c.lineWidth=lw;c.setLineDash([lw*3,lw*2]);c.beginPath();c.moveTo(...prev);pts.forEach(q=>c.lineTo(...q));c.stroke();prev=pts[pts.length-1];}
    if(wp){const q=P(wp.x,wp.z);c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=lw+3;c.setLineDash([]);c.beginPath();c.moveTo(...prev);c.lineTo(...q);c.stroke();
      c.strokeStyle='#22e0ff';c.lineWidth=lw;c.setLineDash([lw*3,lw*2]);c.beginPath();c.moveTo(...prev);c.lineTo(...q);c.stroke();}
    c.setLineDash([]);};
  // Anflugbahn (violett): Kurven, Sinkflugbeginn, Höhen
  const drawAppr=(c,P,pl,lbl,lw,rot)=>{if(!pl)return;const pts=pl.pts,st=Math.max(0,pl.last||0);c.lineCap=c.lineJoin='round';
    const line=(i0,i1,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();for(let i=i0;i<=i1;i+=2){const q=P(pts[i].x,pts[i].z);i===i0?c.moveTo(...q):c.lineTo(...q);}c.stroke();};
    if(st>2)line(0,st,'rgba(214,92,255,.25)',lw);
    line(st,pts.length-1,'rgba(30,0,40,.55)',lw+4);line(st,Math.min(pts.length-1,pl.iFAF),'#d65cff',lw);line(Math.max(st,pl.iFAF),pts.length-1,'#ff8af0',lw+1);
    const tag=(i,txt,col)=>{if(i<st||i<0)return;const q=P(pts[i].x,pts[i].z);c.fillStyle=col;c.strokeStyle='#1e0028';c.lineWidth=2;c.beginPath();c.arc(q[0],q[1],lbl?6:7,0,7);c.fill();c.stroke();
      if(!lbl)return;c.save();c.translate(q[0],q[1]);if(rot)c.rotate(rot);c.font='800 12px Inter';const w=c.measureText(txt).width;c.fillStyle='rgba(20,0,28,.86)';c.beginPath();rr(c,9,-22,w+12,19,5);c.fill();c.fillStyle='#f3c9ff';c.textAlign='left';c.fillText(txt,15,-8);c.restore();};
    if(pl.iTOD>=0)tag(pl.iTOD,`↘ Sinkflug ab ${Math.round(pts[pl.iTOD].y)} m`,'#ffd23f');
    tag(pl.iIF,`Eindrehen · ${Math.round(pl.yF)} m`,'#d65cff');tag(pl.iFAF,`Gleitpfad ab ${Math.round(pl.yF)} m`,'#ff8af0');
    if(lbl){let nx=st+Math.round(8000/40);for(let i=nx;i<Math.min(pl.iTOD>=0?pl.iTOD:pl.iIF,pts.length)-60;i+=Math.round(8000/40)){const q=P(pts[i].x,pts[i].z);c.font='700 11px Inter';c.fillStyle='#f3c9ff';c.strokeStyle='rgba(20,0,28,.9)';c.lineWidth=3;c.textAlign='center';c.strokeText(Math.round(pts[i].y)+' m',q[0],q[1]-8);c.fillText(Math.round(pts[i].y)+' m',q[0],q[1]-8);}}
    const e=pts[pts.length-1],q=P(e.x,e.z);c.fillStyle='#ff8af0';c.beginPath();c.arc(q[0],q[1],lbl?5:6,0,7);c.fill();};
  H.drawMini=(map,d,objs,oi,AIR)=>{
    const c=mctx,S=420,R=d.range||6000,k=S/(2*R);c.clearRect(0,0,S,S);c.save();c.beginPath();c.arc(S/2,S/2,S/2-2,0,7);c.clip();
    c.fillStyle='#1b2430';c.fillRect(0,0,S,S);
    c.translate(S/2,S/2);c.rotate(-d.heading*DEG);
    const mk=map.width/(2*d.half);const sx=(d.x+d.half-R*1.5)*mk,sz=(d.z+d.half-R*1.5)*mk;
    c.drawImage(map,sx,sz,3*R*mk,3*R*mk,-R*1.5*k,-R*1.5*k,3*R*k,3*R*k);
    const P=(x,z)=>[(x-d.x)*k,(z-d.z)*k];
    for(const A of AIR){const a=P(A.x-A.sin*A.len/2,A.z+A.cos*A.len/2),b=P(A.x+A.sin*A.len/2,A.z-A.cos*A.len/2);c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
    for(const g of d.gold||[]){const p=P(g.x,g.z);c.save();c.translate(p[0],p[1]);c.rotate(d.heading*DEG);c.fillStyle='#ffd23a';c.strokeStyle='#5a3d00';c.lineWidth=1.5;c.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,rr=i%2?3.5:8;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();c.restore();}
    for(const t of d.traffic||[]){const p=P(t.x,t.z);c.save();c.translate(p[0],p[1]);c.rotate(t.hdg*DEG);c.fillStyle='#7fe0ff';c.strokeStyle='#000';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(0,3);c.lineTo(6,7);c.closePath();c.fill();c.stroke();c.restore();}
    route(c,P,d,objs,oi,d.wp,4);
    drawAppr(c,P,d.appr,false,5);
    objs.forEach((o,i)=>{if(i<oi)return;const p=P(o.x,o.z);c.fillStyle=i===oi?'#ffd23f':'rgba(255,210,63,0.55)';c.strokeStyle='#3a2a00';c.lineWidth=2;c.beginPath();c.arc(p[0],p[1],i===oi?10:6,0,7);c.fill();c.stroke();});
    if(d.wp){const p=P(d.wp.x,d.wp.z);c.save();c.translate(p[0],p[1]);c.rotate(d.heading*DEG);pin(c,0,0,1.15);c.restore();}
    c.restore();
    // Randpfeile für Ziele ausserhalb der Minikarte
    const edge=(x,z,col)=>{const dx=x-d.x,dz=z-d.z,dist=Math.hypot(dx,dz);if(dist*k<S/2-16)return;const a=Math.atan2(dz,dx)-d.heading*DEG,r=S/2-15;
      c.save();c.translate(S/2+Math.cos(a)*r,S/2+Math.sin(a)*r);c.rotate(a);c.fillStyle=col;c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(11,0);c.lineTo(-8,-9);c.lineTo(-4,0);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();};
    if(objs[oi])edge(objs[oi].x,objs[oi].z,'#ffd23f');if(d.wp)edge(d.wp.x,d.wp.z,'#22e0ff');
    c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(S/2,S/2-16);c.lineTo(S/2-11,S/2+12);c.lineTo(S/2,S/2+6);c.lineTo(S/2+11,S/2+12);c.closePath();c.fill();c.stroke();
    c.fillStyle='#fff';c.font='700 22px Inter';c.textAlign='center';c.save();c.translate(S/2,S/2);c.rotate(-d.heading*DEG);c.fillText('N',0,-S/2+30);c.restore();
  };
  // Grosse Karte mit Zoom/Verschieben (d.view={z,cx,cz}), eigenem Ziel (d.wp) und Cursor (d.cur)
  H.mapXf=(S,half,v,Hc)=>{Hc=Hc||S;const k=S/(2*half)*v.z;return{k,X:x=>(x-v.cx)*k+S/2,Y:z=>(z-v.cz)*k+Hc/2,inv:(px,py)=>({x:(px-S/2)/k+v.cx,z:(py-Hc/2)/k+v.cz})};};
  H.drawMap=(cv,map,d,objs,oi,AIR,TOWNS,trail,EXTRA)=>{
    const c=cv.getContext('2d'),S=cv.width,Hc=cv.height,v=d.view||{z:1,cx:0,cz:0},T=H.mapXf(S,d.half,v,Hc),X=T.X,Y=T.Y,z=v.z;
    c.fillStyle='#141a22';c.fillRect(0,0,S,Hc);
    const mk=map.width/(2*d.half),hw=d.half/z;c.imageSmoothingQuality='high';
    const hh=hw*Hc/S;c.drawImage(map,(v.cx-hw+d.half)*mk,(v.cz-hh+d.half)*mk,2*hw*mk,2*hh*mk,0,0,S,Hc);
    c.textAlign='left';
    for(const L of EXTRA.lakes){c.fillStyle='rgba(190,225,255,0.95)';c.font=`italic 600 ${Math.round(13+z)}px Inter`;c.textAlign='center';c.fillText(L.name,X(L.cx),Y(L.cz));}
    for(const P of EXTRA.peaks){const x=X(P.x),y=Y(P.z);c.fillStyle='#fff';c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1;c.beginPath();c.moveTo(x,y-7);c.lineTo(x-6,y+4);c.lineTo(x+6,y+4);c.closePath();c.fill();c.stroke();
      c.font='600 12px Inter';c.textAlign='left';c.fillStyle='rgba(0,0,0,.55)';c.fillText(`${P.name} ${P.h}`,x+9,y+5);c.fillStyle='#fff';c.fillText(`${P.name} ${P.h}`,x+8,y+4);}
    c.textAlign='left';
    for(const Tn of TOWNS){const big=Tn.city||Tn.r>=900;if(!big&&z<1.4&&Tn.r<500)continue;const x=X(Tn.x),y=Y(Tn.z);c.font=(big?'700 15px':'600 12px')+' Inter';c.fillStyle='rgba(0,0,0,0.55)';c.fillText(Tn.name,x+7,y+5);c.fillStyle='#fff';c.fillText(Tn.name,x+6,y+4);c.beginPath();c.arc(x,y,big?3.5:2.2,0,7);c.fill();}
    const seen={};
    for(const A of AIR){c.strokeStyle='#fff';c.lineWidth=(A.small?3:5)*Math.min(2,Math.sqrt(z));c.beginPath();c.moveTo(X(A.x-A.sin*A.len/2),Y(A.z+A.cos*A.len/2));c.lineTo(X(A.x+A.sin*A.len/2),Y(A.z-A.cos*A.len/2));c.stroke();
      if(seen[A.icao])continue;seen[A.icao]=1;const rw=AIR.filter(a=>a.icao===A.icao).map(a=>a.rwyA+'/'+a.rwyB).join(' · ');
      c.fillStyle='rgba(0,0,0,.55)';c.font='800 15px Inter';c.fillText(`${A.name} ${A.icao}`,X(A.x)+17,Y(A.z)-9);c.fillStyle='#29d4ff';c.fillText(`${A.name} ${A.icao}`,X(A.x)+16,Y(A.z)-10);c.font='600 11px Inter';c.fillText(`${rw} · ${A.elev} m`,X(A.x)+16,Y(A.z)+5);}
    for(const g of EXTRA.gold||[]){c.fillStyle='#ffd23a';c.strokeStyle='#5a3d00';c.lineWidth=1.5;c.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,rr=i%2?4:9;c.lineTo(X(g.x)+Math.cos(a)*rr,Y(g.z)+Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();}
    for(const t of EXTRA.traffic||[]){c.fillStyle='#7fe0ff';c.beginPath();c.arc(X(t.x),Y(t.z),4,0,7);c.fill();}
    if(trail.length>1){c.strokeStyle='#ff4fd8';c.lineWidth=2.5;c.beginPath();trail.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke();}
    route(c,(x,zz)=>[X(x),Y(zz)],d,objs,oi,d.wp,3);
    objs.forEach((o,i)=>{if(i<oi)return;c.fillStyle=i===oi?'#ffd23f':'rgba(255,210,63,0.7)';c.strokeStyle='#3a2a00';c.lineWidth=2;c.beginPath();c.arc(X(o.x),Y(o.z),i===oi?9:6,0,7);c.fill();c.stroke();
      if(i===oi||z>2){c.fillStyle='#3a2a00';c.font='800 10px Inter';c.textAlign='center';c.fillText(String(i+1),X(o.x),Y(o.z)+3.5);c.textAlign='left';}});
    drawAppr(c,(x,zz)=>[X(x),Y(zz)],EXTRA&&EXTRA.appr,true,4);
    if(d.wp)pin(c,X(d.wp.x),Y(d.wp.z),1.3,d.wp.lbl);
    if(d.lastLbl&&objs.length){const o=objs[objs.length-1],lb=o.type==='land'?'Landung '+o.ap.name:o.name?'Ziel: '+o.name:'Ziel';c.font='800 13px Inter';const w=c.measureText(lb).width;c.fillStyle='rgba(10,14,20,.85)';c.beginPath();rr(c,X(o.x)+12,Y(o.z)-12,w+14,22,6);c.fill();c.fillStyle='#ffd23f';c.textAlign='left';c.fillText(lb,X(o.x)+19,Y(o.z)+3.5);}
    c.save();c.translate(X(d.x),Y(d.z));c.rotate(d.heading*DEG);c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(0,-15);c.lineTo(-11,11);c.lineTo(0,5);c.lineTo(11,11);c.closePath();c.fill();c.stroke();c.restore();
    // Cursor (Controller/Maus) mit Vorschau
    if(d.cur){const x=X(d.cur.x),y=Y(d.cur.z);c.strokeStyle='#fff';c.lineWidth=2;c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=4;c.beginPath();c.arc(x,y,13,0,7);c.moveTo(x-22,y);c.lineTo(x-6,y);c.moveTo(x+6,y);c.lineTo(x+22,y);c.moveTo(x,y-22);c.lineTo(x,y-6);c.moveTo(x,y+6);c.lineTo(x,y+22);c.stroke();c.shadowBlur=0;
      if(d.cur.lbl){c.font='700 13px Inter';const w=c.measureText(d.cur.lbl).width;const bx=Math.min(S-w-24,x+18),by=Math.max(8,y-40);c.fillStyle='rgba(10,14,20,.85)';c.beginPath();rr(c,bx,by,w+16,24,6);c.fill();c.fillStyle='#fff';c.fillText(d.cur.lbl,bx+8,by+16.5);}}
    // Massstab
    {const km=[1,2,5,10,20][[1,2,5,10,20].findIndex(q=>q*1000*T.k>90)]||20,px=km*1000*T.k;c.fillStyle='rgba(10,14,20,.7)';c.beginPath();rr(c,14,Hc-44,px+28,30,7);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(28,Hc-24);c.lineTo(28,Hc-19);c.lineTo(28+px,Hc-19);c.lineTo(28+px,Hc-24);c.stroke();c.fillStyle='#fff';c.font='700 11px Inter';c.textAlign='center';c.fillText(km+' km',28+px/2,Hc-26);c.textAlign='left';}
  };
  return H;
}
function rr(c,x,y,w,h,r){c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function box(c,x,y,w,h,t,col){c.fillStyle='#000';c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();rr(c,x,y,w,h,5);c.fill();c.stroke();c.fillStyle=col;c.font='800 18px Inter';c.textAlign='center';c.fillText(t,x+w/2,y+h/2+6);}
