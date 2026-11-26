// Flugzeuge: Daten + detaillierte 3D-Modelle
import {TEXS} from './device.js';
import * as THREE from 'three';
import {makeGlow} from './env.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const PLANES={
  alpina:{id:'alpina',name:'Alpina S-72',type:'Hochdecker · 4 Plätze',cls:'small',desc:'Der gutmütige Klassiker für Rundflüge. Reist mit rund 240 km/h.',
    mass:1050,S:16.2,CL0:0.3,CLa:5.0,alphaStall:15,flapCL:[0,0.28,0.5,0.7],flapCD:0.05,flapNames:['0°','10°','20°','30°'],CD0:0.03,K:0.055,gearCD:0,fixedGear:true,
    Tmax:3700,prop:true,Vprop:145,spool:3,Vr:28,Vref:33,gearH:1.32,bellyH:0.6,steer:0.7,rotRate:0.14,tailStrike:13,rollRate:0.95,yawAuth:1.3,kAlpha:10,dampP:5,qRef:900,
    brakeMu:0.7,reverse:0,maxBank:45,wingStrike:20,camDist:12.5,camH:3,shadow:20,ldgSink:2.6,engines:1,crates:4,wingTip:5.5},
  saentis:{id:'saentis',name:'Säntis S-22',type:'Schneller Tiefdecker · 4 Plätze',cls:'small',desc:'Moderner Reise-Einmot – ideal zum Erkunden, rund 320 km/h schnell.',
    mass:1450,S:13.5,CL0:0.25,CLa:5.2,alphaStall:15,flapCL:[0,0.3,0.55,0.75],flapCD:0.05,flapNames:['0°','16°','32°','40°'],CD0:0.026,K:0.05,gearCD:0,fixedGear:true,
    Tmax:6000,prop:true,Vprop:190,spool:3,Vr:36,Vref:40,gearH:1.25,bellyH:0.55,steer:0.7,rotRate:0.14,tailStrike:12,rollRate:1.1,yawAuth:1.2,kAlpha:9,dampP:4.6,qRef:1500,
    brakeMu:0.7,reverse:0,maxBank:45,wingStrike:18,camDist:12,camH:2.8,shadow:18,ldgSink:2.6,engines:1,crates:0,wingTip:5.85},
  titlis:{id:'titlis',name:'Titlis T-12 NGX',type:'Einmotorige Turboprop · 9 Plätze',cls:'small',desc:'Robuster Alleskönner für Berge und kurze Pisten, neueste Ausführung mit Fünfblatt-Propeller. Schnell (≈500 km/h), kann Kisten abwerfen.',
    mass:4300,S:25.8,CL0:0.3,CLa:5.3,alphaStall:15,flapCL:[0,0.35,0.6,0.85],flapCD:0.055,flapNames:['0°','15°','30°','40°'],CD0:0.024,K:0.045,gearCD:0.015,
    Tmax:14000,prop:true,Vprop:230,spool:2,Vr:40,Vref:45,gearH:1.7,bellyH:0.8,steer:0.55,rotRate:0.1,tailStrike:11,rollRate:0.8,yawAuth:0.9,kAlpha:7,dampP:4,qRef:3000,
    brakeMu:0.65,reverse:0.25,maxBank:45,wingStrike:16,camDist:20,camH:4.5,shadow:28,ldgSink:2.8,engines:1,crates:4,wingTip:8.1},
  foehn:{id:'foehn',name:'Föhn TP-42',type:'Regional-Turboprop · 48 Plätze',cls:'regional',desc:'Zweimotorig, robust, mit Laderaum für Abwürfe. Kurze Pisten sind kein Problem.',
    mass:16500,S:54.5,CL0:0.3,CLa:5.4,alphaStall:14,flapCL:[0,0.35,0.6,0.85],flapCD:0.055,flapNames:['0','15','25','35'],CD0:0.026,K:0.042,gearCD:0.016,
    Tmax:54000,prop:true,Vprop:185,spool:1.6,Vr:52,Vref:56,gearH:2.15,bellyH:1.0,steer:0.45,rotRate:0.07,tailStrike:9,rollRate:0.5,yawAuth:0.7,kAlpha:6,dampP:3.4,qRef:3500,
    brakeMu:0.65,reverse:0.25,maxBank:40,wingStrike:14,camDist:31,camH:7,shadow:45,ldgSink:2.8,engines:2,crates:6,wingTip:12.3},
  feuer:{id:'feuer',name:'Feuervogel FV-515',type:'Amphibien-Löschflugzeug · 2 Motoren',cls:'regional',desc:'Landet auf Seen, schöpft im Gleiten 6000 Liter Wasser und löscht Waldbrände. Fahrwerk auf dem Wasser eingefahren lassen!',
    mass:17000,S:100,CL0:0.35,CLa:5.2,alphaStall:15,flapCL:[0,0.3,0.55,0.8],flapCD:0.05,flapNames:['0°','10°','20°','30°'],CD0:0.034,K:0.05,gearCD:0.015,
    Tmax:52000,prop:true,Vprop:170,spool:1.8,Vr:36,Vref:42,gearH:2.3,bellyH:0.95,waterH:0.95,steer:0.5,rotRate:0.08,tailStrike:10,rollRate:0.6,yawAuth:0.8,kAlpha:5.5,dampP:3.6,qRef:2600,
    brakeMu:0.6,reverse:0.2,maxBank:40,wingStrike:12,camDist:30,camH:7,shadow:40,ldgSink:3,engines:2,crates:0,wingTip:14.5,amphib:true},
  segler:{id:'segler',name:'Segler LS-18',type:'Segelflugzeug · 1 Platz',cls:'small',desc:'Kein Motor, dafür 18 m Spannweite: Steig in der Thermik unter den Quellwolken und gleite lautlos über die Alpen.',
    mass:450,S:10.5,CL0:0.4,CLa:5.6,alphaStall:14,flapCL:[0,0.12,0.25,0.4],flapCD:0.025,flapNames:['0°','5°','10°','Landung'],CD0:0.0095,K:0.018,gearCD:0,fixedGear:true,
    Tmax:0,prop:true,Vprop:100,spool:1,Vr:20,Vref:27,gearH:0.62,bellyH:0.35,steer:0.6,rotRate:0.14,tailStrike:12,rollRate:0.75,yawAuth:1.2,kAlpha:9,dampP:4.8,qRef:450,
    brakeMu:0.5,reverse:0,maxBank:50,wingStrike:7,camDist:14,camH:2.6,shadow:20,ldgSink:2.4,engines:0,crates:0,wingTip:9.1,glider:true},
  rega:{id:'rega',name:'Rega H145',type:'Rettungshelikopter · 2 Turbinen · 5 Rotorblätter',cls:'heli',heli:true,desc:'Der neue rot-weisse Rettungshelikopter (Airbus H145 D3): senkrecht starten, schweben, am Berg landen und Patienten ins Spital fliegen.',
    mass:3700,S:20,CL0:0,CLa:5,alphaStall:15,flapCL:[0,0,0,0],flapCD:0,flapNames:['–','–','–','–'],CD0:0.05,K:0.05,gearCD:0,fixedGear:true,rotorR:5.5,Vmax:79,
    Tmax:0,prop:true,Vprop:100,spool:2,Vr:0,Vref:22,gearH:1.32,bellyH:1.2,steer:0,rotRate:0,tailStrike:20,rollRate:1,yawAuth:1,kAlpha:5,dampP:4,qRef:1000,
    brakeMu:1,reverse:0,maxBank:35,wingStrike:20,camDist:20,camH:5,shadow:22,ldgSink:3,engines:2,crates:0,wingTip:6},
  l320:{id:'l320',name:'LUIS L-321neo',type:'Mittelstrecke lang · 220 Plätze',cls:'jet',desc:'Die lange Version mit neuen Triebwerken: 44,5 m, vier Türpaare, Sharklets. Mehr Plätze, braucht etwas mehr Piste.',
    mass:76000,S:122.6,CL0:0.2,CLa:5.6,alphaStall:15,flapCL:[0,0.42,0.8,1.17],flapCD:0.066,flapNames:['0','1','2','FULL'],CD0:0.0205,K:0.04,gearCD:0.02,
    Tmax:292000,prop:false,spool:0.45,Vr:80,Vref:72,gearH:3.8,bellyH:1.9,steer:0.28,rotRate:0.045,tailStrike:9.7,rollRate:0.34,yawAuth:0.47,kAlpha:4.3,dampP:2.7,qRef:9100,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:11,camDist:62,camH:12,shadow:78,ldgSink:2.8,engines:2,crates:0,wingTip:17.9},
  l32n:{id:'l32n',name:'LUIS L-320neo',type:'Mittelstrecke · neue Triebwerke · 180 Plätze',cls:'jet',desc:'Die sparsame Neuauflage der L-320: grosse Triebwerke, Sharklets an den Flügelspitzen, mehr Schub.',
    mass:66000,S:122.6,CL0:0.2,CLa:5.6,alphaStall:15,flapCL:[0,0.4,0.75,1.1],flapCD:0.065,flapNames:['0','1','2','FULL'],CD0:0.0205,K:0.04,gearCD:0.02,
    Tmax:262000,prop:false,spool:0.45,Vr:76,Vref:70,gearH:3.8,bellyH:1.9,steer:0.3,rotRate:0.05,tailStrike:11,rollRate:0.36,yawAuth:0.5,kAlpha:4.5,dampP:2.8,qRef:9000,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:11,camDist:54,camH:11,shadow:70,ldgSink:2.8,engines:2,crates:0,wingTip:17.9},
  l330:{id:'l330',name:'LUIS L-330neo',type:'Grossraum · 2 Triebwerke · 290 Plätze',cls:'jet',desc:'Der neue Grossraum-Zweistrahler: 64 m lang, 64 m Spannweite mit Sharklets und riesigen Trent-7000-Triebwerken.',
    mass:190000,S:370,CL0:0.22,CLa:5.6,alphaStall:14,flapCL:[0,0.42,0.78,1.12],flapCD:0.06,flapNames:['0','1','2','FULL'],CD0:0.0195,K:0.037,gearCD:0.02,
    Tmax:650000,prop:false,spool:0.4,Vr:78,Vref:72,gearH:4.7,bellyH:2.8,steer:0.24,rotRate:0.042,tailStrike:10,rollRate:0.3,yawAuth:0.42,kAlpha:3.8,dampP:2.5,qRef:9500,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:9,camDist:88,camH:17,shadow:110,ldgSink:2.7,engines:2,crates:0,wingTip:32.0},
  l340:{id:'l340',name:'LUIS L-340',type:'Langstrecke · 4 Triebwerke · 280 Plätze',cls:'jet',desc:'Der klassische Vierstrahler wie bei Swiss: 64 m lang, vier schlanke Triebwerke.',
    mass:220000,S:361.6,CL0:0.22,CLa:5.6,alphaStall:14,flapCL:[0,0.42,0.78,1.12],flapCD:0.06,flapNames:['0','1','2','FULL'],CD0:0.02,K:0.04,gearCD:0.02,
    Tmax:600000,prop:false,spool:0.38,Vr:82,Vref:76,gearH:4.7,bellyH:2.8,steer:0.22,rotRate:0.038,tailStrike:9,rollRate:0.27,yawAuth:0.4,kAlpha:3.6,dampP:2.4,qRef:9500,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:8,camDist:88,camH:17,shadow:120,ldgSink:2.6,engines:4,crates:0,wingTip:30.2},
  l346:{id:'l346',name:'LUIS L-340 Stretch',type:'Ultralangstrecke · 4 Triebwerke · 380 Plätze',cls:'jet',desc:'Die gestreckte L-340: 75 m lang, grosse Triebwerke – elegant und für die ganz weiten Strecken.',
    mass:250000,S:439,CL0:0.22,CLa:5.6,alphaStall:14,flapCL:[0,0.42,0.78,1.12],flapCD:0.06,flapNames:['0','1','2','FULL'],CD0:0.02,K:0.04,gearCD:0.02,
    Tmax:1000000,prop:false,spool:0.38,Vr:82,Vref:76,gearH:4.7,bellyH:2.8,steer:0.22,rotRate:0.038,tailStrike:9,rollRate:0.27,yawAuth:0.4,kAlpha:3.6,dampP:2.4,qRef:9500,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:8,camDist:98,camH:18,shadow:120,ldgSink:2.6,engines:4,crates:0,wingTip:31.8},
  l350:{id:'l350',name:'LUIS L-350',type:'Moderne Langstrecke · 350 Plätze',cls:'jet',desc:'Der neueste Langstrecken-Jet der Flotte: leise, effizient, 74 m lang.',
    mass:250000,S:465,CL0:0.22,CLa:5.6,alphaStall:14,flapCL:[0,0.45,0.8,1.15],flapCD:0.06,flapNames:['0','1','2','FULL'],CD0:0.019,K:0.038,gearCD:0.02,
    Tmax:860000,prop:false,spool:0.4,Vr:80,Vref:74,gearH:5.1,bellyH:2.9,steer:0.22,rotRate:0.04,tailStrike:10.5,rollRate:0.27,yawAuth:0.4,kAlpha:3.6,dampP:2.4,qRef:9500,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:9,camDist:96,camH:19,shadow:120,ldgSink:2.6,engines:2,crates:0,wingTip:32.4},
  l747:{id:'l747',name:'LUIS L-747-8',type:'Jumbo · 4 Triebwerke · 465 Plätze',cls:'jet',desc:'Die neueste Königin der Lüfte: 76 m lang, längeres Oberdeck, GEnx-Triebwerke mit Zackendüsen und schräge Flügelspitzen.',
    mass:360000,S:554,CL0:0.22,CLa:5.6,alphaStall:14,flapCL:[0,0.42,0.8,1.12],flapCD:0.062,flapNames:['0','1','2','FULL'],CD0:0.0205,K:0.039,gearCD:0.02,
    Tmax:1190000,prop:false,spool:0.36,Vr:85,Vref:78,gearH:5.4,bellyH:3.5,steer:0.2,rotRate:0.034,tailStrike:9.5,rollRate:0.23,yawAuth:0.35,kAlpha:3.2,dampP:2.3,qRef:9800,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:8,camDist:120,camH:24,shadow:150,ldgSink:2.6,engines:4,crates:0,wingTip:34.2},
  l380:{id:'l380',name:'LUIS L-380',type:'Doppelstöcker · 4 Triebwerke · 500 Plätze',cls:'jet',desc:'Der Riese: zwei volle Passagierdecks, 80 m Spannweite. Nur für lange Pisten wie Zürich.',
    mass:420000,S:845,CL0:0.24,CLa:5.6,alphaStall:14,flapCL:[0,0.42,0.78,1.1],flapCD:0.06,flapNames:['0','1','2','FULL'],CD0:0.021,K:0.04,gearCD:0.02,
    Tmax:1360000,prop:false,spool:0.35,Vr:82,Vref:74,gearH:6.3,bellyH:4.2,steer:0.2,rotRate:0.035,tailStrike:10,rollRate:0.22,yawAuth:0.35,kAlpha:3.2,dampP:2.2,qRef:10000,
    brakeMu:0.6,reverse:0.3,maxBank:30,wingStrike:8,camDist:120,camH:24,shadow:150,ldgSink:2.6,engines:4,crates:0,wingTip:39.9}
};
function lerpProf(prof,t,key){const g=q=>key==='syT'?(q.syT??q.sy??1):key==='sxT'?(q.sxT??1):(q[key]??(key==='r'?0:1));for(let i=0;i<prof.length-1;i++){const a=prof[i],b=prof[i+1];if(t<=b.t){const u=(t-a.t)/(b.t-a.t||1);return g(a)*(1-u)+g(b)*u;}}return g(prof[prof.length-1]);}
// Höhenfaktor oben/unten: die obere Rumpfhälfte kann höher sein (Buckel der L-747)
const syAt=(PR,t,ph)=>Math.cos(ph)>0?lerpProf(PR,t,'syT'):lerpProf(PR,t,'sy');
// Breitenfaktor der oberen Rumpfhälfte: schmaler oben (sxT) und beim Buckel kastenförmiger (steile Seitenwände wie beim 747-Oberdeck)
const sxF=(k,c)=>k>0.999?1:(1-(1-k)*c*c)*Math.pow(Math.max(1e-4,1-c*c),-0.22*Math.min(1,(1-k)/0.45));
const sxW=(PR,t,c)=>sxF(lerpProf(PR,t,'sxT'),c);
function fuselageGeo(L,prof,segs){
  const ts=[];for(let k=0;k<64;k++)ts.push(0.2*Math.pow(k/64,1.6));for(let k=0;k<40;k++)ts.push(0.2+0.6*k/40);for(let k=0;k<=30;k++)ts.push(0.8+0.2*k/30);
  const pts=[];for(let i=ts.length-1;i>=0;i--){const t=ts[i];pts.push(new THREE.Vector2(Math.max(0.001,lerpProf(prof,t,'r')),L/2-t*L));}
  const g=new THREE.LatheGeometry(pts,segs||40);
  const p=g.attributes.position;for(let k=0;k<p.count;k++){const y=p.getY(k),t=(L/2-y)/L;
    const zz=p.getZ(k),rr=Math.hypot(p.getX(k),zz)||1;p.setX(k,p.getX(k)*lerpProf(prof,t,'sx')*(zz>0?sxW(prof,t,zz/rr):1));p.setZ(k,zz*lerpProf(prof,t,zz>0?'syT':'sy')+yOff(prof,t));}
  const uv=g.attributes.uv;for(let k=0;k<uv.count;k++){const u=uv.getX(k),y=p.getY(k);uv.setXY(k,(L/2-y)/L,u);}
  g.rotateX(-Math.PI/2);
  g.computeVertexNormals();return g;
}
function yOff(prof,t){for(let i=0;i<prof.length-1;i++){const a=prof[i],b=prof[i+1];if(t<=b.t){const u=(t-a.t)/(b.t-a.t||1);return(a.y||0)*(1-u)+(b.y||0)*u;}}return prof[prof.length-1].y||0;}
const AF=(()=>{const n=14,up=[],lo=[];for(let i=0;i<=n;i++){const b=i/n,x=(1-Math.cos(b*Math.PI))/2;const yt=5*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);up.push([x,yt+0.02*Math.sin(Math.PI*x)]);lo.push([x,-yt+0.02*Math.sin(Math.PI*x)]);}
  const loop=[];for(let i=n;i>=0;i--)loop.push(up[i]);for(let i=1;i<=n;i++)loop.push(lo[i]);return loop;})();
