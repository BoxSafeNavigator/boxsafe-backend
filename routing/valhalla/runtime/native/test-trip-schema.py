"""Synthetic protobuf round trip; does NOT execute the patched native engine."""
from api_pb2 import Api
api=Api();leg=api.trip.routes.add().legs.add()
for edge_id,way,start,end in [(9007199254740993,100,0,2),(9007199254740995,103,2,4)]:
 edge=leg.node.add().edge;edge.id=edge_id;edge.way_id=way;edge.begin_shape_index=start;edge.end_shape_index=end
raw=api.SerializeToString();out=Api();out.ParseFromString(raw)
edges=[node.edge for node in out.trip.routes[0].legs[0].node]
assert [str(edge.id) for edge in edges]==['9007199254740993','9007199254740995']
assert edges[0].end_shape_index==edges[1].begin_shape_index
assert not Api().trip.routes
print('PASS: schema round trip, 64-bit identity, order, indices and empty-trip control; synthetic only')
