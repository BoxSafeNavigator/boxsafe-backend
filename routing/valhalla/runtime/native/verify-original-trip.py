"""Run only with a patched wheel and protobuf modules generated from pinned source."""
import argparse,json,pathlib
from valhalla import Actor
from api_pb2 import Api
p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--output',required=True);args=p.parse_args()
actor=Actor(json.load(open(args.config)))
if not hasattr(actor,'route_bytes'):raise SystemExit('BLOCKED: patched route_bytes binding is unavailable')
request={'locations':[{'lat':34,'lon':-81},{'lat':34,'lon':-80.98}],'costing':'truck','format':'pbf','pbf_field_selector':{'trip':True}}
raw=actor.route_bytes(json.dumps(request))
if not isinstance(raw,bytes) or not raw:raise SystemExit('Binary response missing')
api=Api();api.ParseFromString(raw)
if len(api.trip.routes)!=1 or len(api.trip.routes[0].legs)!=1:raise SystemExit('Unexpected original trip layout')
records=[]
for node in api.trip.routes[0].legs[0].node:
 if node.HasField('edge'):
  edge=node.edge
  if not edge.id or edge.end_shape_index<edge.begin_shape_index:raise SystemExit('Invalid original edge evidence')
  records.append({'graphEdgeId':str(edge.id),'wayId':str(edge.way_id),'beginShapeIndex':edge.begin_shape_index,'endShapeIndex':edge.end_shape_index})
if not records:raise SystemExit('Original trip has no edge evidence')
pathlib.Path(args.output).write_text(json.dumps({'syntheticOnly':True,'binaryResponseDecoded':True,'edges':records,'fullPathClearanceVerified':False,'navigationReady':False},indent=2)+'\n')