// sections: [{x,y,z(LE),c,t,cf}] -> Loft (cf: Profil-Anteil der Sehne, für Ruder)
function loft(secs,loop){
  loop=loop||AF;const n=loop.length,pos=[],idx=[];
  secs.forEach(s=>{for(const [xc,yv] of loop){pos.push(s.x,s.y+yv*s.t*s.c,s.z+xc*s.c*(s.cf||1));}});
  for(let k=0;k<secs.length-1;k++)for(let i=0;i<n-1;i++){const a=k*n+i,b=a+1,c=a+n,d=c+1;idx.push(a,c,b,b,c,d);}
  const last=(secs.length-1)*n;for(let i=1;i<n-2;i++)idx.push(last,last+i,last+i+1);
  for(let i=1;i<n-2;i++)idx.push(0,i+1,i);
  const uv=[];secs.forEach((s0,k)=>{for(let i=0;i<n;i++)uv.push(secs.length>1?k/(secs.length-1):0,i/(n-1));});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Loft mit eigenem Rahmen je Querschnitt: P (Vorderkante), N (Dickenrichtung), c (Sehne, nach hinten +z), t (Dicke/Sehne)
function loftFrames(secs,loop){loop=loop||AF;const n=loop.length,pos=[],idx=[];
  for(const S of secs)for(const [xc,yv] of loop)pos.push(S.p.x+S.n.x*yv*S.t*S.c,S.p.y+S.n.y*yv*S.t*S.c,S.p.z+xc*S.c);
  for(let k=0;k<secs.length-1;k++)for(let i=0;i<n-1;i++){const a=k*n+i,b=a+1,c=a+n,d=c+1;idx.push(a,c,b,b,c,d);}
  const last=(secs.length-1)*n;for(let i=1;i<n-2;i++)idx.push(last,last+i,last+i+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const uv=[];secs.forEach((S0,k)=>{for(let i=0;i<n;i++)uv.push(k/(secs.length-1),i/(n-1));});g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;}
// Zackenkranz (Chevrons): Ring mit n dreieckigen Zacken nach hinten, Spitzen leicht nach innen geneigt
function chevronGeo(r0,r1,h,n){const pos=[],idx=[],N=n*2;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,tip=i%2===0,r=tip?r1:r0*0.985,z=tip?h:h*0.12;
    pos.push(Math.cos(a)*r0,Math.sin(a)*r0,0,Math.cos(a)*r,Math.sin(a)*r,z);}
  for(let i=0;i<N;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,c,b,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
let CHM=null;function chevMat(){return CHM||(CHM=new THREE.MeshStandardMaterial({color:0xa9aeb4,roughness:0.36,metalness:0.4,side:THREE.DoubleSide}));}
// Winglet als weich gebogene Fläche aus der Flügelspitze heraus (rechte Seite):
// h Höhe, cant Neigung nach aussen (Grad, 0 = senkrecht), rb Biegeradius, sw Vorderkanten-Pfeilung (Grad), c0/c1 Sehne Wurzel/Spitze, dn nach unten
function wingletGeo(tip,o){const n=14,thE=(90-o.cant)*Math.PI/180*(o.dn?-1:1),rb=o.rb,sgn=o.dn?-1:1;
  const arcV=rb*(1-Math.cos(Math.abs(thE))),Ls=Math.max(0.05,(o.h-arcV)/Math.sin(Math.abs(thE))),La=rb*Math.abs(thE),Lt=La+Ls,tw=Math.tan(o.sw*Math.PI/180),secs=[];
  for(let i=0;i<=n;i++){const u=i/n,d=u*Lt;let px,py,th;
    if(d<=La){th=thE*(d/(La||1));px=rb*Math.sin(Math.abs(th));py=sgn*rb*(1-Math.cos(th));}
    else{th=thE;const e=d-La;px=rb*Math.sin(Math.abs(thE))+e*Math.cos(thE);py=sgn*arcV+e*Math.sin(Math.abs(thE))*sgn;}
    const f=Math.pow(u,o.tp||1),c=o.c0+(o.c1-o.c0)*f;
    // Vorderkante läuft mit der Pfeilung nach hinten, die Hinterkante bleibt ruhiger (wie beim echten Sharklet)
    const zl=d*tw*(0.35+0.65*u);
    secs.push({p:new THREE.Vector3(tip.x+px,tip.y+py,tip.z+zl),n:new THREE.Vector3(-Math.sin(th),Math.cos(th),0),c,t:o.t0+(o.t1-o.t0)*u});}
  return loftFrames(secs);}
const WEDGE=[[1,0],[0.5,0.5],[0,1],[0,0.6],[0,-0.6],[0,-1],[0.5,-0.5],[1,0]].map(([x,y])=>[x,y*0.5]);
// Flügelprofil geteilt in Hauptflügel (mit Abdeckung über der Klappennase) und Klappe (Rest desselben Profils mit runder Nase):
// eingefahren ergibt beides wieder genau ein Profil, ausgefahren gleitet die Klappe unter der Abdeckung nach hinten
const afU=x=>{const yt=5*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);return yt+0.02*Math.sin(Math.PI*x);};
const afL=x=>{const yt=5*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);return -yt+0.02*Math.sin(Math.PI*x);};
const SPLIT={};
// ov: wie weit die Ruder-/Klappennase unter der Abdeckung liegt (Klappen tief für Fowler-Weg, Querruder kurz)
function splitLoops(fc,ov){ov=ov||0.045;const k=fc.toFixed(3)+'_'+ov;if(SPLIT[k])return SPLIT[k];
  const n=22,x0=fc-ov,FU=0.86,SU=0.93,cx=x0+0.02;
  const fu=x=>x<fc?FU:FU+(1-FU)*Math.min(1,(x-fc)/0.08);
  const yU=afU(cx)*FU,yL=afL(cx),yc=(yU+yL)/2,rr=(yU-yL)/2;
  const main=[];for(let i=0;i<=n;i++){const b=i/n,x=fc*(1-Math.cos(b*Math.PI/2));main.push([x,afU(x)]);}main.reverse();
  // Bucht (Cove): Ellipse mit Abstand um die Klappennase, beginnt dort, wo sie die Unterseite schneidet
  const Rx=0.032,Ry=rr+0.03;let a0=Math.PI*1.5;
  for(let a=Math.PI*1.5;a>Math.PI;a-=0.01){const x=cx+Rx*Math.cos(a),y=yc+Ry*Math.sin(a);if(y>=afL(x)){a0=a;break;}}
  const xs=cx+Rx*Math.cos(a0);
  for(let i=1;i<=n;i++){const b=i/n,x=xs*(1-Math.cos(b*Math.PI/2));main.push([x,afL(x)]);}
  for(let i=1;i<=10;i++){const a=a0+(Math.PI/2-a0)*i/10;main.push([cx+Rx*Math.cos(a),yc+Ry*Math.sin(a)]);}
  {const yT=yc+Ry,d=yT-afU(cx)*SU;for(let i=1;i<=6;i++){const u=i/6,x=cx+(fc-cx)*u;main.push([x,afU(x)*SU+d*(1-u)]);}}
  main.push([...main[0]]);
  // Klappe: x0..1, runde Nase unter der Abdeckung; hinter der Abdeckung wieder volle Profildicke
  const fl=[],cw=1-x0,m=16;
  for(let i=m;i>=0;i--){const b=i/m,x=cx+(1-cx)*(1-Math.cos(b*Math.PI/2));fl.push([(x-x0)/cw,afU(x)*fu(x)]);}
  for(let i=1;i<10;i++){const a=Math.PI/2+Math.PI*i/10;fl.push([(0.02+Math.cos(a)*0.02)/cw,yc+Math.sin(a)*rr]);}
  for(let i=0;i<=m;i++){const b=i/m,x=cx+(1-cx)*(1-Math.cos(b*Math.PI/2));fl.push([(x-x0)/cw,afL(x)]);}
  // Fowler-Weg: Klappennase bleibt knapp unter der Abdeckungs-Hinterkante -> von oben keine Lücke
  return SPLIT[k]={main,flap:fl,x0,ext:Math.max(0,ov-0.016)/cw};}
function mirror(g){const m=g.clone();m.scale(-1,1,1);const i=m.index.array;for(let k=0;k<i.length;k+=3){const t=i[k];i[k]=i[k+1];i[k+1]=t;}m.index.needsUpdate=true;m.computeVertexNormals();return m;}
// Ruderfläche zwischen zwei Scharnierpunkten (A,B), Sehnen cA,cB, Dicke tA,tB
function surface(A,B,cA,cB,th,mat,parent,prof){
  const ax=B.clone().sub(A),len=ax.length();ax.normalize();
  const h=new THREE.Group();h.position.copy(A);
  // Achsen ohne Verdrehung: x = Scharnier, z = Sehne (nach hinten), y = Dicke
  const zA=new THREE.Vector3(0,0,1).addScaledVector(ax,-ax.z).normalize(),yA=new THREE.Vector3().crossVectors(zA,ax);
  h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax,yA,zA));
  const g=loft([{x:0,y:0,z:0,c:cA,t:th/Math.max(cA,0.01)},{x:len,y:0,z:0,c:cB,t:(prof&&prof.th1!=null?prof.th1:th)/Math.max(cB,0.01)}],prof?prof.loop:WEDGE);
  const m=new THREE.Mesh(g,mat);m.castShadow=true;m.userData.ext=(cA+cB)/2*(prof&&prof.ext!=null?prof.ext:0);h.add(m);parent.add(h);return m;
}
// Flügel (rechte Hälfte) mit Ruderflächen
function wing(o,mat,smat,parent,parts,name){
  const {x0,span,root,tip,sweep,dih,y0,z0,tr,tt,split}=o;const tanD=Math.tan(dih);
  if(smat===mat&&mat.userData&&mat.userData.col!=null)smat=surfMat(mat);
  // Hinterkanten-Knick (Yehudi) wie bei echten Verkehrsflugzeugen: innen fast gerade Hinterkante, aussen normal zugespitzt
  const kS=o.kink||0,kC=kS?root+kS*span*0.035-kS*sweep:0;
  const chord=s=>!kS?root+(tip-root)*s:s<=kS?root+(kC-root)*s/kS:kC+(tip-kC)*(s-kS)/(1-kS);
  const sec=s=>{const x=x0+s*span;return{x,y:y0+(x-x0)*tanD,z:z0+s*sweep,c:chord(s),t:tr+(tt-tr)*s};};
  const fc=split||0.72;
  // Abschnitte: Lücken zwischen Rudern werden mit fester Hinterkante gefüllt
  const segs=(o.surfaces||[[0,1,null]]).slice().sort((p,q)=>p[0]-q[0]),full=[];let s=0;
  for(const g of segs){if(g[0]>s+1e-4)full.push([s,g[0],null]);full.push(g);s=Math.max(s,g[1]);}if(s<1-1e-4)full.push([s,1,null]);
  if(kS){for(let i=0;i<full.length;i++){const [a,b,k]=full[i];if(a<kS-1e-4&&b>kS+1e-4){full.splice(i,1,[a,kS,k],[kS,b,k]);i++;}}}
  const gs=[];
  for(const [s0,s1,key] of full){
    const ov=!key?0:key.startsWith('flap')?0.12:0.045,SP=ov?splitLoops(fc,ov):null;
    gs.push(loft([s0,s1].map(q=>({...sec(q),cf:1})),SP?SP.main:AF));
    if(!SP)continue;
    const hp=q=>{const e=sec(q);return new THREE.Vector3(e.x,e.y,e.z+e.c*SP.x0);};
    const rc=q=>sec(q).c*(1-SP.x0),th=q=>sec(q).t*sec(q).c;
    const r=surface(hp(s0),hp(s1),rc(s0),rc(s1),th(s0),smat,parent,{loop:SP.flap,th1:th(s1),ext:key.startsWith('flap')?SP.ext:0});
    const a=hp(s1).multiply(new THREE.Vector3(-1,1,1)),b=hp(s0).multiply(new THREE.Vector3(-1,1,1));
    const l=surface(a,b,rc(s1),rc(s0),th(s1),smat,parent,{loop:SP.flap,th1:th(s0),ext:key.startsWith('flap')?SP.ext:0});
    if(key.startsWith('flap')){(parts.flaps=parts.flaps||[]).push({s0,s1,R:r,L:l});if(!parts.flapR){parts.flapR=r;parts.flapL=l;}}
    else{parts[key+'R']=r;parts[key+'L']=l;}
  }
  const main=mergeGeometries(gs,false);main.computeVertexNormals();gs.forEach(g=>g.dispose());
  const R=new THREE.Mesh(main,mat),Lm=new THREE.Mesh(mirror(main),mat);R.castShadow=Lm.castShadow=true;parent.add(R,Lm);
  return {sec,chord};
}
function canvasTex(w,h,draw){w=Math.max(32,Math.round(w*TEXS));h=Math.max(32,Math.round(h*TEXS));const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
// Lackierung: x = Länge (Nase->Heck), y: 0 oben,0.25H links,0.5H Bauch,0.75H rechts
const LIVC=new Map();
const hexA=(c,a)=>{const n=parseInt(c.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
function livery(L,R,cfg){
  const key=L+'|'+R+'|'+JSON.stringify(cfg);if(LIVC.has(key)){const t=LIVC.get(key);LIVC.delete(key);LIVC.set(key,t);return t;}
  const W=L>45?4096:2048,Hh=1024;const tex=canvasTex(W,Hh,(x,w,h)=>{
    const pa=w/L,pr=h/(2*Math.PI*R);
    x.fillStyle=cfg.base;x.fillRect(0,0,w,h);
    if(cfg.belly){const B=typeof cfg.belly==='string'?{col:cfg.belly,w:cfg.bellyW}:cfg.belly,x0=(B.x0||0)*w,fd=B.x0?0.05*w:0;
      if(B.sw){// Bauch mit scharfer, nach hinten oben gezogener Vorderkante (kein verwaschener Übergang)
        const sl=B.sw*w,yU=h*0.5-h*B.w,yD=h*0.5+h*B.w;x.fillStyle=B.col;x.beginPath();x.moveTo(x0,h*0.5);
        for(let i=1;i<=16;i++){const u=i/16;x.lineTo(x0+sl*Math.pow(u,0.6),h*0.5-(h*0.5-yU)*u);}x.lineTo(w,yU);x.lineTo(w,yD);
        for(let i=16;i>=1;i--){const u=i/16;x.lineTo(x0+sl*Math.pow(u,0.6),h*0.5+(yD-h*0.5)*u);}x.closePath();x.fill();}
      else{const gr=x.createLinearGradient(x0,0,x0+fd+1,0);gr.addColorStop(0,hexA(B.col,0));gr.addColorStop(1,hexA(B.col,1));x.fillStyle=B.x0?gr:B.col;x.fillRect(x0,h*0.5-h*B.w,w-x0,h*B.w*2);}}
    // Swoosh-Flächen: Ober-/Unterkante a(t)=a0+(a1-a0)*s^pw
    for(const S of cfg.sweeps||[]){x.fillStyle=S.col;for(const sd of [1,-1]){x.beginPath();const N=48,Y=a=>sd>0?h*a:h*(1-a),f=(e,u)=>e[0]+(e[1]-e[0])*Math.pow(u,S.pw);
      for(let i=0;i<=N;i++){const u=i/N;x.lineTo((S.t0+(S.t1-S.t0)*u)*w,Y(f(S.top,u)));}for(let i=N;i>=0;i--){const u=i/N;x.lineTo((S.t0+(S.t1-S.t0)*u)*w,Y(f(S.bot,u)));}x.closePath();x.fill();}}
    // Zierstreifen, vorne spitz auslaufend
    for(const s of cfg.stripes||[]){x.fillStyle=s.col;const x0=(s.x0??0.02)*w,x1=(s.x1??1)*w,tp=(s.tip||0)*pa,th=s.th*pr;
      for(const sd of [1,-1]){const yc=sd>0?h*s.a:h*(1-s.a);x.beginPath();x.moveTo(x0,yc+(sd>0?th/2:-th/2));x.lineTo(x0+tp,yc-(sd>0?th/2:-th/2));x.lineTo(x1,yc-(sd>0?th/2:-th/2));x.lineTo(x1,yc+(sd>0?th/2:-th/2));x.closePath();x.fill();}}
    // A350-Maske um die Cockpitscheiben
    if(cfg.mask&&MASKF[cfg.mask]){const fn=MASKF[cfg.mask],X1=Math.ceil(fn.tMax*w),Y1=Math.ceil(0.3*h),im=x.getImageData(0,0,X1,h),D=im.data,mc=parseInt((cfg.maskCol||'#14161a').slice(1),16);
      for(let py=0;py<h;py++){if(py>Y1&&py<h-Y1)continue;const a=py<h/2?py/h:1-py/h,ph=a*2*Math.PI;for(let px=0;px<X1;px++)if(fn((px+0.5)/w,ph)){const o=(py*X1+px)*4;D[o]=mc>>16&255;D[o+1]=mc>>8&255;D[o+2]=mc&255;}}
      x.putImageData(im,0,0);}
    // Blechstösse
    x.strokeStyle='rgba(20,25,35,0.11)';x.lineWidth=1.4;for(let xm=2;xm<L;xm+=2.6){x.beginPath();x.moveTo(xm*pa,0);x.lineTo(xm*pa,h);x.stroke();}
    // Längsstösse (Überlappungen) und Wartungsklappen am Bauch
    x.strokeStyle='rgba(20,25,35,0.08)';for(const a of [0.09,0.36,0.44]){for(const yy of [h*a,h*(1-a)]){x.beginPath();x.moveTo(0.04*w,yy);x.lineTo(0.97*w,yy);x.stroke();}}
    if(L>12){x.strokeStyle='rgba(0,0,0,0.09)';for(let xm=L*0.12;xm<L*0.85;xm+=L*0.11)for(const sd of [1,-1]){const yy=sd>0?h*0.46:h*0.54;x.strokeRect(xm*pa,yy-0.25*pr,0.5*pa,0.5*pr);}}
    // leichte Schattierung: Oberseite hell, Bauch etwas dunkler (Verschmutzung)
    {const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,0.08)');g.addColorStop(0.18,'rgba(255,255,255,0.02)');g.addColorStop(0.3,'rgba(0,0,0,0)');g.addColorStop(0.38,'rgba(40,50,65,0.07)');g.addColorStop(0.45,'rgba(40,45,50,0.13)');g.addColorStop(0.5,'rgba(45,42,38,0.17)');g.addColorStop(0.55,'rgba(40,45,50,0.13)');g.addColorStop(0.62,'rgba(40,50,65,0.07)');g.addColorStop(0.7,'rgba(0,0,0,0)');g.addColorStop(0.82,'rgba(255,255,255,0.02)');g.addColorStop(1,'rgba(255,255,255,0.08)');x.fillStyle=g;x.fillRect(0,0,w,h);
      // Umgebungsschatten am Flügelansatz (unten seitlich) und leichte Abgas-Spuren am Heck
      if(cfg.wingZ){const z0=cfg.wingZ[0]*w,z1=cfg.wingZ[1]*w;for(const [a0,a1] of [[0.3,0.48],[0.52,0.7]]){const gy=x.createLinearGradient(0,a0*h,0,a1*h),dn=a0<0.5;gy.addColorStop(dn?0:1,'rgba(30,35,45,0)');gy.addColorStop(dn?1:0,'rgba(30,35,45,0.16)');x.fillStyle=gy;
        const gx=x.createLinearGradient(z0-0.06*w,0,z1+0.08*w,0);x.save();x.beginPath();x.rect(z0-0.06*w,a0*h,z1-z0+0.14*w,(a1-a0)*h);x.clip();x.fillRect(z0-0.06*w,a0*h,z1-z0+0.14*w,(a1-a0)*h);x.restore();}}
      if(cfg.wingZ&&cfg.fairing!==false){const z0=(cfg.wingZ[0]-0.03)*w,z1=(cfg.wingZ[1]+0.05)*w,a0=0.43*h,a1=0.57*h,rr0=(a1-a0)*0.5;x.fillStyle='rgba(120,128,140,0.13)';x.beginPath();x.moveTo(z0+rr0,a0);x.lineTo(z1-rr0*1.6,a0);x.quadraticCurveTo(z1,a0,z1,(a0+a1)/2);x.quadraticCurveTo(z1,a1,z1-rr0*1.6,a1);x.lineTo(z0+rr0,a1);x.quadraticCurveTo(z0,a1,z0,(a0+a1)/2);x.quadraticCurveTo(z0,a0,z0+rr0,a0);x.fill();x.strokeStyle='rgba(30,35,45,0.22)';x.lineWidth=1.5;x.stroke();}
      {const ge=x.createLinearGradient(0.86*w,0,w,0);ge.addColorStop(0,'rgba(60,55,50,0)');ge.addColorStop(1,'rgba(60,55,50,0.12)');x.fillStyle=ge;x.fillRect(0.86*w,0.25*h,0.14*w,0.5*h);}}
    // Frachttüren (rechte Seite, unten)
    for(const d0 of cfg.cargo||[]){const d=typeof d0==='number'?{x:d0,w:1.7,h:1.7}:d0;x.strokeStyle='rgba(60,60,70,0.55)';x.lineWidth=2;rr(x,d.x*L*pa-d.w/2*pa,h*(1-0.385)-d.h/2*pr,d.w*pa,d.h*pr,6);x.stroke();
      x.fillStyle='rgba(60,60,70,0.45)';x.fillRect(d.x*L*pa-0.12*pa,h*(1-0.385)+d.h/2*pr-0.16*pr,0.24*pa,0.06*pr);}
    if(cfg.seam){x.strokeStyle='rgba(40,46,56,0.16)';x.lineWidth=2;x.beginPath();x.moveTo(cfg.seam*w,0);x.lineTo(cfg.seam*w,h);x.stroke();}
    for(const wn of (cfg.wins||(cfg.win?[cfg.win]:[]))){const {x0,x1,pitch,ww,wh,a}=wn;x.fillStyle='#1b2533';
      for(let xm=x0*L;xm<x1*L;xm+=pitch){if(wn.skip&&wn.skip.some(([s0,s1])=>xm>s0*L&&xm<s1*L))continue;for(const s of [1,-1]){const yc=s>0?h*a:h*(1-a);rr(x,xm*pa-ww*pa/2,yc-wh*pr/2,ww*pa,wh*pr,Math.min(ww*pa,wh*pr)*0.45);x.fill();}}}
    if(cfg.doors)for(const d0 of cfg.doors){const D=typeof d0==='number'?{x:d0,t:'S',a:0.235}:d0,[dw,dh]=D.t==='S'?[0.9,1.9]:DOORT[D.t],dx=D.x*L*pa;
      x.strokeStyle='rgba(60,60,70,0.7)';x.lineWidth=2;
      for(const s of [1,-1]){const yc=s>0?h*D.a:h*(1-D.a);
        if(D.t==='III'){rr(x,dx-dw/2*pa,yc-dh/2*pr,dw*pa,dh*pr,dw*pa*0.3);x.stroke();x.fillStyle='rgba(215,38,61,0.75)';x.fillRect(dx-0.06*pa,yc+s*(dh/2-0.1)*pr-0.025*pr,0.12*pa,0.05*pr);continue;}
        // Tür mit runden Ecken, Fenster oben in der Tür, Griffmulde
        rr(x,dx-dw/2*pa,yc-dh/2*pr,dw*pa,dh*pr,Math.min(dw*pa,dh*pr)*0.16);x.stroke();
        if(L>12){const wy=yc-s*0.42*pr;x.fillStyle='#1b2533';rr(x,dx-0.115*pa,wy-0.155*pr,0.23*pa,0.31*pr,Math.min(0.23*pa,0.31*pr)*0.45);x.fill();
          x.fillStyle='rgba(60,60,70,0.6)';x.fillRect(dx+(dw/2-0.2)*pa,yc+s*0.15*pr,0.12*pa,0.05*pr);}}}
    // Schriftzug: Hauptwort gross, Rest klein – auf beiden Seiten in Leserichtung
    if(cfg.title){const T=cfg.title;const fnt=(sz,wt)=>`${wt} ${sz*pa}px Arial`;let k=1;
      const meas=()=>{x.font=fnt(T.size*k,'900');const wm=x.measureText(T.main).width;let ws=0;if(T.sub){x.font=fnt(T.size*0.37*k,'bold');ws=x.measureText(T.sub).width;}return[wm,ws,T.sub?T.size*0.25*k*pa:0];};
      let [wm,ws,gp]=meas();if(wm+ws+gp>T.max*w){k=T.max*w/(wm+ws+gp);[wm,ws,gp]=meas();}
      const x0=T.x*w-wm/2;
      for(const sd of [1,-1]){const yc=sd>0?h*T.a:h*(1-T.a);
        const items=[[T.main,T.size*k,'900',T.colMain,wm],...(T.sub?[[T.sub,T.size*0.37*k,'bold',T.colSub,ws]]:[])];if(sd<0)items.reverse();
        let cx=x0;for(const [str,sz,wt,col,ww] of items){x.save();x.fillStyle=col;x.font=fnt(sz,wt);x.textAlign='center';x.textBaseline='middle';
          const dy=(str===T.main?0:T.size*0.18*k)*pr;x.translate(cx+ww/2,yc+(sd>0?dy:-dy));if(sd<0)x.rotate(Math.PI);x.scale(1,pr/pa);x.fillText(str,0,0);x.restore();cx+=ww+gp;}}}
    for(const t of cfg.text||[]){x.fillStyle=t.col;x.font=`${t.weight||'bold'} ${t.size*pa}px Arial`;x.textAlign='center';x.textBaseline='middle';
      for(const s of [1,-1]){x.save();x.translate(t.x*L*pa,s>0?h*t.a:h*(1-t.a));if(s<0)x.rotate(Math.PI);x.scale(1,pr/pa);x.fillText(t.str,0,0);x.restore();}}
  });
  LIVC.set(key,tex);if(LIVC.size>30){const k0=LIVC.keys().next().value,t0=LIVC.get(k0);LIVC.delete(k0);t0.dispose();}
  return tex;
}
const MASKF={};
// ---------- Lackier-Vorlagen ----------
export const LIV_TPL=[['clean','Clean'],['klassisch','Klassisch'],['retro','Retro'],['bauch','Farbbauch'],['voll','Vollfarbe'],['swoosh','Swoosh'],['schweiz','Schweizerkreuz']];
export const LIV_COL=['#0b2545','#1d3a7a','#1d4ed8','#38a3e8','#0f766e','#1f8a5b','#0f4d36','#d7263d','#9b1c2c','#f26b1d','#e8b330','#6d28d9','#d9467a','#15171b','#8a939e'];
export const LIV_BASE=[['#f8f8f7','Weiss'],['#dfe3e8','Perlgrau'],['#efe6d2','Creme'],['#2a2e35','Anthrazit']];
const LUISL={tpl:'clean',c1:'#0b2545',c2:'#d7263d',base:'#f3f5f8',name:'LUIS AIRLINES'};
export const LIV_DEF={alpina:{tpl:'klassisch',c1:'#1d3a7a',c2:'#c8202f',base:'#f8f8f7',name:''},saentis:{...LUISL,name:''},titlis:{...LUISL},foehn:{tpl:'klassisch',c1:'#0f4d36',c2:'#1f8a5b',base:'#f8f8f7',name:'FÖHN AIR'},
  feuer:{tpl:'bauch',c1:'#e8b330',c2:'#d7263d',base:'#f8f8f7',name:'LUIS FEUERWEHR'},segler:{tpl:'klassisch',c1:'#d7263d',c2:'#0b2545',base:'#f8f8f7',name:''},
  rega:{tpl:'bauch',c1:'#e30613',c2:'#e30613',base:'#f8f8f7',name:'REGA'},
  l320:{...LUISL},l32n:{...LUISL},l330:{...LUISL},l340:{...LUISL},l346:{...LUISL},l350:{...LUISL},l747:{...LUISL},l380:{...LUISL,tpl:'bauch',base:'#f3f5f8'}};
export const livSpec=(id,c)=>({...(LIV_DEF[id]||LUISL),...(c||{})});
function lum(c){const n=parseInt(c.slice(1),16),f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(n>>16&255)+0.7152*f(n>>8&255)+0.0722*f(n&255);}
const cRatio=(a,b)=>{const A=lum(a),B=lum(b);return(Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);};
const onCol=(fg,bg)=>cRatio(fg,bg)>=2.2?fg:(lum(bg)>0.35?'#1a1f27':'#ffffff');
// G: Geometrie der Lackierung je Typ, S: gewählte Lackierung
function paint(G,S){const {c1,c2}=S,base=S.base||'#f8f8f7',am=m=>m/(2*Math.PI*G.R),st=G.st;
  const cfg={base,doors:G.doors,wins:G.wins,seam:G.seam,mask:G.mask};let belly=G.belly?{...G.belly,col:G.belly.col==='c1'?c1:G.belly.col}:null,
    nameC=onCol(c1,base),subC=onCol(c2,base),regC=onCol('#33384a',base),fin='stripe',stripes;
  const S1=(a,th,col,o)=>({a,th,col,x0:st.x0,x1:st.x1,tip:G.tip||0,...o});
  switch(S.tpl){
    case 'retro':stripes=[S1(G.a0,G.wb,c1),S1(G.a0+am(G.wb*0.68),G.wb*0.16,c2)];fin='solid';break;
    case 'bauch':{const sa=G.a0+am(G.wb*0.8);belly={col:c1,w:0.5-sa,x0:G.belly&&G.belly.x0?Math.max(0.03,G.belly.x0*0.5):0.03,sw:0.12};stripes=[S1(sa,G.wb*0.18,c2)];break;}
    case 'voll':cfg.base=c1;belly={col:base,w:G.belly?Math.max(0.08,G.belly.w):0.08,x0:G.belly&&G.belly.x0};stripes=[S1(st.a,st.t2*1.5,c2)];nameC=onCol(base,c1);subC=onCol(c2,c1);regC=onCol(base,c1);fin='solid';break;
    case 'swoosh':{const t0=G.swT||0.36;cfg.sweeps=[{t0,t1:1,top:[0.5,0.03],bot:[0.5,0.5],pw:1.7,col:c1},{t0,t1:1,top:[0.47,0.0],bot:[0.488,0.018],pw:1.7,col:c2}];stripes=[];regC=onCol(base,c1);fin='swoosh';break;}
    case 'schweiz':stripes=[S1(st.a,st.t2*1.6,c1)];subC=nameC;fin='cross';break;
    case 'clean':stripes=[];break;// ganz weiss, nur Schriftzug und Leitwerk
    default:stripes=[S1(st.a,st.t1,c2),S1(st.a+st.da,st.t2,c1,{x0:st.x0+0.01})];
  }
  if(G.finStyle&&S.tpl===G.finTpl)fin=G.finStyle;
  cfg.belly=belly;cfg.stripes=stripes;
  const nm=(S.name||'').trim().toUpperCase().slice(0,16);
  if(G.nm&&nm){const [w1,...r]=nm.split(/\s+/);cfg.title={main:w1,sub:r.join(' '),a:G.nm.a,x:G.nm.x,size:G.nm.size,max:G.nm.max,colMain:nameC,colSub:subC};}
  cfg.text=[{str:G.reg.str,a:G.reg.a,x:G.reg.x,size:G.reg.size,col:regC}];
  return{cfg,fin:[fin,c1,c2,G.nm&&nm?nm[0]:'',base]};
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}

const M={};
function mats(){if(M.ok)return M;M.ok=1;
  M.white=new THREE.MeshStandardMaterial({color:0xf3f4f5,roughness:0.35,metalness:0.1});
  M.grey=new THREE.MeshStandardMaterial({color:0xb8bcc2,roughness:0.4,metalness:0.4});
  M.dark=new THREE.MeshStandardMaterial({color:0x1d1f22,roughness:0.55,metalness:0.2});
  M.tire=new THREE.MeshStandardMaterial({color:0x151515,roughness:0.9});
  M.metal=new THREE.MeshStandardMaterial({color:0xc9ced4,roughness:0.25,metalness:0.85});
  M.glass=new THREE.MeshStandardMaterial({color:0x22384c,roughness:0.04,metalness:0.92,envMapIntensity:2.4});
  M.disc=new THREE.MeshBasicMaterial({map:canvasTex(256,256,(x,w,h)=>{const g=x.createRadialGradient(128,128,10,128,128,128);g.addColorStop(0,'rgba(30,30,30,0.45)');g.addColorStop(0.85,'rgba(40,40,40,0.25)');g.addColorStop(0.97,'rgba(240,240,240,0.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,w,h);}),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  M.inlet=new THREE.MeshStandardMaterial({color:0x3a3e44,roughness:0.5,metalness:0.5,side:THREE.BackSide});
  M.hot=new THREE.MeshStandardMaterial({color:0x4d4f52,roughness:0.55,metalness:0.7,side:THREE.DoubleSide});
  M.spin=new THREE.MeshStandardMaterial({map:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#e9ebee';x.fillRect(0,0,w,h);x.fillStyle='#24272b';for(let yy=0;yy<h;yy++){const u=(1-yy/h)*0.85;x.fillRect(u*w,yy,w*0.08,1);x.fillRect(((u+0.5)%1)*w,yy,w*0.08,1);}}),roughness:0.3,metalness:0.3});
  M.fan=new THREE.MeshStandardMaterial({map:canvasTex(256,256,(x)=>{x.fillStyle='#1a1c1f';x.fillRect(0,0,256,256);x.translate(128,128);x.strokeStyle='#5a5f66';x.lineWidth=7;for(let i=0;i<24;i++){x.rotate(Math.PI*2/24);x.beginPath();x.moveTo(18,0);x.quadraticCurveTo(70,22,124,6);x.stroke();}}),roughness:0.4,metalness:0.7});
  return M;}

// Glanzlack mit Klarlackschicht (spiegelt Himmel und Sonne)
function paintMat(o){return new THREE.MeshPhysicalMaterial({color:0xe2e5e9,...o,roughness:Math.max(0.22,o.roughness??0.3),metalness:o.metalness??0.08,clearcoat:1,clearcoatRoughness:0.05,envMapIntensity:0.95});}// Lack nie reinweiss (sonst überstrahlt er), dafür glänzender Klarlack
// Triebwerksgondel: Fan-Haube, Schubumkehr-Fuge, Scharnier oben, dunklerer hinterer Teil (UV: u = Länge)
const NMC={};function nacMat(band){const k=band||'-';if(NMC[k])return NMC[k];
  const tex=canvasTex(512,256,(x,w,h)=>{x.fillStyle='#c3c7cc';x.fillRect(0,0,w,h);const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(255,255,255,0.12)');g.addColorStop(0.5,'rgba(0,0,0,0)');g.addColorStop(0.85,'rgba(0,0,0,0.06)');g.addColorStop(1,'rgba(30,25,20,0.25)');x.fillStyle=g;x.fillRect(0,0,w,h);
    if(band){x.fillStyle=band;x.fillRect(w*0.15,0,w*0.07,h);}
    x.strokeStyle='rgba(0,0,0,0.25)';x.lineWidth=2;for(const u of [0.1,0.42,0.7]){x.beginPath();x.moveTo(u*w,0);x.lineTo(u*w,h);x.stroke();}
    x.strokeStyle='rgba(0,0,0,0.18)';for(const v of [0,0.5,1]){x.beginPath();x.moveTo(0.1*w,v*h);x.lineTo(0.95*w,v*h);x.stroke();}
    x.fillStyle='rgba(0,0,0,0.12)';for(let u=0.46;u<0.68;u+=0.045)x.fillRect(u*w,h*0.3,3,h*0.4);});
  return NMC[k]=paintMat({map:tex,roughness:0.34,metalness:0.2});}
// Flügel: Blechfelder, Rippen, metallische Nasenkante, dunklere Hinterkante (UV aus loft: u = Spannweite, v = um das Profil)
const WMC={};
function wingMat(col,opt){opt=opt||{};const key=col+'|'+JSON.stringify(opt);if(WMC[key])return WMC[key];const c=new THREE.Color(col);
  const tex=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#'+c.getHexString();x.fillRect(0,0,w,h);
    const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,0.10)');g.addColorStop(0.06,'rgba(0,0,0,0)');g.addColorStop(0.44,'rgba(255,255,255,0)');g.addColorStop(0.5,'rgba(255,255,255,0.22)');g.addColorStop(0.56,'rgba(255,255,255,0)');g.addColorStop(0.94,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.12)');x.fillStyle=g;x.fillRect(0,0,w,h);
    if(opt.smooth)return;
    x.strokeStyle='rgba(0,0,0,0.13)';x.lineWidth=1.2;for(const v of [0.16,0.3,0.42,0.58,0.7,0.84]){x.beginPath();x.moveTo(0,v*h);x.lineTo(w,v*h);x.stroke();}
    x.strokeStyle='rgba(0,0,0,0.07)';for(let u=0;u<=1;u+=1/14){x.beginPath();x.moveTo(u*w,0.06*h);x.lineTo(u*w,0.94*h);x.stroke();}
    x.fillStyle='rgba(0,0,0,0.06)';for(let u=0.04;u<1;u+=1/28)for(const v of [0.23,0.36,0.64,0.77])x.fillRect(u*w,v*h,2,2);
    if(opt.walk){x.strokeStyle='rgba(30,30,30,0.35)';x.lineWidth=1.5;x.strokeRect(0.02*w,0.32*h,0.22*w,0.09*h);}});
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  const m=new THREE.MeshStandardMaterial({map:tex,roughness:opt.smooth?0.2:0.32,metalness:opt.smooth?0.06:0.38,side:THREE.DoubleSide,envMapIntensity:1.1});m.userData.col=col;m.userData.smooth=!!opt.smooth;return WMC[key]=m;}
const SMC={};function surfMat(m){const k=m.userData.col;if(SMC[k])return SMC[k];const c=new THREE.Color(k).multiplyScalar(0.94);return SMC[k]=new THREE.MeshStandardMaterial({color:c,roughness:m.userData.smooth?0.24:0.4,metalness:m.userData.smooth?0.05:0.3,side:THREE.DoubleSide});}
let SPINT=null;const spinTex=()=>SPINT||(SPINT=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#f2f3f4';x.fillRect(0,0,w,h);x.fillStyle='#1d1f22';for(let yy=0;yy<h;yy++){const u=((yy/h)*0.9)%1;x.fillRect(u*w,yy,w*0.07,1);}}));
// Entladungsstäbe an Hinterkanten
function wicks(parent,pts){const m=new THREE.MeshStandardMaterial({color:0x222428,roughness:0.6});for(const [x,y,z] of pts){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,0.32,5),m);c.rotation.x=Math.PI/2;c.position.set(x,y,z+0.16);parent.add(c);}}
function wheel(r,w,parent,x,y,z){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,20),M.tire);t.rotation.z=Math.PI/2;g.add(t);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*0.55,r*0.55,w*1.02,14),M.metal);hub.rotation.z=Math.PI/2;g.add(hub);g.position.set(x,y,z);parent.add(g);return g;}
function strut(parent,a,b,r,mat){const d=b.clone().sub(a),len=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),mat||M.metal);m.position.copy(a).add(b).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
// Propellerblatt: verwundenes Profil, breiteste Stelle bei 35 %, runde Spitze, gelbe Warnspitze über die Textur
const BLG={};let BLM=null;
function bladeGeo(R){const k=R.toFixed(2);if(BLG[k])return BLG[k];const N=9,secs=[];
  for(let i=0;i<=N;i++){const f=0.14+0.86*i/N,ch=R*(0.075+0.09*Math.sin(Math.PI*Math.min(1,f*1.25))*(1-0.55*f))*(i===N?0.55:1);secs.push({x:f*R,y:0,z:-ch*0.35,c:ch,t:0.11-0.05*f});}
  const g=loft(secs);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const xr=p.getX(i)/R,b=(62-46*xr)*Math.PI/180,yy=p.getY(i),zz=p.getZ(i),a=Math.PI/2-b;p.setY(i,yy*Math.cos(a)-zz*Math.sin(a));p.setZ(i,yy*Math.sin(a)+zz*Math.cos(a));}
  g.rotateZ(Math.PI/2);g.computeVertexNormals();return BLG[k]=g;}
