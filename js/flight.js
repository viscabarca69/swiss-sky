// Flugphysik: Auftrieb, Widerstand, Schub, Anstellwinkel, Bodenkontakt
import * as THREE from 'three';
const V3=THREE.Vector3,DEG=Math.PI/180,G=9.81;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const _a=new V3(),_f=new V3(),_u=new V3(),_r=new V3(),_v=new V3(),_F=new V3(),_t=new V3(),_l=new V3(),_q=new THREE.Quaternion(),_e=new THREE.Euler(0,0,0,'YXZ');
function interp(arr,t){const x=t*(arr.length-1),i=Math.min(arr.length-2,Math.floor(x)),f=x-i;return arr[i]*(1-f)+arr[i+1]*f;}

export function createFlight(P,pos,heading,opt={}){
  const F={P,pos:pos.clone(),vel:new V3(),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,heading,0,'YXZ')),w:new V3(),
    thr:0,eng:0,flaps:0,flapPos:0,gear:true,gearPos:1,brake:false,spoiler:false,onGround:true,assist:opt.assist!==false,level:opt.level??0.35,gammaT:0,
    alpha:0,beta:0,stalled:false,airTime:0,groundTime:0,ail:0,elev:0,rud:0,crashed:false,events:[],CL:0,qbar:0,tailStrike:false};
  if(opt.air){const sp=opt.speed||P.Vref*1.35;F.onGround=false;F.vel.set(0,0,-sp).applyQuaternion(F.q);F.thr=F.eng=opt.thr??0.55;
    if(!P.fixedGear){F.gear=false;F.gearPos=0;}F.airTime=10;}
  return F;
}
export function stallSpeed(F){if(F.P.heli)return 0;const P=F.P,rho=1.225*Math.exp(-F.pos.y/8500);const CLmax=P.CL0+interp(P.flapCL,F.flapPos)+P.CLa*(P.alphaStall-2*F.flapPos)*DEG;return Math.sqrt(2*P.mass*G/(rho*P.S*CLmax));}

function crash(F,reason){F.crashed=true;F.events.push({type:'crash',reason});}

