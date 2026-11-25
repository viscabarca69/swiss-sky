import * as THREE from 'three';
import {createHeli,stepHeli} from '../js/heli.js';
import {PLANES} from '../js/aircraft.js';
const dt=1/60,W={heightAt:()=>0,isLake:()=>false,waterLevel:()=>0,slopeAt:()=>0,runwayAt:()=>null,airportZone:()=>null,wind:null};
const P=PLANES.rega;const F=createHeli(P,new THREE.Vector3(0,300,0),0,{air:true,speed:5});
const eul=new THREE.Euler();
for(let t=0;t<90;t+=dt){const ph=t<25?'vor':t<55?'los':t<70?'zurueck':'los2';const pitch=ph==='vor'?-1:ph==='zurueck'?0.6:0;
 stepHeli(F,{pitch,roll:0,yaw:0,coll:0},dt,W);
 if(Math.round(t*60)%300===0){eul.setFromQuaternion(F.q,'YXZ');console.log(t.toFixed(0),ph,'v',Math.hypot(F.vel.x,F.vel.z).toFixed(1),'m/s =',(Math.hypot(F.vel.x,F.vel.z)*3.6).toFixed(0),'km/h  vs',F.vel.y.toFixed(1),'pitch',(eul.x*57.3).toFixed(1),'alt',F.pos.y.toFixed(0));}}