function bladeMat(){return BLM||(BLM=new THREE.MeshStandardMaterial({map:canvasTex(128,8,(x,w,h)=>{x.fillStyle='#202226';x.fillRect(0,0,w,h);x.fillStyle='#f2c200';x.fillRect(w*0.9,0,w*0.1,h);x.fillStyle='rgba(255,255,255,0.06)';x.fillRect(0,0,w,2);}),roughness:0.45,metalness:0.35,side:THREE.DoubleSide}));}
function prop(parent,x,y,z,R,blades,col){
  const g=new THREE.Group();g.position.set(x,y,z);const bl=new THREE.Group();
  for(let i=0;i<blades;i++){const b=new THREE.Mesh(bladeGeo(R),bladeMat());b.rotation.z=i*Math.PI*2/blades;bl.add(b);}
  g.add(bl);const sm=col?col:paintMat({color:0xf3f4f5,roughness:0.3});const sp=new THREE.Mesh(new THREE.SphereGeometry(R*0.16,20,12,0,Math.PI*2,0,Math.PI/2).scale(1,1.9,1).rotateX(-Math.PI/2),sm);g.add(sp);
  const bp=new THREE.Mesh(new THREE.CylinderGeometry(R*0.162,R*0.17,R*0.05,20).rotateX(Math.PI/2),M.metal);bp.position.z=R*0.02;g.add(bp);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(R*1.02,40),M.disc);disc.visible=false;g.add(disc);
  parent.add(g);return{g,bl,disc};
}
function navLights(parent,pts){
  const pu={uI:{value:2.2},uScale:{value:500},uFogD:{value:0.00003}};
  const pos=[],col=[],sz=[];pts.forEach(p=>{pos.push(...p.p);col.push(...p.c);sz.push(p.s||0.6);});
  const P=makeGlow(pos,col,sz,pu);parent.add(P);return{P,u:pu,pts};
}

// ---------- Modelle ----------

// ---------- Airliner-Bausatz (LUIS-Flotte) ----------
const NAVY='#0b2545',RED='#d7263d';
// Rumpfprofil: Nase mit Ober-/Unterkante (halbe Rumpfhöhen) und eigener Breite (R) – nach Airbus-Seiten- und Draufsicht
// [s, oben, unten, halbe Breite]; s = Anteil der Nasenlänge
const NOSE={std:[[0,-0.35,-0.35,0],[0.004,-0.29,-0.41,0.055],[0.012,-0.25,-0.45,0.1],[0.03,-0.17,-0.5,0.17],[0.056,-0.09,-0.55,0.245],[0.11,0.04,-0.64,0.37],[0.22,0.2,-0.775,0.55],[0.33,0.3,-0.87,0.69],[0.44,0.39,-0.925,0.8],[0.54,0.6,-0.96,0.87],[0.64,0.79,-0.98,0.92],[0.8,0.935,-0.995,0.97],[0.9,0.985,-1,0.99],[1,1,-1,1]],
  a380:[[0,-0.33,-0.33,0],[0.016,-0.17,-0.52,0.15],[0.0485,0.02,-0.62,0.27],[0.097,0.2,-0.73,0.38],[0.162,0.38,-0.83,0.5],[0.259,0.57,-0.91,0.63],[0.38,0.72,-0.96,0.75],[0.558,0.87,-0.985,0.87],[0.752,0.96,-1,0.95],[1,1,-1,1]],
  b747:[[0,0.1,0.1,0],[0.0177,0.22,-0.04,0.12],[0.0426,0.32,-0.15,0.2],[0.071,0.44,-0.26,0.27],[0.142,0.66,-0.48,0.41],[0.213,0.82,-0.63,0.53],[0.305,0.96,-0.74,0.65],[0.355,1.0,-0.79,0.71],[0.567,1,-0.89,0.88],[0.78,1,-0.96,0.96],[1,1,-1,1]],
  a350:[[0,-0.3,-0.3,0],[0.005,-0.24,-0.38,0.065],[0.015,-0.18,-0.44,0.12],[0.035,-0.09,-0.51,0.2],[0.06,0.0,-0.57,0.28],[0.11,0.14,-0.66,0.41],[0.2,0.32,-0.78,0.58],[0.3,0.47,-0.86,0.71],[0.42,0.61,-0.92,0.82],[0.55,0.75,-0.96,0.9],[0.7,0.87,-0.985,0.96],[0.85,0.96,-0.997,0.99],[1,1,-1,1]]};
// monotone kubische Interpolation (kein Überschwingen)
function mono(xs,ys){const n=xs.length,d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
  m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(3*(xs[i+1]-xs[i-1]))/((2*xs[i+1]-xs[i]-xs[i-1])/d[i-1]+(xs[i+1]+xs[i]-2*xs[i-1])/d[i]);
  return x=>{let i=0;while(i<n-2&&x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};}
const NOSEF={};
function noseFn(kind){if(NOSEF[kind])return NOSEF[kind];const T=NOSE[kind]||NOSE.std,xs=T.map(r=>r[0]);return NOSEF[kind]=[1,2,3].map(k=>mono(xs,T.map(r=>r[k])));}
function prof(R,nose,tailT,up,sy,kind){sy=sy||1;const [fT,fB,fW]=noseFn(kind),st=[];
  for(let k=0;k<=36;k++){const s=Math.pow(k/36,1.7),top=fT(s),bot=fB(s),hh=Math.max(0.004,(top-bot)/2)*R*sy,r=Math.max(R*0.006,fW(s)*R);
    st.push({t:nose*s,r,y:(top+bot)/2*R*sy,sy:hh/r});}
  return[...st,{t:tailT,r:R,sy},{t:tailT+(1-tailT)*0.3,r:R*0.86,y:R*0.14*up,sy},{t:tailT+(1-tailT)*0.65,r:R*0.52,y:R*0.4*up,sy},{t:0.985,r:R*0.2,y:R*0.58*up,sy},{t:1,r:R*0.12,y:R*0.6*up,sy}];}
// Verglasung als eigene, dem Rumpf folgende Fläche. Maske wird pro Pixel in (t, Winkel) berechnet.
const GC={};
function glassMat(tex,cabin){const m=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:0.5,roughness:0.05,metalness:0.9,envMapIntensity:2.4,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  if(cabin){m.emissiveMap=cabin;m.emissive=new THREE.Color(1,0.78,0.5);m.emissiveIntensity=0;}return m;}
function patchGeo(L,PR,ta,tb,p0,p1,NT,NP,lift,swap){const pos=[],uv=[],idx=[];
  for(let j=0;j<=NT;j++){const t=ta+(tb-ta)*j/NT,r=lerpProf(PR,t,'r')+(lift||0.015),sx=lerpProf(PR,t,'sx'),yo=yOff(PR,t),q0=typeof p0==='function'?p0(t):p0,q1=typeof p1==='function'?p1(t):p1;
    for(let i=0;i<=NP;i++){const ph=q0+(q1-q0)*i/NP,cp=Math.cos(ph);pos.push(r*sx*Math.sin(ph)*(cp>0?sxW(PR,t,cp):1),r*syAt(PR,t,ph)*cp+yo,t*L-L/2);if(swap)uv.push(j/NT,i/NP);else uv.push(i/NP,1-j/NT);}}
  const inc=(typeof p1==='function'?p1(ta):p1)>(typeof p0==='function'?p0(ta):p0);for(let j=0;j<NT;j++)for(let i=0;i<NP;i++){const a=j*(NP+1)+i,b=a+1,c=a+NP+1,d=c+1;if(inc)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function maskTex(W,H,fn,emis){W=Math.max(16,Math.round(W*TEXS));H=Math.max(16,Math.round(H*TEXS));const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),im=x.createImageData(W,H),D=im.data;let e=null,E=null;if(emis){e=document.createElement('canvas');e.width=W;e.height=H;E=e.getContext('2d').createImageData(W,H);}
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){const v=fn(px/W,py/H),o=(py*W+px)*4;if(!v){D[o+3]=0;continue;}D[o]=v[0];D[o+1]=v[1];D[o+2]=v[2];D[o+3]=255;if(E&&v[3]){E.data[o]=255;E.data[o+1]=255;E.data[o+2]=255;E.data[o+3]=255;}}
  x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;let te=null;if(e){e.getContext('2d').putImageData(E,0,0);te=new THREE.CanvasTexture(e);}return[t,te];}
// Cockpitscheiben: Band zwischen Höhe yl..yh, vorne ab t0, hinten bis back(Winkel), Pfosten bei posts (Grad)
function windshield(L,PR,R,o,key){
  const ta=o.ta,tb=o.tb,PA=(o.maxPd+4)*Math.PI/180,NT=40,NP=64;
  const g=patchGeo(L,PR,ta,tb,-PA,PA,NT,NP);
  if(!GC[key]){const fr=o.fr||0.035*R;
    GC[key]=maskTex(1024,512,(u,v)=>{const t=ta+(tb-ta)*v,ph=-PA+2*PA*u,pd=Math.abs(ph)*180/Math.PI,r=lerpProf(PR,t,'r'),sy=syAt(PR,t,ph),yo=yOff(PR,t),y=r*sy*Math.cos(ph)+yo;
      if(o.fn){const c=o.fn(t*L,y,Math.abs(ph)*r,pd);if(!c)return null;if(c===1)return[46,48,54];const k=Math.min(1,Math.max(0,(y-o.yl)/(o.yh-o.yl)));return[30+46*k,46+60*k,62+74*k];}
      const back=o.back(pd),yl=typeof o.yl==='function'?o.yl(t,pd):o.yl,yh=typeof o.yh==='function'?o.yh(t,pd):o.yh;if(!(y>yl&&y<yh&&t>o.t0&&t<back&&pd<o.maxPd))return null;
      const edge=Math.min(y-yl,yh-y)<fr||o.posts.some(q=>Math.abs(pd-q)<(o.pw||1.6))||(back-t)*L<fr*1.2||(t-o.t0)*L<fr;
      if(edge)return[46,48,54];const k=(y-yl)/(yh-yl);return[30+46*k,46+60*k,62+74*k];})[0];}
  const m=new THREE.Mesh(g,glassMat(GC[key]));m.castShadow=false;return m;
}
// ---------- Cockpitscheiben als echte Einzelscheiben ----------
// Frontscheiben werden in der Vorderansicht (x,y), Seitenscheiben in der Seitenansicht (u = Abstand zur Nasenspitze, y)
// als Vielecke mit runden Ecken beschrieben und pro Pixel auf die Rumpfoberfläche projiziert. Rahmen dunkel, Pfosten schmal.
function polyInset(P,d){const n=P.length;let A=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];A+=a[0]*b[1]-b[0]*a[1];}const sg=A>0?1:-1,L=[];
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n],ex=b[0]-a[0],ey=b[1]-a[1],l=Math.hypot(ex,ey)||1,nx=-ey/l*sg,ny=ex/l*sg;L.push([a[0]+nx*d,a[1]+ny*d,ex,ey]);}
  const out=[];for(let i=0;i<n;i++){const p=L[(i+n-1)%n],q=L[i],den=p[2]*q[3]-p[3]*q[2];if(Math.abs(den)<1e-9){out.push([q[0],q[1]]);continue;}const t=((q[0]-p[0])*q[3]-(q[1]-p[1])*q[2])/den;out.push([p[0]+p[2]*t,p[1]+p[3]*t]);}
  return out;}
