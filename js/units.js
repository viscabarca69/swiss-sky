// Einheiten für Anweisungen und Hinweise: im Pilotenmodus (kt/ft) werden Zahlen mit m, km, km/h und m/s in Texten umgerechnet.
// So bleiben die vielen Texte einheitlich geschrieben (metrisch) und erscheinen trotzdem in der gewählten Einheit.
export const UNITS={mode:'metric'};
const num=s=>parseFloat(String(s).replace(/['’\s]/g,'').replace(',','.'));
const grp=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'’');
const rnd=(v,st)=>Math.round(v/st)*st;
// Text (metrisch geschrieben) → Pilotenmodus
export function uTxt(t){if(UNITS.mode==='metric'||t==null)return t;t=String(t);
  return t
    .replace(/(\d[\d'’]*(?:[.,]\d+)?)\s?km\/h/g,(m,a)=>`${grp(rnd(num(a)*0.53996,num(a)>100?5:1))} kt`)
    .replace(/(-?\d+(?:[.,]\d+)?)\s?m\/s/g,(m,a)=>`${grp(rnd(num(a)*196.85,50))} ft/min`)
    .replace(/(\d[\d'’]*(?:[.,]\d+)?)\s?km(?![\/\wäöü])/g,(m,a)=>{const v=num(a)*0.53996;return `${v<10?v.toFixed(1):grp(Math.round(v))} NM`;})
    .replace(/(\d[\d'’]*(?:[.,]\d+)?)\s?m(?![\/\wäöüÄÖÜ²³])/g,(m,a)=>{const v=num(a)*3.2808;return `${grp(v>=1000?rnd(v,50):v>=100?rnd(v,10):Math.round(v))} ft`;});}
