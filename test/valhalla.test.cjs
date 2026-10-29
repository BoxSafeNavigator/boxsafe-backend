'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const http = require('node:http');
const { buildRequest, createRouter, decode6, normalize } = require('../routing/valhalla/adapter.cjs');
const input = () => ({ locations: [{ lat: 34.92, lon: -81.03 }, { lat: 34.93, lon: -81.04 }], truck: {
  height: { value: 13, unit: 'ft' }, width: { value: 102, unit: 'in' }, length: { value: 26, unit: 'ft' },
  loadedWeight: { value: 26000, unit: 'lb' }, maxAxleLoad: { value: 16000, unit: 'lb' }, axleCount: 2, hazmat: false } });
function encode(points) { let lat = 0, lon = 0, out = ''; for (const p of points) {
  for (const d of [p[0] - lat, p[1] - lon]) { let n = d < 0 ? -d * 2 - 1 : d * 2;
    while (n >= 32) { out += String.fromCharCode((n % 32) + 95); n = Math.floor(n / 32); } out += String.fromCharCode(n + 63); }
  [lat, lon] = p; } return out; }
const shape = encode([[34920000, -81030000], [34930000, -81040000]]);
const good = () => ({ boxsafe_endpoint_assessment: {checked:true,scope:'graph_candidate_endpoints_only',clearanceVerified:false}, trip: { status: 0, units: 'kilometers', summary: { length: 2, time: 120 }, legs: [{ shape, maneuvers: [{ instruction: 'Head north.' }] }] } });
test('converts US units and prevents caller restriction overrides', () => {
  const i = input(); i.costing = 'auto'; i.truck.ignore_restrictions = true;
  const r = buildRequest(i); assert.equal(r.costing, 'truck');
  assert.equal(r.costing_options.truck.height, 3.9624); assert.equal(r.costing_options.truck.width, 2.5907999999999998);
  assert.equal(r.costing_options.truck.ignore_restrictions, false); assert.equal(r.costing_options.truck.hgv_no_access_penalty, 43200);
  assert.ok(Math.abs(r.costing_options.truck.weight - 11.79340162) < 1e-8);
});
for (const field of ['height', 'width', 'length', 'loadedWeight', 'maxAxleLoad', 'axleCount', 'hazmat']) test('requires '+field, () => {
  const i = input(); delete i.truck[field]; assert.throws(() => buildRequest(i), /INVALID_ROUTE_INPUT/);
});
for (const value of [0, -1, NaN, Infinity, '13', 1000]) test('rejects invalid height '+value, () => {
  const i = input(); i.truck.height.value = value; assert.throws(() => buildRequest(i));
});
test('rejects units, coordinates and fractional axles', () => {
  let i = input(); i.truck.height.unit = 'yards'; assert.throws(() => buildRequest(i));
  i = input(); i.locations[0].lat = 91; assert.throws(() => buildRequest(i));
  i = input(); i.truck.axleCount = 2.5; assert.throws(() => buildRequest(i));
});
test('polyline6 decodes actual South Carolina coordinates', () => assert.deepEqual(decode6(shape), [[-81.03, 34.92], [-81.04, 34.93]]));
for (const s of ['', '?', '????', '~~~', '\u2603']) test('reject malformed geometry '+s, () => assert.throws(() => decode6(s)));
test('success always remains unverified and preserves provenance', () => {
  const r = normalize(good(), { datasetId: 'fixture-only' }); assert.equal(r.safeRouteFound, false);
  assert.equal(r.truckRouteVerified, false); assert.equal(r.route.distanceMeters, 2000); assert.equal(r.provenance.datasetId, 'fixture-only');
});
for (const data of [{}, { trip: { status: 442 } }, { trip: { ...good().trip, units: 'miles' } }]) test('malformed/no-route response fails closed', () => assert.throws(() => normalize(data, {})));
test('HTTP transport: success, no-route, bad JSON, timeout; no fallback requests', async () => {
  let requests = 0, mode = 'good';
  const server = http.createServer(async (req, res) => { requests++; let body = ''; for await (const c of req) body += c;
    assert.equal(JSON.parse(body).costing, 'truck');
    if (mode === 'slow') return;
    res.writeHead(mode === 'error' ? 400 : 200, { 'Content-Type': 'application/json' });
    res.end(mode === 'bad' ? '{' : JSON.stringify(mode === 'error' ? { error_code: 442 } : good())); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const route = createRouter({ endpoint: 'http://127.0.0.1:'+server.address().port, timeoutMs: 100 });
    assert.equal((await route(input())).safeRouteFound, false);
    for (mode of ['error', 'bad', 'slow']) await assert.rejects(route(input()));
    assert.equal(requests, 4);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

test('toll and freeway preferences retain truck restrictions', () => {
  const i = input(); i.preferences = { preferFewerFreeways: true, preferFewerTolls: true };
  const r = buildRequest(i); const t = r.costing_options.truck;
  assert.equal(t.use_highways, 0); assert.equal(t.use_tolls, 0);
  assert.equal(r.costing, 'truck'); assert.equal(t.ignore_restrictions, false);
  assert.equal(t.ignore_access, false); assert.equal(t.hgv_no_access_penalty, 43200);
});
test('default preferences remain neutral', () => {
  const t = buildRequest(input()).costing_options.truck;
  assert.equal(t.use_highways, 0.5); assert.equal(t.use_tolls, 0.5);
});
for (const preferences of [null, [], { preferFewerTolls: 'true' }, { ignore_restrictions: true }]) {
  test('reject invalid preference '+JSON.stringify(preferences), () => {
    assert.throws(() => buildRequest({ ...input(), preferences }), /INVALID_ROUTE_INPUT/);
  });
}
test('router rejects engine responses without endpoint assessment',async()=>{
 const data=good();delete data.boxsafe_endpoint_assessment;
 const route=createRouter({endpoint:'http://127.0.0.1:8002',fetchImpl:async()=>new Response(JSON.stringify(data))});
 await assert.rejects(route(input()),/ENDPOINT_COMPATIBILITY_UNVERIFIED/);
});

for (const [name, points] of [
  ['shifted origin', [[34921000, -81030000], [34930000, -81040000]]],
  ['shifted destination', [[34920000, -81030000], [34931000, -81040000]]],
  ['reversed endpoints', [[34930000, -81040000], [34920000, -81030000]]]
]) test('router rejects '+name+' despite a positive endpoint assessment', async () => {
  const data = good(); data.trip.legs[0].shape = encode(points);
  const router = createRouter({ endpoint: 'http://127.0.0.1:8002', fetchImpl: async () => new Response(JSON.stringify(data)) });
  await assert.rejects(router(input()), { code: 'ROUTE_ENDPOINT_MISMATCH' });
});
test('nearby returned endpoints stay experimental', async () => {
  const data = good(); data.trip.legs[0].shape = encode([[34920200, -81030000], [34929800, -81040000]]);
  const router = createRouter({ endpoint: 'http://127.0.0.1:8002', fetchImpl: async () => new Response(JSON.stringify(data)) });
  assert.equal((await router(input())).safeRouteFound, false);
});
