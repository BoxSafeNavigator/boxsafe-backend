import argparse, json, os, pathlib, subprocess, time, urllib.request, urllib.error
parser=argparse.ArgumentParser();parser.add_argument('--workspace',required=True);args=parser.parse_args()
root=pathlib.Path(args.workspace).resolve()
config=json.load(open(root/'boxsafe-data/valhalla.json'))
config['httpd']['service']['listen']='tcp://127.0.0.1:8002'
json.dump(config,open(root/'boxsafe-data/valhalla-http.json','w'),indent=2)
engine=None;app=None
report={'cases':[],'realEngine':'Valhalla 3.9.0','graph':'sc-pyvalhalla390-20261029','navigationReady':False}
def request(url, data=None):
 raw=None if data is None else json.dumps(data).encode()
 req=urllib.request.Request(url,data=raw,headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=15) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def wait(url):
 for attempt in range(30):
  try:return request(url, {})
  except (OSError,ValueError):time.sleep(.2)
 raise RuntimeError('service did not start')
engine_log=open(root/'boxsafe-data/http-engine.log','w');app_log=open(root/'boxsafe-data/http-app.log','w')
try:
 engine=subprocess.Popen([str(root/'valhalla-runtime/bin/python'),str(root/'boxsafe-backend/routing/valhalla/runtime/actor-http.py'),'--config',str(root/'boxsafe-data/valhalla-http.json')],stdout=engine_log,stderr=subprocess.STDOUT)
 wait('http://127.0.0.1:8002/route')
 env=os.environ.copy();env['VALHALLA_URL']='http://127.0.0.1:8002';env['BOXSAFE_DATASET_ID']='sc-261028';env['BOXSAFE_GRAPH_BUILD_ID']='sc-pyvalhalla390-20261029'
 app=subprocess.Popen(['node','routing/valhalla/server.cjs'],cwd=root/'boxsafe-backend',env=env,stdout=app_log,stderr=subprocess.STDOUT)
 wait('http://127.0.0.1:8085/route')
 payload=json.load(open(root/'boxsafe-data/smoke-input.json'))
 start=time.perf_counter();status,result=request('http://127.0.0.1:8085/route',payload);elapsed=time.perf_counter()-start
 assert status==200,(status,result)
 assert result['truckRouteVerified'] is False and result['safeRouteFound'] is False
 assert result['route']['geometry']['precision']==6
 report['cases'].append({'name':'real truck HTTP route','passed':True,'status':status,'durationSeconds':round(elapsed,4),'distanceMeters':result['route']['distanceMeters'],'maneuvers':len(result['route']['maneuvers']),'safetyStatus':result['status']})
 bad=json.loads(json.dumps(payload));del bad['truck']['height']
 status,result=request('http://127.0.0.1:8085/route',bad);assert status==400 and 'route' not in result
 report['cases'].append({'name':'invalid truck profile','passed':True,'status':status})
 outside=json.loads(json.dumps(payload));outside['locations']=[{'lat':0,'lon':0},{'lat':0.1,'lon':0.1}]
 status,result=request('http://127.0.0.1:8085/route',outside);assert status==503 and 'route' not in result and result['truckRouteVerified'] is False
 report['cases'].append({'name':'outside graph coverage','passed':True,'status':status})
 engine.terminate();engine.wait(timeout=10)
 status,result=request('http://127.0.0.1:8085/route',payload);assert status==503 and 'route' not in result and result['safeRouteFound'] is False
 report['cases'].append({'name':'engine stopped','passed':True,'status':status})
 report['passed']=True
finally:
 for p in (app,engine):
  if p and p.poll() is None:
   p.terminate()
   try:p.wait(timeout=10)
   except subprocess.TimeoutExpired:p.kill();p.wait()
 engine_log.close();app_log.close()
 json.dump(report,open(root/'boxsafe-data/http-integration-results.json','w'),indent=2)
print(json.dumps(report))
