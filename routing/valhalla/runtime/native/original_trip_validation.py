"""Structural original-trip checks; no physical-clearance assertion."""
def extract(api):
 if len(api.trip.routes)!=1 or len(api.trip.routes[0].legs)!=1:raise ValueError('UNEXPECTED_TRIP_LAYOUT')
 records=[];previous=None
 for node in api.trip.routes[0].legs[0].node:
  if not node.HasField('edge'):continue
  edge=node.edge
  if not edge.id or not edge.way_id:raise ValueError('MISSING_EDGE_IDENTITY')
  start,end=edge.begin_shape_index,edge.end_shape_index
  if end<start:raise ValueError('REVERSED_SHAPE_INDICES')
  if previous is not None and start!=previous:raise ValueError('DISCONTINUOUS_SHAPE_INDICES')
  records.append({'graphEdgeId':str(edge.id),'wayId':str(edge.way_id),'beginShapeIndex':start,'endShapeIndex':end})
  previous=end
 if not records:raise ValueError('EMPTY_EDGE_SEQUENCE')
 return records
