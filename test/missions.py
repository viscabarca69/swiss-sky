# Regression: jede Mission starten, 8 s ohne Eingabe simulieren, Fehler/Absturz/Sofort-Abbruch melden
# Aufruf: python3 test/missions.py [mission-id ...]
import asyncio,sys
from playwright.async_api import async_playwright
from common import launch,load_game
ONLY=sys.argv[1:]
async def main():
  async with async_playwright() as p:
    b,pg,errs=await launch(p,960,540);await load_game(pg)
    ids=await pg.evaluate('window.__af.MISSIONS.map(m=>m.id)');bad=0
    for mid in ids:
      if ONLY and mid not in ONLY: continue
      n0=len(errs)
      try:
        r=await pg.evaluate(f"""(()=>{{const A=window.__af;A.startFlight({{mission:'{mid}'}});const r=A.sim(8,[]);const G=A.G;
          return JSON.stringify({{plane:G.P.id,crates:G.crates,crashed:r.crashed,done:G.done,state:A.state,obj:G.obj.length,oi:G.oi,y:Math.round(r.y),v:Math.round(r.v),gnd:r.gnd}});}})()""")
      except Exception as e: r='EXC '+str(e)[:200]
      flag='' if ('"crashed":false' in r and '"done":false' in r and len(errs)==n0) else '  <-- PRÜFEN'
      if flag: bad+=1
      print(mid,r,flag,errs[n0:][:2])
    print('fertig, auffällig:',bad);await b.close();sys.exit(1 if bad else 0)
asyncio.run(main())
