// Einstieg: Desktop im Stil von Windows 11 – eigenes Hintergrundbild (Alpen-Glas), Taskleiste, Startmenü, Info-Fenster
const $=id=>document.getElementById(id);
const desk=$('desk'),win=$('win'),cv=$('stars'),ctx=cv.getContext('2d');
let W=0,H=0,dpr=1,open=false,pct=0,raf=0,bokeh=[],game=false;
function size(){dpr=Math.min(2,devicePixelRatio||1);W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
  bokeh=[];for(let i=0;i<14;i++)bokeh.push({x:Math.random(),y:Math.random()*0.7,r:20+Math.random()*90,a:0.03+Math.random()*0.07,s:0.2+Math.random()*0.6,p:Math.random()*6});}
// Bergkamm als glatte Kurve aus Sinuswellen
const ridge=(x,k,t)=>Math.sin(x*2.1*k+1.3*k+t*0.05)*0.045+Math.sin(x*5.3*k+0.7+t*0.03)*0.022+Math.sin(x*11.7+k*3)*0.008-Math.abs(Math.sin(x*1.6+k))*0.05;
function draw(ts){if(desk.classList.contains('gone'))return;raf=requestAnimationFrame(draw);const t=ts*0.001;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1d4f');g.addColorStop(0.45,'#1b56c2');g.addColorStop(0.8,'#5e9cf0');g.addColorStop(1,'#a9d0ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // weiches Licht hinter den Bergen
  const gl=ctx.createRadialGradient(W*0.62,H*0.48,0,W*0.62,H*0.48,Math.max(W,H)*0.55);gl.addColorStop(0,'rgba(210,235,255,0.55)');gl.addColorStop(0.35,'rgba(150,200,255,0.18)');gl.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
  for(const b of bokeh){const x=(b.x*W+Math.sin(t*b.s*0.2+b.p)*30*dpr),y=b.y*H+Math.cos(t*b.s*0.15+b.p)*20*dpr,r=b.r*dpr;const rg=ctx.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,`rgba(255,255,255,${b.a})`);rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
  // gläserne Bergketten, hinten hell, vorne dunkel
  const L=[[0.5,0.62,'rgba(200,228,255,0.55)','rgba(120,170,240,0.25)'],[0.62,0.8,'rgba(130,185,255,0.6)','rgba(40,100,210,0.45)'],[0.72,1.1,'rgba(70,130,230,0.75)','rgba(15,60,160,0.7)'],[0.84,1.45,'rgba(20,60,150,0.9)','rgba(8,28,80,0.95)']];
  L.forEach(([base,k,c1,c2],i)=>{const pts=[];for(let s=0;s<=80;s++){const x=s/80;pts.push([x*W,(base+ridge(x,k+i*0.37,t*(1+i*0.4)))*H]);}
    const lg=ctx.createLinearGradient(0,(base-0.12)*H,0,H);lg.addColorStop(0,c1);lg.addColorStop(1,c2);ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(0,H);for(const p of pts)ctx.lineTo(p[0],p[1]);ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    ctx.strokeStyle=`rgba(255,255,255,${0.32-i*0.06})`;ctx.lineWidth=1.2*dpr;ctx.beginPath();pts.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();});}
