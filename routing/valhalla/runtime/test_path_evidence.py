import unittest
from path_evidence import assess
class PathEvidenceTests(unittest.TestCase):
 def test_matching_candidate_preserves_restrictions_without_approval(self):
  r=assess([{'id':7,'way_id':100}],[{'edge_id':{'value':7},'access_restrictions':[{'type':'max_height','value':3}]}])
  self.assertEqual(r['edges'][0]['evidenceStatus'],'candidate_evidence');self.assertFalse(r['fullPathClearanceVerified']);self.assertFalse(r['originalRouteEdgeIdentityVerified'])
 def test_way_identity_alone_does_not_match(self):
  r=assess([{'id':7,'way_id':100}],[{'edge_id':{'value':8},'way_id':100,'access_restrictions':[]}]);self.assertEqual(r['edges'][0]['evidenceStatus'],'unknown')
 def test_missing_restrictions_remain_unknown(self):
  self.assertEqual(assess([{'id':7}],[{'edge_id':{'value':7}}])['edges'][0]['evidenceStatus'],'unknown')
 def test_empty_input_cannot_approve(self):self.assertFalse(assess([],[])['fullPathClearanceVerified'])
if __name__=='__main__':unittest.main()
