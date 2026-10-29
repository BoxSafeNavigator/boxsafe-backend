'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../routing/valhalla/server.cjs');
test('private app serves UI and handles route failures without fallback',async()=>{
 let calls=0;const server=createApp({route:async()=>{calls++;const e=Error('private internals');e.status=503;throw e}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(url);assert.match(await page.text(),/data-engine-enabled="true"/);
  let r=await fetch(url+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,503);const result=await r.json();assert.equal(result.safeRouteFound,false);assert.ok(!JSON.stringify(result).includes('private internals'));assert.equal(calls,1);
  r=await fetch(url+'/route',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://elsewhere.example'},body:'{}'});assert.equal(r.status,403);assert.equal(calls,1);
  r=await fetch(url+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);
  r=await fetch(url+'/route',{method:'POST',body:'{}'});assert.equal(r.status,415);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
