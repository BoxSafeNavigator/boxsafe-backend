import unittest
from api_pb2 import Api
from original_trip_validation import extract
class OriginalTripTests(unittest.TestCase):
 def sample(self):
  api=Api();leg=api.trip.routes.add().legs.add();leg.shape='??????????'
  for identity,start,end in [(9007199254740993,0,2),(9007199254740995,2,4)]:
   edge=leg.node.add().edge;edge.id=identity;edge.way_id=100;edge.begin_shape_index=start;edge.end_shape_index=end
  return api
 def test_large_ids_preserved(self):self.assertEqual(extract(self.sample())[0]['graphEdgeId'],'9007199254740993')
 def test_missing_trip(self):
  with self.assertRaisesRegex(ValueError,'LAYOUT'):extract(Api())
 def test_empty_edges(self):
  api=Api();api.trip.routes.add().legs.add().shape='????'
  with self.assertRaisesRegex(ValueError,'EMPTY'):extract(api)
 def test_missing_identity(self):
  api=self.sample();api.trip.routes[0].legs[0].node[0].edge.id=0
  with self.assertRaisesRegex(ValueError,'IDENTITY'):extract(api)
 def test_reversed_indices(self):
  api=self.sample();api.trip.routes[0].legs[0].node[0].edge.begin_shape_index=3
  with self.assertRaisesRegex(ValueError,'REVERSED'):extract(api)
 def test_discontinuous_indices(self):
  api=self.sample();api.trip.routes[0].legs[0].node[1].edge.begin_shape_index=3
  with self.assertRaisesRegex(ValueError,'DISCONTINUOUS'):extract(api)
 def test_multiple_routes(self):
  api=self.sample();api.trip.routes.add()
  with self.assertRaisesRegex(ValueError,'LAYOUT'):extract(api)
 def test_out_of_range(self):
  api=self.sample();api.trip.routes[0].legs[0].node[1].edge.end_shape_index=5
  with self.assertRaisesRegex(ValueError,'OUT_OF_RANGE'):extract(api)
 def test_missing_shape(self):
  api=self.sample();api.trip.routes[0].legs[0].shape=''
  with self.assertRaisesRegex(ValueError,'MISSING_SHAPE'):extract(api)
 def test_truncated_shape(self):
  api=self.sample();api.trip.routes[0].legs[0].shape='~'
  with self.assertRaisesRegex(ValueError,'INVALID_SHAPE'):extract(api)
 def test_incomplete_end(self):
  api=self.sample();api.trip.routes[0].legs[0].node[1].edge.end_shape_index=3
  with self.assertRaisesRegex(ValueError,'INCOMPLETE_SHAPE_END'):extract(api)
 def test_missing_interior_edge(self):
  api=self.sample();api.trip.routes[0].legs[0].node[0].ClearField('edge')
  with self.assertRaisesRegex(ValueError,'INTERIOR_EDGE'):extract(api)
if __name__=='__main__':unittest.main()
