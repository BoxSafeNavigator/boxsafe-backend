"""Endpoint evidence validation; no Valhalla dependency needed."""
import copy,json,unittest
from endpoint_guard import check_endpoints,EndpointUnverified
class Actor:
 def __init__(self,edge): self.edge=edge
 def locate(self,request): return json.dumps([{'edges':[self.edge]}])
class EndpointGuardTests(unittest.TestCase):
 def setUp(self):
  self.payload={'locations':[{'lat':0,'lon':0}],'costing_options':{'truck':{'height':2}}}
  self.edge={'correlated_lat':0,'correlated_lon':0,'edge':{'access':{'truck':True},'access_restriction':False},'access_restrictions':[]}
 def check(self): return check_endpoints(Actor(self.edge),self.payload)
 def test_nearby_candidates_remain_unverified(self):
  self.edge['correlated_lon']=.0004 # about 44.5 meters
  self.assertFalse(self.check()['clearanceVerified'])
 def test_distant_candidate_rejected(self):
  self.edge['correlated_lon']=.0005 # about 55.6 meters
  with self.assertRaisesRegex(EndpointUnverified,'TOO_FAR'): self.check()
 def test_missing_invalid_and_nonfinite_positions_rejected(self):
  for value in (None,True,'0',float('nan'),float('inf'),91):
   with self.subTest(value=value):
    self.edge['correlated_lat']=value
    with self.assertRaises(EndpointUnverified): self.check()
 def test_conflicting_restriction_rejected(self):
  self.edge['access_restrictions']=[{'type':'max_height','value':1,'truck':True}]
  with self.assertRaisesRegex(EndpointUnverified,'CONFLICT'): self.check()
 def test_any_distant_candidate_rejects(self):
  near=copy.deepcopy(self.edge); self.edge['correlated_lon']=.01
  class Multiple:
   def locate(inner,request): return [{'edges':[near,self.edge]}]
  with self.assertRaises(EndpointUnverified): check_endpoints(Multiple(),self.payload)
if __name__=='__main__': unittest.main()