function polySD(P,x,y){const n=P.length;let d=1e9,s=0,A=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];A+=a[0]*b[1]-b[0]*a[1];}
  let inside=true;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n],ex=b[0]-a[0],ey=b[1]-a[1],wx=x-a[0],wy=y-a[1],t=Math.max(0,Math.min(1,(wx*ex+wy*ey)/(ex*ex+ey*ey||1)));
    d=Math.min(d,Math.hypot(wx-ex*t,wy-ey*t));if((ex*wy-ey*wx)*A<0)inside=false;}
  return inside?-d:d;}
function roundPane(P,rc){const Q=polyInset(P,rc);return (x,y)=>polySD(Q,x,y)-rc;}
// Querschnitt: Halbbreite in Höhe y an der Stelle t
function halfW(PR,t,y){const r=lerpProf(PR,t,'r'),sx=lerpProf(PR,t,'sx'),yo=yOff(PR,t),hh=r*(y>yo?lerpProf(PR,t,'syT'):lerpProf(PR,t,'sy'));const c=(y-yo)/hh;if(Math.abs(c)>=1)return 0;const w=r*sx*Math.sqrt(1-c*c);return y>yo?w*sxW(PR,t,c):w;}
function uAtWidth(PR,L,x,y,t0,t1){let a=t0,b=t1;if(halfW(PR,b,y)<x)return b*L;for(let k=0;k<40;k++){const m=(a+b)/2;if(halfW(PR,m,y)<x)a=m;else b=m;}return (a+b)/2*L;}
// Scheiben-Layout: Airbus (Unterkante waagrecht, hintere Seitenscheibe mit stark abfallender Oberkante) oder Boeing 747 (auf dem Oberdeck)
function paneLayout(C,PR,L,R,H){const k=1+(R/1.98-1)*0.3,nz=C.nose,F=[],S=[];
  // Frontscheiben in der Frontansicht (x = halbe Breite, y = Höhe), Seitenscheiben auf der Rumpfseite (u = Abstand ab Nase, y)
  // Seitenscheiben: vordere Kante folgt dem A-Pfosten, hintere Kanten nur leicht geneigt – keine verdrehten Vierecke
  const a=C.hump?{yb:R*0.99,yt:R*1.25,xo:0.82,xt:0.7,w2:0.7,w3:0.5,drop:0.5,g:0.09,r0:0.02,r1:0.2}
    :C.deck2?{yb:0.155*H,yt:0.285*H,xo:0.8*k,xt:0.74*k,w2:0.62,w3:0.46,drop:0.55,g:0.08,r0:0.003,r1:nz*1.6}
    :C.ws==='a350'?{yb:0.3*H,yt:0.53*H,xo:0.95*k,xt:0.84*k,w2:0.68,w3:0.5,drop:0.5,g:0.07,r0:0.003,r1:nz*1.6}
    :{yb:0.33*H,yt:0.575*H,xo:0.97*k,xt:0.82*k,w2:0.66,w3:0.5,drop:0.55,g:0.09,r0:0.003,r1:nz*1.6};
  const yb=a.yb,yt=a.yt,hgt=yt-yb,pst=0.045*k,g=a.g*k;
  F.push([[pst,yb],[pst,yt],[a.xt,yt-0.05*hgt],[a.xo,yb+0.04*hgt]]);
  const uB=uAtWidth(PR,L,a.xo,yb+0.04*hgt,a.r0,a.r1);let uT=uAtWidth(PR,L,a.xt,yt-0.05*hgt,a.r0,a.r1);
  uT=Math.min(uT,uB+1.3*hgt);// A-Pfosten nicht flacher als ~37°
  const lean=0.12*hgt,w2=a.w2*k,w3=a.w3*k;
  // Scheibe 2: vorne am Pfosten, hinten fast senkrecht; oben mindestens 0,25 m breit
  let r2b=uB+g+w2;if(r2b+lean<uT+g+0.25*k)r2b=uT+g+0.25*k-lean;const r2t=r2b+lean;
  S.push([[uB+g,yb+0.04*hgt],[uT+g,yt-0.05*hgt],[r2t,yt-0.1*hgt],[r2b,yb+0.02*hgt]]);
  // Scheibe 3: kleiner, Oberkante fällt nach hinten ab, hintere Kante schräg
  const f3b=r2b+g,f3t=r2t+g,r3b=f3b+w3,r3t=Math.max(f3t+0.15*k,f3b+w3*0.55);
  S.push([[f3b,yb+0.02*hgt],[f3t,yt-0.12*hgt],[r3t,yt-a.drop*hgt],[r3b,yb+0.02*hgt]]);
  return{F,S,fr:0.05*k,rc:0.06*k,ta:C.hump?0.02:0.003,tb:Math.min(C.hump?0.3:nz*2.2,(r3b+0.5*k)/L)};}
function cockpitGlass(L,PR,R,C,key){const H=R*(C.sy||1),lay=paneLayout(C,PR,L,R,H),ta=lay.ta,tb=lay.tb,PA=104*Math.PI/180,k0=1+(R/1.98-1)*0.3;
  const g=patchGeo(L,PR,ta,tb,-PA,PA,48,96);
  if(!GC[key]){const FP=lay.F.map(p=>roundPane(p,lay.rc)),SP=lay.S.map(p=>roundPane(p,lay.rc)),fr=lay.fr,TW=2048,TH=1024;
    const rows=[],st=(t)=>({r:lerpProf(PR,t,'r'),sx:lerpProf(PR,t,'sx'),sy:lerpProf(PR,t,'sy'),syT:lerpProf(PR,t,'syT'),sxT:lerpProf(PR,t,'sxT'),yo:yOff(PR,t),z:t*L});
    const pos=(q,ph)=>{const c=Math.cos(ph);return[q.r*q.sx*Math.sin(ph)*(c>0?sxF(q.sxT,c):1),q.r*(c>0?q.syT:q.sy)*c+q.yo,q.z];};
    const yC=[0.06,0.1,0.15],yR=[0.2,0.3,0.4];
    GC[key]=maskTex(TW,TH,(u,v)=>{const t=ta+(tb-ta)*v,row=rows[Math.round(v*TH)]||(rows[Math.round(v*TH)]=[st(t),st(t+(tb-ta)/TH)]),ph=-PA+2*PA*u;
      const P=pos(row[0],ph),Pp=pos(row[0],ph+0.002),Pt=pos(row[1],ph);
      const a1=[Pp[0]-P[0],Pp[1]-P[1],Pp[2]-P[2]],a2=[Pt[0]-P[0],Pt[1]-P[1],Pt[2]-P[2]];let nx=a1[1]*a2[2]-a1[2]*a2[1],ny=a1[2]*a2[0]-a1[0]*a2[2],nz2=a1[0]*a2[1]-a1[1]*a2[0];const nl=Math.hypot(nx,ny,nz2)||1;nx/=nl;nz2/=nl;
      if(nx*P[0]<0){nx=-nx;nz2=-nz2;}
      const ax=Math.abs(P[0]),uu=P[2];let d=1e9;
      if(nz2<-0.12)for(const f of FP)d=Math.min(d,f(ax,P[1]));
      if(Math.abs(nx)>0.3)for(const f of SP)d=Math.min(d,f(uu,P[1]));
      if(d<0){const kk=Math.min(1,Math.max(0,(P[1]-lay.F[0][0][1])/(lay.F[0][1][1]-lay.F[0][0][1]+1e-6)));return[yC[0]*255+kk*(yR[0]-yC[0])*255,yC[1]*255+kk*(yR[1]-yC[1])*255,yC[2]*255+kk*(yR[2]-yC[2])*255];}
      // Rahmen in Rumpffarbe (durchsichtig -> Lack darunter), nur eine schmale dunkle Dichtung um jede Scheibe
      if(C.mask&&d<0.11*k0)return[20,22,26];if(d<0.022*k0)return[38,41,46];if(d<0.034*k0)return[150,154,160];return null;})[0];}
  const m=new THREE.Mesh(g,cockpitGlassMat(GC[key]));m.castShadow=false;return m;}
// Innenverkleidung des Cockpits (nur von innen sichtbar): Wand mit Ausschnitten genau dort, wo aussen die Scheiben sitzen
function cockpitShell(L,PR,R,C,key){const H=R*(C.sy||1),lay=paneLayout(C,PR,L,R,H),ta=lay.ta,PA=150*Math.PI/180,k0=1+(R/1.98-1)*0.3;
  const te=(C.eye[2]+L/2)/L,tb=Math.min(0.4,te+2.6/L);
  const g=patchGeo(L,PR,ta,tb,-PA,PA,40,90,-0.05);
  if(!GC[key]){const FP=lay.F.map(p=>roundPane(p,lay.rc)),SP=lay.S.map(p=>roundPane(p,lay.rc)),TW=2048,TH=1024;
    const rows=[],st=(t)=>({r:lerpProf(PR,t,'r'),sx:lerpProf(PR,t,'sx'),sy:lerpProf(PR,t,'sy'),syT:lerpProf(PR,t,'syT'),sxT:lerpProf(PR,t,'sxT'),yo:yOff(PR,t),z:t*L});
    const pos=(q,ph)=>{const c=Math.cos(ph);return[q.r*q.sx*Math.sin(ph)*(c>0?sxF(q.sxT,c):1),q.r*(c>0?q.syT:q.sy)*c+q.yo,q.z];};
    const boe=!!C.hump,wall=boe?[138,136,130]:[132,140,150],frm=boe?[70,70,68]:[62,68,76];
    GC[key]=softTex(TW,TH,(u,v)=>{const t=ta+(tb-ta)*v,row=rows[Math.round(v*TH)]||(rows[Math.round(v*TH)]=[st(t),st(t+(tb-ta)/TH)]),ph=-PA+2*PA*u;
      const P=pos(row[0],ph),Pp=pos(row[0],ph+0.002),Pt=pos(row[1],ph);
      const a1=[Pp[0]-P[0],Pp[1]-P[1],Pp[2]-P[2]],a2=[Pt[0]-P[0],Pt[1]-P[1],Pt[2]-P[2]];let nx=a1[1]*a2[2]-a1[2]*a2[1],nz2=a1[0]*a2[1]-a1[1]*a2[0];const nl=Math.hypot(nx,a1[2]*a2[0]-a1[0]*a2[2],nz2)||1;nx/=nl;nz2/=nl;
      if(nx*P[0]<0){nx=-nx;nz2=-nz2;}
      const ax=Math.abs(P[0]),uu=P[2];let d=1e9;
      if(nz2<-0.12)for(const f of FP)d=Math.min(d,f(ax,P[1]));
      if(Math.abs(nx)>0.3)for(const f of SP)d=Math.min(d,f(uu,P[1]));
      // weiche Kanten: Deckkraft steigt über 1 cm am Scheibenrand, Rahmen geht weich in die Verkleidung über
      const al=Math.min(1,Math.max(0,(d+0.004)/0.01));if(al<=0)return null;
      const fw=0.045*k0,q=Math.min(1,Math.max(0,(d-fw+0.005)/0.01));
      return[frm[0]+(wall[0]-frm[0])*q,frm[1]+(wall[1]-frm[1])*q,frm[2]+(wall[2]-frm[2])*q,al*255];});}
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:GC[key],transparent:false,alphaTest:0.5,side:THREE.BackSide,roughness:0.85,metalness:0.0}));m.castShadow=false;m.receiveShadow=false;m.name='cockpitShell';return m;}
// Textur mit weichem Alpha (v = [r,g,b,a] oder null)
function softTex(W,H,fn){W=Math.max(16,Math.round(W*TEXS));H=Math.max(16,Math.round(H*TEXS));const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),im=x.createImageData(W,H),D=im.data;
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){const v=fn(px/W,py/H),o=(py*W+px)*4;if(!v){D[o+3]=0;continue;}D[o]=v[0];D[o+1]=v[1];D[o+2]=v[2];D[o+3]=v[3]??255;}
  x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
let CGM=new Map();function cockpitGlassMat(tex){if(CGM.has(tex))return CGM.get(tex);const m=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:0.5,roughness:0.04,metalness:0.72,envMapIntensity:2.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});CGM.set(tex,m);return m;}
// Kabinenfenster einer Reihe (beide Seiten), echtes Glas mit Rahmen, nachts beleuchtet
function cabinGlass(L,PR,row,key,parts){
  const dph=row.dph||0.2,ta=Math.max(0.01,row.x0-0.8/L),tb=Math.min(0.99,row.x1+0.8/L);
  const PC=row.y!=null?(t=>{const r=lerpProf(PR,t,'r'),c=(row.y-yOff(PR,t))/(r*lerpProf(PR,t,'syT'));return Math.acos(Math.max(-1,Math.min(1,c)));}):(()=>row.a*2*Math.PI);
  if(!GC[key]){const W=Math.min(4096,Math.ceil((tb-ta)*L*60)),H=128;
    GC[key]=maskTex(W,H,(u,v)=>{const tt=ta+(tb-ta)*u,phc=PC(tt),ph=phc-dph+2*dph*v;
      const r=lerpProf(PR,tt,'r'),sx=lerpProf(PR,tt,'sx'),sy=syAt(PR,tt,ph);
      const zl=tt*L,k=Math.round((zl-row.x0*L)/row.pitch);let xc=row.x0*L+k*row.pitch;
      const ex=row.extra&&row.extra.find(z=>Math.abs(zl-z)<row.pitch*0.5);
      if(ex!=null)xc=ex;else{if(xc<row.x0*L-0.01||xc>row.x1*L+0.01)return null;if(row.skip&&row.skip.some(([s0,s1])=>xc>s0*L&&xc<s1*L))return null;}
      const arc=(ph-phc)*r*(sx+sy)/2,dx=(zl-xc)/(row.ww/2),dy=arc/(row.wh/2),pw=row.pw||4,d=Math.pow(Math.pow(Math.abs(dx),pw)+Math.pow(Math.abs(dy),pw),1/pw);
      if(d<1){const k2=(1-dy)/2;return[26+40*k2,40+52*k2,56+64*k2,1];}if(d<(row.fr||1.28))return[176,182,190,0];return null;},true);}
  const [tex,em]=GC[key];
  for(const sd of [1,-1]){const g=patchGeo(L,PR,ta,tb,t=>sd*(PC(t)+dph),t=>sd*(PC(t)-dph),Math.max(8,Math.ceil((tb-ta)*L/0.8)),8,0.012,true);
    const mat=glassMat(tex,em);const m=new THREE.Mesh(g,mat);m.castShadow=false;parts.body.add(m);(parts.cabin=parts.cabin||[]).push(mat);}
}
// Seitenleitwerk: UV aus der Seitenansicht, links und rechts lesbar
function finUV(g){const p=g.attributes.position;let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<p.count;i++){z0=Math.min(z0,p.getZ(i));z1=Math.max(z1,p.getZ(i));y0=Math.min(y0,p.getY(i));y1=Math.max(y1,p.getY(i));}
  const uv=[];for(let i=0;i<p.count;i++){const u=(p.getZ(i)-z0)/(z1-z0),v=(p.getY(i)-y0)/(y1-y0);uv.push(p.getX(i)>0?1-u:u,v);}
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const ix=g.index.array,R=[],Lf=[];for(let k=0;k<ix.length;k+=3){const cx=p.getX(ix[k])+p.getX(ix[k+1])+p.getX(ix[k+2]);(cx>=0?R:Lf).push(ix[k],ix[k+1],ix[k+2]);}
  g.setIndex([...R,...Lf]);g.clearGroups();g.addGroup(0,R.length,0);g.addGroup(R.length,Lf.length,1);}
const FINM={};
function finMats(spec){const [style,c1,c2,letter,base]=spec||['stripe','#0b2545','#d7263d','L','#f8f8f7'],key=spec?spec.join('|'):'d';if(FINM[key])return FINM[key];
  const lc=style==='swoosh'?onCol('#ffffff',c1):onCol('#ffffff',c1);
  const draw=flip=>(x,w,h)=>{x.save();if(flip){x.translate(w,0);x.scale(-1,1);}
    // u=0 vorne (links im Bild) für die linke Seite, oben = Spitze des Leitwerks
    if(style==='swoosh'){x.fillStyle=base;x.fillRect(0,0,w,h);const cv=u=>h*(1-0.97*Math.pow(u,1.45));
      x.fillStyle=c2;x.beginPath();x.moveTo(0,h);for(let i=0;i<=40;i++){const u=i/40;x.lineTo(u*w,cv(u)-h*0.075);}x.lineTo(w,h);x.closePath();x.fill();
      x.fillStyle=base;x.beginPath();x.moveTo(0,h);for(let i=0;i<=40;i++){const u=i/40;x.lineTo(u*w,cv(u)-h*0.04);}x.lineTo(w,h);x.closePath();x.fill();
      x.fillStyle=c1;x.beginPath();x.moveTo(0,h);for(let i=0;i<=40;i++){const u=i/40;x.lineTo(u*w,cv(u));}x.lineTo(w,h);x.closePath();x.fill();}
    else{x.fillStyle=c1;x.fillRect(0,0,w,h);
      if(style==='stripe'){x.save();x.translate(w*0.6,h*0.36);x.rotate(-0.62);x.fillStyle=c2;x.fillRect(-w,-h*0.07,2*w,h*0.11);x.fillStyle='#fff';x.fillRect(-w,h*0.055,2*w,h*0.025);x.restore();}
      if(style==='solid'){x.fillStyle=c2;x.beginPath();x.moveTo(0,h);x.lineTo(w*0.62,h);x.lineTo(0,h*0.42);x.closePath();x.fill();}
      if(style==='cross'){const S=Math.min(w,h)*0.44,a=S*0.3,b=S/2,cx=w*0.56,cy=h*0.5;x.fillStyle='#fff';x.fillRect(cx-a/2,cy-b,a,2*b);x.fillRect(cx-b,cy-a/2,2*b,a);}}
    x.restore();
    if(letter&&style!=='cross'){x.fillStyle=lc;x.font=`900 ${h*0.3}px Arial`;x.textAlign='center';x.textBaseline='middle';
      const ux=style==='swoosh'?0.66:style==='solid'?0.56:0.38;x.fillText(letter,flip?w*(1-ux):w*ux,h*(style==='solid'?0.5:0.74));}};
  const mk=f=>{const t=canvasTex(512,512,draw(f));return new THREE.MeshStandardMaterial({map:t,roughness:0.28,side:THREE.DoubleSide});};
  return FINM[key]=[mk(true),mk(false)];}
