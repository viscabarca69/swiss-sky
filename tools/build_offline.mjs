// Offline-Datei «Swiss Sky.html»: alles in einer HTML-Datei (Doppelklick, file://, ohne Internet spielbar).
// three.js und alle Module gebündelt (esbuild); Höhenmodell, Gebäude und Luftbilder als Text-Blöcke (window.__OFF liest sie bei Bedarf), Schrift im CSS.
// Aufruf aus einem Ordner mit node_modules/esbuild und node_modules/three (0.160):
//   node tools/build_offline.mjs <repo> <ziel.html>
import fs from 'fs';import path from 'path';
const repo=path.resolve(process.argv[2]||'.'),dst=path.resolve(process.argv[3]||'Swiss Sky.html');
const esbuild=(await import(path.join(process.cwd(),'node_modules/esbuild/lib/main.js'))).default;
const THREE=path.join(process.cwd(),'node_modules/three');
const b64=f=>fs.readFileSync(f).toString('base64');
// 1) Module bündeln (desk.js vor main.js, wie im HTML)
const entry=path.join(repo,'js','__offline_entry.js');fs.writeFileSync(entry,"import './desk.js';\nimport './main.js';\n");
let bundle;
try{const r=await esbuild.build({entryPoints:[entry],bundle:true,format:'esm',minify:true,write:false,target:'es2022',legalComments:'none',
  plugins:[{name:'three',setup(b){b.onResolve({filter:/^three(\/addons\/.*)?$/},a=>({path:a.path==='three'?path.join(THREE,'build/three.module.js'):path.join(THREE,'examples/jsm',a.path.slice('three/addons/'.length))}));}}]});
  bundle=r.outputFiles[0].text;}finally{fs.unlinkSync(entry);}
// 2) Daten: nicht als JS-Objekt (120 MB JavaScript zu parsen lässt den Browser lange hängen), sondern als reine Text-Blöcke
//    <script type="text/plain" id="off-…">base64</script>, die erst beim Gebrauch gelesen werden (window.__OFF mit Gettern)
const blocks=[];const blk=(id,b)=>blocks.push(`<script type="text/plain" id="off-${id}">${b}</script>`);
blk('terrain',b64(path.join(repo,'data/terrain_ch.png')));
blk('buildings',fs.readFileSync(path.join(repo,'data/buildings.txt'),'utf8').trim());
for(const [id,f] of [['tfine','terrain_fine.txt'],['ffine','forest_fine.txt']])if(fs.existsSync(path.join(repo,'data',f)))blk(id,fs.readFileSync(path.join(repo,'data',f),'utf8').trim());
let nOrtho=0;for(const f of fs.readdirSync(path.join(repo,'data/ortho')))if(f.endsWith('.webp')){blk('o-'+f.slice(0,-5),b64(path.join(repo,'data/ortho',f)));nOrtho++;}
const offJs="(function(){var T=function(id){var e=document.getElementById(id);return e?e.textContent:null;};window.__OFF={get terrain(){return 'data:image/png;base64,'+T('off-terrain');},get buildings(){return 'data:application/gzip;base64,'+T('off-buildings');},get tfine(){var t=T('off-tfine');return t?'data:application/octet-stream;base64,'+t:null;},get ffine(){var t=T('off-ffine');return t?'data:application/octet-stream;base64,'+t:null;},ortho:new Proxy({},{get:function(o,k){var t=T('off-o-'+String(k));return t?'data:image/webp;base64,'+t:undefined;}})};})();";
// 3) CSS mit Schriften
let css=fs.readFileSync(path.join(repo,'css/style.css'),'utf8').replace(/url\((fonts\/[^)]+\.woff2)\)/g,(m,f)=>`url(data:font/woff2;base64,${b64(path.join(repo,'css',f))})`);
// 4) HTML zusammensetzen
let html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/,'');
html=html.replace('<link rel="stylesheet" href="css/style.css">',()=>'<style>'+css+'</style>');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
html=html.replace(/<script type="module" src="js\/desk\.js"><\/script>\s*<script type="module" src="js\/main\.js"><\/script>/,
  ()=>'<script>'+offJs+'</script>\n<script type="module">'+safe(bundle)+'</script>');
html=html.replace('</body>',()=>blocks.join('\n')+'\n</body>');
if(html.includes('src="js/main.js"'))throw new Error('Skript-Tags nicht ersetzt');
fs.writeFileSync(dst,html);
console.log('geschrieben',dst,(fs.statSync(dst).size/1e6).toFixed(1),'MB · Bündel',(bundle.length/1e6).toFixed(2),'MB · Luftbilder',nOrtho);
