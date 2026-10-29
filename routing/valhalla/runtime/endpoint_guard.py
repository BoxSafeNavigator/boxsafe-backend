"""Conservative graph-endpoint check. No missing-tag clearance assurance."""
import json,math
class EndpointUnverified(ValueError):pass
def check_endpoints(actor,payload):
 truck=payload.get('costing_options',{}).get('truck',{})
 fields={'max_height':'height','max_width':'width','max_length':'length','max_weight':'weight','max_axle_load':'axle_load'}
 for loc in payload['locations']:
  probe={'locations':[loc],'costing':'truck','costing_options':{'truck':truck},'verbose':True}
  result=actor.locate(json.dumps(probe));result=json.loads(result) if isinstance(result,str) else result
  if not isinstance(result,list) or len(result)!=1 or not result[0].get('edges'):raise EndpointUnverified('NO_ENDPOINT_EVIDENCE')
  for edge in result[0]['edges']:
   if edge.get('edge',{}).get('access',{}).get('truck') is not True:raise EndpointUnverified('TRUCK_ACCESS_UNKNOWN')
   restrictions=edge.get('access_restrictions')
   if not isinstance(restrictions,list):raise EndpointUnverified('RESTRICTIONS_UNKNOWN')
   if edge.get('edge',{}).get('access_restriction') and not restrictions:raise EndpointUnverified('RESTRICTIONS_UNKNOWN')
   for restriction in restrictions:
    if restriction.get('truck') is False:continue
    field=fields.get(restriction.get('type'));value=restriction.get('value');actual=truck.get(field)
    if restriction.get('truck') is not True or not field or type(value) not in (int,float) or type(actual) not in (int,float) or not math.isfinite(value) or value<=0 or not math.isfinite(actual):raise EndpointUnverified('UNSUPPORTED_ENDPOINT_RESTRICTION')
    if actual>value:raise EndpointUnverified('ENDPOINT_RESTRICTION_CONFLICT')
 return {'checked':True,'scope':'graph_candidate_endpoints_only','clearanceVerified':False}