export function stepFlight(F,ctl,dt,W){
  const P=F.P;if(F.crashed)return;
  const sm=Math.min(1,dt*7);F.elev+=(ctl.pitch-F.elev)*sm;F.ail+=(ctl.roll-F.ail)*sm;F.rud+=(ctl.yaw-F.rud)*sm;
  const TM=1.22,SP=P.prop?1.3:1.7;F.eng+=(F.thr-F.eng)*Math.min(1,dt*P.spool*SP*(F.thr<F.eng?1.4:1));
  F.flapPos+=clamp(F.flaps/(P.flapCL.length-1)-F.flapPos,-dt*0.2,dt*0.2);
  if(P.fixedGear){F.gear=true;F.gearPos=1;}else F.gearPos+=clamp((F.gear?1:0)-F.gearPos,-dt/7,dt/7);
  const fwd=_f.set(0,0,-1).applyQuaternion(F.q),up=_u.set(0,1,0).applyQuaternion(F.q),right=_r.set(1,0,0).applyQuaternion(F.q);
  const VA=_a.copy(F.vel);if(W.wind&&!F.onGround)VA.sub(W.wind);else if(W.wind&&F.onGround)VA.addScaledVector(fwd,-W.wind.dot(fwd));
  const Vs=VA.length(),vdir=Vs>0.5?_v.copy(VA).divideScalar(Vs):_v.copy(fwd);F.ias=Vs;
  const u=VA.dot(fwd),wv=VA.dot(up),sv=VA.dot(right);
  const alpha=Vs>2?Math.atan2(-wv,Math.max(Math.abs(u),0.5)):0,beta=Vs>3?Math.atan2(sv,Math.max(Math.abs(u),2)):0;
  F.alpha=alpha;F.beta=beta;
  const rho=1.225*Math.exp(-F.pos.y/8500),qbar=0.5*rho*Vs*Vs;F.qbar=qbar;
  const flapCL=interp(P.flapCL,F.flapPos),as=(P.alphaStall-2*F.flapPos)*DEG;
  let CL;
  if(alpha>as){const CLs=P.CL0+flapCL+P.CLa*as;CL=CLs*Math.max(0.55,1-(alpha-as)*2.4);F.stalled=!F.onGround;}
  else if(alpha<-as*0.8){const CLs=P.CL0+flapCL-P.CLa*as*0.8;CL=CLs*Math.max(0.55,1-(-as*0.8-alpha)*2.4);F.stalled=!F.onGround;}
  else{CL=P.CL0+flapCL+P.CLa*alpha;F.stalled=false;}
  F.airbrake=!F.onGround&&F.brake;
  F.spoiler=(F.onGround&&F.thr<0.05&&Vs>8&&!P.prop)||F.airbrake;
  if(F.spoiler)CL*=F.airbrake?0.9:0.5;
  const idle=Math.max(0,1-F.eng/0.3)*(P.prop?0.03:0.02);
  F.CL=CL;
  const CD=P.CD0+P.K*CL*CL+P.flapCD*F.flapPos+P.gearCD*F.gearPos+(F.spoiler?(F.airbrake?(P.prop?0.045:0.07):0.08):0)+idle+(F.stalled?0.22:0)+Math.abs(beta)*0.6;
  let T=P.prop?TM*P.Tmax*F.eng*Math.max(0.15,1-Vs/P.Vprop*0.75):TM*P.Tmax*F.eng*(1-Vs/650);
  T*=Math.pow(rho/1.225,0.75)*(F.thrMul??1);F.thrust=T;
  _F.set(0,-P.mass*G,0);
  if(Vs>0.5){_l.crossVectors(right,vdir).normalize();_F.addScaledVector(_l,qbar*P.S*CL);_F.addScaledVector(vdir,-qbar*P.S*CD);_F.addScaledVector(right,-qbar*P.S*2.4*beta);}
  _F.addScaledVector(fwd,T);
  const lift=qbar*P.S*CL;

  if(F.onGround){
    F.groundTime+=dt;
    _e.setFromQuaternion(F.q,'YXZ');let pitch=_e.x,yaw=_e.y;
    const vl0=F.vel.x*-Math.sin(yaw)+F.vel.z*-Math.cos(yaw);
    const sr=P.steer*clamp(Math.abs(vl0)/2.5,0,1)/(1+Math.abs(vl0)/16);
    yaw+=(F.rud+F.ail*0.4)*sr*dt*(vl0<0?-1:1);
    const rotOK=Vs>P.Vr*0.82;
    if(F.elev>0.12&&rotOK)pitch+=F.elev*P.rotRate*dt;
    else if(F.elev<-0.1||Vs<P.Vr*0.65)pitch-=0.1*dt;
    pitch=clamp(pitch,0,P.tailStrike*DEG);
    F.tailStrike=pitch>=P.tailStrike*DEG-0.002;
    _e.set(pitch,yaw,0,'YXZ');F.q.setFromEuler(_e);F.w.set(0,0,0);
    const ff=_t.set(-Math.sin(yaw),0,-Math.cos(yaw));
    let vl=F.vel.dot(ff);
    const N=Math.max(0,P.mass*G-Math.max(0,lift*Math.cos(pitch)));
    const rw=W.runwayAt(F.pos.x,F.pos.z),mu=F.water?0.045+Math.min(0.06,Math.abs(F.vel.length())*0.0016):rw?0.015:0.06;
    const rev=F.brake&&P.reverse&&Math.abs(vl)>12?P.Tmax*P.reverse:0;F.reversing=rev>0;
    const a=(_F.dot(ff)-Math.sign(vl)*rev)/P.mass,fr=(mu*N+(F.brake&&!F.water?P.brakeMu*N:0))/P.mass;
    if(Math.abs(vl)<0.05&&Math.abs(a)<=fr)vl=0;else{vl+=a*dt;const dv=fr*dt;if(Math.abs(vl)<=dv)vl=0;else vl-=Math.sign(vl)*dv;}
    const ay=_F.y/P.mass;
    F.vel.copy(ff).multiplyScalar(vl);
    if(ay>0.2&&pitch>1.5*DEG){F.onGround=false;F.water=false;F.vel.y=ay*dt;F.airTime=0;F.gammaT=Math.max(3*DEG,pitch*0.6);F.events.push({type:'liftoff'});}
    F.pos.addScaledVector(F.vel,dt);
    if(F.onGround){
      const lk=W.isLake(F.pos.x,F.pos.z);
      if(lk&&P.amphib){F.water=true;F.pos.y=W.waterLevel(F.pos.x,F.pos.z)+P.waterH;return;}
      if(F.water&&!lk&&F.gearPos<0.9)return crash(F,'Mit eingefahrenem Fahrwerk ans Ufer gerutscht.');
      F.water=false;F.pos.y=W.heightAt(F.pos.x,F.pos.z)+P.gearH;
      if(lk)return crash(F,'Im See versunken.');
      if(!W.airportZone(F.pos.x,F.pos.z)&&W.slopeAt(F.pos.x,F.pos.z)>0.14&&Math.abs(vl)>4)return crash(F,'Im unebenen Gelände verunglückt.');
    }
    return;
  }

  // ---- in der Luft ----
  F.airTime+=dt;F.groundTime=0;
  const ce=clamp(qbar/P.qRef,0,1.6),ceF=Math.max(ce,0.75);
  const bankL=Math.atan2(right.y,up.y);F.bank=bankL;
  let aCmd;
  const gamma=Math.asin(clamp(F.vel.y/Math.max(F.vel.length(),1),-1,1));
  const cosPhi=Math.max(0.45,Math.cos(bankL)),qS=Math.max(qbar,40)*P.S;
  const aLvl=(P.mass*G*Math.cos(gamma)/qS-P.CL0-flapCL)/P.CLa,aReq=(P.mass*G*Math.cos(gamma)/(qS*cosPhi)-P.CL0-flapCL)/P.CLa;
  if(F.assist){
    if(Math.abs(F.elev)>0.06){F.gammaT=gamma;F.prot=false;aCmd=aReq+F.elev*(F.elev>0?9:7)*DEG;}
    else aCmd=aReq+clamp((F.gammaT-gamma)*2.6,-6*DEG,6*DEG)-F.w.x*0.15;
    const Vst=Math.sqrt(2*P.mass*G/(rho*P.S*(P.CL0+flapCL+P.CLa*as)));F.vst=Vst;
    if(Vs<Vst*1.08&&F.elev<0.5){const agl=F.pos.y-W.heightAt(F.pos.x,F.pos.z);const floor=agl<250?0:-12*DEG;if(F.gammaT>floor){if(!F.prot)F.gPre=F.gammaT;F.gammaT=Math.max(floor,F.gammaT-(Vst*1.12-Vs)/Vst*0.8*dt);F.prot=true;}}
    else if(F.prot&&Vs>Vst*1.3){const gt=Math.min(0,F.gPre??0);F.gammaT=Math.min(gt,F.gammaT+0.6*DEG*dt);if(F.gammaT>=gt-0.001||Math.abs(F.elev)>0.06)F.prot=false;}
    F.gammaT=clamp(F.gammaT,-18*DEG,22*DEG);
    aCmd=clamp(aCmd,-7*DEG,as-2.5*DEG);
  }else aCmd=2*DEG+clamp(aReq-aLvl,0,6*DEG)+F.elev*(F.elev>0?P.alphaStall+4:9)*DEG;
  F.w.x+=(P.kAlpha*(aCmd-alpha)*ceF-P.dampP*F.w.x)*dt;
  let rt;
  const mb=(P.maxBank||55)*DEG;
  const over=Math.abs(bankL)-mb;
  if(Math.abs(F.ail)>0.04){rt=F.ail*P.rollRate*Math.min(1,ce*1.2+0.2);if(Math.sign(F.ail)===Math.sign(bankL)){const room=(mb-Math.abs(bankL))/(7*DEG);rt=room>0?rt*Math.min(1,room):-Math.sign(bankL)*(over*4+0.02);}}
  else{const rb=Math.abs(F.rud)>0.05?F.rud*(P.cls==='small'?20:P.cls==='regional'?17:15)*DEG:0;
    rt=Math.abs(F.rud)>0.05?clamp((rb-bankL)*1.6,-P.rollRate*0.5,P.rollRate*0.5):F.level>0?clamp(-bankL*F.level,-P.rollRate*0.45,P.rollRate*0.45):0;if(over>0)rt=-Math.sign(bankL)*Math.max(Math.abs(rt),over*4+0.05);}
  F.w.z+=(rt-F.w.z)*Math.min(1,dt*4.5);
  const yr=(F.rud*(P.cls==='small'?0.26:P.cls==='regional'?0.19:0.15)+(F.asym||0)*0.1*F.eng)*Math.min(1,0.35+ce);
  F.w.y+=(-beta*2.2*ceF+(yr-F.w.y)*3.2)*dt;
  const ang=F.w.length()*dt;if(ang>1e-7){_t.copy(F.w).normalize();_q.setFromAxisAngle(_t,ang);F.q.multiply(_q).normalize();}
  F.vel.addScaledVector(_F,dt/P.mass);
  F.pos.addScaledVector(F.vel,dt);
  const gh=W.heightAt(F.pos.x,F.pos.z),lake=W.isLake(F.pos.x,F.pos.z);
  const surf=lake?W.waterLevel(F.pos.x,F.pos.z):gh,bottom=F.pos.y-(lake&&P.amphib?P.waterH:F.gearPos>0.9?P.gearH:P.bellyH);
  if(bottom<=surf){
    const sink=-F.vel.y;_e.setFromQuaternion(F.q,'YXZ');const pitch=_e.x/DEG,bank=Math.abs(_e.z)/DEG;
    if(lake&&P.amphib){if(F.gearPos>0.1)return crash(F,'Mit ausgefahrenem Fahrwerk gewassert – das Flugzeug hat sich überschlagen.');
      if(sink>P.ldgSink*2.3)return crash(F,`Zu harter Aufprall auf dem Wasser (${sink.toFixed(1)} m/s).`);if(bank>(P.wingStrike||14))return crash(F,'Ein Flügel hat das Wasser berührt.');if(pitch<-4)return crash(F,'Mit der Nase ins Wasser getaucht.');
      F.onGround=true;F.water=true;F.pos.y=surf+P.waterH;F.vel.y=0;_e.set(clamp(_e.x,0,P.tailStrike*DEG),_e.y,0,'YXZ');F.q.setFromEuler(_e);F.w.set(0,0,0);
      if(F.airTime>4)F.events.push({type:'touchdown',sink,pitch,bank,x:F.pos.x,z:F.pos.z,rw:null,water:true});return;}
    if(lake)return crash(F,'Notwasserung im See.');
    if(F.gearPos<0.9)return crash(F,'Bauchlandung – das Fahrwerk war nicht ausgefahren (G).');
    const maxBank=P.wingStrike||14;
    if(sink>P.ldgSink*2.3)return crash(F,`Zu harter Aufprall (Sinkrate ${sink.toFixed(1)} m/s).`);
    if(bank>maxBank)return crash(F,'Eine Flügelspitze hat den Boden berührt.');
    if(pitch<-5)return crash(F,'Mit der Nase voran aufgeschlagen.');
    const rw=W.runwayAt(F.pos.x,F.pos.z),zone=W.airportZone(F.pos.x,F.pos.z);
    if(!rw&&!zone){if(W.slopeAt(F.pos.x,F.pos.z)<0.09&&sink<P.ldgSink*1.2&&Vs<P.Vr*1.4)F.events.push({type:'outlanding'});else return crash(F,'Bodenberührung im Gelände.');}
    F.onGround=true;F.pos.y=gh+P.gearH;F.vel.y=0;
    _e.set(clamp(_e.x,0,P.tailStrike*DEG),_e.y,0,'YXZ');F.q.setFromEuler(_e);F.w.set(0,0,0);
    if(F.airTime>4)F.events.push({type:'touchdown',sink,pitch,bank,x:F.pos.x,z:F.pos.z,rw:rw||zone,grass:!rw});
  }
}
