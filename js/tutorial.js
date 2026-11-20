// Flugschule: Lektionen mit Fluglehrer – jede Lektion besteht aus Schritten mit Prüfbedingung
import {AREA_ID} from './worldgen.js';
const DEG=Math.PI/180;
const kmh=v=>Math.round(v*3.6);
// c: {F,P,G,V,agl,hdg,bank,vs,glide,dH,s}  s = Schritt-Zustand (frei beschreibbar)
const LESSONS_ZS=[
 {id:'l1',name:'Rollen am Boden',plane:'alpina',ap:'BIR',rev:false,air:false,hour:10,weather:'clear',
  brief:'Hier lernst du Schub, Seitenruder und Bremsen kennen – noch ohne abzuheben.',
  steps:[
   {t:'Willkommen in der Alpina S-72! Gib mit W Vollgas. Der Balken unten rechts zeigt den Schub.',ok:c=>c.F.thr>0.95,info:c=>`Schub ${Math.round(c.F.thr*100)} %`},
   {t:'Halte die gelbe Mittellinie mit Q und E (Seitenruder/Bugrad). Beschleunige auf 60 km/h – noch nicht ziehen!',ok:c=>c.V>16.7,info:c=>`${kmh(c.V)} / 60 km/h`},
   {t:'Schub weg mit S und bremse mit B bis zum Stillstand.',ok:c=>c.F.onGround&&c.V<1,info:c=>`${kmh(c.V)} km/h`},
   {t:'Sehr gut! Mit G fährst du bei grossen Flugzeugen das Fahrwerk ein und aus – die Alpina hat ein festes Fahrwerk. Drücke C, um die Kameraansicht zu wechseln.',ok:c=>c.s.KeyC},
 ]},
 {id:'l2',name:'Der erste Start',plane:'alpina',ap:'BIR',rev:false,air:false,hour:9,weather:'fair',
  brief:'Vom Startlauf bis zum Steigflug: Vollgas, rotieren, steigen, Schub reduzieren.',
  steps:[
   {t:'Setze die Klappen auf Stufe 1 mit F – sie erzeugen mehr Auftrieb, damit du früher abheben kannst.',ok:c=>c.F.flaps>=1},
   {t:'Vollgas mit W und Mittellinie halten (Q/E).',ok:c=>c.F.thr>0.95},
   {t:'Bei ca. 100 km/h (blaue R-Marke auf dem Tacho) die Nase mit ↓ sanft anheben.',ok:c=>!c.F.onGround&&c.agl>5,info:c=>`${kmh(c.V)} km/h`},
   {t:'Abgehoben! Steige auf 300 m über Grund. Halte die Nase ca. 8° über dem Horizont.',ok:c=>c.agl>300,info:c=>`Höhe über Grund ${Math.round(c.agl)} / 300 m`},
   {t:'Klappen einfahren mit V und Schub mit S auf ca. 75 % reduzieren.',ok:c=>c.F.flaps===0&&c.F.thr<0.8,info:c=>`Klappen ${c.F.flaps} · Schub ${Math.round(c.F.thr*100)} %`},
 ]},
 {id:'l3',name:'Horizontalflug & Autopilot',plane:'alpina',ap:'BIR',rev:false,air:true,airAt:[2500,550],hour:12,weather:'fair',
  brief:'Höhe halten, steigen und sinken – und den Autopiloten kennenlernen.',
  steps:[
   {t:'Lass alle Tasten los. Die Flughilfe hält die Fluglage. Fliege 5 Sekunden ruhig geradeaus.',hold:5,ok:c=>Math.abs(c.vs)<2.5&&Math.abs(c.bank)<5*DEG,info:c=>`Steigrate ${c.vs.toFixed(1)} m/s`},
   {t:'Steige mit ↓ (Nase hoch) um 150 m.',ok:c=>c.dH>150,info:c=>`+${Math.round(Math.max(0,c.dH))} / 150 m`},
   {t:'Sinke mit ↑ (Nase runter) zurück auf die Ausgangshöhe (± 30 m).',ok:c=>Math.abs(c.dH)<30,info:c=>`${c.dH>0?'+':''}${Math.round(c.dH)} m`},
   {t:'Beschleunige mit W auf 200 km/h.',ok:c=>c.V>55.5,info:c=>`${kmh(c.V)} / 200 km/h`},
   {t:'Schalte den Autopiloten mit U ein. Er hält Kurs, Höhe und Tempo.',ok:c=>!!c.G.ap},
   {t:'Mit Q/E änderst du den Kurs des Autopiloten, mit W/S das Tempo. Drehe den Kurs um 30°.',ok:c=>Math.abs(c.dHdg)>28,info:c=>`${Math.round(Math.abs(c.dHdg))} / 30°`},
   {t:'Jede Steuereingabe (Pfeiltasten, A/D) schaltet den Autopiloten aus. Übernimm wieder selbst.',ok:c=>!c.G.ap},
 ]},
 {id:'l4',name:'Kurven fliegen',plane:'alpina',ap:'BIR',rev:false,air:true,airAt:[2500,600],hour:15,weather:'fair',
  brief:'Querneigung, Kurvenflug und wieder Ausleiten – ohne Höhe zu verlieren.',
  steps:[
   {t:'Neige das Flugzeug mit A nach links, bis ca. 25° Querneigung erreicht sind.',ok:c=>Math.abs(c.bank)>20*DEG,info:c=>`Querneigung ${Math.round(Math.abs(c.bank)/DEG)}°`},
   {t:'Halte die Kurve (A antippen), bis du 90° gedreht hast. Die Höhe wird automatisch gehalten.',ok:c=>Math.abs(c.dHdg)>85,info:c=>`${Math.round(Math.abs(c.dHdg))} / 90°`},
   {t:'Lass A los – die Flügel richten sich wieder auf. Fliege 3 s geradeaus.',hold:3,ok:c=>Math.abs(c.bank)<6*DEG,info:c=>`Querneigung ${Math.round(Math.abs(c.bank)/DEG)}°`},
   {t:'Jetzt eine Rechtskurve mit D um 180°.',ok:c=>Math.abs(c.dHdg)>170,info:c=>`${Math.round(Math.abs(c.dHdg))} / 180°`},
   {t:'Ausleiten und geradeaus fliegen. Prüfe: Hast du Höhe verloren? (Ziel: ± 60 m)',hold:2,ok:c=>Math.abs(c.bank)<6*DEG,info:c=>`Höhenabweichung ${Math.round(c.dH0)} m`},
 ]},
 {id:'l5',name:'Klappen & Langsamflug',plane:'alpina',ap:'BIR',rev:false,air:true,airAt:[2500,650],hour:17,weather:'clear',
  brief:'Wozu Klappen? Sie wölben den Flügel: mehr Auftrieb bei kleinem Tempo, aber mehr Widerstand. Start: Stufe 1. Landung: voll.',
  steps:[
   {t:'Reduziere den Schub mit S auf ca. 30 %.',ok:c=>c.F.thr<0.35,info:c=>`Schub ${Math.round(c.F.thr*100)} %`},
   {t:'Fahre die Klappen mit F auf Stufe 1. Du kannst jetzt langsamer fliegen, ohne zu überziehen.',ok:c=>c.F.flaps>=1},
   {t:'Klappen voll ausfahren (F mehrmals). Spürst du den Widerstand? Ideal für steile, langsame Anflüge.',ok:c=>c.F.flaps>=3},
   {t:'Fliege 8 Sekunden stabil langsamer als 140 km/h.',hold:8,ok:c=>c.V<38.9&&!c.F.stalled,info:c=>`${kmh(c.V)} km/h`},
   {t:'Durchstarten üben: Vollgas (W) und Klappen schrittweise einfahren (V).',ok:c=>c.F.flaps===0&&c.F.thr>0.9,info:c=>`Klappen ${c.F.flaps} · Schub ${Math.round(c.F.thr*100)} %`},
 ]},
 {id:'l6',name:'Überziehen erkennen',plane:'alpina',ap:'BIR',rev:false,air:true,airAt:[2500,900],hour:11,weather:'clear',noAssist:true,
  brief:'Die Flughilfe ist in dieser Lektion aus. Du lernst, wie ein Strömungsabriss entsteht und wie du ihn beendest.',
  steps:[
   {t:'Flughilfe ist AUS. Nimm den Schub ganz weg (S).',ok:c=>c.F.thr<0.05},
   {t:'Ziehe die Nase mit ↓ langsam hoch und halte sie oben, bis die Überziehwarnung erscheint.',ok:c=>c.F.stalled||c.V<c.vst*1.05,info:c=>`${kmh(c.V)} km/h · Überziehen bei ${kmh(c.vst)} km/h`},
   {t:'ERHOLEN: Nase runter (↑), Vollgas (W)! Dann sanft abfangen.',ok:c=>c.V>c.vst*1.45&&c.F.thr>0.9&&c.vs>-1,info:c=>`${kmh(c.V)} km/h · ${c.vs.toFixed(1)} m/s`},
 ]},
 {id:'l7',name:'Anflug und Landung',plane:'alpina',ap:'BIR',rev:false,air:true,hour:18.5,weather:'fair',
  brief:'Du startest im Endanflug auf Birrfeld. Klappen, Gleitpfad, Mittellinie – und sanft aufsetzen.',
  steps:[
   {t:'Setze die Klappen (F) und reduziere den Schub auf ca. 40 %.',ok:c=>c.F.flaps>=1&&c.F.thr<0.5},
   {t:'Folge dem Gleitpfad-Hinweis (oben): «zu hoch» → Nase runter/Schub weg, «zu tief» → Schub. Halte ihn 6 Sekunden.',hold:6,ok:c=>c.glide&&c.glide.ok,info:c=>c.glide?c.glide.txt:'Piste voraus suchen'},
   {t:'Richte dich mit A/D auf die Mittellinie aus (weniger als 25 m daneben).',hold:2,ok:c=>c.glide&&Math.abs(c.glide.across)<25,info:c=>c.glide?`${Math.round(Math.abs(c.glide.across))} m daneben`:''},
   {t:'Klappen voll (F). Tempo ca. 120 km/h halten.',ok:c=>c.F.flaps>=3,info:c=>`${kmh(c.V)} km/h`},
   {t:'Über der Schwelle: Schub weg (S) und mit ↓ sanft abfangen. Aufsetzen und bremsen (B).',land:true,ok:c=>c.F.onGround&&c.V<2.5&&c.G.lastTouch,info:c=>c.glide?c.glide.txt:`${kmh(c.V)} km/h`},
 ]},
 {id:'l8',name:'Airliner-Landung Zürich',plane:'l320',ap:'ZRH14',rev:false,air:true,hour:16,weather:'fair',
  brief:'Grosse Flugzeuge reagieren träge: früh stabilisieren, Fahrwerk und Klappen rechtzeitig, maximal ca. 25° Querneigung.',
  steps:[
   {t:'Du fliegst die LUIS L-320. Fahrwerk ausfahren (G).',ok:c=>c.F.gear},
   {t:'Klappen auf Stufe 3 (F) – Stufe für Stufe, Tempo unter 300 km/h halten.',ok:c=>c.F.flaps>=3,info:c=>`${kmh(c.V)} km/h · Klappen ${c.F.flaps}`},
   {t:'Stabil auf dem Gleitpfad bleiben (6 s). Tipp: Autopilot U hilft beim Ausrichten – vor der Landung ausschalten!',hold:6,ok:c=>c.glide&&c.glide.ok,info:c=>c.glide?c.glide.txt:''},
   {t:'Lande auf Piste 14. Bremse mit B – grosse Jets nutzen dabei Schubumkehr.',land:true,ok:c=>c.F.onGround&&c.V<2.5&&c.G.lastTouch,info:c=>c.glide?c.glide.txt:`${kmh(c.V)} km/h`},
 ]},
 {id:'l9',name:'Prüfungsflug: Platzrunde',plane:'alpina',ap:'BIR',rev:false,air:false,hour:19.6,weather:'fair',exam:true,
  brief:'Die praktische Prüfung: Start, Platzrunde und Landung ohne Hilfe der Ringe. Mindestnote C.',
  steps:[
   {t:'Starte von Piste 08 (Klappen 1, Vollgas, bei R ziehen).',ok:c=>!c.F.onGround&&c.agl>30},
   {t:'Steige auf 300 m über Grund.',ok:c=>c.agl>280,info:c=>`${Math.round(c.agl)} / 300 m`},
   {t:'Fliege eine Kurve um 180° (Gegenanflug), Klappen ein.',ok:c=>Math.abs(c.dHdg)>165,info:c=>`${Math.round(Math.abs(c.dHdg))} / 180°`},
   {t:'Fliege im Gegenanflug mindestens 2 km parallel zur Piste.',ok:c=>c.distAP>2200,info:c=>`${(c.distAP/1000).toFixed(1)} km vom Platz`},
   {t:'Drehe zurück in den Endanflug und lande auf Piste 08 oder 26. Gleitpfad-Hinweis beachten!',land:true,ok:c=>c.F.onGround&&c.V<2.5&&c.G.lastTouch,info:c=>c.glide?c.glide.txt:`${(c.distAP/1000).toFixed(1)} km vom Platz`},
 ]},
];
// Im Berner Oberland findet die Flugschule in Bern-Belp statt (gleiche Lektionen, angepasste Orte)
const BO_TXT=[['Birrfeld','Bern-Belp'],['Airliner-Landung Zürich','Airliner-Landung Bern'],['Piste 08 oder 26','Piste 14 oder 32'],['Piste 08','Piste 14']];
const boL=L=>({...L,ap:{BIR:'BRN',ZRH14:'BRN'}[L.ap]||L.ap,name:BO_TXT.reduce((t,[a,b])=>t.split(a).join(b),L.name),brief:BO_TXT.reduce((t,[a,b])=>t.split(a).join(b),L.brief),
  steps:L.steps.map(st=>({...st,t:BO_TXT.reduce((t,[a,b])=>t.split(a).join(b),st.t)}))});
export const LESSONS=AREA_ID==='bo'?LESSONS_ZS.map(boL):LESSONS_ZS;

// Ein Simulationsschritt der Lektion. Liefert {done, stepDone}
export function tutorTick(L,st,c,dt){
  const S=L.steps[st.k];if(!S)return{done:true};
  if(!st.s){st.s={};st.h0=c.hdg;st.alt0=c.F.pos.y;st.hold=0;}
  c.s=st.s;st.c=c;let d=((c.hdg-st.h0+540)%360)-180;st.acc=(st.acc||0)+(d-(st.lastD||0));st.lastD=d;c.dHdg=st.acc;c.dH=c.F.pos.y-st.alt0;c.dH0=c.F.pos.y-(st.alt00??st.alt0);
  let ok=false;try{ok=!!S.ok(c);}catch(e){ok=false;}
  if(S.hold){st.hold=ok?st.hold+dt:0;ok=st.hold>=S.hold;}
  if(ok){st.k++;st.s=null;st.acc=0;st.lastD=0;return{stepDone:true,done:st.k>=L.steps.length};}
  return{};
}
