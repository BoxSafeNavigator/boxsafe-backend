#!/usr/bin/env python3
"""Private development transport around the real Valhalla Actor, not a production server."""
import argparse, json, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from valhalla import Actor
from endpoint_guard import check_endpoints
p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--port',type=int,default=8002);a=p.parse_args()
actor=Actor(json.load(open(a.config)));lock=threading.Lock()
class Handler(BaseHTTPRequestHandler):
 def reply(self,status,data):
  raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_POST(self):
  if self.path!='/route':return self.reply(404,{'error':'NOT_FOUND'})
  try:
   size=int(self.headers.get('Content-Length','0'))
   if size<=0 or size>16384:return self.reply(413,{'error':'BODY_SIZE'})
   payload=json.loads(self.rfile.read(size))
   if not isinstance(payload,dict) or payload.get('costing')!='truck':return self.reply(400,{'error':'TRUCK_REQUIRED'})
   # BoxSafe adapter owns profile validation; this service must stay private behind it.
   with lock:
    assessment=check_endpoints(actor,payload)
    result=actor.route(json.dumps(payload))
   if isinstance(result,str):result=json.loads(result)
   result['boxsafe_endpoint_assessment']=assessment
   return self.reply(200,result)
  except Exception:return self.reply(400,{'error':'ENGINE_REQUEST_FAILED'})
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
