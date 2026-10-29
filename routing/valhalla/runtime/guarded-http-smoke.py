"""Real Actor + Node HTTP integration on synthetic roads; never navigation evidence.
Run with the pinned Valhalla runtime (plus osmium==4.3.2):
  python guarded-http-smoke.py --work-dir /absolute/temporary/directory
"""
import argparse, json, os, pathlib, subprocess, sys, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET
import osmium
from valhalla import get_config

parser = argparse.ArgumentParser()
parser.add_argument('--work-dir', required=True)
a = parser.parse_args()
work = pathlib.Path(a.work_dir).resolve(); work.mkdir(parents=True, exist_ok=True)
runtime = pathlib.Path(__file__).resolve().parent
repo = runtime.parents[2]
# Add a connected grid to each original fixture so default reachability=50
# remains in force. No request or production configuration lowers that filter.
osm = ET.parse(runtime/'restriction-fixture/roads.osm').getroot()
for k in range(3):
    base = 34 + k*.1; offset = 1000+k*100
    for row in range(8):
        for col in range(8):
            nid = offset+row*8+col
            ET.SubElement(osm,'node',id=str(nid),lat=str(base-.004-row*.002),lon=str(-81.004-col*.002),version='1')
    edges = [(k*10+1,offset)]
    for row in range(8):
        for col in range(8):
            node = offset+row*8+col
            if row<7: edges.append((node,node+8))
            if col<7: edges.append((node,node+1))
    for i,(start,end) in enumerate(edges):
        way = ET.SubElement(osm,'way',id=str(10000+k*1000+i),version='1')
        for node in (start,end): ET.SubElement(way,'nd',ref=str(node))
        ET.SubElement(way,'tag',k='highway',v='primary')
        ET.SubElement(way,'tag',k='name',v='Synthetic grid')
# OSM readers require all nodes before ways.
osm[:] = sorted(osm, key=lambda e: 0 if e.tag=='node' else 1)
ET.ElementTree(osm).write(work/'roads.osm',encoding='utf-8')
with osmium.SimpleWriter(str(work/'roads.osm.pbf'),overwrite=True) as writer:
    for obj in osmium.FileProcessor(str(work/'roads.osm')): writer.add(obj)
(work/'tiles').mkdir(exist_ok=True)
config = get_config(tile_extract='',tile_dir=str(work/'tiles'))
config['mjolnir']['concurrency']=1
(work/'config.json').write_text(json.dumps(config))
binary = pathlib.Path(__import__('valhalla').__file__).parent/'bin/valhalla_build_tiles'
with open(work/'build.log','w') as log:
    subprocess.run([str(binary),'-c',str(work/'config.json'),str(work/'roads.osm.pbf')],stdout=log,stderr=subprocess.STDOUT,check=True)

def request(url,payload):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=15) as response: return response.status,json.load(response)
    except urllib.error.HTTPError as error: return error.code,json.load(error)
def wait(url):
    for _ in range(50):
        try: request(url,{}); return
        except OSError: time.sleep(.1)
    raise RuntimeError('service did not start')
def payload(k,height=2,weight=2,origin=False,destination=False):
    lat=34+k*.1
    return {'locations':[{'lat':lat,'lon':-80.99 if origin else -81},{'lat':lat,'lon':-80.99 if destination else -80.98}],
        'truck':{'height':{'value':height,'unit':'m'},'width':{'value':2,'unit':'m'},'length':{'value':6,'unit':'m'},
        'loadedWeight':{'value':weight,'unit':'tonnes'},'maxAxleLoad':{'value':1,'unit':'tonnes'},'axleCount':2,'hazmat':False}}
engine=app=None
report={'syntheticOnly':True,'realEngine':'Valhalla 3.9.0','navigationReady':False,'defaultReachabilityRetained':True,'cases':[],'passed':False}
logs=[]
try:
    logs=[open(work/'engine.log','w'),open(work/'app.log','w')]
    engine=subprocess.Popen([sys.executable,str(runtime/'actor-http.py'),'--config',str(work/'config.json')],stdout=logs[0],stderr=subprocess.STDOUT)
    wait('http://127.0.0.1:8002/route')
    env=os.environ.copy();env.update(VALHALLA_URL='http://127.0.0.1:8002',BOXSAFE_DATASET_ID='synthetic-only',BOXSAFE_GRAPH_BUILD_ID='guarded-http-fixture')
    app=subprocess.Popen(['node','routing/valhalla/server.cjs'],cwd=repo,env=env,stdout=logs[1],stderr=subprocess.STDOUT)
    wait('http://127.0.0.1:8085/route')
    cases=[]
    for k,label in [(0,'height'),(1,'weight')]:
        for endpoint in ('origin','destination'):
            for over in (False,True):
                data=payload(k,height=4 if k==0 and over else 2,weight=10 if k==1 and over else 2,**{endpoint:True})
                cases.append((f'{label} {endpoint} '+('over limit' if over else 'smaller control'),data,503 if over else 200))
    cases.append(('truck access denied at origin',payload(2,origin=True),503))
    cases.append(('truck access denied at destination',payload(2,destination=True),503))
    bad=payload(0);del bad['truck']['height'];cases.append(('invalid profile',bad,400))
    outside=payload(0);outside['locations']=[{'lat':0,'lon':0},{'lat':.1,'lon':.1}];cases.append(('outside coverage',outside,503))
    for name,data,expected in cases:
        status,result=request('http://127.0.0.1:8085/route',data)
        assert status==expected,(name,status,result)
        assert result['safeRouteFound'] is False and result['truckRouteVerified'] is False,(name,result)
        assert ('route' in result)==(status==200),(name,result)
        if status==200: assert result['status']=='UNKNOWN_ROUTE_SAFETY'
        report['cases'].append({'name':name,'status':status,'passed':True,'routeReturned':status==200})
    engine.terminate();engine.wait(timeout=10)
    status,result=request('http://127.0.0.1:8085/route',payload(0))
    assert status==503 and 'route' not in result and result['safeRouteFound'] is False and result['truckRouteVerified'] is False
    report['cases'].append({'name':'engine stopped','status':status,'passed':True,'routeReturned':False})
    report['passed']=True
finally:
    for process in (app,engine):
        if process and process.poll() is None:
            process.terminate()
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: process.kill();process.wait()
    for log in logs: log.close()
    (work/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
