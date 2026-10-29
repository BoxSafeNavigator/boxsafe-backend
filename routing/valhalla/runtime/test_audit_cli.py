import json,pathlib,subprocess,sys,tempfile,unittest
class AuditCliTests(unittest.TestCase):
 def test_example_exit_codes(self):
  root=pathlib.Path(__file__).resolve().parent
  for name,code,status in [('no-recorded-conflict',0,'UNKNOWN_ROUTE_SAFETY'),('height-conflict',1,'SUPPLIED_EVIDENCE_CONFLICT'),('missing-evidence',1,'UNKNOWN_ROUTE_SAFETY')]:
   with self.subTest(name=name),tempfile.TemporaryDirectory() as tmp:
    output=pathlib.Path(tmp)/'report.json'
    result=subprocess.run([sys.executable,str(root/'audit-route-evidence.py'),str(root/'evidence-examples'/f'{name}.json'),'--output',str(output)],capture_output=True,text=True)
    self.assertEqual(result.returncode,code,result.stderr)
    data=json.loads(output.read_text());self.assertEqual(data['status'],status)
    for flag in ('navigationReady','fullPathClearanceVerified','safeRouteFound','sourceAuthenticated'):self.assertIs(data[flag],False)
if __name__=='__main__':unittest.main()
