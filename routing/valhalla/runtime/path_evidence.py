"""Candidate-edge evidence only; never establishes original route-edge identity."""
def assess(trace_edges, located_edges):
 records=[]
 for edge in trace_edges:
  identity=edge.get('id')
  matches=[item for item in located_edges if item.get('edge_id',{}).get('value')==identity] if type(identity) is int else []
  restrictions=[item.get('access_restrictions') for item in matches]
  complete=bool(matches) and all(isinstance(items,list) for items in restrictions)
  records.append({'candidateEdgeId':identity,'wayId':edge.get('way_id'),'evidenceStatus':'candidate_evidence' if complete else 'unknown','restrictions':restrictions if complete else None})
 return {'originalRouteEdgeIdentityVerified':False,'fullPathClearanceVerified':False,'navigationReady':False,'edges':records}
