// Geräteprofil: Telefone, Tablets und Geräte mit wenig Speicher bekommen den Sparmodus
// (halb so grosse Texturen, weniger abgestellte Flugzeuge, weniger scharfe Luftbild-Kacheln, niedrige Qualität).
// Ausserdem eine einfache Absturz-Erkennung: Beim Start wird ein Merker gesetzt und beim normalen Verlassen gelöscht.
// Steht er beim nächsten Start noch, ist die Seite abgestürzt (meist Speicher) – dann bleibt der Sparmodus eingeschaltet.
const ua=(typeof navigator!=='undefined'&&navigator.userAgent)||'';
const touchMac=/Macintosh/.test(ua)&&typeof navigator!=='undefined'&&navigator.maxTouchPoints>1;// iPad mit Desktop-Kennung
export const MOBILE=/iPhone|iPad|iPod|Android|Mobi/.test(ua)||touchMac;
const LS=(()=>{try{return typeof localStorage!=='undefined'?localStorage:null;}catch(e){return null;}})();
let st={};try{st=(LS&&JSON.parse(LS.getItem('alpenflug-ch1')||'{}')||{}).settings||{};}catch(e){}
let crashed=false;
try{if(LS){crashed=!!LS.getItem('swissSky-alive');LS.setItem('swissSky-alive',String(Date.now()));
  addEventListener('pagehide',()=>{try{LS.removeItem('swissSky-alive');}catch(e){}});
  if(crashed&&(st.lite||'auto')==='auto')LS.setItem('swissSky-lite','1');}}catch(e){}
const q=(()=>{try{return new URLSearchParams(location.search);}catch(e){return new URLSearchParams('');}})();
export const LITE_MODE=q.has('lite')?'on':q.has('full')?'off':(st.lite||'auto');
let sticky=false;try{sticky=!!(LS&&LS.getItem('swissSky-lite'));}catch(e){}
const weak=(typeof navigator!=='undefined'&&navigator.deviceMemory||8)<=4;
export const CRASHED=crashed;
export const LOWMEM=LITE_MODE==='on'||(LITE_MODE==='auto'&&(MOBILE||weak||sticky));
// Grund für die Anzeige in den Einstellungen
export const LOWMEM_WHY=!LOWMEM?'':LITE_MODE==='on'?'eingeschaltet':MOBILE?'Telefon/Tablet erkannt':weak?'wenig Arbeitsspeicher':'nach einem Absturz';
export const TEXS=LOWMEM?0.5:1;// Massstab für selbst gezeichnete Texturen
export function setLite(v){try{if(v!=='auto'&&LS)LS.removeItem('swissSky-lite');}catch(e){}}
