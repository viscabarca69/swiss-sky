// Flugphysik-Test ohne Browser: Kurven (Schiebewinkel), Seitenruder, Landung
import * as THREE from 'three';
import {createFlight,stepFlight} from '../js/flight.js';
import {PLANES} from '../js/aircraft.js';
const DEG=Math.PI/180,dt=1/60;
const W={heightAt:()=>0,runwayAt:()=>({}),airportZone:()=>true,isLake:()=>false,slopeAt:()=>0,waterLevel:()=>0,wind:null};
const ids=process.argv[2]?process.argv[2].split(','):['l320','l350','titlis','alpina'];
const eul=new THREE.Euler();
function att(F){eul.setFromQuaternion(F.q,'YXZ');return{pitch:eul.x/DEG,hdg:-eul.y/DEG,bank:eul.z/DEG};}
for(const id of ids){const P=PLANES[id];if(P.heli)continue;
  // A) Kurve mit Querruder, dann loslassen
  let F=createFlight(P,new THREE.Vector3(0,1500,0),0,{air:true,speed:P.Vref*1.6,thr:0.6});
  let maxB=0,sumB=0,n=0;
  for(let t=0;t<30;t+=dt){const roll=t<2.5?-1:0;stepFlight(F,{pitch:0,roll,yaw:0},dt,W);if(t>3){maxB=Math.max(maxB,Math.abs(F.beta/DEG));sumB+=Math.abs(F.beta/DEG);n++;}}
  const a1=att(F);
  // B) nur Seitenruder 10 s
  F=createFlight(P,new THREE.Vector3(0,1500,0),0,{air:true,speed:P.Vref*1.6,thr:0.6});
  for(let t=0;t<10;t+=dt)stepFlight(F,{pitch:0,roll:0,yaw:-1},dt,W);
  const a2=att(F);a2.beta=F.beta/DEG;
  // C) Landung: 3°-Gleitpfad bei Vref, Abfangen ab 12 m
  F=createFlight(P,new THREE.Vector3(0,120,0),0,{air:true,speed:P.Vref*1.08,thr:0.35});F.gear=true;F.gearPos=1;F.flaps=P.flapCL.length-1;F.flapPos=1;
  F.gammaT=-3*DEG;F.vel.set(0,-Math.sin(3*DEG)*P.Vref*1.08,-Math.cos(3*DEG)*P.Vref*1.08);
  let td=null,tt=0;
  for(let t=0;t<120&&!td;t+=dt){tt=t;const agl=F.pos.y-P.gearH;let pitch=0,thr=null;
    if(agl<12){pitch=0.35;}
    stepFlight(F,{pitch,roll:0,yaw:0},dt,W);
    // Schub für Vref
    F.thr=Math.max(0,Math.min(1,F.thr+(P.Vref-F.ias)*0.02*dt*10));if(agl<8)F.thr=0;
    for(const e of F.events)if(e.type==='touchdown'||e.type==='crash')td=e;F.events.length=0;}
  console.log(id.padEnd(7),`Kurve: Querlage ${a1.bank.toFixed(0)}°, Schiebewinkel max ${maxB.toFixed(1)}° Ø ${(sumB/n).toFixed(1)}°`,
    `| Seitenruder 10 s: Kurs ${a2.hdg.toFixed(0)}°, Querlage ${a2.bank.toFixed(0)}°, β ${a2.beta.toFixed(1)}°`,
    `| Landung: ${td?td.type+' sink '+(td.sink??0).toFixed(2)+' pitch '+(td.pitch??0).toFixed(1):'keine'} nach ${tt.toFixed(0)} s`);
}
