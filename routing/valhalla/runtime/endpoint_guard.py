"""Conservative graph-endpoint check. No missing-tag clearance assurance."""
import json,math
class EndpointUnverified(ValueError):pass
# Conservative prototype policy, not an assurance of road or entrance access.
MAX_ENDPOINT_SNAP_METERS=50

def endpoint_distance(loc,edge):
 lat=edge.get('correlated_lat');lon=edge.get('correlated_lon')
 if type(lat) not in (int,float) or type(lon) not in (int,float) or not math.isfinite(lat) or not math.isfinite(lon) or abs(lat)>90 or abs(lon)>180:raise EndpointUnverified('ENDPOINT_POSITION_UNKNOWN')
 a,b=math.radians(loc['lat']),math.radians(lat)
 dlat=b-a;dlon=math.radians(lon-loc['lon'])
 h=math.sin(dlat/2)**2+math.cos(a)*math.cos(b)*math.sin(dlon/2)**2
 return 6371008.8*2*math.asin(math.sqrt(min(1,max(0,h))))

def check_endpoints(actor,payload):
 truck=payload.get('costing_options',{}).get('truck',{})
 fields={'max_height':'height','max_width':'width','max_length':'length','max_weight':'weight','max_axle_load':'axle_load'}
 for loc in payload['locations']:
  probe={'locations':[loc],'costing':'truck','costing_options':{'truck':truck},'verbose':True}
  result=actor.locate(json.dumps(probe));result=json.loads(result) if isinstance(result,str) else result
  if not isinstance(result,list) or len(result)!=1 or not result[0].get('edges'):raise EndpointUnverified('NO_ENDPOINT_EVIDENCE')
  for edge in result[0]['edges']:
   if endpoint_distance(loc,edge)>MAX_ENDPOINT_SNAP_METERS:raise EndpointUnverified('ENDPOINT_TOO_FAR_FROM_REQUEST')
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
