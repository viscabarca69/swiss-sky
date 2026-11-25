# KI-Verkehr: an mehreren Plätzen 400 s simulieren, Arten zählen, Bodenabstand prüfen
# Aufruf: python3 test/traffic.py [GVA BRN ...]
import asyncio,sys
from playwright.async_api import async_playwright
from common import launch,load_game
APS=sys.argv[1:] or ['ZRH16','GVA','BRN','BIR','LUG','SIO','ZOF']
async def main():
  async with async_playwright() as p:
    b,pg,errs=await launch(p);await load_game(pg);bad=0
    for ap in APS:
      r=await pg.evaluate(f"""(()=>{{const A=window.__af;A.startFlight({{plane:'alpina',ap:'{ap}',rev:false,air:false,hour:13,weather:'clear'}});
        const T=A.traffic,F=A.G.F,S=A.S;F.pos.x+=3000;F.pos.y+=600;F.onGround=false;const kinds={{}},minClr={{}};
        for(let k=0;k<4000;k++){{T.update(0.1,F,k*0.1,0,null);for(const a of T.list){{kinds[a.kind]=1;const c=a.pos.y-S.heightAt(a.pos.x,a.pos.z);
          if(!(a.kind==='arr'||a.kind==='dep'||a.kind==='ga')||c>20)minClr[a.kind]=Math.min(minClr[a.kind]??1e9,Math.round(c));}}}}
        return JSON.stringify({{ap:'{ap}',kinds:Object.keys(kinds),minClr}});}})()""")
      low=[k for k,v in __import__('json').loads(r)['minClr'].items() if v<15]
      if low: bad+=1
      print(r,'  <-- zu tief: '+','.join(low) if low else '')
    print('Fehler:',errs[:5]);await b.close();sys.exit(1 if bad or errs else 0)
asyncio.run(main())
