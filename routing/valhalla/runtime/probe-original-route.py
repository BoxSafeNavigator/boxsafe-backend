"""Probe binary original-trip output without treating an unsupported binding as evidence."""
import argparse,json,pathlib
from valhalla import Actor
p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--output',required=True);args=p.parse_args()
a=Actor(json.load(open(args.config)))
request={'locations':[{'lat':34,'lon':-81},{'lat':34,'lon':-80.98}],'costing':'truck'}
control=json.loads(a.route(json.dumps(request)))
assert control['trip']['status']==0
report={'syntheticOnly':True,'jsonControlPassed':True,'binaryTripAvailable':False,'originalRouteEdgeIdentityVerified':False,'fullPathClearanceVerified':False}
try:
 raw=a.route(json.dumps({**request,'format':'pbf','pbf_field_selector':{'trip':True}}))
 report['returnedType']=type(raw).__name__;report['returnedLength']=len(raw)
except UnicodeDecodeError:
 report['blocker']='Python string-returning route binding cannot decode this binary trip response as UTF-8'
except Exception as error:
 report['blocker']=type(error).__name__+': '+str(error)[:200]
pathlib.Path(args.output).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
