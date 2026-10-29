import copy,unittest
from route_restrictions import audit,FIELDS
class RestrictionAuditTests(unittest.TestCase):
 def packet(self):
  return {'truck':{'height':2,'width':2,'length':6,'weight':2,'axle_load':1},'identitySource':'original_trip','routeGraphBuildId':'fixture','evidenceGraphBuildId':'fixture','routeEdgeIds':['7'],'edges':[{'graphEdgeId':'7','truckAccess':True,'hasRestrictions':False,'restrictions':[]}]}
 def test_empty_restrictions_never_approve(self):
  r=audit(self.packet());self.assertTrue(r['suppliedEvidenceComplete']);self.assertFalse(r['fullPathClearanceVerified']);self.assertFalse(r['safeRouteFound'])
 def test_five_dimension_conflicts(self):
  for kind,(field,unit) in FIELDS.items():
   with self.subTest(kind=kind):
    p=self.packet();p['edges'][0]['hasRestrictions']=True;p['edges'][0]['restrictions']=[{'type':kind,'value':p['truck'][field]/2,'unit':unit,'truck':True,'conditional':False}]
    self.assertEqual(audit(p)['conflicts'][0]['type'],kind)
 def test_wrong_units_unknown(self):
  p=self.packet();p['edges'][0]['hasRestrictions']=True;p['edges'][0]['restrictions']=[{'type':'max_height','value':3,'unit':'ft','truck':True,'conditional':False}];self.assertFalse(audit(p)['suppliedEvidenceComplete'])
 def test_conditional_unknown(self):
  p=self.packet();p['edges'][0]['hasRestrictions']=True;p['edges'][0]['restrictions']=[{'type':'max_height','value':1,'unit':'m','truck':True,'conditional':True}];self.assertIn('CONDITION_UNKNOWN_OR_UNSUPPORTED',audit(p)['unknownReasons'])
 def test_build_mismatch(self):
  p=self.packet();p['evidenceGraphBuildId']='other';self.assertFalse(audit(p)['suppliedEvidenceComplete'])
 def test_wrong_order(self):
  p=self.packet();p['routeEdgeIds']=['8','7'];self.assertIn('EDGE_SEQUENCE_MISMATCH',audit(p)['unknownReasons'])
 def test_denied_access(self):
  p=self.packet();p['edges'][0]['truckAccess']=False;self.assertTrue(audit(p)['conflicts'])
 def test_invalid_profile(self):
  for value in (True,None,float('nan'),float('inf'),-1):
   p=self.packet();p['truck']['height']=value;self.assertFalse(audit(p)['suppliedEvidenceComplete'])
 def test_missing_packet(self):self.assertFalse(audit(None)['suppliedEvidenceComplete'])
 def test_candidate_identity_unknown(self):
  p=self.packet();p['identitySource']='trace';self.assertFalse(audit(p)['suppliedEvidenceComplete'])
 def test_unhashable_restriction_type(self):
  p=self.packet();p['edges'][0].update(hasRestrictions=True,restrictions=[{'type':[],'truck':True,'conditional':False}])
  self.assertIn('UNSUPPORTED_RESTRICTION',audit(p)['unknownReasons'])
 def test_inconsistent_restriction_flag(self):
  p=self.packet();p['edges'][0]['hasRestrictions']=True
  self.assertIn('RESTRICTION_FLAG_INCONSISTENT',audit(p)['unknownReasons'])
 def test_malformed_edge(self):
  p=self.packet();p['edges']=[None]
  self.assertFalse(audit(p)['suppliedEvidenceComplete'])
 def test_missing_access(self):
  p=self.packet();del p['edges'][0]['truckAccess']
  self.assertIn('TRUCK_ACCESS_UNKNOWN',audit(p)['unknownReasons'])
if __name__=='__main__':unittest.main()
