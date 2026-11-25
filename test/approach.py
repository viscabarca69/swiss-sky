# Anflugplaner an allen Bergflugplätzen: aus 5 Richtungen je 2 Pisten planen, tiefster Abstand zum Gelände (ohne letzten Kilometer)
# Aufruf: python3 approach.py [flugzeug]  (Standard l32n; z. B. alpina)
import asyncio,sys,json
sys.path.insert(0,__import__('os').path.dirname(__file__))
from playwright.async_api import async_playwright
from common import launch,load_game
PLANE=sys.argv[1] if len(sys.argv)>1 else 'l32n'
async def main():
  async with async_playwright() as p:
    b,pg,errs=await launch(p,1000,700);await load_game(pg)
    r=await pg.evaluate(("""(()=>{const A=window.__af,S=A.S,out={};
      A.startFlight({plane:'PLANE',ap:'ZRH16',rev:false,air:true,hour:13,weather:'clear'});A.sim(0.5,[]);
      for(const ic of ['LSMA','LSMI','LSZS','LSZC','LSTA','LSGR','LSMM','LSZA','LSGS']){const ap=A.AIRPORTS.find(a=>a.icao===ic);if(!ap){out[ic]='fehlt';continue;}
        let worst=1e9,n=0,uns=0;
        for(let k=0;k<5;k++){const ang=k*2*Math.PI/5,F=A.G.F;F.pos.set(ap.x+Math.sin(ang)*15000,0,ap.z+Math.cos(ang)*15000);F.pos.y=Math.max(S.heightAt(F.pos.x,F.pos.z)+600,2500);F.onGround=false;
          const opts=window.__af.apprTest?null:null;let i=0;
          for(;i<4;i++){let pl;try{pl=A.apprTest(ic,i);}catch(e){break;}if(!pl||!pl.pts)break;n++;if(pl.unsafe)uns++;
            for(const q of pl.pts){const dTH=Math.hypot(q.x-pl.TH.x,q.z-pl.TH.z);if(dTH<1000)continue;worst=Math.min(worst,q.y-S.heightAt(q.x,q.z));}}}
        out[ic+" "+ap.name]={bahnen:n,minAbstand:Math.round(worst),unsicher:uns};}
      return JSON.stringify(out);})()""").replace('PLANE',PLANE))
    for k,v in json.loads(r).items(): print(k,v)
    print(errs[:3]);await b.close()
asyncio.run(main())
