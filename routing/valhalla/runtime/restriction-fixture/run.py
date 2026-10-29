import json,pathlib,subprocess,osmium
from valhalla import get_config,Actor
root=pathlib.Path(__file__).resolve().parent
xml=['<osm version="0.6" generator="BoxSafe synthetic test">'];ways=[]
for k,(tag,value) in enumerate([('maxheight','3'),('maxweight','5'),('hgv','no')]):
 b=34+k*.1;n=k*10
 for i,(lat,lon) in enumerate([(b,-81),(b,-80.995),(b,-80.985),(b+.01,-80.995),(b+.01,-80.985),(b,-80.98)],1):xml.append(f'<node id="{n+i}" lat="{lat}" lon="{lon}" version="1"/>')
 for j,(refs,tags) in enumerate([([2,3],f'<tag k="{tag}" v="{value}"/>'),([2,4,5,3],''),([1,2],''),([3,6],'')]):
  ways.append(f'<way id="{100+k*10+j}" version="1">'+''.join(f'<nd ref="{n+r}"/>' for r in refs)+'<tag k="highway" v="primary"/><tag k="name" v="Fixture road"/>'+tags+'</way>')
xml+=ways+['</osm>'];(root/'roads.osm').write_text('\n'.join(xml))
with osmium.SimpleWriter(str(root/'roads.osm.pbf'),overwrite=True) as writer:
 for obj in osmium.FileProcessor(str(root/'roads.osm')):writer.add(obj)
c=get_config(tile_extract='',tile_dir=str(root/'tiles'));c['mjolnir']['concurrency']=1
json.dump(c,open(root/'config.json','w'))
binary=pathlib.Path(__import__('valhalla').__file__).parent/'bin/valhalla_build_tiles'
subprocess.run([str(binary),'-c',str(root/'config.json'),str(root/'roads.osm.pbf')],check=True,stdout=open(root/'build.log','w'),stderr=subprocess.STDOUT)
actor=Actor(c);results=[]
for k,name in enumerate(['height','weight','hgv_access']):
 b=34+k*.1
 for restricted in [False,True]:
  truck={'height':4 if name=='height' and restricted else 2,'weight':10 if name=='weight' and restricted else 2,'width':2,'length':6,'axle_load':1,'axle_count':2,'ignore_restrictions':False,'ignore_access':False,'hgv_no_access_penalty':43200}
  request={'locations':[{'lat':b,'lon':-81,'minimum_reachability':1,'search_cutoff':100},{'lat':b,'lon':-80.98,'minimum_reachability':1,'search_cutoff':100}],'costing':'truck' if name!='hgv_access' or restricted else 'auto','costing_options':{'truck':truck},'units':'kilometers'}
  out=actor.route(json.dumps(request));out=json.loads(out) if isinstance(out,str) else out
  detour=out['trip']['summary']['max_lat']>b+.005
  passed=detour==restricted
  results.append({'case':name,'restrictedProfile':restricted,'costing':request['costing'],'detourObserved':detour,'distanceKm':out['trip']['summary']['length'],'passed':passed})
json.dump({'syntheticOnly':True,'results':results,'allPassed':all(r['passed'] for r in results)},open(root/'results.json','w'),indent=2)
print(json.dumps(results))
