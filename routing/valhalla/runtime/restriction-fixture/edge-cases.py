import json,pathlib,subprocess,osmium,xml.etree.ElementTree as ET
from valhalla import Actor,get_config
root=pathlib.Path(__file__).resolve().parent
full=Actor(json.load(open(root/'config.json')))
nd=root/'no-detour';nd.mkdir(exist_ok=True);(nd/'tiles').mkdir(exist_ok=True)
xml=ET.parse(root/'roads.osm');tree=xml.getroot()
for way in list(tree.findall('way')):
 if int(way.attrib['id']) in [101,111,121]:tree.remove(way)
xml.write(nd/'roads.osm',encoding='unicode')
with osmium.SimpleWriter(str(nd/'roads.osm.pbf'),overwrite=True) as w:
 for obj in osmium.FileProcessor(str(nd/'roads.osm')):w.add(obj)
c=get_config(tile_extract='',tile_dir=str(nd/'tiles'));c['mjolnir']['concurrency']=1
json.dump(c,open(nd/'config.json','w'))
binary=pathlib.Path(__import__('valhalla').__file__).parent/'bin/valhalla_build_tiles'
subprocess.run([str(binary),'-c',str(nd/'config.json'),str(nd/'roads.osm.pbf')],check=True,stdout=open(nd/'build.log','w'),stderr=subprocess.STDOUT)
limited=Actor(c);results=[]
for k,name in enumerate(['height','weight','hgv_access']):
 b=34+k*.1
 for scenario,actor in [('no_alternative_control',limited),('no_alternative_restricted',limited),('restricted_origin',full),('restricted_destination',full)]:
  restricted=scenario!='no_alternative_control'
  truck={'height':4 if name=='height' and restricted else 2,'weight':10 if name=='weight' and restricted else 2,'width':2,'length':6,'axle_load':1,'axle_count':2,'ignore_restrictions':False,'ignore_access':False,'hgv_no_access_penalty':43200}
  origin={'lat':b,'lon':-80.99 if scenario=='restricted_origin' else -81,'minimum_reachability':1,'search_cutoff':100}
  destination={'lat':b,'lon':-80.99 if scenario=='restricted_destination' else -80.98,'minimum_reachability':1,'search_cutoff':100}
  costing='auto' if name=='hgv_access' and not restricted else 'truck'
  req={'locations':[origin,destination],'costing':costing,'costing_options':{'truck':truck},'units':'kilometers'}
  row={'restriction':name,'scenario':scenario,'costing':costing,'request':req}
  try:
   response=actor.route(json.dumps(req));response=json.loads(response) if isinstance(response,str) else response
   row.update({'routeReturned':True,'summary':response['trip']['summary'],'geometry':response['trip']['legs'][0]['shape']})
  except Exception as e:row.update({'routeReturned':False,'engineError':str(e)})
  row['expectationMet']=(row['routeReturned'] if scenario=='no_alternative_control' else not row['routeReturned'])
  results.append(row)
report={'syntheticOnly':True,'engineVersion':'3.9.0','cases':results,'releaseBlocked':any(not r['expectationMet'] for r in results)}
json.dump(report,open(root/'edge-results.json','w'),indent=2)
print(json.dumps([{k:r[k] for k in ['restriction','scenario','routeReturned','expectationMet']} for r in results]))