function clock(){const d=new Date();$('tTime').textContent=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;$('tDate').textContent=`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;}
const startm=$('startm');
function startToggle(on){const v=on??startm.classList.contains('hidden');startm.classList.toggle('hidden',!v);$('tbStart').classList.toggle('on',v);}
function openWin(){startToggle(false);if(game){play();return;}if(open){win.classList.remove('hidden');return;}open=true;$('dhint').style.display='none';win.classList.remove('hidden','closing');win.classList.add('opening');$('dockApp').classList.add('run');setTimeout(()=>win.classList.remove('opening'),300);$('wPlay').focus();}
function closeWin(min){if(!open)return;win.classList.add('closing');if(!min){open=false;$('dockApp').classList.remove('run');}setTimeout(()=>{win.classList.add('hidden');win.classList.remove('closing');},180);}
function play(){game=true;$('dockApp').classList.add('run');desk.classList.add('leaving');setTimeout(()=>{desk.classList.add('gone');cancelAnimationFrame(raf);},550);if(window.__deskPlay)window.__deskPlay();else window.__deskWantPlay=true;}
// Desktop-Symbole: Klick wählt aus, Doppelklick öffnet (Touch: Tippen öffnet)
document.querySelectorAll('.dico').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.dico').forEach(d=>d.classList.toggle('sel',d===el));startToggle(false);});});
$('dicon').addEventListener('dblclick',openWin);$('dicon').addEventListener('pointerup',e=>{if(e.pointerType==='touch')openWin();});
$('dbin').addEventListener('dblclick',()=>{$('dbin').animate([{transform:'rotate(0)'},{transform:'rotate(-6deg)'},{transform:'rotate(6deg)'},{transform:'rotate(0)'}],{duration:350});});
$('dockApp').addEventListener('click',e=>{e.stopPropagation();if(game){play();return;}if(open&&!win.classList.contains('hidden'))closeWin(true);else openWin();});
$('tbStart').addEventListener('click',e=>{e.stopPropagation();startToggle();});$('tbSearch').addEventListener('click',e=>{e.stopPropagation();startToggle(true);});
startm.addEventListener('click',e=>e.stopPropagation());$('sApp').addEventListener('click',openWin);$('sRec').addEventListener('click',()=>{openWin();setTimeout(()=>{const n=document.querySelector('#win .news');if(n)n.scrollIntoView({behavior:'smooth',block:'center'});},320);});
desk.addEventListener('click',()=>{startToggle(false);document.querySelectorAll('.dico').forEach(d=>d.classList.remove('sel'));});
win.addEventListener('click',e=>e.stopPropagation());
$('wClose').addEventListener('click',e=>{e.stopPropagation();closeWin();});$('wMin').addEventListener('click',e=>{e.stopPropagation();closeWin(true);});$('wMax').addEventListener('click',e=>{e.stopPropagation();win.classList.toggle('max');});
document.querySelector('#win .wbar').addEventListener('dblclick',()=>win.classList.toggle('max'));
$('wPlay').addEventListener('click',play);
try{if(sessionStorage.getItem('alpenflug-skipdesk')){sessionStorage.removeItem('alpenflug-skipdesk');setTimeout(play,50);}}catch(e){}
addEventListener('keydown',e=>{if(desk.classList.contains('gone'))return;if(e.code==='Enter'||e.code==='Space'){e.preventDefault();open&&!win.classList.contains('hidden')?play():openWin();}else if(e.code==='Escape'){if(!startm.classList.contains('hidden'))startToggle(false);else closeWin();}else if(e.code==='MetaLeft'||e.code==='MetaRight'){e.preventDefault();startToggle();}},true);
// Controller: ✕ öffnet bzw. startet, ○ schliesst
let padPrev={};function padPoll(){if(desk.classList.contains('gone'))return;requestAnimationFrame(padPoll);const ps=navigator.getGamepads?navigator.getGamepads():[];
  for(const g of ps){if(!g)continue;const b=i=>g.buttons[i]&&g.buttons[i].pressed;for(const i of [0,1,9]){const p=b(i);if(p&&!padPrev[i]){if(i===0||i===9)open&&!win.classList.contains('hidden')?play():openWin();if(i===1)closeWin();}padPrev[i]=p;}break;}}
function show(){startToggle(false);win.classList.add('hidden');open=false;$('dockApp').classList.add('run');
  const h=$('dhint');h.style.display='';h.innerHTML='Swiss Sky ist pausiert – klicke unten in der Taskleiste auf <b>Swiss Sky</b>, um weiterzuspielen';
  desk.classList.add('leaving');desk.classList.remove('gone');requestAnimationFrame(()=>requestAnimationFrame(()=>desk.classList.remove('leaving')));
  cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);padPrev={0:true,1:true,9:true};requestAnimationFrame(padPoll);}
window.__desk={show,progress:(p,t)=>{pct=p;$('wBar').style.width=Math.round(p*100)+'%';$('wStat').textContent=p>=1?'Bereit – viel Spass beim Fliegen!':`Wird im Hintergrund geladen … ${Math.round(p*100)} %`;if(p>=1)$('wStat').classList.add('ok');}};
try{if(matchMedia('(pointer:coarse)').matches)$('dhint').innerHTML='Tippe auf <b>Swiss Sky</b>, um zu starten';}catch(e){}
addEventListener('resize',size);size();clock();setInterval(clock,10000);raf=requestAnimationFrame(draw);requestAnimationFrame(padPoll);
