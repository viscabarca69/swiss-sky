// Autobrake und Bugradsteuerung: Bremsweg nach dem Aufsetzen je Stufe, Wendekreis beim Rollen
import * as THREE from 'three';
import {createFlight,stepFlight} from '../js/flight.js';
import {PLANES} from '../js/aircraft.js';
const dt=1/60,W={heightAt:()=>0,runwayAt:()=>({}),airportZone:()=>true,isLake:()=>false,slopeAt:()=>0,waterLevel:()=>0,wind:null};
const P=PLANES[process.argv[2]||'l320'];
for(const ab of [0,1,2,3]){const F=createFlight(P,new THREE.Vector3(0,P.gearH,0),0,{air:false});F.vel.set(0,0,-P.Vref);F.autobrake=ab;F.abOn=ab>0;F.thr=0;let d=0,t=0;
  for(;t<120&&F.vel.length()>7;t+=dt){const p0=F.pos.clone();stepFlight(F,{pitch:0,roll:0,yaw:0},dt,W);d+=F.pos.distanceTo(p0);F.events.length=0;}
  console.log('Autobrake',['AUS','LO','MED','MAX'][ab],'Bremsweg bis 7 m/s:',Math.round(d),'m in',t.toFixed(1),'s');}
{const F=createFlight(P,new THREE.Vector3(0,P.gearH,0),0,{air:false});F.vel.set(0,0,-7);F.thr=0.08;let yaw0=null,t=0;
 for(;t<20;t+=dt){stepFlight(F,{pitch:0,roll:0,yaw:1},dt,W);F.rud=1;F.events.length=0;}
 const e=new THREE.Euler().setFromQuaternion(F.q,'YXZ');const v=F.vel.length();console.log('Rollen 7 m/s, volles Ruder 20 s: Kurs',Math.round(((e.y*180/Math.PI)%360+360)%360),'°, Tempo',v.toFixed(1),'m/s');}
