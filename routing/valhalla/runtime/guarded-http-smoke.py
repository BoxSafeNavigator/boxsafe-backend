"""Real Actor + Node HTTP integration on synthetic roads; never navigation evidence.
Run with the pinned Valhalla runtime (plus osmium==4.3.2):
  python guarded-http-smoke.py --work-dir /absolute/temporary/directory
"""
import argparse, copy, json, os, pathlib, signal, socket, subprocess, sys, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET
import osmium
from valhalla import get_config

def terminate(signum,frame): raise SystemExit(128+signum)
signal.signal(signal.SIGTERM,terminate)

parser = argparse.ArgumentParser()
parser.add_argument('--work-dir', required=True)
a = parser.parse_args()
work = pathlib.Path(a.work_dir).resolve(); work.mkdir(parents=True, exist_ok=True)
runtime = pathlib.Path(__file__).resolve().parent
repo = runtime.parents[2]
# Add a connected grid to each original fixture so default reachability=50
# remains in force. No request or production configuration lowers that filter.
osm = ET.parse(runtime/'restriction-fixture/roads.osm').getroot()
# Clone the height network for independent width, length and axle-load cases.
for k,tag,value in [(3,'maxwidth','2.5'),(4,'maxlength','8'),(5,'maxaxleload','3')]:
    for original in list(osm):
        if original.tag=='node' and 1<=int(original.attrib['id'])<=6:
            node=copy.deepcopy(original);node.set('id',str(int(node.attrib['id'])+k*10))
            node.set('lat',str(float(node.attrib['lat'])+k*.1));osm.append(node)
        elif original.tag=='way' and 100<=int(original.attrib['id'])<=103:
            way=copy.deepcopy(original);way.set('id',str(int(way.attrib['id'])+k*10))
            for nd in way.findall('nd'): nd.set('ref',str(int(nd.attrib['ref'])+k*10))
            for item in way.findall('tag'):
                if item.attrib['k']=='maxheight':item.set('k',tag);item.set('v',value)
            osm.append(way)
for k in range(6):
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
def decode6(shape):
    values=[];value=shift=0
    for ch in shape:
        byte=ord(ch)-63;value|=(byte&31)<<shift
        if byte<32:
            values.append(~(value>>1) if value&1 else value>>1);value=shift=0
        else:shift+=5
    lat=lon=0;points=[]
    for i in range(0,len(values),2):
        lat+=values[i];lon+=values[i+1];points.append((lat/1e6,lon/1e6))
    return points
def payload(k,height=2,weight=2,width=2,length=6,axle=1,origin=False,destination=False):
    lat=34+k*.1
    return {'locations':[{'lat':lat,'lon':-80.99 if origin else -81},{'lat':lat,'lon':-80.99 if destination else -80.98}],
        'truck':{'height':{'value':height,'unit':'m'},'width':{'value':width,'unit':'m'},'length':{'value':length,'unit':'m'},
        'loadedWeight':{'value':weight,'unit':'tonnes'},'maxAxleLoad':{'value':axle,'unit':'tonnes'},'axleCount':2,'hazmat':False}}
def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); return sock.getsockname()[1]
engine_port=free_port();app_port=free_port()
while app_port==engine_port:app_port=free_port()
engine_url=f'http://127.0.0.1:{engine_port}/route'
app_url=f'http://127.0.0.1:{app_port}/route'
engine=app=None
report={'syntheticOnly':True,'realEngine':'Valhalla 3.9.0','navigationReady':False,'defaultReachabilityRetained':True,'cases':[],'passed':False}
logs=[]
try:
    logs=[open(work/'engine.log','w'),open(work/'app.log','w')]
    engine=subprocess.Popen([sys.executable,str(runtime/'actor-http.py'),'--config',str(work/'config.json'),'--port',str(engine_port)],stdout=logs[0],stderr=subprocess.STDOUT)
    wait(engine_url)
    env=os.environ.copy();env.update(VALHALLA_URL=f'http://127.0.0.1:{engine_port}',BOXSAFE_TEST_PORT=str(app_port),BOXSAFE_DATASET_ID='synthetic-only',BOXSAFE_GRAPH_BUILD_ID='guarded-http-fixture')
    app=subprocess.Popen(['node','-e',"require('./routing/valhalla/server.cjs').createApp().listen(Number(process.env.BOXSAFE_TEST_PORT),'127.0.0.1')"],cwd=repo,env=env,stdout=logs[1],stderr=subprocess.STDOUT)
    wait(app_url)
    cases=[]
    profiles=[(0,'height',{'height':4}),(1,'weight',{'weight':10}),
              (3,'width',{'width':3}),(4,'length',{'length':10}),
              (5,'axle load',{'axle':4,'weight':8})]
    for k,label,overrides in profiles:
        for endpoint in ('origin','destination'):
            for over in (False,True):
                data=payload(k,**(overrides if over else {}),**{endpoint:True})
                cases.append((f'{label} {endpoint} '+('over limit' if over else 'smaller control'),data,503 if over else 200,None))
        for over in (False,True):
            data=payload(k,**(overrides if over else {}))
            cases.append((f'{label} interior '+('detour' if over else 'direct control'),data,200,over))
    cases.append(('truck access denied at origin',payload(2,origin=True),503,None))
    cases.append(('truck access denied at destination',payload(2,destination=True),503,None))
    bad=payload(0);del bad['truck']['height'];cases.append(('invalid profile',bad,400,None))
    outside=payload(0);outside['locations']=[{'lat':0,'lon':0},{'lat':.1,'lon':.1}];cases.append(('outside coverage',outside,503,None))
    for name,data,expected,expected_detour in cases:
        status,result=request(app_url,data)
        record={'name':name,'status':status,'expectedStatus':expected,'passed':False,'routeReturned':'route' in result}
        report['cases'].append(record)
        assert status==expected,(name,status,result)
        assert result['safeRouteFound'] is False and result['truckRouteVerified'] is False,(name,result)
        assert ('route' in result)==(status==200),(name,result)
        if status==200: assert result['status']=='UNKNOWN_ROUTE_SAFETY'
        if expected_detour is not None:
            coordinates=decode6(result['route']['geometry']['encodedPolyline'])
            observed=max(lat for lat,lon in coordinates)>data['locations'][0]['lat']+.005
            record['detourObserved']=observed
            assert observed==expected_detour,(name,'unexpected path',result)
        record['passed']=True
    engine.terminate();engine.wait(timeout=10)
    status,result=request(app_url,payload(0))
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
