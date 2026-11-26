// Flugverkehrsleitung: Funk mit dem Tower, Freigaben, Regelverstösse, Sprachausgabe
import {AIRPORTS,toLocal} from './worldgen.js';
const TWR={LSZH:{n:'Zürich Turm',c:true},LSME:{n:'Emmen Turm',c:true},LSZC:{n:'Buochs Turm',c:true},LSMA:{n:'Alpnach Turm',c:true},LSZF:{n:'Birrfeld Info',c:false},LSXZ:{n:'Zofingen Info',c:false},LSZN:{n:'Hausen Info',c:false},LSZB:{n:'Bern Turm',c:true},LSMM:{n:'Meiringen Turm',c:true},LSMI:{n:'Interlaken Info',c:false},LSGR:{n:'Reichenbach Info',c:false},LSTA:{n:'Raron Info',c:false},LSGS:{n:'Sion Turm',c:true},LSZG:{n:'Grenchen Turm',c:true},LSGG:{n:'Genève Tour',c:true},LFSB:{n:'Basel Turm',c:true},LSZA:{n:'Lugano Torre',c:true},LSZR:{n:'Altenrhein Turm',c:true},LSZS:{n:'Samedan Turm',c:true},LSMP:{n:'Payerne Tour',c:true}};
const DIG=['null','eins','zwo','drei','vier','fünf','sechs','sieben','acht','neun'];
const spell=s=>String(s).split('').map(c=>/[0-9]/.test(c)?DIG[+c]:c==='-'?'':({A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-Ray',Y:'Yankee',Z:'Zulu'}[c]||c)).join(' ');
export const CALLSIGN={alpina:'HB-KAL',saentis:'HB-SAE',titlis:'HB-FTI',foehn:'LUIS 42',l320:'LUIS 320',l330:'LUIS 330',l340:'LUIS 340',l346:'LUIS 346',l350:'LUIS 350',l380:'LUIS 380',l32n:'LUIS 324',l747:'LUIS 747'};
// Frequenzen: aus dem Platzkürzel abgeleitet (Turm 118–119, Rollkontrolle 121, Abflug/Anflug 119–127), fest pro Platz
const hsh=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
const FQ=(icao,kind)=>{const h=hsh(icao+kind),b={twr:[118.0,1.9],gnd:[121.6,0.4],dep:[125.0,2.9],app:[119.0,1.9],atis:[128.0,1.9]}[kind];return(b[0]+(h%Math.round(b[1]/0.025))*0.025).toFixed(3);};
const fqSpeak=f=>f.replace('.',' Komma ').split('').map(c=>/[0-9]/.test(c)?DIG[+c]:c).join(' ').replace(/\s+/g,' ');
const csSpeak=cs=>cs.startsWith('LUIS')?'Luis '+spell(cs.slice(5)):spell(cs);

const ZONE_V=128;// m/s ≈ 460 km/h ≈ 250 Knoten
const spdTxt=(v,metric)=>metric?[`${Math.round(v*3.6/10)*10} km/h`,`${Math.round(v*3.6/10)*10} Kilometer pro Stunde`]:[`${Math.round(v*1.944/10)*10} Knoten`,`${Math.round(v*1.944/10)*10} Knoten`];
const altTxt=(y,metric)=>metric?[`${Math.round(y/100)*100} m`,`${Math.round(y/100)*100} Meter`]:[`${Math.round(y*3.281/100)*100} Fuss`,`${Math.round(y*3.281/100)*100} Fuss`];
export function createATC(audio,opts){
  const A={on:false,log:[],pen:[],queue:[],t:0};
  let voice=null;
  function pickVoice(){try{const v=speechSynthesis.getVoices();voice=v.find(x=>/de-CH/i.test(x.lang))||v.find(x=>/^de/i.test(x.lang))||null;}catch(e){}}
  try{pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}catch(e){}
  const el=()=>document.getElementById('radio');
  function render(){const r=el();if(!r)return;if(!A.on){r.style.display='none';return;}r.style.display='';
    r.innerHTML=A.log.slice(-3).map(m=>`<div class="rl ${m.who}"><b>${m.who!=='me'?(m.nm||A.twrName).toUpperCase():'DU'}</b><span>${m.txt}</span></div>`).join('')+(A.prompt?`<div class="rp">${A.prompt}</div>`:'');}
  function say(who,txt,spk,delay){A.queue.push({at:A.t+(delay||0),who,txt,spk,nm:A.twrName});}
  function flush(){while(A.queue.length&&A.queue[0].at<=A.t){const m=A.queue.shift();A.log.push(m);if(A.log.length>12)A.log.shift();audio.radio&&audio.radio();
      if(opts.voice()&&m.spk){try{const u=new SpeechSynthesisUtterance(m.spk);u.lang=voice?voice.lang:'de-DE';if(voice)u.voice=voice;u.rate=m.who!=='me'?1.12:1.05;u.pitch=m.who!=='me'?0.85:1.15;u.volume=0.9;speechSynthesis.speak(u);}catch(e){}}
      render();}}
  function windTxt(W,metric){const d=Math.round(W.dir/10)*10||360,s=W.base??W.spd;if(s<1.5)return['Wind ruhig','Wind ruhig'];
    const v=metric?Math.round(s*3.6):Math.round(s*1.944),u=metric?'km/h':'Knoten';const g=W.gustTxt?' Böen':'';
    return[`Wind ${String(d).padStart(3,'0')}° ${v} ${u}${g}`,`Wind ${spell(String(d).padStart(3,'0'))} Grad, ${v} ${metric?'Kilometer pro Stunde':'Knoten'}${g}`];}
  A.start=c=>{A.on=c.enabled!==false;A.log=[];A.pen=[];A.queue=[];A.t=0;A.c=c;A.cs=c.callsign;A.csS=csSpeak(c.callsign);
    A.phase=c.onGround?'ground':'enroute';A.clrTO=false;A.clrLdg=false;A.reqTO=false;A.reqLdg=false;A.home=c.startAP;A.dest=c.dest;A.warned={};A.prompt='';A.depCall=false;A.leftHome=false;A.zone=null;A.fast={};
    A.twrA=c.onGround?c.startAP:c.dest;A.twrName=A.twrA?(TWR[A.twrA.icao]||{n:A.twrA.name+' Turm'}).n:'Funk';render();
    if(A.on&&c.onGround){const T=TWR[A.home.icao];if(T&&!T.c)A.clrTO=true;if(T&&T.c)A.atisAt=1.5;}};
  A.stop=()=>{A.on=false;render();try{speechSynthesis.cancel();}catch(e){}};
  const ctrl=Ap=>Ap&&(TWR[Ap.icao]||{}).c;
  // Ziel-Flugplatz: Missionsziel oder nächster Platz
  function target(F){if(A.dest)return A.dest;let b=null,bd=1e9;for(const Ap of AIRPORTS){const d=Math.hypot(F.pos.x-Ap.x,F.pos.z-Ap.z);if(d<bd){bd=d;b=Ap;}}return bd<16000?b:null;}
  function rwyFor(Ap,F){let best=null,bd=1e9;for(const R of AIRPORTS.filter(x=>x.icao===Ap.icao)){const l=toLocal(R,F.pos.x,F.pos.z);const sd=l.along<0?1:-1;
      const hd=Math.atan2(F.vel.x,-F.vel.z),rh=Math.atan2(R.sin*sd,R.cos*sd);let dh=Math.abs(((hd-rh)*180/Math.PI+540)%360-180);const sc=Math.abs(l.across)/1000+dh/30;if(sc<bd){bd=sc;best={R,sd,name:sd>0?R.rwyA:R.rwyB};}}return best;}
  A.press=(ctx)=>{if(!A.on)return;const F=ctx.F;const metric=ctx.metric;
    // Rollfreigabe: wer abseits der Piste steht (Gate, Vorfeld), bekommt zuerst die Freigabe zum Rollhalt
    if(A.phase==='ground'&&!A.reqTO&&!A.taxiClr&&ctrl(A.home)&&!ctx.onRwy){A.taxiClr=true;const Ap=A.home,rw=ctx.startRwy,gn=(TWR[Ap.icao]||{n:Ap.name}).n.replace(/ Turm$/,' Rollkontrolle');
      say('me',`${gn}, ${A.cs}, rollbereit, Information ${A.atisL||'Alpha'}.`,`${gn}, ${A.csS}, rollbereit, Information ${A.atisL||'Alpha'}`);
      // Rollweg-Namen aus dem echten Netz (OSM): «via D, F, E»; Namen wie «Link 1» bleiben ausgeschrieben
      const via=(ctx.taxiVia||[]).slice(0,7),hp=ctx.taxiHold?` ${ctx.taxiHold}`:'',sp=n=>/^[A-Z]{1,2}\d*$/.test(n)?spell(n):n;
      if(via.length){say('twr',`${A.cs}, rollen Sie zum Rollhalt${hp} Piste ${rw} via ${via.join(', ')}, halten Sie vor der Piste. Am Rollhalt Turm ${FQ(Ap.icao,'twr')}.`,`${A.csS}, rollen Sie zum Rollhalt${hp?' '+sp(hp.trim()):''} Piste ${spell(rw)} via ${via.map(sp).join(', ')}, halten Sie vor der Piste, am Rollhalt Turm ${fqSpeak(FQ(Ap.icao,'twr'))}`,1.6);return;}
      say('twr',`${A.cs}, rollen Sie zum Rollhalt Piste ${rw}, folgen Sie den grünen Rollweglichtern, halten Sie vor der Piste. Am Rollhalt Turm ${FQ(Ap.icao,'twr')}.`,`${A.csS}, rollen Sie zum Rollhalt Piste ${spell(rw)}, halten Sie vor der Piste, am Rollhalt Turm ${fqSpeak(FQ(Ap.icao,'twr'))}`,1.6);return;}
    if(A.phase==='ground'&&!A.reqTO){A.reqTO=true;const Ap=A.home,rw=ctx.startRwy;A.twrA=Ap;A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;
      say('me',`${A.twrName}, ${A.cs}, bereit zum Abflug Piste ${rw}.`,`${A.twrName}, ${A.csS}, bereit zum Abflug Piste ${spell(rw)}`);
      const [wt,ws]=windTxt(ctx.wind,metric);
      if(!ctrl(Ap)){say('twr',`${A.cs}, ${wt}, Piste ${rw} in Betrieb. Guten Flug!`,`${A.csS}, ${ws}, Piste ${spell(rw)} in Betrieb, guten Flug`,1.6);A.clrTO=true;return;}
      const busy=ctx.traffic&&ctx.traffic.busy(Ap,ctx.startRwyObj,'dep');
      if(busy){say('twr',`${A.cs}, warten Sie auf der Piste. ${busy}.`,`${A.csS}, warten Sie auf der Piste, ${busy}`,1.6);A.waitTO=true;}
      else{say('twr',`${A.cs}, ${wt}, Piste ${rw}, Start frei.`,`${A.csS}, ${ws}, Piste ${spell(rw)}, Start frei`,1.6);A.clrTO=true;}
      return;}
    if(A.phase==='ground'&&A.reqTO&&!A.clrTO){say('twr',`${A.cs}, bitte warten.`,`${A.csS}, bitte warten`,1);return;}
    // nach dem Start: erst die Abflugkontrolle, nicht schon wieder eine Landung anfragen
    // Platzrunde: wer nach dem Start tief bleibt (unter 450 m), kann nach 40 s direkt die Landung anfragen
    if(!F.onGround&&A.phase==='departure'&&A.t-A.depT<=40){say('me',`${A.twrName}, ${A.cs}, in der Luft.`,`${A.twrName}, ${A.csS}, in der Luft`);
      say('twr',`${A.cs}, weiter steigen. Ab ${altTxt(450,metric)[0]} über Grund rufen Sie die Abflugkontrolle.`,`${A.csS}, weiter steigen, danach rufen Sie die Abflugkontrolle`,1.4);return;}
    if(!F.onGround&&A.depCall){A.depCall=false;const nm=(A.home?A.home.name:'Abflug').split('-')[0]+' Abflug',[at,as]=altTxt(F.pos.y,metric);
      say('me',`${nm}, ${A.cs}, steigend durch ${at}.`,`${nm}, ${A.csS}, steigend durch ${as}`);
      A.twrName=nm;say('twr',`${A.cs}, ${nm}, Radarkontakt. Steigen Sie nach eigenem Ermessen. Gute Reise!`,`${A.csS}, ${nm}, Radarkontakt, steigen Sie nach eigenem Ermessen, gute Reise`,1.5);return;}
    const Ap=target(F);
    if(!F.onGround&&Ap){const d=Math.hypot(F.pos.x-Ap.x,F.pos.z-Ap.z),rw=rwyFor(Ap,F);A.twrA=Ap;A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;A.rw=rw;
      const [wt,ws]=windTxt(ctx.wind,metric);const km=Math.max(1,Math.round(d/1000));
      say('me',`${A.twrName}, ${A.cs}, ${km} km vor dem Platz, für Landung Piste ${rw.name}.`,`${A.twrName}, ${A.csS}, ${km} Kilometer vor dem Platz, für Landung Piste ${spell(rw.name)}`);
      A.reqLdg=true;A.ldgAP=Ap;
      if(!ctrl(Ap)){say('twr',`${A.cs}, ${wt}, Piste ${rw.name} in Betrieb.`,`${A.csS}, ${ws}, Piste ${spell(rw.name)} in Betrieb`,1.6);A.clrLdg=true;return;}
      const busy=ctx.traffic&&ctx.traffic.busy(Ap,rw.R,'arr');
      if(busy){say('twr',`${A.cs}, Sie sind Nummer zwei, ${busy}. Weiter im Anflug.`,`${A.csS}, Sie sind Nummer zwo, ${busy}, weiter im Anflug`,1.6);A.waitLdg=true;}
      else{say('twr',`${A.cs}, ${wt}, Piste ${rw.name}, Landung frei.`,`${A.csS}, ${ws}, Piste ${spell(rw.name)}, Landung frei`,1.6);A.clrLdg=true;}
      return;}
    say('twr',`${A.cs}, kein Platz in Reichweite. Melden Sie sich 15 km vor dem Ziel.`,`${A.csS}, melden Sie sich fünfzehn Kilometer vor dem Ziel`,1.2);};
  function penalty(txt,spk){if(A.pen.includes(txt))return;A.pen.push(txt);say('twr',`${A.cs}, ${txt}! Das wird gemeldet.`,`${A.csS}, ${spk||txt}, das wird gemeldet`,0.4);opts.onPenalty&&opts.onPenalty(txt);}
  A.event=(ev,ctx)=>{if(!A.on)return;
    if(ev==='liftoff'&&A.phase==='ground'){if(ctrl(A.home)&&!A.clrTO)penalty('Start ohne Freigabe','Start ohne Freigabe');A.phase='departure';A.depT=A.t;}
    else if(ev==='liftoff'&&A.phase==='landed'){A.phase='departure';A.reqLdg=A.clrLdg=false;A.home=A.twrA;A.warned.dep=0;A.warned.wel=0;}
    if(ev==='touchdown'){const Ap=ctx.ap;if(Ap&&A.phase!=='ground'){if(ctrl(Ap)&&!(A.clrLdg&&A.ldgAP&&A.ldgAP.icao===Ap.icao))penalty('Landung ohne Freigabe');A.phase='landed';A.twrA=Ap;A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;}}
    if(ev==='stopped'&&A.phase==='landed'&&!A.warned.wel){A.warned.wel=1;say('twr',`${A.cs}, willkommen in ${A.twrA.name}! Verlassen Sie die Piste und rollen Sie zum Vorfeld.`,`${A.csS}, willkommen in ${A.twrA.name}`,1.2);}};
  A.update=(dt,ctx)=>{if(!A.on)return;A.t+=dt;flush();const F=ctx.F;let p='';A.zone=null;
    // ATIS: Wetter und Piste vor dem Start (Buchstabe wechselt stündlich)
    if(A.atisAt!=null&&A.t>=A.atisAt){A.atisAt=null;const Ap=A.home,L='ABCDEFGHIKLMNOPQRSTUVWXYZ'[(new Date().getHours()+hsh(Ap.icao))%24],LN={A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-Ray',Y:'Yankee',Z:'Zulu'}[L];
      A.atisL=LN;const [wt,ws]=windTxt(ctx.wind,ctx.metric),T=Math.round(ctx.temp??14),q=1007+hsh(Ap.icao+new Date().toDateString())%17,vis=ctx.vis||'über 10 km';
      A.twrName=Ap.name+' ATIS';say('atis',`${Ap.name} Information ${LN}: Piste ${ctx.startRwy} in Betrieb, ${wt}, Sicht ${vis}, Temperatur ${T}°, QNH ${q}. Turm ${FQ(Ap.icao,'twr')}, Rollkontrolle ${FQ(Ap.icao,'gnd')}.`,
        `${Ap.name} Information ${LN}, Piste ${spell(ctx.startRwy)} in Betrieb, ${ws}, Temperatur ${T} Grad, Q N H ${spell(String(q))}`);A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;}
    const key=ctx.pad?'L3 / Create':'T';
    if(A.phase==='ground'){if(!A.reqTO)p=!A.taxiClr&&!ctx.onRwy&&ctrl(A.home)?`Funk: ${key} drücken – Rollfreigabe anfordern`:`Funk: ${key} drücken – Startfreigabe anfordern`;else if(!A.clrTO)p='Warte auf Startfreigabe …';
      if(A.waitTO&&!A.clrTO&&!(ctx.traffic&&ctx.traffic.busy(A.home,ctx.startRwyObj,'dep'))){A.waitTO=false;A.clrTO=true;const [wt,ws]=windTxt(ctx.wind,ctx.metric);say('twr',`${A.cs}, ${wt}, Piste ${ctx.startRwy}, Start frei.`,`${A.csS}, ${ws}, Piste ${spell(ctx.startRwy)}, Start frei`,0.5);}}
    else if(!F.onGround){
      if(A.phase==='departure'&&ctx.agl>450&&!A.warned.dep){A.warned.dep=1;A.phase='enroute';if(ctrl(A.home)){A.depCall=true;say('twr',`${A.cs}, kontaktieren Sie die Abflugkontrolle auf ${FQ(A.home.icao,'dep')}. Auf Wiederhören!`,`${A.csS}, kontaktieren Sie die Abflugkontrolle auf ${fqSpeak(FQ(A.home.icao,'dep'))}, auf Wiederhören`);}}
      if(A.depCall)p=`Funk: ${key} drücken – Abflugkontrolle rufen`;
      if(A.home&&!A.leftHome&&Math.hypot(F.pos.x-A.home.x,F.pos.z-A.home.z)>16000)A.leftHome=true;
      const Ap=target(F);
      const circuit=A.phase==='departure'&&A.depT!=null&&A.t-A.depT>40;
      if(Ap&&(A.phase!=='departure'||circuit)){const d=Math.hypot(F.pos.x-Ap.x,F.pos.z-Ap.z);
        if(A.reqLdg&&A.ldgAP&&A.ldgAP.icao===Ap.icao){
          if(A.waitLdg&&!A.clrLdg&&!(ctx.traffic&&ctx.traffic.busy(Ap,A.rw.R,'arr'))){A.waitLdg=false;A.clrLdg=true;const [wt,ws]=windTxt(ctx.wind,ctx.metric);say('twr',`${A.cs}, ${wt}, Piste ${A.rw.name}, Landung frei.`,`${A.csS}, ${ws}, Piste ${spell(A.rw.name)}, Landung frei`,0.3);}
          if(!A.clrLdg)p='Warte auf Landefreigabe – weiter im Anflug';
          if(d>20000){A.reqLdg=false;A.clrLdg=false;}}
        else if(!A.depCall&&d<16000&&(A.phase==='enroute'||A.phase==='landed'||circuit)&&!(!circuit&&A.depT!=null&&!A.leftHome&&A.t-A.depT<240&&A.home&&A.home.icao===Ap.icao)){p=`Funk: ${key} drücken – Landefreigabe für ${Ap.name} anfordern`;
          if(d<4500&&ctrl(Ap)&&!A.warned['call'+Ap.icao]&&ctx.agl<350&&F.vel.y<-1){A.warned['call'+Ap.icao]=1;A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;say('twr',`Unbekanntes Flugzeug im Anflug, melden Sie sich bei ${A.twrName}!`,`Unbekanntes Flugzeug im Anflug, melden Sie sich`);}}
        // Nahbereich kontrollierter Plätze: unter 1000 m über Grund und näher als 10 km höchstens 460 km/h (250 Knoten)
        const inZone=d<10000&&ctx.agl<1000&&ctrl(Ap)&&!(A.depT!=null&&A.t-A.depT<240&&A.home&&A.home.icao===Ap.icao);
        A.zone=inZone?{name:Ap.name,limit:ZONE_V,d}:null;
        if(inZone&&F.ias>ZONE_V){const f=A.fast[Ap.icao]||(A.fast[Ap.icao]={t:0,warned:false});f.t+=F.ias>ZONE_V*1.07?dt:dt*0.3;const [lt,ls]=spdTxt(ZONE_V,ctx.metric),[vt]=spdTxt(F.ias,ctx.metric);
          if(!f.warned){f.warned=true;A.twrName=(TWR[Ap.icao]||{n:Ap.name}).n;say('twr',`${A.cs}, Sie sind im Nahbereich von ${Ap.name}: reduzieren Sie auf höchstens ${lt}.`,`${A.csS}, reduzieren Sie auf höchstens ${ls}`,0.3);
            opts.onInfo&&opts.onInfo(`Tempolimit: im Umkreis von 10 km um ${Ap.name} und unter 1000 m über Grund gilt höchstens ${lt}. Du fliegst ${vt} – Schub reduzieren (S) oder Luftbremse (B).`);}
          if(f.t>25&&!f.warn2){f.warn2=true;say('twr',`${A.cs}, letzte Warnung: reduzieren Sie sofort auf ${lt}.`,`${A.csS}, letzte Warnung, reduzieren Sie auf ${ls}`,0.3);}
          if(f.t>50)penalty(`zu schnell im Nahbereich von ${Ap.name} (${vt} statt höchstens ${lt})`,'zu schnell im Nahbereich');}
        else if(A.fast[Ap.icao]&&F.ias<=ZONE_V)A.fast[Ap.icao].t=Math.max(0,A.fast[Ap.icao].t-dt*3);}
      else A.zone=null;}
    if(p!==A.prompt){A.prompt=p;render();}};
  A.score=()=>Math.max(0,100-A.pen.length*30);
  return A;
}
