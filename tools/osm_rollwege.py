#!/usr/bin/env python3
# Rollwege aus OpenStreetMap → js/taxiways.js (Rollweg-Netz pro Flugplatz)
# Eingabe: data/osm/rollwege_kompakt.txt (Zeilen  W|ICAO|aeroway|ref|width|lat,lon;dlat,dlon;…  in 1e-6 Grad
#                                         bzw.  N|ICAO|aeroway|ref|lat|lon)
# Entsteht aus einer Overpass-Abfrage (aeroway=taxiway/taxilane/apron/runway/holding_position/parking_position/gate, Schweiz + EuroAirport).
# Ausgabe pro Flugplatz: Knoten (dm), Kanten mit Namen/Breite, Haltepunkte, Standplätze, Vorfelder, Pisten-Mittellinien.
import json,re,sys,math
from collections import defaultdict
src=sys.argv[1] if len(sys.argv)>1 else 'data/osm/rollwege_kompakt.txt'
out=sys.argv[2] if len(sys.argv)>2 else 'js/taxiways.js'
txt=open('js/area_ch.js',encoding='utf-8').read()
GEO=json.loads(re.search(r'export const GEO=(\{[^}]*\})',txt).group(1))
def xz(lat,lon):return((lon-GEO['lon0'])*GEO['kx'],-(lat-GEO['lat0'])*GEO['kz'])
def dec(s):
    P=[];a=o=0
    for i,t in enumerate(s.split(';')):
        u,v=t.split(',');u=int(u);v=int(v)
        if i==0:a,o=u,v
        else:a+=u;o+=v
        P.append(xz(a/1e6,o/1e6))
    return P