let LV=null,FS=null;
const solidMat=(c,r)=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),roughness:r||0.3,side:THREE.DoubleSide});
function tailDecal(){return canvasTex(512,512,(x)=>{x.clearRect(0,0,512,512);x.save();x.translate(256,256);x.rotate(-0.55);x.fillStyle=RED;x.fillRect(-400,40,800,70);x.fillStyle='#ffffff';x.fillRect(-400,118,800,14);x.restore();
  x.fillStyle='#ffffff';x.font='900 250px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('L',230,215);});}
export const AIRLINER={
  // A321neo: A320 + 4,27 m vor und 2,67 m hinter dem Flügel (44,51 m), LEAP-1A, Sharklets, vier Türpaare
  l320:{L:44.51,R:1.98,sy:1.05,nose:0.101,tail:0.73,up:1,reg:'HB-LAA',
    wing:{x0:1.6,span:15.4,root:6.7,tip:1.55,sweep:7.6,dih:5.5,y0:-1.25,z0:-3.19,tr:0.14,tt:0.11,kink:0.34},winglet:'sharklet',
    eng:[{x:5.9,len:5.3,r:1.3,k:0.86,fwd:0.68,neo:1}],fin:{z:15.69,root:6.2,tip:2.5,h:6.3,sweep:4.4,y:1.7},stab:{x0:0.6,span:5.6,root:3.7,tip:1.6,sweep:3.4,dih:6,y:0.85,z:18.39},
    main:[{x:3.8,z:2.02,ax:1}],ng:-16.86,eye:[-0.52,0.62,-20.0],cg:2.6,winX:[0.1,0.86],doors:[0.11,0.39,0.61,0.86],skip:[]},
  l32n:{L:37.6,R:1.98,sy:1.05,nose:0.12,tail:0.68,up:1,reg:'HB-LNA',
    wing:{x0:1.6,span:15.4,root:6.6,tip:1.55,sweep:7.6,dih:5.5,y0:-1.25,z0:-4.0,tr:0.14,tt:0.11,kink:0.34},winglet:'sharklet',
    eng:[{x:5.9,len:5.3,r:1.3,k:0.86,fwd:0.68,neo:1}],fin:{z:12.2,root:6.2,tip:2.5,h:6.3,sweep:4.4,y:1.7},stab:{x0:0.6,span:5.6,root:3.7,tip:1.6,sweep:3.4,dih:6,y:0.85,z:14.9},
    main:[{x:3.8,z:1.2,ax:1}],ng:-13.4,eye:[-0.52,0.62,-16.55],cg:1.8,winX:[0.12,0.86],doors:[0.12,0.41,0.84],skip:[[0.105,0.135],[0.39,0.43],[0.82,0.86]]},
  // A330-900neo: Rumpf wie A330-300, Trent 7000 (Fan 2,84 m), neue Flügelspitze mit Sharklet (64 m), schwarze Cockpitmaske
  l330:{L:63.66,R:2.82,sy:1.04,nose:0.1,tail:0.72,up:1,reg:'HB-LBA',mask:1,
    wing:{x0:2.7,span:27.4,root:10.6,tip:2.2,sweep:16.5,dih:5.5,y0:-1.75,z0:-6.2,tr:0.13,tt:0.1,kink:0.36},winglet:'neo330',
    eng:[{x:9.4,len:7.1,r:1.78,k:0.8,fwd:0.7,neo:1}],fin:{z:22.0,root:10,tip:4,h:9.4,sweep:8,y:2.4},stab:{x0:1.1,span:8.5,root:5.6,tip:2.1,sweep:5.8,dih:6,y:1.2,z:25.6},
    main:[{x:5.4,z:2.2,ax:2}],ng:-26.4,eye:[-0.55,0.9,-29.0],cg:3.0,winX:[0.1,0.87],doors:[0.1,0.3,0.6,0.85],skip:[]},
  l340:{L:63.7,R:2.82,sy:1.04,nose:0.1,tail:0.72,up:1,reg:'HB-LCA',
    wing:{x0:2.7,span:27.4,root:10.6,tip:2.2,sweep:16.5,dih:5.5,y0:-1.75,z0:-6.2,tr:0.13,tt:0.1,kink:0.36},winglet:'tall',
    eng:[{x:10.0,len:5.0,r:1.0,k:1.0,fwd:0.62,cfm:1},{x:18.6,len:5.0,r:1.0,k:1.0,fwd:0.6,cfm:1}],fin:{z:22.0,root:10,tip:4,h:9.4,sweep:8,y:2.4},stab:{x0:1.1,span:8.5,root:5.6,tip:2.1,sweep:5.8,dih:6,y:1.2,z:25.6},
    main:[{x:5.4,z:2.2,ax:2},{x:0,z:2.9,ax:1,center:1}],ng:-26.4,eye:[-0.55,0.9,-29.0],cg:3.0,winX:[0.1,0.87],doors:[0.1,0.3,0.6,0.85],skip:[[0.09,0.115],[0.29,0.315],[0.59,0.615],[0.84,0.865]]},
  l346:{L:75.4,R:2.82,sy:1.04,nose:0.09,tail:0.75,up:1,reg:'HB-LFA',
    wing:{x0:2.7,span:29.1,root:11.4,tip:2.3,sweep:17.8,dih:5.5,y0:-1.75,z0:-7.0,tr:0.13,tt:0.1,kink:0.36},winglet:'tall',
    eng:[{x:10.7,len:6.2,r:1.4},{x:19.9,len:6.2,r:1.4}],fin:{z:27.6,root:10.6,tip:4.2,h:9.8,sweep:8.3,y:2.4},stab:{x0:1.1,span:9.4,root:6,tip:2.2,sweep:6.2,dih:6,y:1.2,z:31.6},
    main:[{x:5.4,z:3.0,ax:2},{x:0,z:3.4,ax:2,center:1}],ng:-31.8,eye:[-0.55,0.9,-34.8],cg:3.4,winX:[0.09,0.89],doors:[0.09,0.27,0.53,0.75,0.88],skip:[[0.08,0.1],[0.26,0.28],[0.52,0.54],[0.74,0.76],[0.87,0.89]]},
  l350:{L:73.8,R:2.98,sy:1.03,nose:0.1,tail:0.72,up:1,reg:'HB-LDA',noseK:'a350',ws:'a350',
    wing:{x0:2.8,span:29.6,root:12.5,tip:2.6,sweep:18.4,dih:6,y0:-1.9,z0:-6.5,tr:0.13,tt:0.1,kink:0.32},winglet:'curved',
    eng:[{x:10.3,len:7.6,r:1.75,k:1.0,fwd:0.62}],fin:{z:23.6,root:11,tip:4.3,h:9.0,sweep:7.2,y:2.6},stab:{x0:1.2,span:9.6,root:6.5,tip:2.4,sweep:6.5,dih:5,y:1.4,z:27.0},
    main:[{x:5.6,z:2.0,ax:3}],ng:-29.2,eye:[-0.55,1.12,-32.3],cg:3.4,winX:[0.1,0.88],doors:[0.097,0.282,0.532,0.792],skip:[[0.085,0.11],[0.27,0.295],[0.52,0.545],[0.78,0.805]],mask:1},
  // 747-8 Intercontinental: 747-400 + 4,1 m vor und 1,5 m hinter dem Flügel (76,3 m), Oberdeck 4,1 m länger,
  // GEnx-2B mit Zacken an Fan- und Kerndüse, neuer Flügel mit schräger Spitze (68,4 m)
  l747:{L:76.3,R:3.25,sy:1.14,nose:0.185,tail:0.758,up:1,reg:'HB-LGA',noseK:'b747',
    wing:{x0:3.0,span:29.2,root:14.8,tip:4.0,sweep:22.5,dih:7,y0:-2.1,z0:-7.95,tr:0.13,tt:0.09,kink:0.34},winglet:'raked',
    eng:[{x:11.9,len:6.4,r:1.56,k:0.92,fwd:0.62,neo:1,chev:1},{x:20.9,len:6.3,r:1.55,k:0.92,fwd:0.6,neo:1,chev:1}],fin:{z:24.75,root:12.5,tip:4.6,h:11.2,sweep:10,y:2.9},stab:{x0:1.3,span:10.4,root:7.6,tip:2.6,sweep:8.4,dih:7,y:1.1,z:28.75},
    main:[{x:5.9,z:2.85,ax:2},{x:1.95,z:5.85,ax:2}],ng:-29.45,eye:[-0.55,4.1,-31.05],cg:4.85,winX:[0.1,0.9],doors:[],skip:[],
    hump:{top:0.48,tb:0.1573,tc:0.3498,td:0.4701,pts:[[0,0],[0.0032,0.08],[0.0079,0.15],[0.0131,0.23],[0.0259,0.4],[0.0393,0.53],[0.0564,0.66],[0.074,0.78],[0.0916,0.88],[0.111,0.95],[0.1314,0.98],[0.1573,1]]}},
  l380:{L:72.7,R:3.57,sy:1.2,nose:0.2,tail:0.72,up:0.8,reg:'HB-LEA',deck2:1,
    wing:{x0:3.4,span:36.4,root:17.5,tip:4.0,sweep:24.5,dih:5.6,y0:-2.6,z0:-9.8,tr:0.14,tt:0.1,kink:0.31},winglet:'split',
    eng:[{x:14.8,len:7.3,r:1.72},{x:25.7,len:7.1,r:1.7}],fin:{z:21.5,root:14,tip:5.5,h:13.5,sweep:10.5,y:3.6},stab:{x0:1.8,span:13.2,root:9,tip:3,sweep:8.5,dih:5,y:1.3,z:25.2},
    main:[{x:6.0,z:1.8,ax:2},{x:2.4,z:4.6,ax:3}],ng:-26.8,eye:[-0.6,1.35,-33.3],cg:4.4,winX:[0.1,0.88],doors:[0.1,0.3,0.55,0.8],skip:[[0.09,0.115],[0.29,0.315],[0.54,0.565],[0.79,0.815]]}
};
// Türen, Fenster und Frachttore nach den Planungsunterlagen der Hersteller (Abstand ab Nasenspitze in Metern).
// Quellen: Airbus «Aircraft Characteristics – Airport and Maintenance Planning» (A330/A340-300, A340-600, A350-900);
// A320, 747-400 und A380 nach Massskizzen/Fotos geschätzt. Fenster: A320/A330/A340 22,9 × 31,2 cm Glas, Spantabstand 533 mm;
// A350 24,2 × 34,3 cm, Spantabstand 635 mm; 747 25,4 × 35,6 cm, 508 mm; A380 ~25 × 36 cm, 635 mm.
// Türtypen: A = Typ A (1,07 × 1,93 m), I = Typ I (0,81 × 1,85 m), III = Notausstieg über dem Flügel (0,51 × 0,92 m, mit eigenem Fenster)
const DOORT={A:[1.07,1.93],I:[0.81,1.85],III:[0.51,0.92]};
const AIRBUS_W={pitch:0.533,ww:0.229,wh:0.312},A350_W={pitch:0.635,ww:0.242,wh:0.343},B747_W={pitch:0.508,ww:0.254,wh:0.356},A380_W={pitch:0.635,ww:0.25,wh:0.36};
const LAYOUT={
  l32n:{doors:[[4.95,'A'],[16.0,'III'],[16.95,'III'],[31.45,'A']],cargo:[[8.4,1.82,1.24],[26.6,1.82,1.24],[29.6,0.95,0.77]],win:{...AIRBUS_W,z0:6.05,z1:30.6}},
  // A321neo (klassische Kabine): Tür 2 vor, Tür 3 hinter dem Flügel statt Notausstiegen
  l320:{doors:[[4.95,'A'],[17.35,'I'],[27.35,'I'],[38.39,'A']],cargo:[[8.4,1.82,1.24],[33.54,1.82,1.24],[36.54,0.95,0.77]],win:{...AIRBUS_W,z0:6.05,z1:37.54}},
  l330:{doors:[[5.85,'A'],[17.741,'A'],[35.793,'I'],[50.956,'A']],cargo:[[9.53,2.7,1.69],[44.36,2.7,1.69],[47.342,0.95,0.63]],win:{...AIRBUS_W,z0:7.0,z1:49.85}},
  l346:{doors:[[5.85,'A'],[23.91,'A'],[34.087,'A'],[47.46,'I'],[61.576,'A']],cargo:[[9.53,2.7,1.69],[54.98,2.7,1.69],[57.962,0.95,0.63]],win:{...AIRBUS_W,z0:7.0,z1:60.5}},
  // A350-1000: A350-900-Werte (6,85 / 18,85 / 37,93 / 52,55 m) plus 6 Spanten vor und 5 Spanten hinter dem Flügel
  l350:{doors:[[6.85,'A'],[22.66,'A'],[41.74,'A'],[59.53,'A']],cargo:[[11.69,2.7,1.69],[54.28,2.7,1.69],[56.97,0.95,0.63]],win:{...A350_W,z0:8.1,z1:58.3}},
  l747:{doors:[[7.4,'A'],[21.75,'A'],[34.5,'A'],[47.9,'A'],[64.9,'A']],cargo:[[12.2,2.64,1.68],[52.6,2.64,1.68],[60.2,1.12,1.19]],win:{...B747_W,z0:8.5,z1:64.0},
    upper:{...B747_W,z0:9.5,z1:25.4,doors:[[15.2,'I']]}},
  l380:{doors:[[7.2,'A'],[17.3,'A'],[25.0,'A'],[47.0,'A'],[58.4,'A']],cargo:[[12.0,2.7,1.7],[49.6,2.7,1.7],[53.0,1.43,1.45]],win:{...A380_W,z0:8.4,z1:62.6},
    upper:{...A380_W,z0:10.6,z1:59.5,doors:[[19.0,'A'],[42.5,'A'],[52.8,'A']]}}};
LAYOUT.l340=LAYOUT.l330;
// Fenster dort weglassen, wo Türen sitzen (Typ A/I: ganze Tür + Rahmen; Typ III hat ein eigenes Fenster)
function winSkip(doors,L){return doors.map(([z,t])=>{const w=DOORT[t][0]/2+(t==='III'?0.2:0.32);return[(z-w)/L,(z+w)/L];});}
for(const [id,Lo] of Object.entries(LAYOUT)){const C=AIRLINER[id];if(!C)continue;const L=C.L;
  C.lay=Lo;C.doors=Lo.doors.filter(d=>d[1]!=='III').map(d=>d[0]/L);C.winX=[Lo.win.z0/L,Lo.win.z1/L];C.skip=winSkip(Lo.doors,L);}
// Bauchverkleidung: Rumpf unten im Flügelbereich weich ausbauchen statt einer aufgesetzten Kugel
function keelBulge(g,PRF,L,R,sy,zA,zB){
  const p=g.attributes.position,rA=R*2.2,rB=R*4.5,cl=(a,b,x)=>Math.min(1,Math.max(0,(x-a)/(b-a))),sm=x=>x*x*(3-2*x);
  for(let i=0;i<p.count;i++){const z=p.getZ(i),w=sm(cl(zA-rA,zA,z))*(1-sm(cl(zB,zB+rB,z)));if(w<=0)continue;
    const t=(z+L/2)/L,yc=yOff(PRF,t),x=p.getX(i),y=p.getY(i)-yc;const ph=Math.atan2(Math.abs(x),y);const b=sm(cl(Math.PI*0.5,Math.PI*0.93,ph));if(b<=0)continue;
    const k=w*b;p.setX(i,x*(1+0.075*k*(1-0.6*b)));p.setY(i,yc+y-R*sy*0.11*k*b);}
  g.computeVertexNormals();}
function buildAirliner(C,body,parts,root,P){
  const {L,R}=C;const sy=C.sy;
  // Fenster: Glas wie beim Vorbild, darum ein heller Dichtungsrahmen (fr)
  const LW=C.lay.win,winA=C.deck2?0.235:0.205,win=[{x0:C.winX[0],x1:C.winX[1],pitch:LW.pitch,ww:LW.ww,wh:LW.wh,a:winA,skip:C.skip,pw:2.4,fr:1.32,extra:C.lay.doors.filter(d=>d[1]==='III').map(d=>d[0])}];
  const UP=C.lay.upper;
  if(C.deck2)win.push({x0:UP.z0/L,x1:UP.z1/L,pitch:UP.pitch,ww:UP.ww,wh:UP.wh,a:0.14,skip:winSkip(UP.doors,L),pw:2.4,fr:1.32});
  if(C.hump){win[0].y=R*0.2;win.push({x0:UP.z0/L,x1:UP.z1/L,pitch:UP.pitch,ww:UP.ww,wh:UP.wh,y:R*1.15,skip:winSkip(UP.doors,L),pw:2.4,fr:1.32});}
  const nz=C.nose,PRF=prof(R,C.nose,C.tail,C.up,sy,C.noseK||(C.deck2?'a380':'std')),H=R*sy,cl=(a,b,x)=>Math.min(1,Math.max(0,(x-a)/(b-a)));
  // L-747: Oberdeck-Buckel – die obere Rumpfhälfte wird vorne höher (Stirn mit Cockpit, flacher Rücken, weicher Auslauf)
  if(C.hump){const Hm=C.hump,H1=R*sy+Hm.top*R,hTip=-0.15*R,sm=x=>x*x*(3-2*x);
    const ta=0.022,yA=lerpProf(PRF,ta,'r')*lerpProf(PRF,ta,'sy')+yOff(PRF,ta);
    const y0=yOff(PRF,0),pfM=Hm.pts?mono(Hm.pts.map(p=>p[0]),Hm.pts.map(p=>p[1])):null,pf=t=>t>=Hm.pts[Hm.pts.length-1][0]?1:Math.max(0,Math.min(1,pfM(t)));
    const hTop=Hm.pts?(t=>t<Hm.tb?y0+(H1-y0)*pf(t):t<Hm.tc?H1:t<Hm.td?H1-(H1-R*sy)*sm((t-Hm.tc)/(Hm.td-Hm.tc)):-1e9)
      :(t=>t<ta?-1e9:t<Hm.tb?yA+(H1-yA)*(1-Math.pow(1-(t-ta)/(Hm.tb-ta),1.9)):t<Hm.tc?H1:t<Hm.td?H1-(H1-R*sy)*sm((t-Hm.tc)/(Hm.td-Hm.tc)):-1e9);
    for(let t=Hm.pts?0.004:0.03;t<Hm.td+0.015;t+=Hm.pts&&t<0.05?0.003:0.006)if(!PRF.some(q=>Math.abs(q.t-t)<0.002))PRF.push({t,r:lerpProf(PRF,t,'r'),y:yOff(PRF,t),sy:lerpProf(PRF,t,'sy')});PRF.sort((a,b)=>a.t-b.t);
    // oben schmaler (Birnenform des Oberdecks)
    for(const q of PRF){const yy=q.y||0,top=q.r*q.sy+yy,ht=hTop(q.t);if(ht>top){q.syT=(ht-yy)/q.r;q.sxT=1-0.45*Math.min(1,Math.max((ht-top)/(H1-R*sy),Hm.pts&&q.t<Hm.tb?0.85*Math.min(1,q.t/0.03):0));}}}
  // Cockpitfenster: Unterkante fast waagrecht, Oberkante der Seitenfenster fällt nach hinten ab
  // A380: Cockpit zwischen den Decks, tief über der runden Nase; A350: kleine Scheiben in schwarzer Maske mit Knick in der Mitte
  // nach Fotos: A380 Scheiben klein, tief unter der hohen Stirn (57–63 % der Rumpfhöhe), 747 oben auf dem Buckel, A350 hohe Scheiben in schmaler schwarzer Maske
  const WS=C.deck2?{ta:nz*0.12,tb:nz*0.44,t0:0,yl:t=>H*(0.15+0.01*cl(0.25,0.42,t/nz)),yh:t=>H*(0.28-0.02*cl(0.3,0.44,t/nz)),posts:[0,28,50,70],maxPd:80,pw:1.3,back:pd=>nz*(0.44-0.07*cl(55,80,pd)),fr:0.05}
    :C.hump?{ta:0.045,tb:0.106,t0:0,yl:t=>R*(1.05+0.07*cl(0.06,0.1,t)),yh:t=>R*(1.31+0.02*cl(0.08,0.1,t)),posts:[0,30,52,72],maxPd:80,pw:1.4,back:pd=>0.102-0.01*cl(62,80,pd),fr:0.04}
    :C.ws==='a350'?{ta:nz*0.26,tb:nz*0.82,t0:0,yl:(t,pd)=>H*(0.29+0.02*cl(0.4,0.75,t/nz)-0.04*Math.max(0,1-(pd||0)/24)),yh:(t,pd)=>H*(0.57-0.04*cl(0.5,0.78,t/nz)-0.02*Math.max(0,1-(pd||0)/24)),posts:[0,28,50,68],maxPd:78,pw:1.9,back:pd=>nz*(0.64-0.07*cl(60,78,pd)),fr:0.05}
    :{ta:nz*0.36,tb:nz*1.02,t0:0,yl:t=>H*(0.36+0.05*cl(0.5,0.95,t/nz)),yh:t=>H*(0.8-0.14*cl(0.6,0.95,t/nz)),posts:[0,33,57,74],maxPd:86,pw:1.5,back:pd=>nz*(0.97-0.06*cl(74,86,pd)),fr:0.045};
  if(false&&C.mask&&!MASKF['m'+C.L]){const m=0.04*H;MASKF['m'+C.L]=Object.assign((t,ph)=>{const pd=ph*180/Math.PI;if(pd>WS.maxPd+10)return false;
    const y=lerpProf(PRF,t,'r')*syAt(PRF,t,ph)*Math.cos(ph)+yOff(PRF,t),yl=WS.yl(t,pd)-m,yh=WS.yh(t,pd)+m*0.6;if(y<yl||y>yh)return false;
    const mid=(yl+yh)/2,hw=(yh-yl)/2;return t<WS.back(Math.min(pd,WS.maxPd))+nz*(0.012+0.03*Math.pow(Math.max(0,1-Math.abs(y-mid)/hw),1.5));},{tMax:nz*1.3});}
  const PT=paint({R:R*(1+sy)/2,a0:winA,st:{a:winA+0.05,t1:R*0.11,t2:R*0.05,da:0.018,x0:nz*0.9,x1:0.93},tip:R*1.1,wb:R*0.38,
    nm:{a:C.deck2?0.09:C.hump?0.15:0.125,x:C.nmX||(C.deck2?0.3:C.hump?0.43:0.27),size:R*(C.deck2?0.74:1.15),max:C.deck2?0.28:0.34},reg:{str:C.reg,a:0.2,x:0.89,size:R*0.22},belly:{col:'#e1e4e8',w:0.1,x0:nz*0.5},doors:[...C.lay.doors.map(([z,t])=>({x:z/L,t,a:t==='III'?winA:0.235})),...(C.lay.upper?C.lay.upper.doors.map(([z,t])=>({x:z/L,t,a:C.deck2?0.152:0.135})):[])],wins:[],seam:nz*0.36,swT:0.38,mask:C.mask?'m'+C.L:null},LV);
  FS=PT.fin;PT.cfg.cargo=C.lay.cargo.map(([z,w,h])=>({x:z/L,w,h}));PT.cfg.wingZ=[(C.wing.z0+L/2)/L,(C.wing.z0+C.wing.root+L/2)/L];const liv=livery(L,R*(1+sy)/2,PT.cfg);
  const fg=fuselageGeo(L,PRF,72);keelBulge(fg,PRF,L,R,sy,C.wing.z0-C.wing.root*0.12,C.wing.z0+C.wing.root*1.1);
  const fus=new THREE.Mesh(fg,paintMat({map:liv,roughness:0.24,metalness:0.1}));
  fus.castShadow=true;body.add(fus);
  {const PR=PRF;parts.body=body;
   body.add(cockpitGlass(L,PR,R,C,'cg'+C.L+(C.ws||'')+(C.hump?'h':'')));
   if(C.eye)body.add(cockpitShell(L,PR,R,C,'cs'+C.L+(C.ws||'')+(C.hump?'h':'')));
   win.forEach((w,i)=>cabinGlass(L,PR,w,'cw'+C.L+'_'+i,parts));}
  const wm=wingMat(0xd8dce0,{walk:1});
  // Spannweite wie beim Vorbild inkl. Winglets: Flügel um die seitliche Ausladung der Flügelspitze kürzen
  const SPAN_REAL={l320:35.8,l32n:35.8,l330:64.0,l340:60.3,l346:63.45,l350:64.75,l747:68.45,l380:79.75},WEXT={fence:0.15,sharklet:1.25,tall:1.55,curved:2.9,canted:1.25,neo330:2.19,raked:3.4,split:1.9};
  const W={...C.wing},D=W.dih*Math.PI/180;if(SPAN_REAL[P.id])W.span=SPAN_REAL[P.id]/2-(WEXT[C.winglet]||0)-W.x0;
  const kS=W.kink||0.34,WG=wing({...W,dih:D,surfaces:[[0.0,kS,'flap'],[kS,0.74,'flap'],[0.76,0.94,'ail']]},wm,wm,body,parts);
  const yW=x=>W.y0+(x-W.x0)*Math.tan(D),zLE=x=>W.z0+(x-W.x0)/W.span*W.sweep,cW=x=>WG.chord(Math.max(0,Math.min(1,(x-W.x0)/W.span)));
  // Klappenschienen-Verkleidungen (Kanus): hängen an den Klappen und kippen mit ihnen nach unten
  {const kk=Math.min(R,2.6),canoe=(prof)=>{const pts=prof.map(([z,r])=>new THREE.Vector2(Math.max(0.001,r),z));const g=new THREE.LatheGeometry(pts,14);g.rotateX(Math.PI/2);g.scale(0.06*kk,0.085*kk,1);g.translate(0,-0.045*kk,0);return g;};
   // vorne stumpf ansetzend, dann gleich dick; hinten schlank zur Spitze auslaufend – zusammen ein «Kanu»
   const ftF=canoe([[0,0],[0.06,0.55],[0.2,0.85],[0.45,0.98],[1,1]]),ftR=canoe([[0,1],[0.25,0.97],[0.55,0.78],[0.82,0.42],[1,0.04]]);body.updateMatrixWorld(true);
   for(const s of [kS*0.62,kS+(0.74-kS)*0.3,kS+(0.74-kS)*0.75]){const x=W.x0+s*W.span,c=cW(x),t=W.tr+(W.tt-W.tr)*s,yb=yW(x)-t*c*0.32;for(const sg of [1,-1]){
     // vorderer Teil fest am Flügel, hinterer Teil hängt an der Klappe und kippt mit
     const f=new THREE.Mesh(ftF,surfMat(wm));f.scale.set(1,1,c*0.36);f.position.set(sg*x,yb,zLE(x)+c*0.44);f.castShadow=true;body.add(f);
     const m=new THREE.Mesh(ftR,surfMat(wm));m.scale.set(1,1,c*0.5);m.position.set(sg*x,yb,zLE(x)+c*0.8);m.castShadow=true;body.add(m);
     const seg=(parts.flaps||[]).find(f=>s>=f.s0&&s<=f.s1),fl=seg&&(sg>0?seg.R:seg.L);if(fl){body.updateMatrixWorld(true);fl.attach(m);}}}}
  const tipx=W.x0+W.span,tipy=yW(tipx),tipz=zLE(tipx);
  // echte Flügelspitze (bei der schrägen 747-8-Spitze gut 3 m weiter aussen und 5 m weiter hinten)
  const rk=C.winglet==='raked',lx=tipx+(rk?3.35:0),ly=tipy+(rk?0.36:0),lz=tipz+(rk?4.4:0);
  const wlm=solidMat(FS[1],0.35);
  {const tc=W.tip,tt=W.tt,WT={// nach Vorbildern: A320 Sharklet 2,4 m, A320ceo Wingtip-Fence, A330/A340 Winglet 2,7 m (~27° nach aussen),
      // A350 stark gebogene Flügelspitze, 747-400 Winglet 1,8 m (29° nach aussen, 60° Pfeilung), A380 Wingtip-Fence
      sharklet:[{h:2.43,cant:9,rb:1.0,sw:38,c0:tc,c1:tc*0.3,t0:tt,t1:0.085,tp:1.3}],
      fence:[{h:C.deck2?1.35:0.86,cant:0,rb:0.08,sw:58,c0:tc*0.95,c1:tc*0.18,t0:0.09,t1:0.07,tp:0.8},{h:C.deck2?0.85:0.55,cant:0,rb:0.08,sw:58,c0:tc*0.8,c1:tc*0.15,t0:0.09,t1:0.07,dn:1,tp:0.8}],
      tall:[{h:2.74,cant:24,rb:0.45,sw:46,c0:tc,c1:tc*0.28,t0:tt,t1:0.085,tp:1.2}],
      curved:[{h:3.6,cant:12,rb:2.6,sw:52,c0:tc,c1:tc*0.16,t0:tt,t1:0.08,tp:1.6}],
      canted:[{h:1.83,cant:29,rb:0.35,sw:58,c0:tc*0.92,c1:tc*0.3,t0:tt,t1:0.085,tp:1.1}],
      // A330neo: Sharklet 3,7 m, weich aus dem Flügel gebogen; 747-8: schräge Flügelspitze (flach, stark gepfeilt);
      // A380 neueste Ausführung: geteiltes Winglet (oben gross, unten klein)
      neo330:[{h:3.7,cant:12,rb:1.7,sw:40,c0:tc,c1:tc*0.27,t0:tt,t1:0.085,tp:1.3}],
      raked:[{h:0.36,cant:84,rb:0.4,sw:58,c0:tc,c1:tc*0.22,t0:tt,t1:0.075,tp:0.9}],
      split:[{h:3.6,cant:16,rb:1.1,sw:46,c0:tc*0.95,c1:tc*0.26,t0:tt,t1:0.08,tp:1.2},{h:1.4,cant:28,rb:0.5,sw:52,c0:tc*0.62,c1:tc*0.22,t0:0.09,t1:0.075,dn:1,tp:1}]}[C.winglet]||[];
    for(const o of WT){const g=wingletGeo({x:tipx,y:tipy,z:tipz},o),gl=mirror(g);
      for(const gg of [g,gl]){const m=new THREE.Mesh(gg,wlm);m.castShadow=true;body.add(m);}}}
  // Leitwerk wie beim Vorbild: Seitenleitwerk endet oben etwa über dem Heckkonus, Höhenleitwerk vor dem Rumpfende
  const tm=solidMat(FS[1],0.28);const F={...C.fin},S0=C.stab;{const ov=(F.z+F.sweep+F.tip*1.0)-(L/2+0.004*L);if(ov>0)F.z-=ov;}
  const ST={...S0};{const ov=(ST.z+ST.sweep+ST.tip)-(L/2-0.012*L);if(ov>0)ST.z-=ov;}
  const finG=loft([{x:0,y:0,z:F.z,c:F.root,t:0.1,cf:0.7},{x:F.h,y:0,z:F.z+F.sweep,c:F.tip,t:0.09,cf:0.7}]);finG.rotateZ(Math.PI/2);finG.translate(0,F.y,0);
  finUV(finG);const fin=new THREE.Mesh(finG,finMats(FS));fin.castShadow=true;body.add(fin);
  parts.rud=surface(new THREE.Vector3(0,F.y,F.z+F.root*0.7),new THREE.Vector3(0,F.y+F.h,F.z+F.sweep+F.tip*0.7),F.root*0.3,F.tip*0.3,F.root*0.03,tm,body);
  const S=ST;wing({x0:S.x0,span:S.span,root:S.root,tip:S.tip,sweep:S.sweep,dih:S.dih*Math.PI/180,y0:S.y,z0:S.z,tr:0.1,tt:0.1,split:0.68,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
  const apu=new THREE.Mesh(new THREE.CylinderGeometry(R*0.08,R*0.1,0.6,12),M.dark);apu.rotation.x=Math.PI/2;apu.position.set(0,R*0.6*C.up,L/2+0.1);body.add(apu);
  for(const E of C.eng)for(const sg of [1,-1]){const x=sg*E.x,yw=yW(E.x),zl=zLE(E.x);const cy=Math.max(yw-E.r*(E.k||1.15)-0.35,-P.gearH+E.r*1.06+(E.r>1.4?0.62:0.5)),z1=zl-E.len*(E.fwd||0.55),zc=z1+E.len/2;// Gondel mindestens ~0,5 m über dem Boden
    const NP=E.cfm?[{t:0,r:E.r*0.9},{t:0.04,r:E.r*0.98},{t:0.3,r:E.r*1.02},{t:0.66,r:E.r*0.98},{t:0.9,r:E.r*0.8},{t:1,r:E.r*0.66}]:E.neo?[{t:0,r:E.r*0.92},{t:0.04,r:E.r*0.99},{t:0.3,r:E.r*1.04},{t:0.62,r:E.r*0.98},{t:0.86,r:E.r*0.8},{t:1,r:E.r*0.62}]:[{t:0,r:E.r*0.93},{t:0.05,r:E.r},{t:0.4,r:E.r*1.03},{t:0.82,r:E.r*0.84},{t:1,r:E.r*0.56}];
    const nac=new THREE.Mesh(fuselageGeo(E.len,NP,48),nacMat(FS[2]));nac.position.set(x,cy,zc);nac.castShadow=true;body.add(nac);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(E.r*0.93,E.r*0.07,12,40),M.metal);lip.position.set(x,cy,z1);body.add(lip);
    // Einlauf mit Tiefe, Fan, Spinner mit Spirale
    const inl=new THREE.Mesh(new THREE.CylinderGeometry(E.r*0.92,E.r*0.9,E.r*0.42,40,1,true).rotateX(Math.PI/2),M.inlet);inl.position.set(x,cy,z1+E.r*0.2);body.add(inl);
    const fan=new THREE.Mesh(new THREE.CircleGeometry(E.r*0.9,40),M.fan);fan.position.set(x,cy,z1+E.r*0.4);fan.rotation.y=Math.PI;body.add(fan);parts.fans.push(fan);
    const spn=new THREE.Mesh(new THREE.ConeGeometry(E.r*0.3,E.r*0.62,28).rotateX(-Math.PI/2),M.spin);spn.position.set(x,cy,z1+E.r*0.12);body.add(spn);parts.fans.push(spn);
    // Schubdüse: Ring, Kernstrom-Düse, Abgaskegel
    const noz=new THREE.Mesh(new THREE.CylinderGeometry(E.r*0.57,E.r*0.6,E.len*0.05,36,1,true).rotateX(Math.PI/2),M.metal);noz.position.set(x,cy,z1+E.len*1.0);body.add(noz);
    // GEnx-2B (747-8): Zacken (Chevrons) an der Fan-Düse und an der Kerndüse
    if(E.chev){const fc=new THREE.Mesh(chevronGeo(E.r*0.62*0.995,E.r*0.585,E.len*0.045,14),chevMat());fc.position.set(x,cy,z1+E.len*0.998);body.add(fc);
      const cc=new THREE.Mesh(chevronGeo(E.r*0.47,E.r*0.445,E.len*0.035,12),M.hot);cc.position.set(x,cy,z1+E.len*1.195);body.add(cc);}
    const core=new THREE.Mesh(new THREE.CylinderGeometry(E.r*0.42,E.r*0.52,E.len*0.2,32,1,true).rotateX(-Math.PI/2),M.hot);core.position.set(x,cy,z1+E.len*1.1);if(!E.cfm)body.add(core);
    const ex=new THREE.Mesh(new THREE.ConeGeometry(E.r*(E.cfm?0.36:0.3),E.len*(E.cfm?0.16:0.24),24),M.hot);ex.rotation.x=Math.PI/2;ex.position.set(x,cy,z1+E.len*(E.cfm?1.07:1.3));body.add(ex);
    // Pylon: schmale Finne, vorne flach auf der Gondel, steigt zum Flügel an, hinten Heckverkleidung unter dem Flügel
    const yb0=cy+E.r*0.82,Hp=Math.max(0.6,yw+0.3-yb0),Lp=E.len*1.02,wd=Math.max(0.16,E.r*0.2);
    const sh=new THREE.Shape(),pp=[[-0.5,0],[-0.49,0.18],[-0.42,0.4],[-0.2,0.78],[0,0.96],[0.15,1],[0.42,1],[0.5,0.72],[0.53,0.42],[0.45,0.2],[0.3,0.04],[0.1,0]];
    pp.forEach(([zz,yy],k)=>{const X=-(zz*Lp),Y=yy*Hp;if(k)sh.lineTo(X,Y);else sh.moveTo(X,Y);});sh.closePath();
    const pyG=new THREE.ExtrudeGeometry(sh,{depth:wd,bevelEnabled:true,bevelThickness:wd*0.35,bevelSize:wd*0.35,bevelSegments:2,curveSegments:4});pyG.translate(0,0,-wd/2);pyG.rotateY(Math.PI/2);pyG.computeVertexNormals();
    const py=new THREE.Mesh(pyG,surfMat(wm));py.position.set(x,yb0,zc+E.len*0.12);py.castShadow=true;body.add(py);}
  const gearTop=-R*sy*0.72;
  for(const Mg of C.main){const wr=R*0.24,len=P.gearH+gearTop-wr;
    for(const sg of (Mg.center?[0]:[1,-1])){const g=new THREE.Group();g.position.set(sg*Mg.x,gearTop,Mg.z);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-len,0),wr*0.32);
      const zs=Mg.ax===3?[-wr*2.4,0,wr*2.4]:Mg.ax===2?[-wr*1.25,wr*1.25]:[0];
      if(Mg.ax>1){const bg=new THREE.Mesh(new THREE.BoxGeometry(wr*0.4,wr*0.4,wr*2.2*Mg.ax+0.3),M.metal);bg.position.y=-len;g.add(bg);}
      for(const zz of zs)for(const xx of [-wr*0.75,wr*0.75])parts.wheels.push(wheel(wr,wr*0.62,g,xx,-len,zz));
      if(sg){const dr=new THREE.Mesh(new THREE.BoxGeometry(0.06,len*0.62,wr*2.6),M.white);dr.position.set(sg*wr*1.45,-len*0.36,0);g.add(dr);}
      parts.gear.push({g,axis:sg===0?'x':'z',dir:sg||1});}}
  {const wr=R*0.17,len=P.gearH+gearTop+0.2-wr;const g=new THREE.Group();g.position.set(0,gearTop-0.2,C.ng);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-len,0),wr*0.35);
    parts.wheels.push(wheel(wr,wr*0.6,g,wr*0.65,-len,0),wheel(wr,wr*0.6,g,-wr*0.65,-len,0));parts.gear.push({g,axis:'x',dir:1});
    for(const sd of [1,-1]){const dr=new THREE.Mesh(new THREE.BoxGeometry(0.04,len*0.38,wr*2.2),M.grey);dr.position.set(sd*wr*1.35,-len*0.2,-wr*0.4);g.add(dr);}
    const lt=new THREE.Mesh(new THREE.CylinderGeometry(wr*0.22,wr*0.18,wr*0.3,10).rotateX(Math.PI/2),M.metal);lt.position.set(0,-len*0.55,-wr*0.5);g.add(lt);}
  {const ws=[];for(const s of [0.84,0.92,0.99]){const x=W.x0+s*W.span;for(const sg of [1,-1])ws.push([sg*x,yW(x),zLE(x)+cW(x)]);}
   const sx=ST,sy2=sx.y+sx.span*Math.tan(sx.dih*Math.PI/180);for(const sg of [1,-1])ws.push([sg*(sx.x0+sx.span*0.97),sy2,sx.z+sx.sweep+sx.tip]);wicks(body,ws);}
  for(const z of [-L*0.2,L*0.1]){const a=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.4),M.dark);a.position.set(0,R*sy+0.2,z);body.add(a);}
  {const tP=C.nose*0.3,zP=tP*L-L/2,rP=lerpProf(PRF,tP,'r'),yP=yOff(PRF,tP);for(const sg of [1,-1]){const pt=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.04,0.45,6),M.metal);pt.rotation.z=sg*Math.PI/2;pt.rotation.y=0.3*sg;pt.position.set(sg*(rP+0.15),yP-0.1*R,zP);body.add(pt);}
   for(const z of [-L*0.15,L*0.05,L*0.25]){const a=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.35,0.5),M.dark);a.position.set(0,-R*sy-0.12,z);body.add(a);}
   }
  // Augenpunkt: auf Höhe der Frontscheibe (gut 40 % der Scheibenhöhe), etwa 0,9 m hinter der Scheiben-Unterkante
  {const lay=paneLayout(C,PRF,L,R,H),yb=lay.F[0][0][1],yt=lay.F[0][1][1],uB=uAtWidth(PRF,L,lay.F[0][3][0],lay.F[0][3][1],0.003,0.3);
   parts.eye=new THREE.Vector3(C.eye[0],yb+0.42*(yt-yb),Math.max(C.eye[2],uB-L/2+0.9));}
  parts.lights=navLights(body,[{p:[-lx,ly,lz+1.3],c:[1,0.05,0.05],s:1.4},{p:[lx,ly,lz+1.3],c:[0.05,1,0.2],s:1.4},{p:[0,R*0.6*C.up,L/2+0.3],c:[1,1,1],s:1.1},
    {p:[0,R*sy+0.1,L*0.05],c:[1,0.1,0.05],beacon:1,s:1.3},{p:[0,-R*sy-0.1,0],c:[1,0.1,0.05],beacon:1,s:1.3},{p:[-lx,ly,lz+1.7],c:[0,0,0],strobe:1,s:2.2},{p:[lx,ly,lz+1.7],c:[0,0,0],strobe:1,s:2.2},{p:[0,R*0.6*C.up,L/2+0.4],c:[0,0,0],strobe:1,s:1.8}]);
  // Landescheinwerfer in der Mitte: im Bug über dem Bugfahrwerk (leuchtet nach vorne unten, nicht auf den eigenen Rumpf)
  parts.landing=new THREE.Vector3(0,gearTop+0.35,C.ng-1.2);
  root.userData.cgShift=C.cg;body.position.z=C.cg;
}
export function buildModel(id,opts={}){
  mats();const P=PLANES[id];const root=new THREE.Group(),body=new THREE.Group();root.add(body);LV=livSpec(id,opts.livery);let PT=null;
  const parts={props:[],fans:[],gear:[],wheels:[]};
  if(id==='alpina'){
    const L=8.3;const fus=new THREE.Mesh(fuselageGeo(L,[{t:0,r:0.38,y:-0.05},{t:0.03,r:0.5,y:-0.03},{t:0.12,r:0.58},{t:0.24,r:0.63,y:0.04,sy:1.1},{t:0.32,r:0.66,y:0.12,sy:1.28,sx:0.96},
      {t:0.47,r:0.64,y:0.14,sy:1.25,sx:0.95},{t:0.6,r:0.5,y:0.16,sy:1.12},{t:0.78,r:0.32,y:0.22,sy:1.05},{t:0.93,r:0.18,y:0.28},{t:1,r:0.1,y:0.3}],36),
      paintMat({map:(PT=paint({R:0.62,a0:0.22,st:{a:0.27,t1:0.16,t2:0.07,da:0.04,x0:0.06,x1:0.95},tip:0.6,wb:0.22,reg:{str:'HB-KLS',a:0.2,x:0.72,size:0.42},belly:{col:'#e3e4e6',w:0.08},swT:0.3},LV),livery(L,0.62,PT.cfg)),roughness:0.32,metalness:0.08}));
    fus.castShadow=true;body.add(fus);
    // Kabinenverglasung
    const gl=new THREE.Mesh(fuselageGeo(2.4,[{t:0,r:0.2,y:0},{t:0.15,r:0.52},{t:0.5,r:0.6},{t:0.85,r:0.52},{t:1,r:0.25}],24),M.glass);
    gl.scale.set(1.08,0.62,1);gl.position.set(0,0.58,-1.55);body.add(gl);
    {const fm=new THREE.MeshStandardMaterial({color:0xf4f4f2,roughness:0.35});for(const z of [-2.35,-1.45,-0.6])for(const sd of [1,-1]){const b=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.42,0.06),fm);b.position.set(sd*0.6,0.66,z);b.rotation.z=-sd*0.18;body.add(b);}
     const top=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.05,2.3),fm);top.position.set(0,0.94,-1.5);body.add(top);}
    const cowl=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.5,0.25,24),M.white);cowl.rotation.x=Math.PI/2;cowl.position.z=-4.1;body.add(cowl);
    const wm=wingMat(0xf4f4f2,{smooth:1}),sm=wm;
    wing({x0:0,span:5.5,root:1.62,tip:1.15,sweep:0.15,dih:1.7*Math.PI/180,y0:1.02,z0:-1.95,tr:0.15,tt:0.13,surfaces:[[0.08,0.6,'flap'],[0.6,0.97,'ail'],[0.97,1,null]]},wm,sm,body,parts);
    // Flügelstreben
    for(const s of [1,-1])strut(body,new THREE.Vector3(s*0.55,-0.42,-1.3),new THREE.Vector3(s*2.6,1.0,-1.55),0.035,M.white);
    // Leitwerk
    wing({x0:0,span:1.7,root:0.95,tip:0.62,sweep:0.25,dih:0,y0:0.33,z0:3.15,tr:0.1,tt:0.1,split:0.6,surfaces:[[0,1,'elev']]},wm,sm,body,parts);
    const finG=loft([{x:0,y:0,z:2.45,c:1.45,t:0.1,cf:0.65},{x:1.5,y:0,z:3.25,c:0.72,t:0.1,cf:0.65}]);finG.rotateZ(Math.PI/2);finG.translate(0,0.35,0);
    finUV(finG);const fin=new THREE.Mesh(finG,finMats(PT.fin));fin.castShadow=true;body.add(fin);
    parts.rud=surface(new THREE.Vector3(0,0.35,2.45+1.45*0.65),new THREE.Vector3(0,1.85,3.25+0.72*0.65),1.45*0.35,0.72*0.35,0.07,solidMat(PT.fin[1],0.35),body);
    // Fahrwerk (fest)
    const gr=new THREE.Group();body.add(gr);
    for(const s of [1,-1]){strut(gr,new THREE.Vector3(s*0.5,-0.45,-0.75),new THREE.Vector3(s*1.22,-1.05,-0.8),0.04,M.white);parts.wheels.push(wheel(0.28,0.16,gr,s*1.25,-1.04,-0.8));
      const sp=new THREE.Mesh(new THREE.SphereGeometry(0.32,14,10).scale(0.55,0.7,1.6),M.white);sp.position.set(s*1.25,-1.0,-0.78);gr.add(sp);}
    strut(gr,new THREE.Vector3(0,-0.35,-3.3),new THREE.Vector3(0,-1.1,-3.35),0.045);parts.wheels.push(wheel(0.25,0.13,gr,0,-1.07,-3.35));
    parts.gear.push({g:gr,fixed:true});
    parts.props.push(prop(body,0,-0.02,-4.32,0.95,2));
    parts.eye=new THREE.Vector3(-0.3,0.72,-1.25);
    parts.lights=navLights(body,[{p:[-5.52,1.12,-1.4],c:[1,0.05,0.05]},{p:[5.52,1.12,-1.4],c:[0.05,1,0.2]},{p:[0,0.4,4.15],c:[1,1,1]},{p:[0,1.92,3.3],c:[1,0.1,0.05],beacon:1,s:0.5},{p:[-5.55,1.12,-1.2],c:[0,0,0],strobe:1,s:1.1},{p:[5.55,1.12,-1.2],c:[0,0,0],strobe:1,s:1.1}]);
    parts.landing=new THREE.Vector3(0,0.2,-2.6);
    root.userData.cgShift=1.15;body.position.z=1.15;
  }
  if(id==='foehn'){
    const L=22.7,R=1.35;
    const PRf=[{t:0,r:0.1,y:-0.35},{t:0.012,r:0.5,y:-0.32},{t:0.035,r:0.85,y:-0.24},{t:0.06,r:1.1,y:-0.15},{t:0.1,r:1.3,y:-0.05},{t:0.16,r:1.35},{t:0.68,r:1.35},{t:0.8,r:1.05,y:0.4},{t:0.93,r:0.6,y:0.85},{t:1,r:0.3,y:1.0}];
    const fus=new THREE.Mesh(fuselageGeo(L,PRf,40),
      paintMat({map:(PT=paint({R,a0:0.22,st:{a:0.3,t1:0.35,t2:0.12,da:0.035,x0:0.05,x1:1},tip:1.0,wb:0.75,nm:{a:0.135,x:0.45,size:1.0,max:0.42},reg:{str:'HB-AFT',a:0.2,x:0.86,size:0.35},belly:{col:'#c9ccd1',w:0.1,x0:0.04},doors:[0.16,0.74],seam:0.03,swT:0.4},LV),livery(L,R,PT.cfg)),roughness:0.3,metalness:0.1}));
    fus.castShadow=true;body.add(fus);parts.body=body;
    body.add(windshield(L,PRf,R,{ta:0.015,tb:0.13,t0:0.03,yl:0.12*R,yh:0.62*R,posts:[0,28,54],maxPd:82,back:pd=>0.108-0.035*Math.max(0,(pd-54)/28),fr:0.05},'wsFoehn'));
    cabinGlass(L,PRf,{x0:0.2,x1:0.72,pitch:0.78,ww:0.36,wh:0.48,a:0.22},'cwFoehn',parts);
    const wm=wingMat(0xeef0f1);
    wing({x0:0.5,span:11.8,root:2.75,tip:1.45,sweep:0.55,dih:2*Math.PI/180,y0:1.45,z0:-1.6,tr:0.17,tt:0.13,surfaces:[[0.02,0.62,'flap'],[0.62,0.95,'ail'],[0.95,1,null]]},wm,wm,body,parts);
    const wb=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.5,3.0),M.white);wb.position.set(0,1.32,-0.4);body.add(wb);
    // T-Leitwerk
    const tm=solidMat(PT.fin[1],0.35);
    const finG=loft([{x:0,y:0,z:7.2,c:3.7,t:0.12,cf:0.68},{x:4.1,y:0,z:9.3,c:2.2,t:0.12,cf:0.68}]);finG.rotateZ(Math.PI/2);finG.translate(0,1.1,0);
    finUV(finG);const fin=new THREE.Mesh(finG,finMats(PT.fin));fin.castShadow=true;body.add(fin);
    parts.rud=surface(new THREE.Vector3(0,1.1,7.2+3.7*0.68),new THREE.Vector3(0,5.2,9.3+2.2*0.68),3.7*0.32,2.2*0.32,0.18,tm,body);
    wing({x0:0,span:3.9,root:1.9,tip:1.1,sweep:0.6,dih:0,y0:5.25,z0:9.45,tr:0.11,tt:0.1,split:0.62,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
    // Triebwerke
    for(const s of [1,-1]){const x=s*4.1;
      const nac=new THREE.Mesh(fuselageGeo(6.2,[{t:0,r:0.35},{t:0.08,r:0.62},{t:0.35,r:0.68,y:-0.05,sy:1.15},{t:0.75,r:0.55,sy:1.2},{t:1,r:0.18}],20),M.white);
      nac.position.set(x,0.95,-1.55);nac.castShadow=true;body.add(nac);
      parts.props.push(prop(body,x,0.95,-4.75,1.95,6));}
    // Fahrwerk
    for(const s of [1,-1]){const sp=new THREE.Mesh(new THREE.SphereGeometry(1,20,12).scale(0.55,0.62,2.6),M.white);sp.position.set(s*1.25,-0.95,0.8);body.add(sp);}
    for(const s of [1,-1]){const g=new THREE.Group();g.position.set(s*1.45,-1.0,0.9);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-0.75,0),0.09);
      parts.wheels.push(wheel(0.45,0.3,g,s*0.05,-0.72,-0.35),wheel(0.45,0.3,g,s*0.05,-0.72,0.35));parts.gear.push({g,axis:'x',dir:-1});}
    {const g=new THREE.Group();g.position.set(0,-1.15,-8.6);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-0.6,0),0.07);
      parts.wheels.push(wheel(0.33,0.2,g,0.16,-0.67,0),wheel(0.33,0.2,g,-0.16,-0.67,0));parts.gear.push({g,axis:'x',dir:1});}
    parts.eye=new THREE.Vector3(-0.55,0.35,-9.35);
    parts.lights=navLights(body,[{p:[-12.3,1.95,-0.9],c:[1,0.05,0.05],s:0.9},{p:[12.3,1.95,-0.9],c:[0.05,1,0.2],s:0.9},{p:[0,1.0,11.3],c:[1,1,1],s:0.8},{p:[0,5.6,9.6],c:[1,0.1,0.05],beacon:1,s:0.8},{p:[0,-1.4,0],c:[1,0.1,0.05],beacon:1,s:0.8},{p:[-12.35,1.95,-0.6],c:[0,0,0],strobe:1,s:1.6},{p:[12.35,1.95,-0.6],c:[0,0,0],strobe:1,s:1.6}]);
    parts.landing=new THREE.Vector3(0,0.2,-3.2);
    root.userData.cgShift=0.6;body.position.z=0.6;
  }
  if(id==='saentis'){
    const L=7.9;const fus=new THREE.Mesh(fuselageGeo(L,[{t:0,r:0.32,y:-0.02},{t:0.05,r:0.5},{t:0.15,r:0.6},{t:0.3,r:0.66,y:0.06,sy:1.15},{t:0.45,r:0.64,y:0.08,sy:1.15},{t:0.62,r:0.46,y:0.12},{t:0.82,r:0.26,y:0.18},{t:1,r:0.1,y:0.22}],36),
      paintMat({map:(PT=paint({R:0.62,a0:0.22,st:{a:0.3,t1:0.12,t2:0.05,da:0.03,x0:0.05,x1:0.97},tip:0.5,wb:0.2,reg:{str:'HB-LUS',a:0.21,x:0.74,size:0.36},swT:0.3},LV),livery(L,0.62,PT.cfg)),roughness:0.25,metalness:0.1}));
    fus.castShadow=true;body.add(fus);
    const gl=new THREE.Mesh(fuselageGeo(2.3,[{t:0,r:0.15},{t:0.2,r:0.5},{t:0.55,r:0.56},{t:0.9,r:0.4},{t:1,r:0.2}],32),M.glass);gl.scale.set(1.05,0.55,1);gl.position.set(0,0.55,-1.1);body.add(gl);
    {const fm=new THREE.MeshStandardMaterial({color:0xf6f6f4,roughness:0.3});const bow=new THREE.Mesh(new THREE.TorusGeometry(0.56,0.035,8,24,Math.PI),fm);bow.scale.set(1.05,0.55,1);bow.position.set(0,0.55,-1.45);body.add(bow);const b2=bow.clone();b2.position.z=-0.55;body.add(b2);}
    const wm=wingMat(0xf6f6f4);
    wing({x0:0.4,span:5.45,root:1.55,tip:0.75,sweep:0.35,dih:5*Math.PI/180,y0:-0.42,z0:-1.6,tr:0.15,tt:0.12,surfaces:[[0.05,0.55,'flap'],[0.55,0.95,'ail'],[0.95,1,null]]},wm,wm,body,parts);
    wing({x0:0,span:1.65,root:0.85,tip:0.5,sweep:0.25,dih:0,y0:0.22,z0:3.1,tr:0.1,tt:0.1,split:0.6,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
    const fm=solidMat(PT.fin[1],0.3);
    const finG=loft([{x:0,y:0,z:2.6,c:1.25,t:0.1,cf:0.65},{x:1.45,y:0,z:3.35,c:0.65,t:0.1,cf:0.65}]);finG.rotateZ(Math.PI/2);finG.translate(0,0.25,0);finUV(finG);const fin=new THREE.Mesh(finG,finMats(PT.fin));body.add(fin);
    parts.rud=surface(new THREE.Vector3(0,0.25,2.6+1.25*0.65),new THREE.Vector3(0,1.7,3.35+0.65*0.65),1.25*0.35,0.65*0.35,0.06,fm,body);
    const gr=new THREE.Group();body.add(gr);
    for(const s of [1,-1]){strut(gr,new THREE.Vector3(s*0.8,-0.5,-0.35),new THREE.Vector3(s*1.35,-0.98,-0.35),0.05,M.white);parts.wheels.push(wheel(0.27,0.16,gr,s*1.38,-0.98,-0.35));
      const sp=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,10).scale(0.55,0.7,1.7),M.white);sp.position.set(s*1.38,-0.94,-0.33);gr.add(sp);}
    strut(gr,new THREE.Vector3(0,-0.4,-3.0),new THREE.Vector3(0,-1.02,-3.05),0.045);parts.wheels.push(wheel(0.23,0.12,gr,0,-1.02,-3.05));
    parts.gear.push({g:gr,fixed:true});
    parts.props.push(prop(body,0,-0.02,-4.12,0.98,3));
    parts.eye=new THREE.Vector3(-0.3,0.62,-1.05);
    parts.lights=navLights(body,[{p:[-5.85,0.1,-1.0],c:[1,0.05,0.05]},{p:[5.85,0.1,-1.0],c:[0.05,1,0.2]},{p:[0,0.35,3.9],c:[1,1,1]},{p:[-5.88,0.1,-0.8],c:[0,0,0],strobe:1,s:1.1},{p:[5.88,0.1,-0.8],c:[0,0,0],strobe:1,s:1.1}]);
    parts.landing=new THREE.Vector3(0,-0.3,-2.4);root.userData.cgShift=1.1;body.position.z=1.1;
  }
  if(id==='titlis'){
    // PC-12-artig: schlanke Motorhaube, steil ansteigende Frontscheibe, runde Kabine, hochgezogenes Heck
    const L=14.4,st=(z,W,T,B)=>({t:z/L,r:W,y:(T+B)/2,sy:(T-B)/(2*W)});
    const PRt=[st(0,0.26,0.26,-0.26),st(0.35,0.42,0.38,-0.42),st(0.9,0.55,0.48,-0.6),st(1.8,0.62,0.55,-0.68),st(2.6,0.67,0.61,-0.74),st(3.1,0.73,0.72,-0.79),st(3.6,0.79,0.88,-0.83),
      st(4.1,0.82,0.95,-0.84),st(4.6,0.82,0.96,-0.84),st(8.9,0.82,0.96,-0.84),st(9.8,0.79,0.95,-0.75),st(10.7,0.71,0.92,-0.58),st(11.6,0.59,0.87,-0.36),st(12.5,0.46,0.82,-0.12),
      st(13.3,0.34,0.78,0.1),st(13.9,0.25,0.75,0.26),st(14.4,0.15,0.72,0.4)];
    const fus=new THREE.Mesh(fuselageGeo(L,PRt,48),
      paintMat({map:(PT=paint({R:0.8,a0:0.2,st:{a:0.3,t1:0.2,t2:0.075,da:0.033,x0:0.12,x1:0.95},tip:0.8,wb:0.62,nm:{a:0.14,x:0.5,size:0.5,max:0.36},reg:{str:'HB-FLU',a:0.2,x:0.78,size:0.28},belly:{col:'c1',w:0.07,x0:0.08},doors:[0.7],swT:0.3},LV),livery(L,0.8,PT.cfg)),roughness:0.25,metalness:0.1}));
    // Rumpf + Scheiben um 10 % kürzer (PC-12: 14,4 m über alles inkl. Spinner und Höhenleitwerk)
    const fg=new THREE.Group();fg.scale.z=0.9;body.add(fg);fus.castShadow=true;fg.add(fus);parts.body=body;
    // Frontscheibe (Mittelpfosten) + seitliches Cockpitfenster, getrennt durch schrägen Pfosten
    {const zs=y=>3.12+(y-0.33)*1.3,zb=y=>4.66-(y-0.3)*0.25,F=0.035,P=0.03;
      fg.add(windshield(L,PRt,0.82,{ta:2.66/L,tb:4.75/L,maxPd:78,yl:0.3,yh:0.95,fr:F,fn:(z,y,s)=>{
        const zf=y=>2.72+(0.65-y)*1.0,ws=y>0.3&&z>zf(y)&&z<zs(y),sw=y>0.3&&y<0.78&&z>=zs(y)&&z<zb(y);if(!ws&&!sw)return 0;
        if(ws&&y>0.3+F&&z>zf(y)+F&&z<zs(y)-P&&s>P)return 2;if(sw&&y>0.3+F&&y<0.78-F&&z>zs(y)+P&&z<zb(y)-F)return 2;return 1;}},'wsTitlis2'));}
    {const pp={body:fg};cabinGlass(L,PRt,{x0:0.37,x1:0.645,pitch:0.78,ww:0.36,wh:0.31,a:0.235,dph:0.27},'cwTitlis2',pp);if(pp.cabin)parts.cabin=pp.cabin;}
    const wm=wingMat(0xf2f3f4);
    wing({x0:0.6,span:7.5,root:2.2,tip:1.1,sweep:0.5,dih:4*Math.PI/180,y0:-0.62,z0:-1.4,tr:0.16,tt:0.12,surfaces:[[0.03,0.6,'flap'],[0.6,0.95,'ail'],[0.95,1,null]]},wm,wm,body,parts);
    for(const s of [1,-1]){const g=loft([{x:0,y:0,z:0,c:1.1,t:0.1},{x:0.8,y:0,z:0.5,c:0.5,t:0.1}]);g.rotateZ(Math.PI/2-s*0.3);const m=new THREE.Mesh(g,wm);m.position.set(s*8.1,-0.62+7.5*Math.tan(4*Math.PI/180),-0.9);body.add(m);}
    const fm=solidMat(PT.fin[1],0.3);
    const finG=loft([{x:0,y:0,z:3.88,c:2.4,t:0.11,cf:0.68},{x:2.1,y:0,z:5.45,c:1.5,t:0.1,cf:0.68}]);finG.rotateZ(Math.PI/2);finG.translate(0,0.7,0);finUV(finG);body.add(new THREE.Mesh(finG,finMats(PT.fin)));
    parts.rud=surface(new THREE.Vector3(0,0.7,3.88+2.4*0.68),new THREE.Vector3(0,2.8,5.45+1.5*0.68),2.4*0.32,1.5*0.32,0.1,fm,body);
    wing({x0:0,span:2.6,root:1.5,tip:0.9,sweep:0.55,dih:0,y0:2.85,z0:5.6,tr:0.1,tt:0.1,split:0.62,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
    for(const s of [1,-1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.42,12),M.grey);e.scale.set(1,1,0.75);e.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(s*0.62,0.05,0.78).normalize());e.position.set(s*0.6,-0.02,-4.95);body.add(e);
      const o=new THREE.Mesh(new THREE.CircleGeometry(0.075,12),M.dark);o.position.set(0,0.212,0);o.rotation.x=-Math.PI/2;e.add(o);}
    for(const s of [1,-1]){const g=new THREE.Group();g.position.set(s*1.55,-0.7,-0.2);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(s*0.15,-0.7,0),0.07);
      parts.wheels.push(wheel(0.3,0.18,g,s*0.15,-0.7,0));parts.gear.push({g,axis:'z',dir:s});}
    {const g=new THREE.Group();g.position.set(0,-0.65,-4.8);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-0.75,0),0.06);parts.wheels.push(wheel(0.25,0.15,g,0,-0.75,0));parts.gear.push({g,axis:'x',dir:1});}
    parts.props.push(prop(body,0,0,-6.72,1.3,5));// PC-12 NGX: Fünfblatt-Verbundpropeller
    parts.eye=new THREE.Vector3(-0.38,0.45,-3.33);
    parts.lights=navLights(body,[{p:[-8.15,-0.1,-0.8],c:[1,0.05,0.05],s:0.8},{p:[8.15,-0.1,-0.8],c:[0.05,1,0.2],s:0.8},{p:[0,2.95,6.55],c:[1,1,1],s:0.7},{p:[0,1.0,2.25],c:[1,0.1,0.05],beacon:1,s:0.7},{p:[-8.2,-0.1,-0.6],c:[0,0,0],strobe:1,s:1.3},{p:[8.2,-0.1,-0.6],c:[0,0,0],strobe:1,s:1.3}]);
    parts.landing=new THREE.Vector3(0,-0.4,-2.8);root.userData.cgShift=1.3;body.position.z=1.3;
  }
  if(id==='feuer'){
    const L=19.8,R=1.4;
    const PRx=[{t:0,r:0.16,y:-0.25},{t:0.015,r:0.5,y:-0.25,sy:1.05},{t:0.05,r:0.92,y:-0.18,sy:1.12},{t:0.1,r:1.2,y:-0.06,sy:1.2},{t:0.17,r:1.38,y:0,sy:1.25},{t:0.56,r:1.4,y:0,sy:1.25},
      {t:0.64,r:1.25,y:0.25,sy:1.18},{t:0.8,r:0.92,y:0.7,sy:1.1},{t:0.94,r:0.5,y:1.05},{t:1,r:0.28,y:1.15}];
    const fus=new THREE.Mesh(fuselageGeo(L,PRx,44),paintMat({map:(PT=paint({R,a0:0.2,st:{a:0.3,t1:0.32,t2:0.1,da:0.036,x0:0.1,x1:0.97},tip:1,wb:0.75,nm:{a:0.15,x:0.42,size:0.9,max:0.46},reg:{str:'HB-LFW',a:0.2,x:0.86,size:0.36},belly:{col:'#d5d9de',w:0.1},doors:[0.24],seam:0.04,swT:0.42},LV),livery(L,R,PT.cfg)),roughness:0.32,metalness:0.08}));
    fus.castShadow=true;body.add(fus);parts.body=body;
    body.add(windshield(L,PRx,R,{ta:0.03,tb:0.16,t0:0.035,yl:0.32,yh:1.12,posts:[0,27,52],maxPd:78,back:pd=>0.142-0.035*Math.max(0,(pd-52)/26),fr:0.045},'wsFeuer'));
    cabinGlass(L,PRx,{x0:0.3,x1:0.52,pitch:1.1,ww:0.42,wh:0.46,a:0.21},'cwFeuer',parts);
    const keel=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.3,L*0.5),M.dark);keel.position.set(0,-R*1.25+0.05,-1.5);body.add(keel);
    for(const sd of [1,-1]){const ch=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,L*0.42),new THREE.MeshStandardMaterial({color:0xcfd4da,roughness:0.4}));ch.position.set(sd*1.12,-1.05,-2.3);body.add(ch);}
    const wm=wingMat(0xeef0f1);
    const pyl=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.5,3.8),surfMat(wm));pyl.position.set(0,1.85,-0.1);body.add(pyl);
    wing({x0:0.6,span:13.7,root:3.75,tip:2.55,sweep:0.15,dih:0.6*Math.PI/180,y0:2.05,z0:-1.9,tr:0.16,tt:0.13,surfaces:[[0.04,0.58,'flap'],[0.58,0.95,'ail'],[0.95,1,null]]},wm,wm,body,parts);
    for(const sd of [1,-1]){const x=sd*4.7;
      const nac=new THREE.Mesh(fuselageGeo(5.6,[{t:0,r:0.35},{t:0.09,r:0.62},{t:0.35,r:0.68,sy:1.15},{t:0.75,r:0.5,sy:1.1},{t:1,r:0.16}],20),new THREE.MeshStandardMaterial({color:new THREE.Color(PT.fin[1]),roughness:0.35}));
      nac.position.set(x,1.75,-1.5);nac.castShadow=true;body.add(nac);parts.props.push(prop(body,x,1.75,-4.4,1.95,4));
      // Stützschwimmer
      const fl=new THREE.Mesh(fuselageGeo(3.4,[{t:0,r:0.12},{t:0.15,r:0.34},{t:0.5,r:0.38,sy:0.9},{t:0.85,r:0.25},{t:1,r:0.08}],18),new THREE.MeshStandardMaterial({color:new THREE.Color(PT.fin[2]),roughness:0.4}));
      fl.position.set(sd*11.6,0.2,-0.9);body.add(fl);strut(body,new THREE.Vector3(sd*11.6,0.45,-1.4),new THREE.Vector3(sd*11.6,2.12,-1.2),0.06,surfMat(wm));strut(body,new THREE.Vector3(sd*11.6,0.45,-0.3),new THREE.Vector3(sd*11.6,2.12,-0.5),0.05,surfMat(wm));}
    const finG=loft([{x:0,y:0,z:5.9,c:3.6,t:0.12,cf:0.66},{x:4.4,y:0,z:7.5,c:2.3,t:0.11,cf:0.66}]);finG.rotateZ(Math.PI/2);finG.translate(0,1.25,0);finUV(finG);
    body.add(new THREE.Mesh(finG,finMats(PT.fin)));parts.rud=surface(new THREE.Vector3(0,1.25,5.9+3.6*0.66),new THREE.Vector3(0,5.65,7.5+2.3*0.66),3.6*0.34,2.3*0.34,0.15,solidMat(PT.fin[1],0.3),body);
    wing({x0:0.1,span:4.4,root:2.1,tip:1.3,sweep:0.5,dih:0,y0:3.4,z0:7.4,tr:0.1,tt:0.1,split:0.62,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
    for(const sd of [1,-1]){const g=new THREE.Group();g.position.set(sd*1.5,-0.95,0.9);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(sd*0.25,-1.05,0),0.09);
      parts.wheels.push(wheel(0.5,0.32,g,sd*0.3,-1.05,0));parts.gear.push({g,axis:'z',dir:sd});}
    {const g=new THREE.Group();g.position.set(0,-1.2,-7.4);body.add(g);strut(g,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-0.9,0),0.07);parts.wheels.push(wheel(0.34,0.2,g,0.15,-0.95,0),wheel(0.34,0.2,g,-0.15,-0.95,0));parts.gear.push({g,axis:'x',dir:1});}
    parts.eye=new THREE.Vector3(-0.5,0.85,-7.55);
    parts.lights=navLights(body,[{p:[-14.3,2.15,-0.6],c:[1,0.05,0.05],s:0.9},{p:[14.3,2.15,-0.6],c:[0.05,1,0.2],s:0.9},{p:[0,5.8,8.9],c:[1,1,1],s:0.8},{p:[0,2.4,0.5],c:[1,0.1,0.05],beacon:1,s:0.8},{p:[0,-1.75,0],c:[1,0.1,0.05],beacon:1,s:0.8},{p:[-14.35,2.15,-0.4],c:[0,0,0],strobe:1,s:1.5},{p:[14.35,2.15,-0.4],c:[0,0,0],strobe:1,s:1.5}]);
    parts.landing=new THREE.Vector3(0,0.3,-3.2);root.userData.cgShift=0.4;body.position.z=0.4;
  }
  if(id==='segler'){
    const L=7.3,PRs=[{t:0,r:0.1,y:-0.04},{t:0.04,r:0.28,y:-0.03},{t:0.13,r:0.38,y:0},{t:0.26,r:0.4,y:0.03,sy:1.15},{t:0.38,r:0.34,y:0.07,sy:1.08},{t:0.52,r:0.19,y:0.13},{t:0.85,r:0.11,y:0.2},{t:1,r:0.07,y:0.22}];
    const fus=new THREE.Mesh(fuselageGeo(L,PRs,32),paintMat({map:(PT=paint({R:0.38,a0:0.2,st:{a:0.3,t1:0.06,t2:0.03,da:0.03,x0:0.1,x1:0.96},tip:0.3,wb:0.12,reg:{str:'HB-3418',a:0.24,x:0.66,size:0.24},swT:0.42},LV),livery(L,0.38,PT.cfg)),roughness:0.18,metalness:0.05}));
    fus.castShadow=true;body.add(fus);
    const gl=new THREE.Mesh(fuselageGeo(1.75,[{t:0,r:0.08},{t:0.18,r:0.3},{t:0.55,r:0.33},{t:0.9,r:0.24},{t:1,r:0.1}],24),M.glass);gl.scale.set(1,0.62,1);gl.position.set(0,0.28,-1.75);body.add(gl);
    const wm=wingMat(0xfafafa,{smooth:1});
    wing({x0:0.2,span:8.9,root:0.95,tip:0.36,sweep:0.12,dih:3*Math.PI/180,y0:0.24,z0:-0.55,tr:0.14,tt:0.12,surfaces:[[0.04,0.5,'flap'],[0.5,0.96,'ail'],[0.96,1,null]]},wm,wm,body,parts);
    for(const sd of [1,-1]){const g=loft([{x:0,y:0,z:0,c:0.36,t:0.1},{x:0.45,y:0,z:0.12,c:0.2,t:0.1}]);g.rotateZ(Math.PI/2-sd*0.25);const m=new THREE.Mesh(g,solidMat(PT.fin[1],0.3));m.position.set(sd*9.1,0.24+8.9*Math.tan(3*Math.PI/180),-0.43);body.add(m);}
    const finG=loft([{x:0,y:0,z:2.75,c:0.95,t:0.11,cf:0.66},{x:1.25,y:0,z:3.15,c:0.62,t:0.1,cf:0.66}]);finG.rotateZ(Math.PI/2);finG.translate(0,0.18,0);finUV(finG);body.add(new THREE.Mesh(finG,finMats(PT.fin)));
    parts.rud=surface(new THREE.Vector3(0,0.18,2.75+0.95*0.66),new THREE.Vector3(0,1.43,3.15+0.62*0.66),0.95*0.34,0.62*0.34,0.05,solidMat(PT.fin[1],0.3),body);
    wing({x0:0,span:1.45,root:0.58,tip:0.36,sweep:0.15,dih:0,y0:1.44,z0:3.2,tr:0.1,tt:0.1,split:0.62,surfaces:[[0,1,'elev']]},wm,wm,body,parts);
    const gr=new THREE.Group();body.add(gr);parts.wheels.push(wheel(0.2,0.1,gr,0,-0.42,-0.1));const sk=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.9),M.dark);sk.position.set(0,-0.36,-2.1);gr.add(sk);parts.gear.push({g:gr,fixed:true});
    parts.eye=new THREE.Vector3(0,0.42,-1.55);
    parts.lights=navLights(body,[{p:[-9.15,0.75,-0.3],c:[0,0,0],strobe:1,s:0.9},{p:[9.15,0.75,-0.3],c:[0,0,0],strobe:1,s:0.9}]);
    parts.landing=new THREE.Vector3(0,0,-2);root.userData.cgShift=0.2;body.position.z=0.2;
  }
  if(id==='rega'){
    // Rega Airbus H145 D3: runde, hohe Nase mit grossen Frontscheiben und Kinnfenstern, hohe Kabine, Schiebetüren,
    // Heck-Klapptüren unter dem hoch angesetzten Heckausleger, ummantelter Heckrotor (Fenestron) mit Finne darüber,
    // Höhenleitwerk mit Endscheiben, zwei Arriel-Turbinen unter flacher Haube, Kufen, lagerloser Fünfblatt-Rotor
    const L=10.4,Z=zn=>zn-4.5,st=(z,W,T,B)=>({t:z/L,r:W,y:(T+B)/2,sy:(T-B)/(2*W)});
    const PRh=[st(0,0.03,-0.16,-0.24),st(0.04,0.22,0.0,-0.44),st(0.12,0.4,0.16,-0.57),st(0.3,0.56,0.38,-0.68),st(0.62,0.73,0.66,-0.78),st(1.05,0.84,0.9,-0.83),st(1.6,0.88,1.06,-0.85),st(2.3,0.89,1.12,-0.86),
      st(4.65,0.89,1.12,-0.86),st(5.1,0.87,1.11,-0.74),st(5.55,0.78,1.07,-0.32),st(6.0,0.56,1.02,0.18),st(6.5,0.36,0.96,0.46),st(7.4,0.27,0.92,0.53),st(9.6,0.2,0.88,0.58),st(10.1,0.17,0.88,0.62),st(10.4,0.1,0.88,0.7)];
    const red=LV.c1||'#e30613',wh=LV.base||'#f8f8f7',fz=L/2-4.5;
    const tex=canvasTex(2048,512,(x,w,h)=>{const pa=w/L,pr=h/(2*Math.PI*0.86);x.fillStyle=red;x.fillRect(0,0,w,h);
      // weisser Bauch unter Nase und Kabine, läuft hinter der Kabine aus
      const bg=x.createLinearGradient(4.9*pa,0,5.5*pa,0);bg.addColorStop(0,wh);bg.addColorStop(1,red);x.fillStyle=bg;x.fillRect(0,h*0.37,5.5*pa,h*0.26);
      for(const sd of [1,-1]){const Y=a=>sd>0?h*a:h*(1-a);
        // weisses Feld auf den Heck-Klapptüren mit Kreuz und Schriftzug
        x.fillStyle=wh;x.beginPath();x.moveTo(4.55*pa,Y(0.12));x.lineTo(5.25*pa,Y(0.12));x.lineTo(5.6*pa,Y(0.3));x.lineTo(4.55*pa,Y(0.3));x.closePath();x.fill();
        x.save();x.translate(4.95*pa,Y(0.205));if(sd<0)x.rotate(Math.PI);x.scale(1,pr/pa);x.fillStyle=red;const c=0.3*pa,k=c*0.32;x.fillRect(c*0.1-k/2,-c/2,k,c);x.fillRect(c*0.1-c/2,-k/2,c,k);
        x.font=`800 ${0.17*pa}px Arial`;x.textAlign='right';x.textBaseline='middle';x.fillText('rega',-c*0.12,0);x.restore();
        // «Rega 1414» unter dem Seitenfenster, Kennzeichen am Heckausleger
        x.save();x.translate(3.3*pa,Y(0.335));if(sd<0)x.rotate(Math.PI);x.scale(1,pr/pa);x.fillStyle=wh;x.font=`800 ${0.15*pa}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('Rega 1414',0,0);x.restore();
        x.save();x.translate(8.1*pa,Y(0.21));if(sd<0)x.rotate(Math.PI);x.scale(1,pr/pa*2.6);x.fillStyle=wh;x.font=`800 ${0.19*pa}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('HB-ZRR',0,0);x.restore();
        // Türfugen: Cockpittür, Schiebetür mit Laufschiene, Klapptüren
        x.strokeStyle='rgba(0,0,0,0.32)';x.lineWidth=2;
        const dr=(z0,z1,a0,a1)=>{x.strokeRect(z0*pa,Math.min(Y(a0),Y(a1)),(z1-z0)*pa,Math.abs(Y(a1)-Y(a0)));};
        dr(1.42,2.46,0.07,0.36);dr(2.56,4.32,0.08,0.39);x.fillStyle='rgba(0,0,0,0.25)';x.fillRect(2.5*pa,Y(0.085)-2,2.4*pa,3);
        x.beginPath();x.moveTo(4.5*pa,Y(0.07));x.lineTo(5.6*pa,Y(0.3));x.stroke();}
      x.strokeStyle='rgba(0,0,0,0.08)';x.lineWidth=1;for(const zz of [1.38,4.45,6.2,7.9])x.strokeRect(zz*pa,0,1,h);});
    const fus=new THREE.Mesh(fuselageGeo(L,PRh,56),paintMat({map:tex,roughness:0.28,metalness:0.08}));fus.position.z=fz;fus.castShadow=true;body.add(fus);parts.body=body;
    const glassBody=new THREE.Group();glassBody.position.z=fz;body.add(glassBody);
    // Frontscheiben bis aufs Dach (Mittelsteg), darunter Kinnfenster; Seitenfenster in Cockpit-, Schiebe- und Hecktür
    {const F=0.04;glassBody.add(windshield(L,PRh,0.88,{ta:0.01/L,tb:1.9/L,maxPd:150,yl:-0.62,yh:1.1,fr:F,fn:(z,y,s,pd)=>{
        // Frontscheiben: unten waagrecht, A-Pfosten leicht nach hinten geneigt, oben bis zur Dachkante, breiter Mittelsteg
        const zA=1.34+(y+0.08)*0.3,yT=0.97-Math.max(0,z-1.15)*0.25;
        if(y>-0.08&&y<yT&&z<zA&&pd<118){if(y<-0.08+F||yT-y<F||zA-z<F||s<0.05)return 1;return 2;}
        if(y>-0.15&&y<=-0.08&&z<zA&&pd<128)return 1;
        // Kinnfenster unten links und rechts, dazwischen lackierter Bug
        const zc=1.05+(y+0.15)*0.35;if(y>-0.66&&y<=-0.15&&z<zc&&z>0.16&&s>0.2&&pd<150){if(y>-0.15-F||y<-0.66+F||zc-z<F||s<0.2+F||z<0.16+F)return 1;return 2;}
        return 0;}},'wsH145'));
     const pp={body:glassBody};
     cabinGlass(L,PRh,{x0:1.96/L,x1:1.96/L,pitch:1,ww:0.86,wh:0.84,y:0.44,pw:5,dph:0.62,fr:1.08},'cwH145a',pp);
     cabinGlass(L,PRh,{x0:3.3/L,x1:3.3/L,pitch:1,ww:1.12,wh:0.74,y:0.47,pw:5,dph:0.58,fr:1.08},'cwH145b',pp);
     cabinGlass(L,PRh,{x0:4.62/L,x1:4.62/L,pitch:1,ww:0.42,wh:0.52,y:0.5,pw:4,dph:0.5,fr:1.12},'cwH145c',pp);
     if(pp.cabin)parts.cabin=pp.cabin;}
    const whm=new THREE.MeshStandardMaterial({color:new THREE.Color(wh),roughness:0.3,metalness:0.1}),rdm=paintMat({color:new THREE.Color(red),roughness:0.26,metalness:0.08}),dk=new THREE.MeshStandardMaterial({color:0x1d1f22,roughness:0.6});
    // Triebwerks- und Getriebehaube: flach, breit, vorne gerundet, seitliche Lufteinlässe, zwei Abgasrohre nach hinten aussen
    {const rr=(w,h,r)=>{const q=new THREE.Shape(),x0=-w/2,y0=0;q.moveTo(x0+r,y0);q.lineTo(-x0-r,y0);q.quadraticCurveTo(-x0,y0,-x0,y0+r);q.lineTo(-x0,h-r);q.quadraticCurveTo(-x0,h,-x0-r,h);q.lineTo(x0+r,h);q.quadraticCurveTo(x0,h,x0,h-r);q.lineTo(x0,y0+r);q.quadraticCurveTo(x0,y0,x0+r,y0);return q;};
     const cg=new THREE.ExtrudeGeometry(rr(1.12,0.36,0.16),{depth:3.2,bevelEnabled:true,bevelThickness:0.34,bevelSize:0.12,bevelSegments:6,curveSegments:8});cg.translate(0,0,-1.6);cg.computeVertexNormals();
     const cw=new THREE.Mesh(cg,rdm);cw.position.set(0,1.0,Z(3.95));cw.castShadow=true;body.add(cw);
     for(const sd of [1,-1]){for(let k=0;k<5;k++){const sl=new THREE.Mesh(new THREE.BoxGeometry(0.025,0.035,0.5),dk);sl.position.set(sd*0.69,1.15+k*0.055,Z(2.95));body.add(sl);}
       const ex=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,0.42,16,1,true),M.hot);ex.rotation.set(Math.PI/2+0.25,0,sd*0.55);ex.position.set(sd*0.42,1.42,Z(5.62));body.add(ex);
       const ri=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.02,6,16),M.metal);ri.rotation.set(0.25,sd*0.55,0);ri.position.set(sd*0.52,1.46,Z(5.8));body.add(ri);}}
    // Fenestron: Ummantelung mit rundem Kanal, 10 Blätter, Finne darüber, Bauchsporn darunter
    {const sh=new THREE.Shape(),P2=[[9.75,0.6],[10.15,0.3],[10.6,0.2],[11.05,0.32],[11.35,0.68],[11.42,1.05],[11.25,1.42],[10.95,1.62],[10.55,1.62],[10.15,1.2],[9.75,0.9]];
     P2.forEach(([zz,yy],k)=>{if(k)sh.lineTo(Z(zz),yy);else sh.moveTo(Z(zz),yy);});sh.closePath();
     const hole=new THREE.Path();hole.absarc(Z(10.82),0.94,0.5,0,Math.PI*2,true);sh.holes.push(hole);
     const fg=new THREE.ExtrudeGeometry(sh,{depth:0.26,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.06,bevelSegments:3,curveSegments:24});fg.translate(0,0,-0.13);fg.rotateY(-Math.PI/2);fg.computeVertexNormals();
     const fe=new THREE.Mesh(fg,rdm);fe.castShadow=true;body.add(fe);
     const duct=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.38,32,1,true).rotateZ(Math.PI/2),dk);duct.position.set(0,0.94,Z(10.82));body.add(duct);
     const tr=new THREE.Group();tr.position.set(0,0.94,Z(10.82));tr.rotation.y=Math.PI/2;const tb=new THREE.MeshStandardMaterial({color:0x3a3e44,roughness:0.45,metalness:0.5,side:THREE.DoubleSide});
     for(let i=0;i<10;i++){const bl=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.4,0.015).translate(0,0.27,0),tb);bl.rotation.z=i*Math.PI/5+(i%2?0.08:0);bl.rotation.y=0.35;tr.add(bl);}
     tr.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.14,14).rotateX(Math.PI/2),M.metal));body.add(tr);parts.fans.push(tr);
     for(const sd of [1,-1])for(const k of [0,1,2]){const st2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.03,0.5),dk);const a=k*2.1+0.4;st2.position.set(sd*0.12,0.94+Math.sin(a)*0.27,Z(10.82)+Math.cos(a)*0.27);st2.rotation.x=-a;body.add(st2);}
     const finG=loft([{x:0,y:0,z:Z(10.5),c:0.98,t:0.12},{x:0.92,y:0,z:Z(10.5)+0.62,c:0.56,t:0.1}]);finG.rotateZ(Math.PI/2);finG.translate(0,1.5,0);finUV(finG);
     const fin=new THREE.Mesh(finG,finMats(['cross',red,red,'',wh]));fin.castShadow=true;body.add(fin);
     const sk=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.025,6,14,Math.PI*0.5),M.metal);sk.rotation.set(0,Math.PI/2,Math.PI*0.95);sk.position.set(0,0.42,Z(10.7));body.add(sk);}
    // Höhenleitwerk mit schräg gestellten Endscheiben
    {const hs=loft([{x:-1.22,y:0.82,z:Z(9.05),c:0.52,t:0.13},{x:1.22,y:0.82,z:Z(9.05),c:0.52,t:0.13}]);const m=new THREE.Mesh(hs,rdm);m.castShadow=true;body.add(m);
     for(const sd of [1,-1]){const ep=loft([{x:0,y:0,z:Z(8.98),c:0.62,t:0.1},{x:0.46,y:0,z:Z(8.98)+0.16,c:0.42,t:0.1}]);ep.rotateZ(Math.PI/2);ep.rotateZ(-sd*0.3);ep.translate(sd*1.22,0.74,0);const e2=new THREE.Mesh(ep,rdm);e2.castShadow=true;body.add(e2);}}
    // Kufenlandegestell: zwei gebogene Querrohre, Kufen mit hochgezogener Spitze
    {const skm=new THREE.MeshStandardMaterial({color:0x8d939a,roughness:0.35,metalness:0.7}),yk=-1.272,xk=1.08;
     for(const zz of [Z(1.75),Z(4.3)]){const c=new THREE.CatmullRomCurve3([[-xk,yk+0.02],[-xk+0.05,yk+0.25],[-0.82,-0.84],[0,-0.83],[0.82,-0.84],[xk-0.05,yk+0.25],[xk,yk+0.02]].map(([x,y])=>new THREE.Vector3(x,y,zz)));
       const t=new THREE.Mesh(new THREE.TubeGeometry(c,40,0.045,8),skm);t.castShadow=true;body.add(t);}
     for(const sd of [1,-1]){const c=new THREE.CatmullRomCurve3([[Z(5.0),yk],[Z(1.2),yk],[Z(0.7),yk+0.06],[Z(0.48),yk+0.24]].map(([z,y])=>new THREE.Vector3(sd*xk,y,z)));
       const t=new THREE.Mesh(new THREE.TubeGeometry(c,40,0.045,8),skm);t.castShadow=true;body.add(t);
       const step=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.035,0.5),M.metal);step.position.set(sd*0.97,-1.0,Z(3.3));body.add(step);}}
    parts.gear.push({g:new THREE.Group(),fixed:true});
    // Hauptrotor: lagerloser Fünfblatt-Rotor, Blätter mit gepfeilter Spitze, grosser Rotorkopf-Deckel
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,0.5,12),M.metal);mast.position.set(0,1.78,-0.6);body.add(mast);
    const rot=new THREE.Group();rot.position.set(0,2.1,-0.6);
    const rbG=loft([0.55,1.4,3.0,4.7,5.15,5.5].map((x,i)=>({x,y:0,z:-0.14+(i>=4?(x-4.7)*0.42:0),c:i===5?0.16:i===4?0.28:0.33,t:0.11})));rbG.rotateY(-Math.PI/2);
    const rbM=new THREE.MeshStandardMaterial({map:canvasTex(128,8,(x,w,h)=>{x.fillStyle='#2a2d33';x.fillRect(0,0,w,h);x.fillStyle='#f2c200';x.fillRect(w*0.84,0,w*0.16,h);x.fillStyle='#d8dadc';x.fillRect(w*0.66,0,w*0.03,h);}),roughness:0.45,metalness:0.25,side:THREE.DoubleSide});
    const blades=new THREE.Group();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const b=new THREE.Mesh(rbG,rbM);b.rotation.y=a;b.rotation.z=0.02;blades.add(b);
      // Steuermanschette über dem Biegebalken
      const cf=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.09,0.62).translate(0,0,0.55),rdm);cf.rotation.y=a;blades.add(cf);}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.38,0.14,20),M.metal);const cap=new THREE.Mesh(new THREE.SphereGeometry(0.36,20,10,0,Math.PI*2,0,Math.PI/2),rdm);cap.scale.y=0.55;cap.position.y=0.07;rot.add(blades,hub,cap);
    {const sw=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.06,18),M.dark);sw.position.set(0,1.66,-0.6);body.add(sw);}
    const disc=new THREE.Mesh(new THREE.CircleGeometry(5.55,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x1a1c20,transparent:true,opacity:0.16,depthWrite:false,side:THREE.DoubleSide}));disc.visible=false;rot.add(disc);
    body.add(rot);parts.rotor={g:rot,bl:blades,disc};
    // Rettungswinde rechts über der Schiebetür, Suchscheinwerfer unter dem Bug, Antennen, Pitotrohre, Drahtschneider
    {const hm=new THREE.MeshStandardMaterial({color:0x2a2c30,roughness:0.5,metalness:0.4});
     const arm=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.09,0.12),hm);arm.position.set(1.0,1.12,Z(2.9));arm.rotation.z=-0.12;body.add(arm);
     const drum=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.42,14).rotateX(Math.PI/2),rdm);drum.position.set(1.37,1.04,Z(2.9));body.add(drum);
     const cab=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.5,4),hm);cab.position.set(1.37,0.76,Z(2.9));body.add(cab);
     const hook=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.015,6,12),M.metal);hook.position.set(1.37,0.48,Z(2.9));body.add(hook);
     const sl=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.1,0.2,14).rotateX(Math.PI/2-0.4),M.dark);sl.position.set(0.25,-0.92,Z(1.5));body.add(sl);
     const sg=new THREE.Mesh(new THREE.CircleGeometry(0.11,14),new THREE.MeshStandardMaterial({color:0xfff6e0,emissive:0x887a60,emissiveIntensity:0.4,roughness:0.1}));sg.position.set(0.25,-0.96,Z(1.4));sg.rotation.x=Math.PI-0.4+Math.PI/2;body.add(sg);
     for(const [x,y,z,r] of [[0,0.96,Z(7.6),0],[0,-0.92,Z(3.6),Math.PI],[0.25,-0.93,Z(2.9),Math.PI]]){const an=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.22,0.16),hm);an.position.set(x,y,z);an.rotation.z=r;an.rotation.x=0.25;body.add(an);}
     for(const sd of [1,-1]){const pt=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,0.4,6).rotateX(Math.PI/2),M.metal);pt.position.set(sd*0.2,0.78,Z(0.95));body.add(pt);}
     const wc=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.4,0.06),hm);wc.position.set(0,1.32,Z(1.45));wc.rotation.x=-0.5;body.add(wc);
     const wc2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.35,0.06),hm);wc2.position.set(0,-0.98,Z(0.9));wc2.rotation.x=0.5;body.add(wc2);}
    parts.eye=new THREE.Vector3(-0.4,0.4,Z(1.72));
    parts.lights=navLights(body,[{p:[-1.24,0.98,Z(9.05)],c:[1,0.05,0.05],s:0.6},{p:[1.24,0.98,Z(9.05)],c:[0.05,1,0.2],s:0.6},{p:[0,2.45,Z(11.15)],c:[1,1,1],s:0.6},{p:[0,1.6,Z(5.95)],c:[1,0.1,0.05],beacon:1,s:0.7},{p:[0,-0.92,Z(4.2)],c:[1,0.1,0.05],beacon:1,s:0.7},{p:[0,2.48,Z(11.1)],c:[0,0,0],strobe:1,s:1.1}]);
    parts.landing=new THREE.Vector3(0,-0.98,Z(1.3));root.userData.cgShift=0;
  }
  if(AIRLINER[id])buildAirliner(AIRLINER[id],body,parts,root,P);
  body.traverse(o=>{if(o.isMesh&&!o.material.transparent)o.castShadow=true;});
  if(opts.landingLight){const sl=new THREE.SpotLight(0xfff1dc,0,1400,0.32,0.6,1.3);sl.position.copy(parts.landing);sl.target.position.copy(parts.landing).add(new THREE.Vector3(0,-2.4,-25));body.add(sl,sl.target);parts.spot=sl;}
  // Räder genau auf Bodenhöhe (gearH): Fahrwerksbeine entsprechend verschieben
  if(parts.wheels&&parts.wheels.length&&!P.heli){root.updateMatrixWorld(true);let wMin=1e9;const bx=new THREE.Box3();for(const w of parts.wheels){bx.setFromObject(w,true);wMin=Math.min(wMin,bx.min.y);}
    const d=-P.gearH-wMin;if(Math.abs(d)>0.01&&Math.abs(d)<1.5)for(const gg of parts.gear||[])if(gg.g&&!gg.fixed)gg.g.position.y+=d;}
  for(const gg of parts.gear||[])if(gg.g)gg.g.userData.y0=gg.g.position.y;
  root.userData.parts=parts;root.userData.spec=P;
  return root;
}

