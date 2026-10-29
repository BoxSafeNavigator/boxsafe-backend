"""Diagnostic only: inspect trace edge identity, never approve a route."""
import argparse,json,pathlib
from valhalla import Actor
p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--output',required=True);args=p.parse_args()
a=Actor(json.load(open(args.config)));cases=[]
for height in (2,4):
 request={'locations':[{'lat':34,'lon':-81},{'lat':34,'lon':-80.98}],'costing':'truck','costing_options':{'truck':{'height':height,'width':2,'length':6,'weight':2,'axle_load':1}}}
 route=a.route(json.dumps(request));route=json.loads(route) if isinstance(route,str) else route
 trace={k:v for k,v in request.items() if k!='locations'}
 trace.update(encoded_polyline=route['trip']['legs'][0]['shape'],shape_match='map_snap',filters={'action':'include','attributes':['edge.id','edge.way_id','edge.truck_route','edge.truck_speed','edge.names','edge.length']})
 result=a.trace_attributes(json.dumps(trace));result=json.loads(result) if isinstance(result,str) else result
 ways=[edge['way_id'] for edge in result['edges']]
 assert (100 in ways)==(height==2),(height,ways)
 assert (101 in ways)==(height==4),(height,ways)
 cases.append({'heightMeters':height,'trace':result,'expectedWaySequenceObserved':True})
report={'syntheticOnly':True,'navigationReady':False,'fullPathClearanceVerified':False,'cases':cases,'limitation':'Trace map matching identifies candidate edges; it is not proof of original route-edge identity or complete dimensional restriction evidence.'}
pathlib.Path(args.output).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'casesPassed':len(cases),'fullPathClearanceVerified':False}))