A=defaultdict(lambda:{'ways':[],'holds':[],'stands':[],'aprons':[],'rwys':[]})
for line in open(src,encoding='utf-8'):
    f=line.rstrip('\n').split('|')
    if f[0]=='N':
        _,ic,aw,ref,la,lo=f;p=xz(int(la)/1e6,int(lo)/1e6)
        (A[ic]['holds'] if aw=='holding_position' else A[ic]['stands']).append((p,ref))
    elif f[0]=='W':
        _,ic,aw,ref,w,cs=f;P=dec(cs)
        if aw in('taxiway','taxilane'):
            try:wd=float(re.sub(r'[^0-9.]','',w)) if w else 0
            except ValueError:wd=0
            if not wd or wd<5 or wd>60:wd=23 if aw=='taxiway' else 12
            A[ic]['ways'].append((P,ref,wd,aw=='taxilane'))
        elif aw=='apron' and len(P)>=4:A[ic]['aprons'].append(P)
        elif aw=='runway':A[ic]['rwys'].append((P,ref))
        elif aw=='holding_position':A[ic]['holds'].append((P[len(P)//2],ref))
        elif aw=='parking_position':A[ic]['stands'].append((P[0],ref))
# Lage-Abgleich: OSM-Pistenachse auf die Spielpiste legen (Querversatz; Zürich nicht, dort gilt das Luftbild)
RAW=json.loads(re.search(r'AIRPORTS_RAW=(\[.*?\]);',txt,re.S).group(1))
for ic,D in A.items():
    if ic=='LSZH':continue
    best=None
    for P,ref in D['rwys']:
        a,b=P[0],P[-1];L=math.hypot(b[0]-a[0],b[1]-a[1])
        if L<500:continue
        cx,cz=(a[0]+b[0])/2,(a[1]+b[1])/2;hd=math.atan2(b[0]-a[0],-(b[1]-a[1]))
        for R in RAW:
            if R['icao']!=ic:continue
            dh=(math.degrees(hd-R['a'])+90)%180-90
            ac=(cx-R['x'])*math.cos(R['a'])+(cz-R['z'])*math.sin(R['a'])
            if abs(dh)<0.6 and abs(ac)<15 and (best is None or L>best[0]):best=(L,ac,R['a'])
    if not best or abs(best[1])<0.8:continue
    sx,sz=-best[1]*math.cos(best[2]),-best[1]*math.sin(best[2])
    mv=lambda p:(p[0]+sx,p[1]+sz)
    D['ways']=[([mv(q) for q in P],ref,wd,ln) for P,ref,wd,ln in D['ways']]
    D['aprons']=[[mv(q) for q in P] for P in D['aprons']]
    D['rwys']=[([mv(q) for q in P],r) for P,r in D['rwys']]
    D['holds']=[(mv(q),r) for q,r in D['holds']]
    D['stands']=[(mv(q),r) for q,r in D['stands']]
    print(ic,'verschoben um',round(-best[1],1),'m quer')
def seg_inter(p,q,r,s):
    # Schnittpunkt der Strecken p-q und r-s (Parameter t,u in [0,1])
    d=(q[0]-p[0])*(s[1]-r[1])-(q[1]-p[1])*(s[0]-r[0])
    if abs(d)<1e-9:return None
    t=((r[0]-p[0])*(s[1]-r[1])-(r[1]-p[1])*(s[0]-r[0]))/d;u=((r[0]-p[0])*(q[1]-p[1])-(r[1]-p[1])*(q[0]-p[0]))/d
    if -1e-6<=t<=1+1e-6 and -1e-6<=u<=1+1e-6:return t,u
    return None
def proj(p,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1];L2=dx*dx+dz*dz
    if L2<1e-9:return 0,math.hypot(p[0]-a[0],p[1]-a[1])
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/L2));return t,math.hypot(a[0]+t*dx-p[0],a[1]+t*dz-p[1])
OUT={}
for ic,D in sorted(A.items()):
    W=D['ways']
    if not W:continue
    # Teilungspunkte pro Segment sammeln: Kreuzungen und Einmündungen (Endpunkt nahe an fremdem Segment)
    segs=[]  # (wi, si, a, b)
    for wi,(P,ref,wd,lane) in enumerate(W):
        for si in range(len(P)-1):segs.append((wi,si,P[si],P[si+1]))
    cut=defaultdict(list)  # (wi,si) -> [t]
    G=defaultdict(list);C=60.0
    for k,(wi,si,a,b) in enumerate(segs):
        for gx in range(int(math.floor(min(a[0],b[0])/C)),int(math.floor(max(a[0],b[0])/C))+1):
            for gz in range(int(math.floor(min(a[1],b[1])/C)),int(math.floor(max(a[1],b[1])/C))+1):G[(gx,gz)].append(k)
    seen=set()
    for cell in G.values():
        for i in range(len(cell)):
            for j in range(i+1,len(cell)):
                k1,k2=cell[i],cell[j]
                if (k1,k2) in seen:continue
                seen.add((k1,k2))
                w1,s1,a1,b1=segs[k1];w2,s2,a2,b2=segs[k2]
                if w1==w2 and abs(s1-s2)<=1:continue
                r=seg_inter(a1,b1,a2,b2)
                if r:cut[(w1,s1)].append(r[0]);cut[(w2,s2)].append(r[1])
    # Endpunkte, die knapp neben einem anderen Rollweg enden (OSM-Knoten durch Vereinfachung weg): anschliessen
    for wi,(P,ref,wd,lane) in enumerate(W):
        for e in (P[0],P[-1]):
            best=None
            for k in G.get((int(math.floor(e[0]/C)),int(math.floor(e[1]/C))),[]):
                w2,s2,a2,b2=segs[k]
                if w2==wi:continue
                t,d=proj(e,a2,b2)
                if d<6 and (best is None or d<best[0]):best=(d,k,t)
            if best:w2,s2,_,_=segs[best[1]];cut[(w2,s2)].append(best[2])
    # Knoten mit Einrasten (1,5 m)
    nodes=[];grid={}
    def node(p):
        gx,gz=int(p[0]//1.5),int(p[1]//1.5)
        for dx in(-1,0,1):
            for dz in(-1,0,1):
                for n in grid.get((gx+dx,gz+dz),[]):
                    if math.hypot(nodes[n][0]-p[0],nodes[n][1]-p[1])<1.5:return n
        nodes.append(p);grid.setdefault((gx,gz),[]).append(len(nodes)-1);return len(nodes)-1
    refs=[];RI={}
    def rid(r):
        if r not in RI:RI[r]=len(refs);refs.append(r)
        return RI[r]
    edges={}
    for wi,(P,ref,wd,lane) in enumerate(W):
        prev=None
        for si in range(len(P)-1):
            a,b=P[si],P[si+1];ts=sorted(set([0.0,1.0]+[min(1,max(0,t)) for t in cut.get((wi,si),[])]))
            for t in ts:
                n=node((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
                if prev is not None and prev!=n:
                    key=(min(prev,n),max(prev,n))
                    if key not in edges:edges[key]=(rid(ref),wd,1 if lane else 0)
                prev=n
    # Haltepunkte und Standplätze an den nächsten Knoten
    def nearest(p,maxd):
        best=None
        for i,q in enumerate(nodes):
            d=math.hypot(q[0]-p[0],q[1]-p[1])
            if d<maxd and (best is None or d<best[0]):best=(d,i)
        return best[1] if best else -1
    holds=[[nearest(p,40),round(p[0]),round(p[1]),r] for p,r in D['holds']]
    stands=[[round(p[0]),round(p[1]),r,nearest(p,120)] for p,r in D['stands']]
    R10=lambda v:int(round(v*10))
    OUT[ic]={'n':[c for p in nodes for c in (R10(p[0]),R10(p[1]))],
             'e':[c for (a,b),(r,w,l) in edges.items() for c in (a,b,r,int(w),l)],
             'r':refs,'h':[h for h in holds if h[0]>=0],'s':stands,
             'a':[[c for p in P for c in (R10(p[0]),R10(p[1]))] for P in D['aprons']],
             'rw':[{'r':r,'p':[c for p in P for c in (R10(p[0]),R10(p[1]))]} for P,r in D['rwys']]}
    print(ic,'Knoten',len(nodes),'Kanten',len(edges),'Namen',len([r for r in refs if r]),'Halte',len(OUT[ic]['h']),'Stand',len(stands),'Vorfeld',len(D['aprons']))
with open(out,'w',encoding='utf-8') as fo:
    fo.write('// Rollweg-Netz aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL), erzeugt mit tools/osm_rollwege.py\n')
    fo.write('// pro Flugplatz: n = Knoten x,z in dm · e = Kanten (a,b,Name,Breite m,Rollgasse) · r = Namen · h = Haltepunkte [Knoten,x,z,Name] · s = Standplätze [x,z,Name,Knoten] · a = Vorfelder (dm) · rw = Pisten-Mittellinien\n')
    fo.write('export const TAXIWAYS='+json.dumps(OUT,separators=(',',':'),ensure_ascii=False)+';\n')
import os;print('Grösse',os.path.getsize(out)//1024,'KB')