// Abgestellte Flugzeuge: alle starren Teile je Material zu einem Mesh zusammenfassen (viel weniger Draw-Calls)
export function bakeModel(root){
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map(),drop=[];
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.transparent||Array.isArray(o.material))return;let v=true;for(let q=o;q&&q!==root;q=q.parent)if(!q.visible){v=false;break;}
    if(!v){drop.push(o);return;}
    const g=o.geometry.clone();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
    if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(!g.index){const n=g.attributes.position.count,ix=new (n>65535?Uint32Array:Uint16Array)(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));}
    g.morphAttributes={};const m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(m);
    if(m.determinant()<0){const a=g.index.array;for(let k=0;k<a.length;k+=3){const t=a[k];a[k]=a[k+1];a[k+1]=t;}}
    const k=o.material.uuid;if(!groups.has(k))groups.set(k,{mat:o.material,gs:[]});groups.get(k).gs.push(g);drop.push(o);});
  for(const o of drop)o.parent&&o.parent.remove(o);
  for(const {mat,gs} of groups.values()){const mg=mergeGeometries(gs,false);if(!mg)continue;const mm=new THREE.Mesh(mg,mat);mm.castShadow=true;root.add(mm);gs.forEach(g=>g.dispose());}
  root.userData.baked=true;return root;}

