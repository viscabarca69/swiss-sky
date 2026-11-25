import * as THREE from 'three';
import {createFlight,stepFlight} from '../js/flight.js';
import {PLANES} from '../js/aircraft.js';
const DEG=Math.PI/180,dt=1/60;const W={heightAt:()=>0,runwayAt:()=>({}),airportZone:()=>true,isLake:()=>false,slopeAt:()=>0,waterLevel:()=>0,wind:null};
const P=PLANES[process.argv[2]||'l320'];const flareH=+(process.argv[3]||12),flareP=+(process.argv[4]||0.35);
let F=createFlight(P,new THREE.Vector3(0,80,0),0,{air:true,speed:P.Vref*1.08,thr:0.35});F.gear=true;F.gearPos=1;F.flaps=P.flapCL.length-1;F.flapPos=1;F.gammaT=-3*DEG;
for(let t=0;t<90;t+=dt){const agl=F.pos.y-P.gearH;const vsT=-Math.max(flareP,agl*0.25);const pitch=agl<flareH?Math.max(-0.3,Math.min(0.6,(vsT-F.vel.y)*0.3)):0;stepFlight(F,{pitch,roll:0,yaw:0},dt,W);
 F.thr=agl<flareH?0:Math.max(0,Math.min(1,F.thr+(P.Vref*1.05-F.ias)*0.05*dt));
 if(Math.round(t*60)%120===0)console.log(t.toFixed(0),'agl',agl.toFixed(1),'vs',F.vel.y.toFixed(2),'ias',F.ias.toFixed(0),'thr',F.thr.toFixed(2),'gT',(F.gammaT/DEG).toFixed(1));
 const e=F.events.find(e=>e.type==='touchdown'||e.type==='crash');if(e){console.log('EVENT',e.type,e.sink?.toFixed(2),e.reason||'','pitch',e.pitch?.toFixed(1),'t',t.toFixed(1));break;}F.events.length=0;}
