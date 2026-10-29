"""Audit a locally supplied JSON packet; never a driving certificate."""
import argparse,json,pathlib
from route_restrictions import audit
p=argparse.ArgumentParser();p.add_argument('packet');p.add_argument('--output',required=True);args=p.parse_args()
source=pathlib.Path(args.packet)
if source.stat().st_size>2000000:raise SystemExit('Evidence packet too large')
result=audit(json.loads(source.read_text()))
pathlib.Path(args.output).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
raise SystemExit(0 if result['suppliedEvidenceComplete'] and not result['conflicts'] else 1)