// Animation der Teile
export function animateModel(root,st,t,dt){
  const p=root.userData.parts,P=root.userData.spec;if(!p)return;
  const fl=(st.flapPos||0);
  for(const f of (p.flaps||[]))for(const m of [f.R,f.L]){m.rotation.x=fl*0.6;m.position.z=fl*(m.userData.ext||0);}
  if(p.ailR){p.ailR.rotation.x=(st.ail||0)*0.35;p.ailL.rotation.x=-(st.ail||0)*0.35;}
  if(p.elevR){p.elevR.rotation.x=-(st.elev||0)*0.4;p.elevL.rotation.x=-(st.elev||0)*0.4;}
  if(p.rud)p.rud.rotation.x=-(st.rud||0)*0.45;
  const gp=st.gearPos??1;
  for(const g of p.gear){if(g.fixed)continue;g.g.visible=gp>0.02;if(g.g.userData.y0!=null)g.g.position.y=g.g.userData.y0-(st.susp||0);const a=(1-gp)*Math.PI/2;if(g.axis==='x')g.g.rotation.x=a*g.dir;else g.g.rotation.z=a*g.dir;}
  const rpm=st.rpm||0;
  if(p.rotor){const r=st.rpm||0;p.rotor.g.rotation.y+=(r*38)*dt;const fast=r>0.45;p.rotor.bl.visible=!fast||Math.random()<0.15;p.rotor.disc.visible=fast;}
  for(const pr of p.props){pr.g.rotation.z+=(rpm*95+2)*dt*(rpm>0.01?1:0);const fast=rpm>0.18;pr.bl.visible=!fast;pr.disc.visible=fast;}
  for(const f of p.fans)f.rotation.z+=rpm*80*dt;
  if(p.wheels&&st.groundSpeed!==undefined)for(const w of p.wheels)w.rotation.x-=st.groundSpeed*dt/0.4;
  if(p.cabin&&st.night!==undefined)for(const m of p.cabin)m.emissiveIntensity=st.night*1.1;
  if(p.lights&&st.night!==undefined)p.lights.u.uI.value=0.85+1.35*Math.min(1,st.night*1.6);
  if(p.lights){const c=p.lights.P.geometry.attributes.gcol;p.lights.pts.forEach((q,k)=>{if(q.beacon){const on=(t%1.3)<0.12;c.setXYZ(k,on?1:0.05,on?0.12:0,on?0.05:0);}
      else if(q.strobe){const ph=t%1.2,on=ph<0.05||(ph>0.14&&ph<0.18);c.setXYZ(k,on?1.6:0,on?1.6:0,on?1.7:0);}});c.needsUpdate=true;}
  if(p.spot)p.spot.intensity=st.landingLight?600:0;
}
