// PS5-/Xbox-Controller über die Gamepad-API (Standard-Belegung)
// Tasten-Indizes (DualSense in Chrome/Edge/Safari): 0 Kreuz, 1 Kreis, 2 Quadrat, 3 Dreieck, 4 L1, 5 R1, 6 L2, 7 R2,
// 8 Create, 9 Options, 10 L3, 11 R3, 12-15 Steuerkreuz ↑↓←→, 16 PS, 17 Touchpad
export const BTN={X:0,O:1,SQ:2,TRI:3,L1:4,R1:5,L2:6,R2:7,CREATE:8,OPTIONS:9,L3:10,R3:11,UP:12,DOWN:13,LEFT:14,RIGHT:15,PS:16,PAD:17};
const DZ=0.1;
const dz=v=>Math.abs(v)<DZ?0:Math.sign(v)*(Math.abs(v)-DZ)/(1-DZ);
export function createGamepad(onConnect){
  const P={connected:false,name:'',lx:0,ly:0,rx:0,ry:0,l2:0,r2:0,down:new Set(),edges:[],idx:-1,isPS:false};
  addEventListener('gamepadconnected',e=>{P.idx=e.gamepad.index;P.name=e.gamepad.id;P.isPS=/dualsense|dualshock|054c|playstation|wireless controller/i.test(e.gamepad.id);if(onConnect)onConnect(true,P);});
  addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===P.idx){P.connected=false;P.idx=-1;if(onConnect)onConnect(false,P);}});
  let rep={};
  P.poll=(dt)=>{
    P.edges.length=0;
    const pads=navigator.getGamepads?navigator.getGamepads():[];let g=null;
    if(P.idx>=0)g=pads[P.idx];if(!g)for(const q of pads)if(q&&q.connected){g=q;P.idx=q.index;P.name=q.id;break;}
    if(!g){P.connected=false;P.lx=P.ly=P.rx=P.ry=P.l2=P.r2=0;P.down.clear();return P;}
    if(!P.connected){P.connected=true;P.isPS=/dualsense|dualshock|054c|playstation|wireless controller/i.test(g.id);}
    const a=g.axes;P.lx=dz(a[0]||0);P.ly=dz(a[1]||0);P.rx=dz(a[2]||0);P.ry=dz(a[3]||0);
    const b=g.buttons,val=i=>b[i]?(typeof b[i]==='object'?b[i].value:b[i]):0,pr=i=>b[i]?(typeof b[i]==='object'?b[i].pressed:b[i]===1):false;
    P.l2=val(BTN.L2);P.r2=val(BTN.R2);
    // Manche Browser melden die Trigger als Achsen 4/5 (-1..1)
    if(!b[BTN.L2]&&a.length>5){P.l2=(a[4]+1)/2;P.r2=(a[5]+1)/2;}
    for(let i=0;i<b.length;i++){const d=pr(i);if(d&&!P.down.has(i)){P.down.add(i);P.edges.push(i);rep[i]=0.42;}else if(!d)P.down.delete(i);
      else if(i>=12&&i<=15){rep[i]-=dt;if(rep[i]<=0){P.edges.push(i);rep[i]=0.12;}}}
    // linker Stick als Steuerkreuz (für Menüs)
    P.stickDir=null;const m=Math.max(Math.abs(P.lx),Math.abs(P.ly));
    if(m>0.6){const d=Math.abs(P.lx)>Math.abs(P.ly)?(P.lx>0?BTN.RIGHT:BTN.LEFT):(P.ly>0?BTN.DOWN:BTN.UP);if(P.lastStick!==d||(P.stickT-=dt)<=0){P.stickDir=d;P.stickT=P.lastStick===d?0.14:0.4;}P.lastStick=d;}else P.lastStick=null;
    P.g=g;return P;
  };
  P.rumble=(strong,weak,ms)=>{const g=P.g;if(!g)return;try{const v=g.vibrationActuator;if(v&&v.playEffect)v.playEffect('dual-rumble',{startDelay:0,duration:ms||200,strongMagnitude:Math.min(1,strong),weakMagnitude:Math.min(1,weak)});}catch(e){}};
  return P;
}

// Räumliche Fokus-Navigation für Menüs mit dem Controller
export function createMenuNav(){
  const N={cur:null};
  function layer(){for(const id of ['brief','result','pause','mapov','menu']){const el=document.getElementById(id);if(el&&!el.classList.contains('hidden')&&el.getClientRects().length)return el;}return null;}
  function items(L){return [...L.querySelectorAll('button,.mis,.pc,input[type=range],input[type=text]')].filter(e=>{if(e.disabled)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('.hidden');});}
  N.focus=el=>{if(N.cur)N.cur.classList.remove('gpf');N.cur=el;if(el){el.classList.add('gpf');el.scrollIntoView({block:'nearest',behavior:'smooth'});}};
  N.move=dir=>{const L=layer();if(!L)return;const its=items(L);if(!its.length)return;
    if(!N.cur||!its.includes(N.cur)){N.focus(L.querySelector('.tab:not(.hidden) .mis, .tab:not(.hidden) .pc, .btnrow button')||its[0]);return;}
    if(N.cur.type==='range'&&(dir==='l'||dir==='r')){N.cur.value=+N.cur.value+(dir==='r'?0.1:-0.1);N.cur.dispatchEvent(new Event('input'));return;}
    const r0=N.cur.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;let best=null,bd=1e9;
    for(const e of its){if(e===N.cur)continue;const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;
      let ok=dir==='u'?dy<-4:dir==='d'?dy>4:dir==='l'?dx<-4:dx>4;if(!ok)continue;
      const main=dir==='u'||dir==='d'?Math.abs(dy):Math.abs(dx),side=dir==='u'||dir==='d'?Math.abs(dx):Math.abs(dy);const s=main+side*2.2;if(s<bd){bd=s;best=e;}}
    if(best)N.focus(best);};
  N.press=()=>{const L=layer();if(!L)return;if(!N.cur||!items(L).includes(N.cur)){N.move('d');return;}const idx=items(L).indexOf(N.cur);N.cur.click();setTimeout(()=>{const L2=layer();if(L2===L&&N.cur&&!items(L2).includes(N.cur)){const its=items(L2);N.focus(its[Math.min(idx,its.length-1)]||null);}},60);};
  N.tab=d=>{const tabs=[...document.querySelectorAll('#menu .tabs button')];if(!tabs.length||document.getElementById('menu').classList.contains('hidden'))return;const i=tabs.findIndex(t=>t.classList.contains('sel'));const n=tabs[(i+d+tabs.length)%tabs.length];n.click();N.focus(null);N.move('d');};
  N.clear=()=>N.focus(null);
  N.sync=()=>{const L=layer();if(L!==N.L){N.L=L;N.focus(null);if(L){const d=L.id==='menu'?L.querySelector('.tab:not(.hidden) .mis, .tab:not(.hidden) .pc, .tab:not(.hidden) .chip'):L.querySelector('.btnrow button');if(d)N.focus(d);}}};
  return N;
}
