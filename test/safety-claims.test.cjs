'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const net = require('node:net');
const originalLoad = Module._load;
const originalConnect = net.Socket.prototype.connect;
const originalFetch = global.fetch;
const originalApiKey = process.env.ROUTES_API_KEY;

// Tests require no network, including localhost or metadata endpoints.
net.Socket.prototype.connect = function() {
  throw Error('Test blocked outbound connection');
};
global.fetch = async () => { throw Error('Unexpected test fetch'); };
after(() => {
  net.Socket.prototype.connect = originalConnect;
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.ROUTES_API_KEY;
  else process.env.ROUTES_API_KEY = originalApiKey;
});

// Minimal process-memory implementation of only the storage methods used by
// the actual safety-event store. Clone records at both write and read boundaries.
const collections = new Map();
class MemoryFirestore {
  collection(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    const records = collections.get(name);
    return {
      doc: id => ({ set: async value => records.set(id, structuredClone(value)) }),
      where: (field, operator, value) => {
        assert.equal(operator, '==');
        return {
          get: async () => ({
            docs: [...records.values()]
              .filter(record => record[field] === value)
              .map(record => ({ data: () => structuredClone(record) }))
          })
        };
      }
    };
  }
}
let handler;
try {
  Module._load = function(name, ...args) {
    if (name === '@google-cloud/functions-framework') {
      return { http: (target, fn) => { assert.equal(target, 'helloHttp'); handler = fn; } };
    }
    if (name === '@google-cloud/firestore') return { Firestore: MemoryFirestore };
    if (name.startsWith('@google-cloud/')) throw Error('Unexpected cloud SDK load');
    return originalLoad.call(this, name, ...args);
  };
  require('../index');
} finally {
  Module._load = originalLoad;
}
process.env.ROUTES_API_KEY = 'development-mock-only';

async function invoke(body, provider) {
  const modes = [];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://routes.googleapis.com/directions/v2:computeRoutes');
    assert.equal(options.headers['X-Goog-Api-Key'], 'development-mock-only');
    modes.push(JSON.parse(options.body).travelMode);
    return provider();
  };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ path: '/', method: 'POST', body }, res);
  return { ...res, modes };
}

const clear = { polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } };

