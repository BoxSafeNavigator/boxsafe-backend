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
function unavailable(r, status, reason) {
  assert.equal(r.code, status);
  assert.deepEqual(r.modes, ['TRUCK']);
  assert.equal(r.body.error, 'Truck routing is unavailable.');
  assert.equal('googleRoutes' in r.body, false);
  const b = r.body.boxSafe;
  assert.equal(b.routingMode, 'TRUCK');
  assert.equal(b.truckRoutingRequested, true);
  assert.equal(b.truckRoutingFallback, false);
  assert.equal(b.truckRoutingStatus, 'TRUCK_ROUTING_UNAVAILABLE');
  assert.equal(b.routeSafetyStatus, 'UNKNOWN_ROUTE_SAFETY');
  assert.equal(b.safeRouteFound, false);
  assert.equal(b.noSafeRouteFound, false);
  assert.equal(b.evaluatedRouteCount, 0);
  assert.equal(b.routeCollectionValid, false);
  assert.deepEqual(b.routeGeometry, []);
  assert.deepEqual(b.lowBridgeWarnings, []);
  assert.deepEqual(b.safetyEvents, []);
  assert.deepEqual(b.safetyEventPersistence, { attempted: 0, stored: 0, failed: 0 });
  assert.equal(b.upstreamError.reason, reason);
  assert.match(b.safetyMessage, /DO NOT PROCEED.*truck-capable provider.*verification/);
  assert.doesNotMatch(JSON.stringify(r.body), /secret-provider-value|NO SAFE ROUTE FOUND/);
}
for (const status of [400, 401, 403, 429, 500, 503]) {
  test(`TRUCK HTTP ${status}: one request, no downgrade or route payload`, async () => {
    const r = await invoke({ useTruckRouting: true }, () => ({ ok: false, status, json: async () => ({ error: { message: 'secret-provider-value' }, routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } }] }) }));
    unavailable(r, status, 'UPSTREAM_HTTP_ERROR');
    assert.equal(r.body.boxSafe.upstreamError.status, status);
  });
  test(`TRUCK HTTP ${status} malformed JSON preserves HTTP error`, async () => {
    const r = await invoke({ useTruckRouting: true }, () => ({ ok: false, status, json: async () => { throw Error('secret-provider-value'); } }));
    unavailable(r, status, 'INVALID_PROVIDER_JSON');
  });
}
test('TRUCK rejected fetch fails closed', async () => {
  const r = await invoke({ useTruckRouting: true }, () => { throw Error('secret-provider-value'); });
  unavailable(r, 500, 'PROVIDER_REQUEST_FAILED');
  assert.equal(r.body.boxSafe.upstreamError.status, null);
});
test('TRUCK OK malformed JSON fails closed as bad gateway', async () => {
  unavailable(await invoke({ useTruckRouting: true }, () => ({ ok: true, status: 200, json: async () => { throw Error('secret-provider-value'); } })), 502, 'INVALID_PROVIDER_JSON');
});
for (const data of [null, {}, { routes: {} }]) {
  test(`TRUCK invalid collection ${JSON.stringify(data)}`, async () => {
    unavailable(await invoke({ useTruckRouting: true }, () => ({ ok: true, status: 200, json: async () => data })), 502, 'INVALID_PROVIDER_RESPONSE');
  });
}
for (const [name, body, mode] of [['TRUCK', { useTruckRouting: true }, 'TRUCK'], ['explicit DRIVE', { useTruckRouting: false }, 'DRIVE'], ['default DRIVE', {}, 'DRIVE']]) {
  test(`${name} success retains geometry assessment`, async () => {
    const r = await invoke(body, () => ({ ok: true, status: 200, json: async () => ({ routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } }] }) }));
    assert.equal(r.code, 200);
    assert.deepEqual(r.modes, [mode]);
    assert.equal(r.body.boxSafe.routingMode, mode);
    assert.equal(r.body.boxSafe.safeRouteFound, false);
    assert.equal(r.body.boxSafe.truckRoutingFallback, false);
    assert.equal(r.body.boxSafe.evaluatedRouteCount, 1);
    assert.equal(r.body.boxSafe.routeGeometry[0].status, 'VALID');
  });
}
test('successful TRUCK response with missing geometry remains unknown', async () => {
  const r = await invoke({ useTruckRouting: true }, () => ({ ok: true, status: 200, json: async () => ({ routes: [{}] }) }));
  assert.deepEqual(r.modes, ['TRUCK']);
  assert.equal(r.body.boxSafe.routeSafetyStatus, 'UNKNOWN_ROUTE_SAFETY');
  assert.equal(r.body.boxSafe.safeRouteFound, false);
  assert.equal(r.body.boxSafe.evaluatedRouteCount, 1);
  assert.match(r.body.boxSafe.safetyMessage, /DO NOT PROCEED/);
});
test('DRIVE HTTP failure behavior stays unchanged', async () => {
  const r = await invoke({}, () => ({ ok: false, status: 503, json: async () => ({ error: { message: 'mock failure' } }) }));
  assert.equal(r.code, 503);
  assert.deepEqual(r.modes, ['DRIVE']);
  assert.equal(r.body.googleRoutes.error.message, 'mock failure');
});
test('socket guard and real Firestore exclusion', () => {
  assert.throws(() => new net.Socket().connect({ host: '169.254.169.254', port: 80 }), /Test blocked outbound connection/);
  assert.equal(Object.keys(require.cache).some(p => p.includes('/node_modules/@google-cloud/firestore/')), false);
});
