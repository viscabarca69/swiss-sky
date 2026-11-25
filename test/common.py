# Gemeinsame Hilfen für die Browser-Tests: Chrome (SwiftShader) starten, Spiel- und three.js-Dateien lokal ausliefern
import os,mimetypes,shutil
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # Repo-Ordner
THREE=os.path.join(ROOT,'node_modules','three')   # npm install --no-save three@0.160.0 im Repo-Ordner
BASE='http://local.test/'
def chrome():
  for c in [os.environ.get('CHROME'),'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']:
    if c and os.path.exists(c): return c
  return None
async def launch(p,w=1280,h=720):
  exe=chrome();kw={'args':['--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  if exe: kw['executable_path']=exe
  b=await p.chromium.launch(**kw);pg=await b.new_page(viewport={'width':w,'height':h});errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e)[:300]))
  async def serve(route):
    u=route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u: path=os.path.join(THREE,u.split('three@0.160.0/',1)[1].split('?')[0])
    elif u.startswith(BASE): path=os.path.join(ROOT,u[len(BASE):].split('?')[0])
    else: await route.fulfill(status=404,body='');return
    if os.path.isfile(path): await route.fulfill(path=path,content_type='text/javascript' if path.endswith('.js') else (mimetypes.guess_type(path)[0] or 'application/octet-stream'))
    else: await route.fulfill(status=404,body='')
  await pg.route('**/*',serve)
  return b,pg,errs
async def load_game(pg):
  await pg.goto(BASE+'index.html')
  await pg.wait_for_function('window.__af && window.__af.state && window.__af.state!=="load"',timeout=240000)
  await pg.evaluate("document.getElementById('desk')&&(document.getElementById('desk').style.display='none');window.__deskPlay&&window.__deskPlay();window.__noPerf=true")
