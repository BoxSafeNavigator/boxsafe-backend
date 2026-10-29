"""Structural original-trip checks; no physical-clearance assertion."""
def shape_point_count(shape):
 if not shape:raise ValueError('MISSING_SHAPE')
 components=0;pending=0
 for char in shape:
  byte=ord(char)-63
  if not 0<=byte<=63:raise ValueError('INVALID_SHAPE')
  pending+=1
  if pending>7:raise ValueError('INVALID_SHAPE')
  if byte<32:components+=1;pending=0
 if pending or components%2 or components<4:raise ValueError('INVALID_SHAPE')
 return components//2

def extract(api):
 if len(api.trip.routes)!=1 or len(api.trip.routes[0].legs)!=1:raise ValueError('UNEXPECTED_TRIP_LAYOUT')
 leg=api.trip.routes[0].legs[0]
 count=shape_point_count(leg.shape)
 records=[];previous=None
 for index,node in enumerate(leg.node):
  if not node.HasField('edge'):
   if index!=len(leg.node)-1:raise ValueError('MISSING_INTERIOR_EDGE')
   continue
  edge=node.edge
  if not edge.id or not edge.way_id:raise ValueError('MISSING_EDGE_IDENTITY')
  start,end=edge.begin_shape_index,edge.end_shape_index
  if end>=count:raise ValueError('SHAPE_INDEX_OUT_OF_RANGE')
  if end<start:raise ValueError('REVERSED_SHAPE_INDICES')
  if previous is None and start!=0:raise ValueError('INCOMPLETE_SHAPE_START')
  if previous is not None and start!=previous:raise ValueError('DISCONTINUOUS_SHAPE_INDICES')
  records.append({'graphEdgeId':str(edge.id),'wayId':str(edge.way_id),'beginShapeIndex':start,'endShapeIndex':end})
  previous=end
 if not records:raise ValueError('EMPTY_EDGE_SEQUENCE')
 if previous!=count-1:raise ValueError('INCOMPLETE_SHAPE_END')
 return records
