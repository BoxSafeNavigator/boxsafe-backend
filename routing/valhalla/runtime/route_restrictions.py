"""Offline audit of supplied route evidence. Never grants navigation approval."""
import math
FIELDS={'max_height':('height','m'),'max_width':('width','m'),'max_length':('length','m'),'max_weight':('weight','tonnes'),'max_axle_load':('axle_load','tonnes')}
def positive(value):return type(value) in (int,float) and math.isfinite(value) and value>0
def audit(packet):
 unknown=[];conflicts=[]
 if not isinstance(packet,dict):packet={}
 truck=packet.get('truck');truck=truck if isinstance(truck,dict) else {}
 for field,unit in FIELDS.values():
  if not positive(truck.get(field)):unknown.append('INVALID_TRUCK_'+field)
 ids=packet.get('routeEdgeIds');edges=packet.get('edges')
 valid_ids=isinstance(ids,list) and bool(ids) and all(isinstance(i,str) and i.isdecimal() and int(i)>0 for i in ids)
 if not valid_ids:unknown.append('ORIGINAL_EDGE_SEQUENCE_MISSING')
 if packet.get('identitySource')!='original_trip':unknown.append('ORIGINAL_IDENTITY_UNAVAILABLE')
 build=packet.get('routeGraphBuildId')
 if not isinstance(build,str) or not build or build!=packet.get('evidenceGraphBuildId'):unknown.append('GRAPH_BUILD_MISMATCH_OR_UNKNOWN')
 if not isinstance(edges,list):edges=[];unknown.append('EDGE_EVIDENCE_MISSING')
 if valid_ids and [e.get('graphEdgeId') if isinstance(e,dict) else None for e in edges]!=ids:unknown.append('EDGE_SEQUENCE_MISMATCH')
 for index,edge in enumerate(edges):
  if not isinstance(edge,dict):unknown.append('MALFORMED_EDGE');continue
  identity=edge.get('graphEdgeId')
  if edge.get('truckAccess') is False:conflicts.append({'index':index,'graphEdgeId':identity,'type':'TRUCK_ACCESS_DENIED'})
  elif edge.get('truckAccess') is not True:unknown.append('TRUCK_ACCESS_UNKNOWN')
  restrictions=edge.get('restrictions')
  if not isinstance(restrictions,list):unknown.append('RESTRICTIONS_UNKNOWN');continue
  if edge.get('hasRestrictions') is not False and not restrictions:unknown.append('RESTRICTION_COVERAGE_UNKNOWN')
  for restriction in restrictions:
   if not isinstance(restriction,dict):unknown.append('MALFORMED_RESTRICTION');continue
   # No temporal or conditional interpretation in this prototype.
   if restriction.get('conditional') is not False:unknown.append('CONDITION_UNKNOWN_OR_UNSUPPORTED');continue
   if restriction.get('truck') is False:continue
   pair=FIELDS.get(restriction.get('type'))
   if restriction.get('truck') is not True or not pair:unknown.append('UNSUPPORTED_RESTRICTION');continue
   field,unit=pair;limit=restriction.get('value')
   if restriction.get('unit')!=unit or not positive(limit) or not positive(truck.get(field)):unknown.append('INVALID_RESTRICTION_VALUE_OR_UNIT');continue
   if truck[field]>limit:conflicts.append({'index':index,'graphEdgeId':identity,'type':restriction['type'],'actual':truck[field],'limit':limit,'unit':unit})
 return {'status':'SUPPLIED_EVIDENCE_CONFLICT' if conflicts else 'UNKNOWN_ROUTE_SAFETY','conflicts':conflicts,'unknownReasons':sorted(set(unknown)),
         'suppliedEvidenceComplete':not unknown,'sourceAuthenticated':False,'fullPathClearanceVerified':False,'navigationReady':False,'safeRouteFound':False,
         'message':'Offline supplied-data audit only. No restriction conflict does not establish physical clearance.'}