async function assess(body, routes) {
 return invoke(body,()=>({ok:true,status:200,json:async()=>({routes:structuredClone(routes)})}));
}
function unknown(r) {
 assert.equal(r.code,200);
 assert.equal(r.body.boxSafe.safeRouteFound,false);
 assert.equal(r.body.boxSafe.routeSafetyStatus,'UNKNOWN_ROUTE_SAFETY');
 assert.equal(r.body.boxSafe.truckRouteVerified,false);
 assert.match(r.body.boxSafe.safetyMessage,/DO NOT PROCEED/);
}
for(const [name,body,reason] of [
 ['default DRIVE',{},'TRUCK_ROUTING_NOT_USED'],
 ['explicit DRIVE',{useTruckRouting:false},'TRUCK_ROUTING_NOT_USED'],
 ['normal TRUCK',{useTruckRouting:true},'UNVERIFIED_TRUCK_ROUTE']
])test(name,async()=>{
 const r=await assess(body,[clear]);unknown(r);
 assert.deepEqual(r.modes,[body.useTruckRouting?'TRUCK':'DRIVE']);
 assert.deepEqual(r.body.boxSafe.routeVerification[0].reasons,[reason]);
 assert.equal(r.body.boxSafe.noSafeRouteFound,false);
 assert.equal(r.body.boxSafe.routeVerification[0].localBridgeAssessment,'NO_KNOWN_CONFLICT');
});
for(const flag of [true,false,undefined,null,'true','false',0,1,{},[]]) {
 test(`TRUCK restriction flag ${JSON.stringify(flag)}`,async()=>{
  const r=await assess({useTruckRouting:true},[{...clear,travelAdvisory:{routeRestrictionsPartiallyIgnored:flag}}]);unknown(r);
  const reason=flag===true?'RESTRICTIONS_PARTIALLY_IGNORED':flag===false||flag===undefined?'UNVERIFIED_TRUCK_ROUTE':'INVALID_RESTRICTION_FLAG';
  assert.deepEqual(r.body.boxSafe.routeVerification[0].reasons,[reason]);
 });
}
for(const advisory of [null,42,'invalid',[]])test(`malformed advisory ${JSON.stringify(advisory)}`,async()=>{
 const r=await assess({useTruckRouting:true},[{...clear,travelAdvisory:advisory}]);unknown(r);
 assert.deepEqual(r.body.boxSafe.routeVerification[0].reasons,['INVALID_RESTRICTION_FLAG']);
});
test('unknown geometry remains unassessable',async()=>{
 const r=await assess({useTruckRouting:true},[{}]);unknown(r);
 assert.deepEqual(r.body.boxSafe.routeVerification[0].reasons,['UNVERIFIED_TRUCK_ROUTE','UNKNOWN_ROUTE_GEOMETRY']);
 assert.equal(r.body.boxSafe.routeVerification[0].localBridgeAssessment,'NOT_ASSESSABLE');
});
test('empty collection requires stopping',async()=>{
 const r=await assess({useTruckRouting:true},[]);
 assert.equal(r.body.boxSafe.routeSafetyStatus,'NO_ROUTE_RETURNED');
 assert.equal(r.body.boxSafe.safeRouteFound,false);
 assert.equal(r.body.boxSafe.noSafeRouteFound,false);
 assert.deepEqual(r.body.boxSafe.routeVerification,[]);
 assert.match(r.body.boxSafe.safetyMessage,/DO NOT PROCEED/);
});
function encode(points) {
 let prev=[0,0],s='';
 for(const point of points)point.forEach((v,i)=>{const n=Math.round(v*1e5),d=n-prev[i];prev[i]=n;let x=d<0?-d*2-1:d*2;while(x>=32){s+=String.fromCharCode(x%32+95);x=Math.floor(x/32)}s+=String.fromCharCode(x+63)});
 return s;
}
const conflict={polyline:{encodedPolyline:encode([[33.81218,-84.17035],[33.81219,-84.17036]])}};
test('known bridge conflict stays visible without assurance',async()=>{
 const r=await assess({useTruckRouting:true},[conflict]);unknown(r);
 assert.equal(r.body.boxSafe.noSafeRouteFound,true);
 assert.equal(r.body.boxSafe.lowBridgeWarnings.length,1);
 assert.equal(r.body.boxSafe.safetyEventPersistence.stored,1);
 assert.equal(r.body.boxSafe.safetyEvents[0].confidence,'LOW');
 assert.equal(r.body.boxSafe.routeVerification[0].localBridgeAssessment,'KNOWN_CONFLICT');
});
test('mixed alternatives retain sorting and per-route collision diagnostics',async()=>{
 const r=await assess({useTruckRouting:true},[conflict,{}, {...clear,travelAdvisory:{routeRestrictionsPartiallyIgnored:true}}]);unknown(r);
 assert.deepEqual(r.body.boxSafe.routeVerification.map(x=>x.originalIndex),[2,0,1]);
 assert.equal(r.body.boxSafe.routeVerification[0].reasons[0],'RESTRICTIONS_PARTIALLY_IGNORED');
 assert.equal(r.body.boxSafe.routeVerification[1].localBridgeWarnings.length,1);
 assert.equal(r.body.boxSafe.noSafeRouteFound,false);
 assert.equal(r.body.boxSafe.lowBridgeWarnings.length,0);
});
test('client verification claims cannot bypass unknown safety',async()=>{
 const r=await assess({useTruckRouting:true,verified:true,truckRouteVerified:true,safeRouteFound:true,verificationStatus:'VERIFIED'},[clear]);unknown(r);
 assert.equal(r.body.boxSafe.routeVerification[0].verified,false);
});
test('environment verification claims cannot bypass unknown safety',async()=>{
 const names=['BOXSAFE_TRUCK_VERIFIED','TRUCK_ROUTE_VERIFIED'];
 const prior=names.map(n=>process.env[n]);
 try {
  names.forEach(n=>{process.env[n]='true'});
  const r=await assess({useTruckRouting:true},[clear]);unknown(r);
  assert.equal(r.body.boxSafe.routeVerification[0].verified,false);
 } finally {names.forEach((n,i)=>{if(prior[i]===undefined)delete process.env[n];else process.env[n]=prior[i]})}
});
