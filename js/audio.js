// Synthetischer Motor-, Wind- und Effektsound (WebAudio)
export function createAudio(){
  const A={on:false,vol:0.7,muted:false};let ctx=null,master,eng={},wind,windF,stallO,stallG,noiseBuf;
  function noise(){const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;l=(l+0.02*w)/1.02;d[i]=w*0.6+l*3;}return b;}
  A.init=()=>{
    if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
    try{ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
    master=ctx.createGain();master.gain.value=A.muted?0:A.vol;master.connect(ctx.destination);noiseBuf=noise();
    // Kolbenmotor / Turboprop
    eng.o1=ctx.createOscillator();eng.o1.type='sawtooth';eng.o2=ctx.createOscillator();eng.o2.type='square';
    eng.f=ctx.createBiquadFilter();eng.f.type='lowpass';eng.f.frequency.value=600;eng.f.Q.value=2;
    eng.g=ctx.createGain();eng.g.gain.value=0;eng.g2=ctx.createGain();eng.g2.gain.value=0.25;
    eng.o1.connect(eng.f);eng.o2.connect(eng.g2);eng.g2.connect(eng.f);eng.f.connect(eng.g);eng.g.connect(master);eng.o1.start();eng.o2.start();
    // Turbine / Rauschen
    eng.n=ctx.createBufferSource();eng.n.buffer=noiseBuf;eng.n.loop=true;eng.nf=ctx.createBiquadFilter();eng.nf.type='bandpass';eng.nf.frequency.value=800;eng.nf.Q.value=0.7;
    eng.ng=ctx.createGain();eng.ng.gain.value=0;eng.n.connect(eng.nf);eng.nf.connect(eng.ng);eng.ng.connect(master);eng.n.start();
    eng.wh=ctx.createOscillator();eng.wh.type='sine';eng.whg=ctx.createGain();eng.whg.gain.value=0;eng.wh.connect(eng.whg);eng.whg.connect(master);eng.wh.start();
    // Wind
    wind=ctx.createBufferSource();wind.buffer=noiseBuf;wind.loop=true;windF=ctx.createBiquadFilter();windF.type='lowpass';windF.frequency.value=500;
    const wg=ctx.createGain();wg.gain.value=0;wind.connect(windF);windF.connect(wg);wg.connect(master);wind.start();A.wg=wg;
    // Überziehwarnung
    stallO=ctx.createOscillator();stallO.type='square';stallO.frequency.value=780;stallG=ctx.createGain();stallG.gain.value=0;stallO.connect(stallG);stallG.connect(master);stallO.start();
    A.on=true;
  };
  A.setVolume=v=>{A.vol=v;if(master)master.gain.value=A.muted?0:v;};
  A.toggleMute=()=>{A.muted=!A.muted;if(master)master.gain.value=A.muted?0:A.vol;return A.muted;};
  A.update=s=>{
    if(!A.on)return;const t=ctx.currentTime,k=0.08;
    if(s.silent){eng.g.gain.setTargetAtTime(0,t,k);eng.ng.gain.setTargetAtTime(0,t,k);eng.whg.gain.setTargetAtTime(0,t,k);A.wg.gain.setTargetAtTime(0,t,k);stallG.gain.setTargetAtTime(0,t,0.02);return;}
    const r=s.rpm,cam=s.inside?0.55:1;
    if(s.kind==='piston'){eng.o1.frequency.setTargetAtTime(28+r*62,t,k);eng.o2.frequency.setTargetAtTime(56+r*124,t,k);eng.f.frequency.setTargetAtTime(380+r*900,t,k);
      eng.g.gain.setTargetAtTime((0.05+r*0.13)*cam,t,k);eng.ng.gain.setTargetAtTime(0.02+r*0.03,t,k);eng.nf.frequency.setTargetAtTime(300+r*500,t,k);eng.whg.gain.setTargetAtTime(0,t,k);}
    else if(s.kind==='turboprop'){eng.o1.frequency.setTargetAtTime(70+r*40,t,k);eng.o2.frequency.setTargetAtTime(140+r*80,t,k);eng.f.frequency.setTargetAtTime(500+r*700,t,k);
      eng.g.gain.setTargetAtTime((0.03+r*0.07)*cam,t,k);eng.nf.frequency.setTargetAtTime(900+r*1400,t,k);eng.ng.gain.setTargetAtTime((0.04+r*0.1)*cam,t,k);eng.wh.frequency.setTargetAtTime(1800+r*1600,t,k);eng.whg.gain.setTargetAtTime(0.004+r*0.01,t,k);}
    else if(s.kind==='heli'){eng.o1.frequency.setTargetAtTime(17+r*6,t,k);eng.o2.frequency.setTargetAtTime(34+r*12,t,k);eng.f.frequency.setTargetAtTime(220+r*260,t,k);
      eng.g.gain.setTargetAtTime((0.04+r*0.16)*cam,t,k);eng.nf.frequency.setTargetAtTime(1200+r*1500,t,k);eng.ng.gain.setTargetAtTime((0.02+r*0.07)*cam,t,k);eng.wh.frequency.setTargetAtTime(3000+r*1800,t,k);eng.whg.gain.setTargetAtTime((0.003+r*0.008)*cam,t,k);}
    else if(s.kind==='none'){eng.g.gain.setTargetAtTime(0,t,k);eng.ng.gain.setTargetAtTime(0,t,k);eng.whg.gain.setTargetAtTime(0,t,k);}
    else{eng.g.gain.setTargetAtTime(0,t,k);eng.nf.frequency.setTargetAtTime(300+r*900,t,k);eng.ng.gain.setTargetAtTime((0.05+r*0.2)*cam,t,0.3);eng.wh.frequency.setTargetAtTime(2200+r*3200,t,0.4);eng.whg.gain.setTargetAtTime((0.006+r*0.016)*cam,t,0.3);}
    const sp=Math.min(1,s.speed/120);A.wg.gain.setTargetAtTime(sp*sp*0.22*(s.inside?0.6:1),t,0.2);windF.frequency.setTargetAtTime(250+sp*1600,t,0.2);
    stallG.gain.setTargetAtTime(s.stall&&(t%0.5<0.3)?0.05:0,t,0.01);
  };
  function blip(f0,f1,dur,type,vol){if(!A.on)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(vol||0.15,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.05);}
  function burst(dur,freq,vol){if(!A.on)return;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime;s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=freq;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur);}
  A.radio=()=>{if(!A.on)return;const s2=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime;s2.buffer=noiseBuf;f.type='bandpass';f.frequency.value=2200;f.Q.value=1.2;
    g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);s2.connect(f);f.connect(g);g.connect(master);s2.start(t);s2.stop(t+0.2);blip(1450,1450,0.06,'sine',0.05);};
  let rainG=null;A.setRain=v=>{if(!A.on)return;if(!rainG){const r=ctx.createBufferSource();r.buffer=noiseBuf;r.loop=true;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1800;rainG=ctx.createGain();rainG.gain.value=0;r.connect(f);f.connect(rainG);rainG.connect(master);r.start();}
    rainG.gain.setTargetAtTime(v*0.06,ctx.currentTime,0.5);};
  A.chime=()=>{blip(880,880,0.25,'sine',0.12);setTimeout(()=>blip(1320,1320,0.4,'sine',0.1),120);};
  A.touch=v=>{burst(0.25,1800,Math.min(0.5,0.04+v*0.14));};
  A.crash=()=>{burst(2.2,500,0.9);burst(1.2,3000,0.4);};
  A.click=()=>blip(1200,900,0.05,'square',0.05);
  A.alarm=()=>{for(let i=0;i<3;i++)setTimeout(()=>blip(1000,1000,0.16,'square',0.07),i*260);setTimeout(()=>blip(700,700,0.3,'square',0.06),820);};
  A.vario=vs=>{if(vs>0.3)blip(500+vs*130,520+vs*140,Math.max(0.05,0.14-vs*0.012),'sine',0.05);else if(vs<-2.5)blip(220,200,0.25,'sine',0.02);};
  A.thunder=d=>{const k=Math.max(0.15,1-d/9000);setTimeout(()=>{burst(2.6,180+300*k,0.5*k);burst(0.6,900,0.25*k);},Math.min(8000,d/343*1000));};
  A.dingdong=()=>{blip(784,784,0.9,'sine',0.11);setTimeout(()=>blip(622,622,1.2,'sine',0.1),420);};
  A.splash=v=>{burst(0.9,1100,Math.min(0.45,0.12+v*0.05));};
  A.gear=()=>{burst(0.8,300,0.15);setTimeout(()=>burst(0.15,900,0.2),700);};
  return A;
}
